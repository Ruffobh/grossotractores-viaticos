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

export async function revertBCInvoice(invoiceId: string) {
    const supabase = await createClient()

    // Verify admin or branch_manager
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const canRevert = profile?.role === 'admin' || profile?.role === 'branch_manager'

    if (!canRevert) {
        return { error: 'Solo administradores pueden revertir cargas de BC.' }
    }

    // Fetch the invoice
    const { createAdminClient } = await import('@/utils/supabase/admin')
    const adminClient = createAdminClient()

    const { data: invoice, error: fetchError } = await adminClient
        .from('invoices')
        .select('id, status, bc_invoice_number, loaded_to_bc, split_group_id')
        .eq('id', invoiceId)
        .single()

    if (fetchError || !invoice) {
        return { error: 'Comprobante no encontrado' }
    }

    if (invoice.status !== 'submitted_to_bc') {
        return { error: 'El comprobante no está en estado "Cargado en BC".' }
    }

    if (!invoice.bc_invoice_number) {
        return { error: 'No se encontró número de factura BC para revertir.' }
    }

    // Step 1: Find the invoice in BC by number to get its ID
    const bcProxyUrl = 'https://uztwlsqjvvirixfwjfwp.supabase.co/functions/v1/bc-proxy'

    try {
        // List to find the BC invoice ID
        const listRes = await fetch(bcProxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'LIST_PURCHASE_INVOICES',
                data: { number: invoice.bc_invoice_number }
            })
        })
        const listResult = await listRes.json()

        if (!listResult.success || !listResult.invoices?.length) {
            return { error: 'No se encontró la factura en BC. Es posible que ya haya sido eliminada o registrada.' }
        }

        const bcInvoice = listResult.invoices[0]

        // Check if it's been posted (registered) - can only delete Draft or Open invoices
        const allowedStatuses = ['Draft', 'Open']
        if (!allowedStatuses.includes(bcInvoice.status)) {
            return { error: `No se puede revertir: la factura está en estado "${bcInvoice.status}" en BC. Solo se pueden revertir facturas no registradas (Draft/Abierto).` }
        }

        // Step 2: Delete from BC
        const deleteRes = await fetch(bcProxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'DELETE_PURCHASE_INVOICE',
                data: { invoiceId: bcInvoice.id }
            })
        })
        const deleteResult = await deleteRes.json()

        if (!deleteResult.success) {
            return { error: 'Error eliminando factura de BC: ' + (deleteResult.error || 'Error desconocido') }
        }

        // Step 3: Revert status in the app
        const updateData = {
            status: 'approved',
            bc_invoice_number: null,
            loaded_to_bc: false
        }

        const { error: updateError } = await adminClient
            .from('invoices')
            .update(updateData)
            .eq('id', invoiceId)

        // Also revert split group siblings
        if (invoice.split_group_id) {
            await adminClient
                .from('invoices')
                .update(updateData)
                .eq('split_group_id', invoice.split_group_id)
        }

        if (updateError) {
            console.error('[revertBCInvoice] DB Update Error:', updateError)
            return { error: 'Se eliminó de BC pero hubo un error actualizando la app: ' + updateError.message }
        }

        revalidatePath('/expenses')
        revalidatePath(`/expenses/${invoiceId}`)
        return { success: true }

    } catch (e: any) {
        console.error('[revertBCInvoice] Error:', e)
        return { error: 'Error de conexión: ' + e.message }
    }
}
