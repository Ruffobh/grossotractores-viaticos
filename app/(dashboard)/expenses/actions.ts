'use server'

import { createClient } from '@/utils/supabase/server'
import { getGeminiModel, generateWithFallback } from '@/utils/gemini/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sendAdminAlert, sendManagerNotification } from '@/app/utils/mail'

const PAGE_SIZE = 200

export async function loadMoreExpenses(
    offset: number,
    filters: Record<string, string>,
    role: string,
    userBranches: string[]
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { expenses: [], hasMore: false }

    const { data: profile } = await supabase.from('profiles').select('permissions').eq('id', user.id).single()
    const hasApproveArea = (profile?.permissions as any)?.approve_area_expenses === true
    const isManagerOrAdmin = role === 'manager' || role === 'branch_manager' || role === 'admin'

    let query = supabase
        .from('invoices')
        .select(`
            *,
            profiles!invoices_user_id_fkey(full_name, branch, area),
            loaded_by_profile:profiles!invoices_loaded_by_fkey(full_name, branch, area)
        `)
        .order('date', { ascending: false })
        .neq('status', 'draft')
        .range(offset, offset + PAGE_SIZE - 1)

    if (role === 'user' && !hasApproveArea) {
        query = query.eq('user_id', user.id)
    }

    if (filters.status) query = query.eq('status', filters.status)
    if (isManagerOrAdmin) {
        if (filters.user_id) query = query.eq('user_id', filters.user_id)
        if (filters.branch) query = query.eq('branch', filters.branch)
        if (filters.expense_category) query = query.eq('expense_category', filters.expense_category)
        if (filters.payment_method) query = query.eq('payment_method', filters.payment_method)
    }

    const { data: rawExpenses } = await query
    let expenses = rawExpenses || []
    const hasMore = expenses.length >= PAGE_SIZE

    // Client-side branch filtering for managers
    if ((role === 'manager' || role === 'branch_manager') && userBranches.length > 0) {
        expenses = expenses.filter((inv: any) => userBranches.includes(inv.profiles?.branch))
    }

    return { expenses, hasMore }
}

