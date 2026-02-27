'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sendRejectionEmail } from '@/app/utils/mail'

export async function approveExpense(id: string, comment: string | null = null) {
    const supabase = await createClient()

    // Verify admin or permission
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('role, area, permissions').eq('id', user?.id).single()

    // Fetch invoice to check area match
    const { data: invoice } = await supabase.from('invoices').select('user_id').eq('id', id).single()
    const { data: invoiceUser } = await supabase.from('profiles').select('area').eq('id', invoice?.user_id).single()

    const isAdmin = profile?.role === 'admin'
    const hasPermission = (profile?.permissions as any)?.approve_area_expenses
    const isSameArea = profile?.area === invoiceUser?.area

    if (!isAdmin && !(hasPermission && isSameArea)) {
        throw new Error('Unauthorized')
    }

    // Use adminClient to bypass RLS since Area Approvers might not own the row
    const { createAdminClient } = await import('@/utils/supabase/admin')
    const adminClient = createAdminClient()

    const { error } = await adminClient.from('invoices').update({ status: 'approved', admin_comments: comment, approved_by: user?.id }).eq('id', id)

    if (error) throw error

    revalidatePath('/expenses')
    revalidatePath(`/expenses/${id}`)
    redirect('/expenses')
}

export async function rejectExpense(id: string, comment: string | null = null, isPartial: boolean = false, partialAmount: number = 0) {
    const supabase = await createClient()

    // Verify admin or permission
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('role, area, permissions').eq('id', user?.id).single()

    // Fetch invoice to check area match
    const { data: invoice } = await supabase.from('invoices').select('user_id').eq('id', id).single()
    const { data: invoiceUser } = await supabase.from('profiles').select('area').eq('id', invoice?.user_id).single()

    const isAdmin = profile?.role === 'admin'
    const hasPermission = (profile?.permissions as any)?.approve_area_expenses
    const isSameArea = profile?.area === invoiceUser?.area

    if (!isAdmin && !(hasPermission && isSameArea)) {
        throw new Error('Unauthorized')
    }

    // Use adminClient to bypass RLS since Area Approvers might not own the row
    const { createAdminClient } = await import('@/utils/supabase/admin')
    const adminClient = createAdminClient()

    // We need more details for the email, so let's fetch the full invoice + user profile
    const { data: fullInvoice, error: invoiceError } = await adminClient
        .from('invoices')
        .select('*, profiles!invoices_user_id_fkey(full_name, email, area)')
        .eq('id', id)
        .single()

    if (invoiceError || !fullInvoice) throw new Error('Comprobante no encontrado')

    const statusName = isPartial ? 'partially_rejected' : 'rejected'
    let updateQuery = adminClient.from('invoices').update({
        status: statusName,
        admin_comments: comment,
        approved_by: user?.id,
        rejected_amount: isPartial ? partialAmount : 0
    })

    if (fullInvoice.split_group_id) {
        // If one is partially rejected, we assume the whole group is affected the same way for now
        updateQuery = updateQuery.eq('split_group_id', fullInvoice.split_group_id)
    } else {
        updateQuery = updateQuery.eq('id', id)
    }

    const { error } = await updateQuery

    if (error) throw error

    // Send Rejection Email
    if (fullInvoice.profiles?.email) {
        const expenseData = {
            id: fullInvoice.id,
            date: fullInvoice.date,
            vendor_name: fullInvoice.vendor_name,
            total_amount: fullInvoice.total_amount,
            currency: fullInvoice.currency,
            user_name: fullInvoice.profiles.full_name,
            user_id: fullInvoice.user_id,
            area: fullInvoice.profiles.area
        }
        let emailComment = comment || 'Sin comentarios'
        if (isPartial) {
            emailComment = `RECHAZO PARCIAL ($${partialAmount}): ` + emailComment
        }
        await sendRejectionEmail(expenseData, fullInvoice.profiles.email, emailComment)
    }

    revalidatePath('/expenses')
    revalidatePath(`/expenses/${id}`)
    redirect('/expenses')
}

