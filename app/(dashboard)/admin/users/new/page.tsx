import { createClient } from '@/utils/supabase/server'
import NewUserForm from './user-form'
import { BRANCHES } from '@/app/constants'

export default async function NewUserPage() {
    try {
        const supabase = await createClient()

        // Verify Admin Access
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            console.error("Auth User Error:", authError)
            return <div className="p-8">Acceso denegado (No autenticado).</div>
        }

        const { data: currentUserProfile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profileError) {
            console.error("Profile Fetch Error:", profileError)
            // Prevent crashing if profile not found, just deny access
            return <div className="p-8">Error al verificar permisos: {profileError.message}</div>
        }

        if (currentUserProfile?.role !== 'admin') {
            return <div className="p-8">Acceso denegado.</div>
        }

        // Fetch Branches
        const { data: branchesData, error: branchesError } = await supabase
            .from('branches')
            .select('name')
            .order('name')

        if (branchesError) {
            console.error("Branches Fetch Error:", branchesError)
            // Continue with fallback
        }

        // Map to options for MultiSelect
        let branchesOptions = branchesData?.map(b => ({ label: b.name, value: b.name })) || []

        // Fallback if DB is empty or error
        if (branchesOptions.length === 0) {
            branchesOptions = BRANCHES.map(b => ({ label: b, value: b }))
        }

        return <NewUserForm branchesOptions={branchesOptions} />

    } catch (e: any) {
        console.error("Critical Error in NewUserPage:", e)
        return (
            <div className="p-8 text-red-600">
                <h2 className="text-xl font-bold mb-2">Error Inesperado</h2>
                <pre className="bg-gray-100 p-4 rounded overflow-auto border border-red-200">
                    {e.message || JSON.stringify(e)}
                </pre>
            </div>
        )
    }
}
