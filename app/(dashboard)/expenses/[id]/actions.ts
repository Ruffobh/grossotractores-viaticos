'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function approveExpense(id: string) {
    const supabase = await createClient()

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()

    if (profile?.role !== 'admin') {
        throw new Error('Unauthorized')
    }

    const { error } = await supabase.from('invoices').update({ status: 'approved' }).eq('id', id)

    if (error) throw error

    revalidatePath('/expenses')
    revalidatePath(`/expenses/${id}`)
    redirect('/expenses')
}

export async function rejectExpense(id: string) {
    const supabase = await createClient()

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()

    if (profile?.role !== 'admin') {
        throw new Error('Unauthorized')
    }

    const { error } = await supabase.from('invoices').update({ status: 'rejected' }).eq('id', id)

    if (error) throw error

    revalidatePath('/expenses')
    revalidatePath(`/expenses/${id}`)
    redirect('/expenses')
}

export async function updateInvoiceField(id: string, field: string, value: any) {
    const supabase = await createClient()

    // Verify permission (Admin or Manager)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const canEdit = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'branch_manager'

    if (!canEdit) {
        return { error: 'No tienes permisos para editar este comprobante.' }
    }

    // Prepare update object
    const updateData: any = {}
    updateData[field] = value

    // If updating amount, we might want to log it or check something, but for now just update

    const { error } = await supabase
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
