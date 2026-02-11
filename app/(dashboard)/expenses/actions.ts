'use server'

import { createClient } from '@/utils/supabase/server'
import { getGeminiModel, generateWithFallback } from '@/utils/gemini/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sendAdminAlert, sendManagerNotification } from '@/app/utils/mail'

export async function processReceipt(imageUrl: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { error: 'Unauthorized' }

        // 1. Fetch image data
        const imageResp = await fetch(imageUrl)
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

    // Check status first
    // Check status first
    const { data: invoice } = await supabase.from('invoices').select('status, file_url').eq('id', id).single()

    // Check user role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

    if (invoice?.status === 'submitted_to_bc' && profile?.role !== 'admin') {
        return { error: 'No se puede eliminar un comprobante que ya fue cargado en Business Central (Solo Administradores).' }
    }

    const { error } = await supabase.from('invoices').delete().eq('id', id)

    if (error) {
        return { error: error.message }
    }

    // Delete from Storage
    if (invoice?.file_url) {
        try {
            // Extract file path from URL. Assuming format contains .../receipts/path...
            // Or simpler: if it's a signed URL or public URL, the path is usually the last segment(s).
            // But let's look for 'receipts/' segment.
            const parts = invoice.file_url.split('/receipts/')
            if (parts.length > 1) {
                const filePath = parts[1] // content after receipts/
                // Handle URL decoding if needed, usually browser handles it but keep in mind space -> %20
                const decodedPath = decodeURIComponent(filePath)

                const { error: storageError } = await supabase.storage
                    .from('receipts')
                    .remove([decodedPath])

                if (storageError) {
                    console.error('Storage Deletion Error:', storageError)
                }
            }
        } catch (e) {
            console.error('Error attempting to delete file from storage:', e)
        }
    }

    // Setup revalidation
    revalidatePath('/expenses')
    return { success: true }
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



    // Bypass RLS for Admins and Managers using Service Role
    let updateQuery: any = { status: 'submitted_to_bc' }

    // Check if this invoice is part of a split group (Parent)
    // If so, we must update ALL siblings in the group
    const { data: currentInvoice } = await supabase.from('invoices').select('split_group_id, is_parent').eq('id', id).single()

    if (role === 'admin' || role === 'manager' || role === 'branch_manager') {
        console.log("[markInvoiceAsSubmitted] Using Admin Client")
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
        .select('total_amount, payment_method')
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

    const currentTotal = relevantExpenses.reduce((sum: any, item: any) => sum + (item.total_amount || 0), 0)
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

            if (isNaN(diffDays) || diffDays > 7) {
                return { error: 'La fecha del comprobante excede el límite de 7 días.' }
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

        // Prepare Parent Update Data
        const parentUpdateData = {
            ...formData, // Update with all form data (category, etc)
            total_amount: splitAmount,
            original_amount: totalAmount,
            split_group_id: splitGroupId,
            is_parent: true,
            status: parentCheck.status,
            user_id: user.id // Ensure ID remains same
        }

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
