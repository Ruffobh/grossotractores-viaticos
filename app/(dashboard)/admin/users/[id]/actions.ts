'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateUserProfile(formData: FormData) {
    const supabase = await createClient()
    const id = formData.get('id') as string

    // Verify Admin Access First
    const { data: { user } } = await supabase.auth.getUser()
    const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

    if (currentUserProfile?.role !== 'admin') {
        throw new Error('Unauthorized')
    }

    // Update Profile Data
    const branchesJson = formData.get('branches') as string
    let branches: string[] = []
    try {
        branches = branchesJson ? JSON.parse(branchesJson) : []
    } catch (e) {
        console.error("Error parsing branches", e)
    }

    const profileData = {
        full_name: formData.get('full_name'),
        role: formData.get('role'),
        // branch: branches[0] || null, // Keep legacy if needed, or remove. 
        // Better to sync: if 1 branch, set branch. If multi, set branches. 
        // We will set both for now to maintain compatibility with other parts of the app requiring single branch.
        branch: branches.length > 0 ? branches[0] : null,
        branches: branches,
        area: formData.get('area'),
        monthly_limit: Number(formData.get('monthly_limit')) || 0,
        cash_limit: Number(formData.get('cash_limit')) || 0,
        permissions: formData.get('permissions') ? JSON.parse(formData.get('permissions') as string) : {},
        // Sync branch_id
        branch_id: null as string | null
    }

    // Resolve branch_id from db
    if (branches.length > 0) {
        const branchName = branches[0]
        const { data: branchRecord } = await supabase
            .from('branches')
            .select('id')
            .eq('name', branchName)
            .single()

        if (branchRecord) {
            profileData.branch_id = branchRecord.id
        }
    }

    const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', id)

    if (error) {
        console.error('Error updating profile:', error)
        throw new Error('Failed to update profile')
    }

    const newPassword = formData.get('new_password') as string
    const newEmail = formData.get('email') as string

    // 1. Update Profile (Base Table)
    // We already updated other fields above, but we didn't include email in profileData.
    // Let's do it separately or include it. Since we already ran the update above, let's run a second update for email or merge it.
    // Actually, I should have included it in profileData. Let's fix the whole flow to be cleaner.
    // BUT since I am editing existing code, I can just append the email update logic here or above.

    // Let's do the Auth Update FIRST. If that fails, we shouldn't update the profile email ideally, or warn.
    if (newEmail && newEmail.trim().length > 0) {
        try {
            const { createAdminClient } = await import('@/utils/supabase/admin')
            const adminClient = createAdminClient()

            // Update Auth User (Email & Password if provided)
            const param: any = { email: newEmail, email_confirm: true }
            if (newPassword && newPassword.trim().length > 0) {
                param.password = newPassword
            }

            const { error: authError } = await adminClient.auth.admin.updateUserById(id, param)

            if (authError) {
                console.error('Error updating Auth User:', authError)
                // If it's "email already registered", we should throw
                throw new Error(`Error updating Auth: ${authError.message}`)
            }

            // Sync email to profiles table
            await supabase.from('profiles').update({ email: newEmail }).eq('id', id)

        } catch (e: any) {
            console.error("Auth Update Error:", e)
            throw new Error(e.message || "Failed to update authentication data")
        }
    } else if (newPassword && newPassword.trim().length > 0) {
        // Only Password Update
        try {
            const { createAdminClient } = await import('@/utils/supabase/admin')
            const adminClient = createAdminClient()
            const { error: authError } = await adminClient.auth.admin.updateUserById(id, { password: newPassword })
            if (authError) {
                throw new Error(`Error updating Password: ${authError.message}`)
            }
        } catch (e: any) {
            console.error("Password Update Error:", e)
            throw new Error(e.message)
        }
    }

    revalidatePath('/admin/users')
    redirect('/admin/users')
}