export async function managerRejectApprovedExpense(id: string, comment: string, isPartial: boolean = false, partialAmount: number = 0) {
    const supabase = await createClient()

    // Verify permissions: admin, manager, or branch_manager, or area approver
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('role, permissions, area').eq('id', user?.id).single()

    const canRejectByRole = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'branch_manager'
    const hasApproveArea = (profile?.permissions as any)?.approve_area_expenses === true

    // Fetch invoice to ensure it is approved, and get details for email
    // Bypass RLS if needed using adminClient (managers might not have update access to all rows based on current RLS settings)
    const { createAdminClient } = await import('@/utils/supabase/admin')
    const adminClient = createAdminClient()

    const { data: invoice, error: invoiceError } = await adminClient
        .from('invoices')
        .select('*, profiles!invoices_user_id_fkey(full_name, email, area)')
        .eq('id', id)
        .single()

    if (invoiceError || !invoice) {
        throw new Error('Comprobante no encontrado')
    }

    const isSameArea = profile?.area === invoice.profiles?.area
    const canReject = canRejectByRole || (hasApproveArea && isSameArea)

    if (!canReject) {
        throw new Error('No tienes permisos para rechazar este comprobante en esta área.')
    }

    if (invoice.status !== 'approved' && invoice.status !== 'submitted_to_bc') {
        throw new Error('El comprobante debe estar aprobado para ser rechazado por este medio.')
    }

    // Update status using admin client
    const statusName = isPartial ? 'partially_rejected' : 'rejected'
    let updateQuery = adminClient
        .from('invoices')
        .update({
            status: statusName,
            admin_comments: comment,
            approved_by: user?.id,
            rejected_amount: isPartial ? partialAmount : 0
        })

    if (invoice.split_group_id) {
        updateQuery = updateQuery.eq('split_group_id', invoice.split_group_id)
    } else {
        updateQuery = updateQuery.eq('id', id)
    }

    const { error: updateError } = await updateQuery

    if (updateError) {
        console.error('Error rejecting invoice:', updateError)
        throw new Error('Error al actualizar el estado del comprobante')
    }

    // Send Rejection Email
    if (invoice.profiles?.email) {
        const expenseData = {
            id: invoice.id,
            date: invoice.date,
            vendor_name: invoice.vendor_name,
            total_amount: invoice.total_amount,
            currency: invoice.currency,
            user_name: invoice.profiles.full_name,
            user_id: invoice.user_id,
            area: invoice.profiles.area
        }
        let emailComment = comment || 'Sin comentarios'
        if (isPartial) {
            emailComment = `RECHAZO PARCIAL ($${partialAmount}): ` + emailComment
        }
        await sendRejectionEmail(expenseData, invoice.profiles.email, emailComment)
    }

    revalidatePath('/expenses')
    revalidatePath(`/expenses/${id}`)
    redirect('/expenses')
}

export async function updateInvoiceField(id: string, field: string, value: any) {
    const supabase = await createClient()

    // Verify permission (Admin or Manager or Area Approver)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase.from('profiles').select('role, permissions, area').eq('id', user.id).single()
    const canEditByRole = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'branch_manager'
    const hasApproveArea = (profile?.permissions as any)?.approve_area_expenses === true

    // Fetch invoice area
    const { data: invoice } = await supabase.from('invoices').select('profiles!invoices_user_id_fkey(area)').eq('id', id).single()
    const invoiceProfiles = Array.isArray(invoice?.profiles) ? invoice?.profiles[0] : invoice?.profiles
    const isSameArea = profile?.area === invoiceProfiles?.area
    const canEdit = canEditByRole || (hasApproveArea && isSameArea)

    if (!canEdit) {
        return { error: 'No tienes permisos para editar este comprobante.' }
    }

    // Prepare update object
    const updateData: any = {}
    updateData[field] = value

    // Use adminClient to bypass RLS since Area Approvers might not own the row
    const { createAdminClient } = await import('@/utils/supabase/admin')
    const adminClient = createAdminClient()

    const { error } = await adminClient
        .from('invoices')
        .update(updateData)
        .eq('id', id)

    if (error) {
        console.error('Error updating invoice field:', error)
        return { error: 'Error al actualizar: ' + error.message }
    }

    revalidatePath(`/expenses/${id}`)
    revalidatePath('/expenses')

    return { success: true }
}
