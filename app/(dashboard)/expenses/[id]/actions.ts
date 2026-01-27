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
