import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { PlusCircle, Filter } from 'lucide-react'
import styles from './style.module.css'
import { ExpensesTable } from '@/components/expenses-table'

export default async function ExpensesPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const supabase = await createClient()

    // Build query based on method and role (RLS handles role mostly)
    let query = supabase
        .from('invoices')
        .select('*, profiles(full_name)')
        .order('date', { ascending: false })

    // Apply filters if present
    if (params.status) {
        query = query.eq('status', params.status as string)
    }

    const { data: expenses, error } = await query

    if (error) {
        console.error(error)
        return <div>Error al cargar comprobantes.</div>
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
    const isManagerOrAdmin = profile?.role === 'manager' || profile?.role === 'admin'

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Comprobantes</h1>
                <Link href="/expenses/new" className={styles.newButton}>
                    <PlusCircle size={20} />
                    Nuevo
                </Link>
            </div>

            <div className={styles.filters}>
                {/* Simple filter links for now */}
                <Link href="/expenses" className={!params.status ? styles.activeFilter : styles.filter}>Todos</Link>
                <Link href="/expenses?status=pending_approval" className={params.status === 'pending_approval' ? styles.activeFilter : styles.filter}>Pendientes</Link>
                <Link href="/expenses?status=approved" className={params.status === 'approved' ? styles.activeFilter : styles.filter}>Aprobados</Link>
                <Link href="/expenses?status=exceeded_budget" className={params.status === 'exceeded_budget' ? styles.activeFilter : styles.filter}>Excede Límite</Link>
                <Link href="/expenses?status=rejected" className={params.status === 'rejected' ? styles.activeFilter : styles.filter}>Rechazados</Link>
            </div>

            <ExpensesTable expenses={expenses as any} isManagerOrAdmin={isManagerOrAdmin} />
        </div>
    )
}

function formatStatus(status: string | null) {
    if (!status) return 'Pendiente'
    switch (status) {
        case 'pending_approval': return 'Pendiente'
        case 'approved': return 'Aprobado'
        case 'rejected': return 'Rechazado'
        case 'exceeded_budget': return 'Excede Límite'
        default: return status
    }
}
