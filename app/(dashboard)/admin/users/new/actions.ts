'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createUser(formData: FormData) {
    // Verify Service Role Key
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
        console.error("CRITICAL: Missing SUPABASE_SERVICE_ROLE_KEY in environment variables")
        throw new Error('Configuration Error: Missing Service Role Key')
    }

    try {
        const supabase = await createClient()

        // Verify Admin Access
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            throw new Error('Not authenticated')
        }

        const { data: currentUserProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (currentUserProfile?.role !== 'admin') {
            throw new Error('Unauthorized')
        }

        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const full_name = formData.get('full_name') as string
        const role = formData.get('role') as string
        const area = formData.get('area') as string
        const monthlyLimit = Number(formData.get('monthly_limit')) || 0
        const cashLimit = Number(formData.get('cash_limit')) || 0

        // Parse branches JSON
        const branchesJson = formData.get('branches') as string
        let branches: string[] = []
        try {
            branches = branchesJson ? JSON.parse(branchesJson) : []
        } catch (e) {
            console.error("Error parsing branches", e)
        }

        const adminAuthClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // 1. Create Auth User
        const { data: newUser, error: authError } = await adminAuthClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name, branch: branches[0] || null, area, role, branches }
        })

        if (authError) {
            console.error('Auth Create Error:', authError)
            throw new Error(authError.message)
        }

        if (!newUser?.user) {
            throw new Error('Failed to create user object')
        }

        // 2. Create Profile
        const { error: profileError } = await adminAuthClient
            .from('profiles')
            .upsert({
                id: newUser.user.id,
                email,
                full_name,
                role,
                branch: branches.length > 0 ? branches[0] : null,
                branches: branches,
                area,
                monthly_limit: monthlyLimit,
                cash_limit: cashLimit
            })

        if (profileError) {
            console.error('Profile Upsert Error:', profileError)
            throw new Error('User created but profile update failed: ' + profileError.message)
        }

    } catch (e: any) {
        if (e.message === 'NEXT_REDIRECT') throw e; // Let redirects pass through
        console.error("Server Action Error:", e)
        throw new Error(`Error: ${e.message}`)
    }

    revalidatePath('/admin/users')
    redirect('/admin/users')
}