export async function processReceipt(imageUrl: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { error: 'Unauthorized' }

        // 1. Fetch image data (with timeout to prevent hanging)
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000) // 8s timeout
        let imageResp: Response
        try {
            imageResp = await fetch(imageUrl, { signal: controller.signal })
        } finally {
            clearTimeout(timeout)
        }
        const imageBuffer = await imageResp.arrayBuffer()
        const base64Image = Buffer.from(imageBuffer).toString('base64')

        // 2. Prompt Gemini with Structured Output
        const mimeType = imageResp.headers.get('content-type') || 'image/jpeg'

        const prompt = `
        Analiza esta factura o ticket. Extrae cabecera, CUIT del proveedor, moneda, y un desglose detallado de impuestos.
        IMPORTANTE: 
        1. El proveedor NO es "GROSSO TRACTORES SA". Ese es el cliente. Busca el emisor (logotipo arriba a la izquierda).
        2. Debes separar el IVA (21%, 10.5%) de otros impuestos (Percepciones IIBB, Impuestos Internos, Percepción IVA).
        3. Si hay "Conceptos No Gravados" o "Importe Exento", INCLÚYELOS en el array de "taxes" con el nombre "Conceptos No Gravados".
        4. EXCLUYE LÍNEAS DE TOTALES O SUB-TOTALES DE IMPUESTOS: Si el ticket tiene un desglose (ej: "Impuesto Interno" + "IDC") y luego una línea "Importe Total Otros Tributos", SOLO extrae los componentes individuales. NO incluyas la línea de suma total en el array "taxes".
        5. IDENTIFICA LA LETRA O TIPO DE COMPROBANTE: Busca la letra grande en el recuadro (A, B, C, M) o si dice "Ticket", "Tique Factura A", etc.
        
        CRITICAL OUTPUT FORMAT:
        You MUST return a JSON object strictly adhering to this schema:
        {
          "vendorName": string, 
          "vendorCuit": string (format XX-XXXXXXXX-X),
          "invoiceNumber": string,
          "invoiceType": string (Return EXACTLY what you see: e.g., "A", "B", "C", "Ticket A", "Ticket B", "Ticket C", "M", "Recibo C"),
          "date": string (YYYY-MM-DD, convert from DD/MM/YYYY if needed),
          "totalAmount": number,
          "netAmount": number,
          "taxAmount": number, 
          "perceptionsAmount": number,
          "currency": string ("ARS" or "USD"),
          "exchangeRate": number,
          "taxes": [
            { "name": string, "amount": number }
          ],
          "items": [
            { "description": string, "quantity": number, "unitPrice": number, "total": number }
          ]
        }
        `

        let text = "";
        let aiFailed = false;
        let aiErrorDetail = "";

        try {
            // New Multi-Model Logic
            const inlineData = { data: base64Image, mimeType: mimeType };
            // Switch to 1.5-flash as primary for stability with receipts
            text = await generateWithFallback(prompt, inlineData);
            console.log("🤖 AI Response:", text); // Debug log
        } catch (error: any) {
            console.error("⚠️ All AI Models failed. Proceeding to Manual Mode.", error);
            aiFailed = true;
            aiErrorDetail = error.message || "Unknown AI Error";
        }

        let parsedData: any = {}
        if (!aiFailed && text) {
            // Clean markdown if present
            text = text.replace(/```json/g, '').replace(/```/g, '').trim()
            try {
                parsedData = JSON.parse(text)
            } catch (e) {
                console.error("JSON Parse Error:", e)
                // If JSON fails, treating as AI fail is safer than partial garbage
                aiFailed = true;
                aiErrorDetail = "JSON Parse Error";
            }
        }

        // 2b. Fetch User Profile for Branch
        const { data: profile } = await supabase
            .from('profiles')
            .select('branch')
            .eq('id', user.id)
            .single()

        const userBranch = profile?.branch || null

        // --- NORMALIZATION LOGIC ---
        // Map any OCR result to the STRICT 3 options: 'FACTURA A', 'FACTURA C', 'CONSUMIDOR FINAL'
        let normalizedInvoiceType = 'FACTURA A'; // Default fallback

        if (parsedData.invoiceType) {
            const rawType = parsedData.invoiceType.toUpperCase();

            // LOGIC FOR "A"
            if (rawType.includes('A') && !rawType.includes('B') && !rawType.includes('C')) {
                // Matches: "A", "FACTURA A", "TICKET A", "TIQUE A", "M" (treat M as A often or specific logic? Let's assume A for now usually standard business)
                // actually M is different, but for this rigid system, usually businesses take A.
                normalizedInvoiceType = 'FACTURA A';
            }
            // LOGIC FOR "C"
            else if (rawType.includes('C') && !rawType.includes('A') && !rawType.includes('B')) {
                normalizedInvoiceType = 'FACTURA C';
            }
            // LOGIC FOR "B" OR "CONSUMIDOR FINAL"
            else if (rawType.includes('B') || rawType.includes('FINAL') || rawType.includes('CONSUMIDOR')) {
                normalizedInvoiceType = 'CONSUMIDOR FINAL';
            }

            // Specific overrides if needed
            if (rawType === 'M') normalizedInvoiceType = 'FACTURA A'; // Map M to A for system compatibility or treat as A equivalent for tax logic usually
        }
        // ---------------------------

        const mappedData = {
            vendor_name: parsedData.vendorName || (aiFailed ? '' : 'Desconocido'),
            vendor_cuit: parsedData.vendorCuit,
            invoice_number: parsedData.invoiceNumber,
            invoice_type: normalizedInvoiceType, // Use the normalized value
            date: parsedData.date || new Date().toISOString().split('T')[0],
            total_amount: parsedData.totalAmount || 0,
            currency: parsedData.currency || 'ARS',
            // Store the FULL rich objects in parsed_data jsonb column
            parsed_data: parsedData,
            branch: userBranch,
            user_id: user.id,
            file_url: imageUrl,
            payment_method: null,
            expense_category: null,
            status: 'draft' // Always draft initially
        }

        // 3. Create generic Invoice record
        const { data: invoice, error } = await supabase
            .from('invoices')
            .insert(mappedData)
            .select()
            .single()

        if (error) {
            console.error('Supabase Insert Error:', error)
            return { error: 'Failed to save invoice (DB Error): ' + error.message }
        }

        if (aiFailed) {
            return { success: true, invoiceId: invoice.id, warning: 'AI_FAILED', debugInfo: aiErrorDetail };
        }

        // --- EARLY DUPLICATE CHECK ---
        // If AI extracted both CUIT and invoice number, check for existing duplicates
        const extractedCuit = (parsedData.vendorCuit || '').trim()
        const extractedNumber = (parsedData.invoiceNumber || '').trim()

        if (extractedCuit && extractedNumber) {
            const { data: existingDup } = await supabase
                .from('invoices')
                .select('id, vendor_name, date')
                .eq('vendor_cuit', extractedCuit)
                .eq('invoice_number', extractedNumber)
                .neq('id', invoice.id)
                .neq('status', 'draft')
                .neq('status', 'rejected')
                .limit(1)

            if (existingDup && existingDup.length > 0) {
                const dup = existingDup[0]
                const dupDate = dup.date ? new Date(dup.date).toLocaleDateString('es-AR') : 'fecha desconocida'
                return {
                    success: true,
                    invoiceId: invoice.id,
                    warning: 'DUPLICATE',
                    duplicateInfo: `Ya existe un comprobante con CUIT ${extractedCuit} y Nº ${extractedNumber} ` +
                        `(${dup.vendor_name || 'Proveedor'}, ${dupDate}). Verificá que no sea una carga duplicada.`
                }
            }
        }
        // --- END EARLY DUPLICATE CHECK ---

        return { success: true, invoiceId: invoice.id }

    } catch (err: any) {
        console.error('Critical Processing Error:', err)
        return { error: 'Failed to process receipt: ' + (err.message || err) }
    }
}

