'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sendAdminAlert, sendManagerNotification } from '@/app/utils/mail'

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
        expense_category: formData.get('expense_category'),
        comments: formData.get('comments'),
    }

    // Business Logic: Check Monthly Budget
    const { data: user } = await supabase.auth.getUser()
    const { data: profile } = await supabase
        .from('profiles')
        .select('monthly_limit, cash_limit, full_name, branch, area') // Fetch Limits based on type
        .eq('id', user.user?.id)
        .single()

    const cardLimit = profile?.monthly_limit || 0
    const cashLimit = profile?.cash_limit || 0

    // Get full name for email context, default to User if missing
    const userName = profile?.full_name || 'Usuario'
    const userBranch = profile?.branch || null

    const invoiceDate = new Date(data.date as string)
    // Adjust to local timezone logic if needed, but ISO string split is safer for bounds
    const year = invoiceDate.getFullYear()
    const month = invoiceDate.getMonth()

    // Calculate start and end of that specific month
    const firstDay = new Date(year, month, 1).toISOString()
    const lastDay = new Date(year, month + 1, 0).toISOString()

    const { data: expenses } = await supabase
        .from('invoices')
        .select('total_amount, payment_method')
        .eq('user_id', user.user?.id)
        .gte('date', firstDay)
        .lte('date', lastDay)
        .neq('id', id)
        .neq('status', 'rejected')
        .neq('status', 'draft')

    // Filter consumption by Type
    const currentPaymentMethod = data.payment_method as string
    const isCashOrTransfer = currentPaymentMethod === 'Cash' || currentPaymentMethod === 'Transfer'

    // Calculate relevant consumption based on the CURRENT invoice's type
    const relevantExpenses = expenses?.filter(inv => {
        const invMethod = inv.payment_method
        if (isCashOrTransfer) {
            return invMethod === 'Cash' || invMethod === 'Transfer'
        } else {
            return invMethod === 'Card'
        }
    }) || []

    const currentTotal = relevantExpenses.reduce((sum, item) => sum + (item.total_amount || 0), 0)
    const newAmount = data.total_amount
    const activeLimit = isCashOrTransfer ? cashLimit : cardLimit

    let newStatus = 'approved'

    // Determine status logic based on user rules
    if (currentTotal + newAmount > activeLimit) {
        newStatus = 'pending_approval' // Exceeds budget -> Needs Admin Approval
    } else {
        newStatus = 'approved' // Within budget -> Auto Approved
    }

    const { error } = await supabase
        .from('invoices')
        .update({ ...data, status: newStatus, branch: userBranch })
        .eq('id', id)

    if (error) {
        console.error('Error updating invoice:', error)
        throw new Error(`Failed to update invoice: ${error.message} (${error.code})`)
    }

    // --- EMAIL NOTIFICATIONS ---
    // Prepare data helper
    const expenseData = {
        id,
        date: data.date as string,
        vendor_name: data.vendor_name as string,
        total_amount: data.total_amount as number,
        currency: data.currency as string,
        user_name: userName,
        user_id: user.user?.id!,
        area: profile?.area
    }

    if (newStatus === 'pending_approval') {
        // Exceeds Limit -> Alert Admin
        await sendAdminAlert(expenseData)
    } else if (newStatus === 'approved') {
        // Auto Approved -> Notify Manager
        await sendManagerNotification(expenseData)
    }
    // ---------------------------

    revalidatePath('/expenses')
    revalidatePath('/')
    redirect('/expenses')
}
