import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import styles from './style.module.css'
import { PlusCircle, Edit, Trash2 } from 'lucide-react'

export default async function BranchesPage() {
    const supabase = await createClient()

    // Verify Admin Access
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

    if (profile?.role !== 'admin') {
        return <div className="p-8">Acceso denegado.</div>
    }

    // Fetch branches
    const { data: branches, error } = await supabase
        .from('branches')
        .select('*')
        .order('name')

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Gestión de Sucursales</h1>
                {/* Simple Create Branch button if needed, or just list for now */}
                {/* <Link href="/admin/branches/new" className={styles.newButton}>
            <PlusCircle size={20} /> Nueva Sucursal
        </Link> */}
            </div>

            <div className={styles.grid}>
                {branches?.map((branch) => (
                    <div key={branch.id} className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>{branch.name}</h3>
                        </div>
                        {/* Display stats later? */}
                        <p className="text-gray-500 text-sm">Gestionar sucursal</p>
                    </div>
                ))}
                {branches?.length === 0 && <p>No hay sucursales registradas.</p>}
            </div>
        </div>
    )
}