export async function deleteExpense(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Fetch invoice details including split info
    const { createAdminClient } = await import('@/utils/supabase/admin')
    const adminClient = createAdminClient()

    const { data: invoice } = await adminClient
        .from('invoices')
        .select('status, file_url, user_id, split_group_id, is_parent, loaded_by')
        .eq('id', id)
        .single()

    if (!invoice) return { error: 'Comprobante no encontrado.' }

    // Check user role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const role = profile?.role || 'user'

    // --- PERMISSION RULES ---
    if (role === 'user') {
        // Standard users: only own expenses in draft, pending_approval or approved
        if (invoice.user_id !== user.id && invoice.loaded_by !== user.id) {
            return { error: 'No tenés permiso para eliminar comprobantes de otros usuarios.' }
        }
        const deletableStatuses = ['draft', 'pending_approval', 'approved']
        if (!deletableStatuses.includes(invoice.status || '')) {
            return { error: 'Solo podés eliminar comprobantes en estado Borrador, Pendiente o Aprobado.' }
        }
    } else if (role === 'branch_manager') {
        // Branch managers: can delete most, except submitted_to_bc
        if (invoice.status === 'submitted_to_bc') {
            return { error: 'No se puede eliminar un comprobante cargado en Business Central (Solo Administradores).' }
        }
    }
    // Admins: no restrictions

    // --- CASCADE DELETE FOR SPLIT GROUPS ---
    // If this is a parent of a split group AND the current user is the original uploader,
    // delete ALL invoices in the split group
    if (invoice.split_group_id && invoice.is_parent) {
        // Get all invoices in the split group
        const { data: groupInvoices } = await adminClient
            .from('invoices')
            .select('id, file_url')
            .eq('split_group_id', invoice.split_group_id)

        if (groupInvoices && groupInvoices.length > 0) {
            // Delete all invoices in the group
            const { error: groupDeleteError } = await adminClient
                .from('invoices')
                .delete()
                .eq('split_group_id', invoice.split_group_id)

            if (groupDeleteError) {
                return { error: 'Error al eliminar el grupo de gastos compartidos: ' + groupDeleteError.message }
            }

            // Clean up storage (all share the same file_url typically)
            const fileUrls = new Set(groupInvoices.map(inv => inv.file_url).filter(Boolean))
            for (const fileUrl of fileUrls) {
                await cleanupStorageFile(supabase, fileUrl as string)
            }

            revalidatePath('/expenses')
            return { success: true }
        }
    }

    // --- SINGLE DELETE ---
    const { error } = await adminClient.from('invoices').delete().eq('id', id)

    if (error) {
        return { error: error.message }
    }

    // Delete from Storage
    if (invoice.file_url) {
        await cleanupStorageFile(supabase, invoice.file_url)
    }

    revalidatePath('/expenses')
    return { success: true }
}

// Helper to clean up storage files
async function cleanupStorageFile(supabase: any, fileUrl: string) {
    try {
        // Ensure no other invoice is using the exact same file_url
        const { count, error: countError } = await supabase
            .from('invoices')
            .select('id', { count: 'exact', head: true })
            .eq('file_url', fileUrl)

        if (!countError && count === 0) {
            const parts = fileUrl.split('/receipts/')
            if (parts.length > 1) {
                const filePath = parts[1]
                const decodedPath = decodeURIComponent(filePath)
                await supabase.storage.from('receipts').remove([decodedPath])
            }
        }
    } catch (e) {
        console.error('Error attempting to delete file from storage:', e)
    }
}

