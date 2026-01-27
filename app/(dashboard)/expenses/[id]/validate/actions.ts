'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function updateInvoice(formData: FormData) {
    const supabase = await createClient()
    const id = formData.get('id') as string

    const data = {
        vendor_name: formData.get('vendor_name'),
        vendor_cuit: formData.get('vendor_cuit'),
        date: formData.get('date'),
        invoice_type: formData.get('invoice_type'),
        total_amount: parseFloat(formData.get('total_amount') as string),
        currency: formData.get('currency'),
        payment_method: formData.get('payment_method'),
        comments: formData.get('comments'),
        // status: 'pending_approval' // Confirming moves it to pending review - This will be determined by business logic
    }

    // Business Logic: Check Monthly Budget
    // 1. Get User Profile and Limit
    const { data: user } = await supabase.auth.getUser()
    const { data: profile } = await supabase
        .from('profiles')
        .select('monthly_limit')
        .eq('id', user.user?.id)
        .single()

    const monthlyLimit = profile?.monthly_limit || 0

    // 2. Calculate current month total (excluding this invoice if it was already summed, but it's usually new)
    // We sum all 'approved' expenses for this month. 
    // Should we count 'pending' too? Usually pending counts towards reserved budget.
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

    const { data: expenses } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('user_id', user.user?.id)
        .gte('date', firstDay)
        .lte('date', lastDay)
        .neq('id', id) // Exclude current one being updated
        .neq('status', 'rejected') // Don't count rejected

    const currentTotal = expenses?.reduce((sum, item) => sum + (item.total_amount || 0), 0) || 0
    const newAmount = data.total_amount

    let newStatus = 'approved' // Default to approved if under limit? 
    // User said: "el usuario tiene que corroborar... seleccionar forma de pago... aprobados y pendientes de aprobacion"
    // Usually auto-approve if under limit? Or always pending?
    // "Usuario normal... dashboard... aprobados y pendientes de aprobacion" implies someone else approves OR system auto-approves.
    // "si algun usuario va a superar el monto... tiene que ese comprobante solicitar autorizacion" -> Implies others might NOT need authorization if under limit?
    // Let's assume: Under limit -> 'approved' (Auto-approval), Over limit -> 'pending_approval' (or 'exceeded_budget' specific status).

    if (currentTotal + newAmount > monthlyLimit) {
        newStatus = 'exceeded_budget'
    } else {
        newStatus = 'approved' // Auto-approve if under budget
    }

    const { error } = await supabase
        .from('invoices')
        .update({ ...data, status: newStatus })
        .eq('id', id)

    if (error) {
        console.error('Error updating invoice:', error)
        throw new Error(`Failed to update invoice: ${error.message} (${error.code})`)
    }

    revalidatePath('/expenses')
    revalidatePath('/')
    redirect('/expenses')
}
