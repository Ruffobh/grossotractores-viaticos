'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createUser(formData: FormData) {
    const supabase = await createClient()

    // Verify Admin Access
    const { data: { user } } = await supabase.auth.getUser()
    const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

    if (currentUserProfile?.role !== 'admin') {
        throw new Error('Unauthorized')
    }

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const full_name = formData.get('full_name') as string
    const role = formData.get('role') as string
    const branch = formData.get('branch') as string
    const area = formData.get('area') as string
    const monthlyLimit = Number(formData.get('monthly_limit')) || 0
    const cashLimit = Number(formData.get('cash_limit')) || 0

    // Use Service Client to Create Auth User
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
        throw new Error('Missing Service Role Key')
    }

    const { createClient: createAdminClient } = require('@supabase/supabase-js')
    const adminAuthClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    const branchesJson = formData.get('branches') as string
    let branches: string[] = []
    try {
        branches = branchesJson ? JSON.parse(branchesJson) : []
    } catch (e) {
        console.error("Error parsing branches", e)
    }

    // 1. Create Auth User
    const { data: newUser, error: authError } = await adminAuthClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, branch: branches[0] || null, area, role, branches }
    })

    // ...error handling...

    if (!newUser?.user) {
        throw new Error('Failed to create user object')
    }

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
            monthly_limit,
            cash_limit
        })

    if (profileError) {
        console.error('Profile Upsert Error:', profileError)
        // Note: User is created in Auth but profile might be partial. 
        // We warn but don't fail completely? Ideally we should rollback (delete user), but Supabase doesn't support transactions across Auth/DB easily.
        // We throw to show error.
        throw new Error('User created but profile update failed: ' + profileError.message)
    }

    revalidatePath('/admin/users')
    redirect('/admin/users')
}