export async function markInvoiceAsSubmitted(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Check user role
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profileError) {
        console.error("Error fetching profile:", profileError)
    }

    const role = profile?.role
    console.log(`[markInvoiceAsSubmitted] User: ${user.email}, Role: ${role}, InvoiceId: ${id}`)

    // Check if this invoice is part of a split group (Parent)
    // If so, we must update ALL siblings in the group
    const { data: currentInvoice } = await supabase.from('invoices').select('split_group_id, is_parent').eq('id', id).single()

    // Bypass RLS for Admins and Managers using Service Role
    // ALSO bypass for Split Groups to ensure synchronization across users
    const hasSplitGroup = !!currentInvoice?.split_group_id
    let updateQuery: any = { status: 'submitted_to_bc' }

    if (role === 'admin' || role === 'manager' || role === 'branch_manager' || hasSplitGroup) {
        console.log("[markInvoiceAsSubmitted] Using Admin Client (Admin/Manager or Split Group)")
        const { createAdminClient } = await import('@/utils/supabase/admin')
        const adminClient = createAdminClient()

        let query = adminClient.from('invoices').update(updateQuery)

        if (currentInvoice?.split_group_id) {
            // Update all in group
            query = query.eq('split_group_id', currentInvoice.split_group_id)
        } else {
            // Update single
            query = query.eq('id', id)
        }

        const { error, data } = await query.select()

        if (error) {
            console.error("[markInvoiceAsSubmitted] Admin Client Update Error:", error)
            return { error: 'Error al actualizar estado (Admin/Manager): ' + error.message }
        }
        console.log("[markInvoiceAsSubmitted] Update Success:", data)
    } else {
        console.log("[markInvoiceAsSubmitted] Using Standard Client")
        // Fallback for standard users (though they shouldn't see this button usually)
        let query = supabase.from('invoices').update(updateQuery)

        if (currentInvoice?.split_group_id) {
            // Standard user might not have rights to update OTHERS, careful. 
            // Usually only Admins submit to BC. 
            // If user clicks "Mark as Submitted" (rare), they probably can only update their own.
            // But if they are the parent, maybe they should update others? 
            // RLS will block updating others if not admin/manager.
            // So we just try to update by ID for safety or warn.
            if (currentInvoice.is_parent) {
                // Try to update group, but likely will fail for others rows if RLS applies.
                // For now, let's just update ID to avoid RLS errors on non-admin users.
                query = query.eq('id', id)
            } else {
                query = query.eq('id', id)
            }
        } else {
            query = query.eq('id', id)
        }

        const { error } = await query

        if (error) {
            console.error("[markInvoiceAsSubmitted] Standard Update Error:", error)
            return { error: 'No tienes permisos para realizar esta acción o ocurrió un error.' }
        }
    }

    revalidatePath('/expenses')
    return { success: true }
}

export async function searchProfiles(term: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, branch')
        .ilike('full_name', `%${term}%`)
        .limit(10)

    // Filter out current user? Or keep him? User said "assume he includes himself".
    // UI can filter.
    return data || []
}

// Helper for checking limits and determining status
async function checkLimitAndGetStatus(
    supabase: any,
    userId: string,
    amount: number,
    dateStr: string,
    paymentMethod: string
) {
    // 1. Fetch Profile Limits
    const { data: profile } = await supabase
        .from('profiles')
        .select('monthly_limit, cash_limit, full_name, branch, area')
        .eq('id', userId)
        .single()

    if (!profile) return { status: 'pending_approval', profile: null } // Safety fallback

    const cardLimit = profile.monthly_limit || 0
    const cashLimit = profile.cash_limit || 0

    // 2. Calculate Date Range (Month of expense)
    // Date string YYYY-MM-DD
    const [yearPart, monthPart, dayPart] = dateStr.split('-').map(Number)
    const invoiceDate = new Date(yearPart, monthPart - 1, dayPart)
    const year = invoiceDate.getFullYear()
    const month = invoiceDate.getMonth()

    const firstDay = new Date(year, month, 1).toISOString()
    const lastDay = new Date(year, month + 1, 0).toISOString()

    // 3. Fetch Monthly Consumption
    const { data: expenses } = await supabase
        .from('invoices')
        .select('total_amount, payment_method, status, rejected_amount')
        .eq('user_id', userId)
        .gte('date', firstDay)
        .lte('date', lastDay)
        .neq('status', 'rejected')
        .neq('status', 'draft') // Exclude drafts from calculation

    // 4. Calculate relevant consumption
    const isCashOrTransfer = paymentMethod === 'Cash' || paymentMethod === 'Transfer'

    const relevantExpenses = expenses?.filter((inv: any) => {
        const invMethod = inv.payment_method
        if (isCashOrTransfer) {
            return invMethod === 'Cash' || invMethod === 'Transfer'
        } else {
            return invMethod === 'Card'
        }
    }) || []

    const currentTotal = relevantExpenses.reduce((sum: any, item: any) => {
        let amt = item.total_amount || 0;
        if (item.status === 'partially_rejected') {
            amt -= (item.rejected_amount || 0);
        }
        return sum + amt;
    }, 0)
    const activeLimit = isCashOrTransfer ? cashLimit : cardLimit

    // 5. Determine Status
    let status = 'approved'
    if (currentTotal + amount > activeLimit) {
        status = 'pending_approval'
    }

    return { status, profile, currentTotal, activeLimit }
}

