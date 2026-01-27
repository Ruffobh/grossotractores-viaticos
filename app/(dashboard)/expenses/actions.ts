'use server'

import { createClient } from '@/utils/supabase/server'
import { geminiModel } from '@/utils/gemini/client'
import { redirect } from 'next/navigation'

export async function processReceipt(imageUrl: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { error: 'Unauthorized' }

        // 1. Fetch image data (Gemini needs base64 or file part)
        // Since we have a public URL, we can fetch it.
        const imageResp = await fetch(imageUrl)
        const imageBuffer = await imageResp.arrayBuffer()
        const base64Image = Buffer.from(imageBuffer).toString('base64')

        // 2. Prompt Gemini
        // Detect Mime Type
        const mimeType = imageResp.headers.get('content-type') || 'image/jpeg'

        const prompt = `
      Extract the following data from this receipt image in JSON format.
      
      CRITICAL RULES:
      1. **Vendor Name**: The vendor is the ISSUER of the invoice, usually found at the VERY TOP of the image. 
         - WARNING: "GROSSO TRACTORES SA" and "Grosso Tractores" are the RECIPIENTS (Client). NEVER set them as the vendor_name.
         - Look for logos or bold text at the top (e.g., "ESRA SRI", "SHELL", "YPF").
      
      2. **Vendor CUIT**: 
         - WARNING: NEVER use "30-71024933-0" or "30710249330". This is the client's (Grosso Tractores) CUIT.
         - If the only CUIT found is 30-71024933-0, search again for another CUIT belonging to the emitter.

      3. **Invoice Number**: Look for "Nro. Comprobante", "Factura Nº", "Ticket Nº".
         - Format is usually 5 digits - 8 digits (e.g., 00011-00074636).
         - Sometimes labeled as "P.V." (Punto Venta) and "Nro." separately. Join them with a hyphen.
         - Do NOT use internal codes like "Cod. 081" or random hex strings.
      
      4. **Money Amounts**:
         - **net_amount**: The subtotal BEFORE taxes (Neto Gravado).
         - **tax_amount**: The total amount of VAT (IVA).
         - **perceptions_amount**: Sum of other taxes (IIBB, Percepciones, Impuesto Interno).
         - **total_amount**: The final total to pay.
         
      5. **Data Fields to Extract**:
      - vendor_name (string)
      - vendor_cuit (string, format XX-XXXXXXXX-X)
      - invoice_type (string, e.g., "A", "B", "C", "Ticket Factura A", "Ticket Factura B")
      - invoice_number (string, format 00000-00000000)
      - date (string, YYYY-MM-DD)
      - total_amount (number)
      - net_amount (number)
      - tax_amount (number)
      - iva_rate (string, e.g., "21%", "10.5%")
      - perceptions_amount (number)
      - currency (string, "ARS" or "USD")
      - payment_method (string, guess based on context like "Efectivo", "Tarjeta", "Cta Cte")
      - items (array of objects with description and amount)

      Only return the JSON. Do not include markdown formatting.
    `

        const result = await geminiModel.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: mimeType,
                },
            },
        ])

        const response = await result.response
        let text = response.text()

        console.log("Gemini Raw Response:", text)

        // Clean markdown code blocks if present
        text = text.replace(/```json/g, '').replace(/```/g, '').trim()

        let parsedData: any = {}
        try {
            parsedData = JSON.parse(text)
        } catch (e) {
            console.error("JSON Parse Error:", e)
            // Continue with empty data instead of failing completely, so user can edit manually
        }

        // 3. Create generic Invoice record
        const { data: invoice, error } = await supabase
            .from('invoices')
            .insert({
                user_id: user.id,
                file_url: imageUrl,
                status: 'pending_approval',
                vendor_name: parsedData.vendor_name || 'Desconocido',
                vendor_cuit: parsedData.vendor_cuit,
                invoice_type: parsedData.invoice_type,
                date: parsedData.date || new Date().toISOString().split('T')[0],
                total_amount: parsedData.total_amount || 0,
                currency: parsedData.currency || 'ARS',
                parsed_data: parsedData,
                branch: null
            })
            .select()
            .single()

        if (error) {
            console.error('Supabase Insert Error:', error)
            return { error: 'Failed to save invoice (DB Error): ' + error.message }
        }

        console.log("Invoice created:", invoice.id)

        // Redirect to validation page
        redirect(`/expenses/${invoice.id}/validate`)

    } catch (err: any) {
        if (err.message === 'NEXT_REDIRECT' || err.digest?.startsWith('NEXT_REDIRECT')) {
            throw err
        }
        console.error('AI Processing Error:', err)
        return { error: 'Failed to process receipt with AI: ' + (err.message || err) }
    }
}

export async function deleteExpense(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Check status first
    const { data: invoice } = await supabase.from('invoices').select('status').eq('id', id).single()
    if (invoice?.status === 'submitted_to_bc') {
        return { error: 'No se puede eliminar un comprobante que ya fue cargado en Business Central.' }
    }

    const { error } = await supabase.from('invoices').delete().eq('id', id)

    if (error) {
        return { error: error.message }
    }

    // Setup revalidation
    // revalidatePath('/expenses') // We will handle revalidation in the UI or return success
    return { success: true }
}

export async function markInvoiceAsSubmitted(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('invoices')
        .update({ status: 'submitted_to_bc' })
        .eq('id', id)

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}
