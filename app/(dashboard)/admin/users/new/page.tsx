import { createClient } from '@/utils/supabase/server'
import NewUserForm from './user-form'
import { BRANCHES } from '@/app/constants'

export default async function NewUserPage() {
    const supabase = await createClient()

    // Verify Admin Access
    const { data: { user } } = await supabase.auth.getUser()
    const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

    if (currentUserProfile?.role !== 'admin') {
        return <div className="p-8">Acceso denegado.</div>
    }

    // Verify Admin Access
    const { data: branchesData } = await supabase
        .from('branches')
        .select('name')
        .order('name')

    // Map to options for MultiSelect
    let branchesOptions = branchesData?.map(b => ({ label: b.name, value: b.name })) || []

    // Fallback if DB is empty
    if (branchesOptions.length === 0) {
        branchesOptions = BRANCHES.map(b => ({ label: b, value: b }))
    }

    return <NewUserForm branchesOptions={branchesOptions} />
}