export async function splitExpense(invoiceId: string, targetUserIds: string[], formData: any) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    try {
        console.log("--- SPLIT EXPENSE ACTION START ---")

        // 0. Validate Date Restriction (7 days)
        if (formData.date) {
            const today = new Date()
            const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            const [y, m, d] = formData.date.split('-').map(Number)
            const expenseDate = new Date(y, m - 1, d)
            const diffTime = todayZero.getTime() - expenseDate.getTime()
            const diffDays = diffTime / (1000 * 3600 * 24)

            if (isNaN(diffDays)) {
                return { error: 'La fecha es inválida.' }
            } else if (diffDays > 7) {
                return { error: 'La fecha del comprobante excede el límite de 7 días.' }
            } else if (diffDays < 0) {
                return { error: 'La fecha del comprobante no puede ser futura.' }
            }
        } else {
            return { error: 'La fecha es obligatoria.' }
        }

        // 1. Fetch Original Invoice to verify ownership
        const { data: invoice, error: fetchError } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', invoiceId)
            .eq('user_id', user.id) // Ensure ownership
            .single()

        if (fetchError || !invoice) return { error: 'Comprobante no encontrado o no autorizado.' }
        if (invoice.split_group_id) return { error: 'Este comprobante ya fue dividido.' }

        // 2. Preparation
        const totalAmount = parseFloat(formData.total_amount) || invoice.total_amount
        const count = targetUserIds.length + 1 // +1 for self
        const splitAmount = Number((totalAmount / count).toFixed(2)) // Round to 2 decimals
        const splitGroupId = crypto.randomUUID()

        // Use separate Admin Client for Cross-User Inserts/Updates logic if needed, 
        // though Parent Update can be done with standard client usually.
        // We use Admin Client for consistency and to insert children for other users.
        const { createAdminClient } = await import('@/utils/supabase/admin')
        const adminClient = createAdminClient()

        // 3. Process Parent (Self)
        // Check Limit for Parent
        const parentCheck = await checkLimitAndGetStatus(
            adminClient,
            user.id,
            splitAmount,
            formData.date,
            formData.payment_method
        )

        // ... (existing helper function above)

        // Prepare Parent Update Data
        const parentUpdateData = {
            ...formData, // Update with all form data (category, etc)
            total_amount: splitAmount,
            original_amount: totalAmount,
            split_group_id: splitGroupId,
            is_parent: true,
            status: parentCheck.status,
            user_id: user.id, // Ensure ID remains same
            loaded_by: user.id // Set loaded_by to creator
        }

        console.log(`Updating Parent ${invoiceId} Amount to: ${splitAmount}`)

        // Update Parent
        const { error: updateError } = await adminClient
            .from('invoices')
            .update(parentUpdateData)
            .eq('id', invoiceId)

        if (updateError) throw new Error('Error al actualizar comprobante original: ' + updateError.message)

        // Notification for Parent if needed (Admin Alert / Manager Notification)
        const parentExpenseData = {
            id: invoiceId,
            date: formData.date,
            vendor_name: formData.vendor_name,
            total_amount: splitAmount,
            currency: formData.currency,
            user_name: parentCheck.profile?.full_name || 'Usuario',
            user_id: user.id,
            area: parentCheck.profile?.area
        }

        if (parentCheck.status === 'pending_approval') {
            await sendAdminAlert(parentExpenseData)
        } else if (parentCheck.status === 'approved') {
            await sendManagerNotification(parentExpenseData)
        }

        // 4. Create Children (Clones)
        const childrenPromises = targetUserIds.map(async (targetId) => {
            // Check Limit for Child
            const childCheck = await checkLimitAndGetStatus(
                adminClient,
                targetId,
                splitAmount,
                formData.date,
                formData.payment_method
            )

            // Clone data
            const childData = {
                ...invoice, // Start with original base
                ...formData, // Apply form updates
                id: undefined, // New ID
                created_at: undefined,
                user_id: targetId,
                total_amount: splitAmount,
                original_amount: null,
                split_group_id: splitGroupId,
                is_parent: false,
                status: childCheck.status,
                branch: childCheck.profile?.branch || invoice.branch,
                loaded_by: user.id // Set loaded_by to creator
            }

            // Insert
            const { data: insertedChild, error: insertError } = await adminClient
                .from('invoices')
                .insert(childData)
                .select()
                .single()

            if (insertError) {
                console.error(`Error inserting child invoice for ${targetId}:`, insertError)
                return
            }

            // Notification for Child
            const childExpenseData = {
                id: insertedChild.id,
                date: formData.date,
                vendor_name: formData.vendor_name,
                total_amount: splitAmount,
                currency: formData.currency,
                user_name: childCheck.profile?.full_name || 'Colega',
                user_id: targetId,
                area: childCheck.profile?.area
            }

            if (childCheck.status === 'pending_approval') {
                await sendAdminAlert(childExpenseData)
            } else if (childCheck.status === 'approved') {
                await sendManagerNotification(childExpenseData)
            }
        })

        await Promise.all(childrenPromises)

        revalidatePath('/expenses')
        return { success: true }

    } catch (e: any) {
        console.error("Split Expense Error:", e)
        return { error: e.message }
    }
}

