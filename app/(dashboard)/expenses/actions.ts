'use server'

import { createClient } from '@/utils/supabase/server'
import { getGeminiModel, generateWithFallback } from '@/utils/gemini/client'
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
        Analiza esta factura. Extrae cabecera, CUIT del proveedor, moneda, y un desglose detallado de impuestos.
        IMPORTANTE: 
        1. El proveedor NO es "GROSSO TRACTORES SA". Ese es el cliente. Busca el emisor (logotipo arriba a la izquierda).
        2. Debes separar el IVA (21%, 10.5%) de otros impuestos (Percepciones IIBB, Impuestos Internos, Percepción IVA).
        Si la factura tiene ítems, extrae el detalle. Si es manuscrita o borrosa, haz tu mejor esfuerzo.

        CRITICAL OUTPUT FORMAT:
        You MUST return a JSON object strictly adhering to this schema:
        {
          "vendorName": string, 
          "vendorCuit": string (format XX-XXXXXXXX-X),
          "invoiceNumber": string,
          "invoiceType": string (One of: "FA", "FC", "CF", "ND", "NC"),
          "date": string (YYYY-MM-DD),
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
        
        Example of taxes array:
        [
            { "name": "IVA 21%", "amount": 210.00 },
            { "name": "Percepción IIBB Santa Fe", "amount": 45.50 }
        ]
        `

        let text = "";
        let aiFailed = false;

        try {
            // New Multi-Model Logic
            const inlineData = { data: base64Image, mimeType: mimeType };
            text = await generateWithFallback(prompt, inlineData);
        } catch (error) {
            console.error("⚠️ All AI Models failed. Proceeding to Manual Mode.", error);
            aiFailed = true;
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
            }
        }

        // 2b. Fetch User Profile for Branch
        const { data: profile } = await supabase
            .from('profiles')
            .select('branch')
            .eq('id', user.id)
            .single()

        const userBranch = profile?.branch || null

        // Map new schema to database fields
        // Note: DB expects vendor_name, vendor_cuit (snake_case)
        // parsedData is camelCase. We map it.

        const mappedData = {
            vendor_name: parsedData.vendorName || (aiFailed ? '' : 'Desconocido'),
            vendor_cuit: parsedData.vendorCuit,
            invoice_number: parsedData.invoiceNumber,
            invoice_type: parsedData.invoiceType,
            date: parsedData.date || new Date().toISOString().split('T')[0],
            total_amount: parsedData.totalAmount || 0,
            currency: parsedData.currency || 'ARS',
            // Store the FULL rich objects in parsed_data jsonb column
            parsed_data: parsedData,
            branch: userBranch,
            user_id: user.id,
            file_url: imageUrl,
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
            return { success: true, invoiceId: invoice.id, warning: 'AI_FAILED' };
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
    if (role === 'admin' || role === 'manager' || role === 'branch_manager') {
        console.log("[markInvoiceAsSubmitted] Using Admin Client")
        const { createAdminClient } = await import('@/utils/supabase/admin')
        const adminClient = createAdminClient()

        const { error, data } = await adminClient
            .from('invoices')
            .update({ status: 'submitted_to_bc' })
            .eq('id', id)
            .select()

        if (error) {
            console.error("[markInvoiceAsSubmitted] Admin Client Update Error:", error)
            return { error: 'Error al actualizar estado (Admin/Manager): ' + error.message }
        }
        console.log("[markInvoiceAsSubmitted] Update Success:", data)
    } else {
        console.log("[markInvoiceAsSubmitted] Using Standard Client")
        // Fallback for standard users (though they shouldn't see this button usually)
        const { error } = await supabase
            .from('invoices')
            .update({ status: 'submitted_to_bc' })
            .eq('id', id)

        if (error) {
            console.error("[markInvoiceAsSubmitted] Standard Update Error:", error)
            return { error: 'No tienes permisos para realizar esta acción o ocurrió un error.' }
        }
    }

    revalidatePath('/expenses')
    return { success: true }
}
