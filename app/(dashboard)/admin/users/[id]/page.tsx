import { createClient } from '@/utils/supabase/server'
import UserForm from './user-form'

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
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

    // Fetch target user profile
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !profile) {
        return <div>Usuario no encontrado.</div>
    }

    // Fetch branches for selection
    const { data: branchesData } = await supabase
        .from('branches')
        .select('name')
        .order('name')

    // Map to options for MultiSelect
    let branchesOptions = branchesData?.map(b => ({ label: b.name, value: b.name })) || []

    // Fallback options if DB is empty (should probably rely on DB but keeping consistency)
    if (branchesOptions.length === 0) {
        branchesOptions = [
            { label: 'Casilda', value: 'Casilda' },
            { label: 'Rafaela', value: 'Rafaela' },
            { label: 'San Francisco', value: 'San Francisco' },
            { label: 'General', value: 'General' }
        ]
    }

    return <UserForm profile={profile} branchesOptions={branchesOptions} />
}