// --- Business Central Integration ---

import { BC_BRANCH_MAP, BC_AREA_TO_PURCHASER, BC_CONSUMIDOR_FINAL_VENDOR } from '@/app/constants'
import { generateBCRowsForInvoice, InvoiceData } from '@/utils/excel'

export async function searchVendorByCuit(cuit: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    try {
        const bcProxyUrl = 'https://yagyzvvupixmjovyzveu.supabase.co/functions/v1/bc-proxy'
        const res = await fetch(bcProxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'SEARCH_VENDORS', data: { cuit } })
        })
        const result = await res.json()
        if (!result.success) return { error: result.error || `No se pudo buscar el CUIT ${cuit} en Business Central. Verifique la conexión con BC.` }
        return { success: true, found: result.found, vendors: result.vendors }
    } catch (e: any) {
        console.error('[searchVendorByCuit] Error:', e)
        return { error: 'Error de conexión con BC: ' + e.message }
    }
}

export async function searchVendorByNumber(vendorNumber: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    try {
        const bcProxyUrl = 'https://yagyzvvupixmjovyzveu.supabase.co/functions/v1/bc-proxy'
        const res = await fetch(bcProxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'SEARCH_VENDORS', data: { vendorNumber } })
        })
        const result = await res.json()
        if (!result.success) return { error: result.error || `No se pudo buscar el proveedor ${vendorNumber} en Business Central.` }
        return { success: true, found: result.found, vendors: result.vendors }
    } catch (e: any) {
        console.error('[searchVendorByNumber] Error:', e)
        return { error: 'Error de conexión con BC: ' + e.message }
    }
}

export async function fetchBCUsers() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized', users: [] }

    try {
        const bcProxyUrl = 'https://yagyzvvupixmjovyzveu.supabase.co/functions/v1/bc-proxy'
        const res = await fetch(bcProxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'FETCH_BC_USERS' })
        })
        const result = await res.json()
        if (!result.success) return { error: result.error || 'Error obteniendo usuarios', users: [] }
        return { success: true, users: result.users || [] }
    } catch (e: any) {
        console.error('[fetchBCUsers] Error:', e)
        return { error: 'Error de conexión con BC: ' + e.message, users: [] }
    }
}

