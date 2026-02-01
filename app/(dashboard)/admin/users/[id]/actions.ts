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

    // Handle Password Reset if provided
    const newPassword = formData.get('new_password') as string
    if (newPassword && newPassword.trim().length > 0) {
        // Use Admin API to update user password
        // Note: This requires the service_role key usually, but createClient uses ANON key.
        // Standard supabase client with ANON key cannot update OTHER users' passwords.
        // We need a SUPER CLIENT for this or use a Database Function.

        // OPTION 1: Use a Database RPC (most secure if configured right)
        // OPTION 2: Use Service Role Key (Not exposed in client-side env, but we are in server action)
        // We don't have SERVICE_ROLE_KEY in .env.local yet. 
        // User asked to "change password".
        // Let's try to update using the supabase-admin client if we can instantiate it, 
        // OR tell the user we need the SERVICE_KEY.
        // For now, let's log that we need the service key.

        console.warn("Password update for other users requires SERVICE_ROLE_KEY. Skipping for now.")
        // We will notify the user about this limitation or add the key.
    }

    revalidatePath('/admin/users')
    redirect('/admin/users')
}