export async function createPurchaseInvoiceInBC(invoiceId: string, customLines?: { account: string, description: string, unitCost: number, sucursal?: string, area?: string, vatGroup?: string, areaDim?: string, taxAreaCode?: string }[], overrides?: { purchaser?: string, vendorNumber?: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: currentProfile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
    if (!currentProfile || !['admin', 'manager', 'branch_manager'].includes(currentProfile.role)) {
        return { error: 'No tienes permisos para cargar facturas a BC' }
    }

    const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select('*, profiles!invoices_user_id_fkey(full_name, area, branch, bc_user_id, bc_purchaser_code)')
        .eq('id', invoiceId)
        .single()

    if (fetchError || !invoice) return { error: 'Comprobante no encontrado' }
    if (invoice.loaded_to_bc) return { error: 'Este comprobante ya fue cargado a BC' }

    const ownerProfile = Array.isArray(invoice.profiles) ? invoice.profiles[0] : invoice.profiles
    const purchaserCode = ownerProfile?.bc_purchaser_code || BC_AREA_TO_PURCHASER[ownerProfile?.area || ''] || ''

    const bcProxyUrl = 'https://yagyzvvupixmjovyzveu.supabase.co/functions/v1/bc-proxy'

    // Determine if CONSUMIDOR FINAL → use Grosso Tractores vendor
    const isConsumidorFinal = (invoice.invoice_type || '').toUpperCase().includes('CONSUMIDOR FINAL')

    let vendorNumber: string

    // If vendor number was already found by the modal, skip redundant search
    if (overrides?.vendorNumber) {
        vendorNumber = overrides.vendorNumber
    } else if (isConsumidorFinal) {
        // CONSUMIDOR FINAL: always use Grosso Tractores SA (P00753)
        const vendorResult = await fetch(bcProxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'SEARCH_VENDORS', data: { vendorNumber: BC_CONSUMIDOR_FINAL_VENDOR.number } })
        }).then(r => r.json())

        if (!vendorResult.success || !vendorResult.found || !vendorResult.vendors?.length) {
            return { error: 'VENDOR_NOT_FOUND', message: `No se encontró el proveedor ${BC_CONSUMIDOR_FINAL_VENDOR.displayName} en BC.` }
        }
        vendorNumber = vendorResult.vendors[0].number
    } else {
        // Standard flow: search by CUIT
        const vendorCuit = invoice.vendor_cuit
        if (!vendorCuit) return { error: 'El comprobante no tiene CUIT de proveedor' }

        const vendorResult = await fetch(bcProxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'SEARCH_VENDORS', data: { cuit: vendorCuit } })
        }).then(r => r.json())

        if (!vendorResult.success || !vendorResult.found || !vendorResult.vendors?.length) {
            return { error: 'VENDOR_NOT_FOUND', message: `No se encontró un proveedor con CUIT ${vendorCuit} en BC.` }
        }
        vendorNumber = vendorResult.vendors[0].number
    }

    const parsed = invoice.parsed_data || {}
    const invoiceData: InvoiceData = {
        vendorName: parsed.vendorName || invoice.vendor_name,
        vendorCuit: parsed.vendorCuit || invoice.vendor_cuit,
        invoiceNumber: parsed.invoiceNumber || invoice.invoice_number,
        invoiceType: invoice.invoice_type || parsed.invoiceType || 'FC',
        date: parsed.date || invoice.date,
        // SHARED INVOICES: use original_amount (full ticket total) instead of split amount
        totalAmount: invoice.original_amount || parsed.totalAmount || invoice.total_amount || 0,
        netAmount: parsed.netAmount,
        perceptionsAmount: parsed.perceptionsAmount,
        currency: parsed.currency || invoice.currency || 'ARS',
        exchangeRate: parsed.exchangeRate || 1,
        taxes: parsed.taxes || [],
        items: parsed.items || [],
        userBranch: invoice.branch || ownerProfile?.branch,
        userArea: ownerProfile?.area,
        expenseType: invoice.expense_category,
    }
    if ((!invoiceData.taxes || invoiceData.taxes.length === 0) && parsed.tax_amount) {
        invoiceData.taxes = [{ name: "IVA Estimado", amount: parsed.tax_amount }]
    }

    const { rows: bcRows } = generateBCRowsForInvoice(invoiceData as any)

    const branchCode = BC_BRANCH_MAP[invoiceData.userBranch || ''] || 'GRAL'
    const effectivePurchaser = overrides?.purchaser || purchaserCode

    // Format vendorInvoiceNumber with letter prefix for AFIP document type auto-detection
    // FACTURA A → "A0011-00020232", FACTURA C → "C0011-00020232", etc.
    // BC parses the letter prefix to set the Tipo Documento AFIP (FC-A, FC-B, etc.)
    let vendorInvoiceNo = invoice.invoice_number || ''
    const invoiceTypeUpper = (invoice.invoice_type || '').toUpperCase()
    if (vendorInvoiceNo) {
        let letterPrefix = ''
        if (isConsumidorFinal) {
            // CONSUMIDOR FINAL → letra "N" → BC auto-detecta FC-NI
            letterPrefix = 'N'
        } else if (invoiceTypeUpper.includes('FACTURA A') || invoiceTypeUpper === 'FA') letterPrefix = 'A'
        else if (invoiceTypeUpper.includes('FACTURA B') || invoiceTypeUpper === 'FB') letterPrefix = 'B'
        else if (invoiceTypeUpper.includes('FACTURA C') || invoiceTypeUpper === 'FC') letterPrefix = 'C'
        else if (invoiceTypeUpper.includes('FACTURA M') || invoiceTypeUpper === 'FM') letterPrefix = 'M'
        
        if (letterPrefix && !vendorInvoiceNo.startsWith(letterPrefix)) {
            vendorInvoiceNo = letterPrefix + vendorInvoiceNo
        }
    }

    const header: Record<string, any> = {
        vendorNumber: vendorNumber,
        invoiceDate: invoice.date,
        vendorInvoiceNumber: vendorInvoiceNo,
        sucursal: branchCode, // SUC dimension for header
    }
    if (effectivePurchaser) header.purchaser = effectivePurchaser

    let lines: Record<string, any>[]
    if (customLines && customLines.length > 0) {
        lines = customLines.map(cl => ({
            lineType: 'Account',
            lineObjectNumber: cl.account,
            description: (cl.description || '').substring(0, 100),
            quantity: 1,
            unitCost: cl.unitCost,
            // Extra fields for OData PATCH (bc-proxy will strip before API v2.0 POST)
            vatGroup: cl.vatGroup || '',
            sucursal: cl.sucursal || '',
            areaDim: cl.areaDim || '',
            taxAreaCode: cl.taxAreaCode || '',
        }))
    } else {
        lines = bcRows.map(row => ({
            lineType: 'Account',
            lineObjectNumber: row.n,
            description: (row.descripcion || '').substring(0, 100),
            quantity: row.cantidad,
            unitCost: parseFloat(String(row.coste_unit).replace(/\./g, '').replace(',', '.')) || 0,
            vatGroup: row.grupo_iva || '',
            sucursal: row.sucursal || '',
            areaDim: row.area || '',
            taxAreaCode: row.cod_area_impuesto || '',
        }))
    }

    try {
        const createRes = await fetch(bcProxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'CREATE_PURCHASE_INVOICE',
                data: { header, lines }
            })
        })

        const createResult = await createRes.json()
        if (!createResult.success) {
            return { error: 'Error creando factura en BC: ' + (createResult.error || 'Error desconocido') }
        }

        if (createResult.odataWarnings && createResult.odataWarnings.length > 0) {
            console.error('Business Central OData Warnings:', JSON.stringify(createResult.odataWarnings, null, 2))
            try {
                const fs = await import('fs')
                fs.writeFileSync('bc_errors.json', JSON.stringify(createResult.odataWarnings, null, 2))
            } catch (e) {}
        }

        // CONSUMIDOR FINAL: PATCH header to set fiscal type = 90-NO LIBRO IVA
        // This makes BC auto-assign AFIP doc type FC-NI (Facturas NI)
        if (isConsumidorFinal && createResult.invoiceNumber) {
            try {
                const patchRes = await fetch(bcProxyUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'PATCH_INVOICE_HEADER',
                        data: {
                            invoiceNo: createResult.invoiceNumber,
                            fields: { VOXI_Person_document_type: '90-NO LIBRO IVA' }
                        }
                    })
                })
                const patchResult = await patchRes.json()
                if (!patchResult.success) {
                    console.error('PATCH_INVOICE_HEADER warning:', patchResult.error)
                }
            } catch (e) {
                console.error('PATCH_INVOICE_HEADER non-fatal error:', e)
            }
        }

        const { createAdminClient } = await import('@/utils/supabase/admin')
        const adminClient = createAdminClient()

        const updateData = {
            status: 'submitted_to_bc',
            loaded_to_bc: true,
            bc_invoice_number: createResult.invoiceNumber || '',
        }

        await adminClient.from('invoices').update(updateData).eq('id', invoiceId)

        if (invoice.split_group_id) {
            await adminClient.from('invoices').update(updateData).eq('split_group_id', invoice.split_group_id)
        }

        // NOTE: revalidatePath is NOT called here on purpose.
        // The modal's handleClose triggers router.refresh() so the success screen
        // stays visible until the user clicks "Cerrar" or "Abrir en BC".

        return {
            success: true,
            bcInvoiceNumber: createResult.invoiceNumber || '',
            bcInvoiceId: createResult.invoiceId || ''
        }

    } catch (e: any) {
        console.error('[createPurchaseInvoiceInBC] Error:', e)
        return { error: 'Error de conexión con BC: ' + e.message }
    }
}
