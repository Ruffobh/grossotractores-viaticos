import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { PlusCircle, Filter } from 'lucide-react'
import styles from './style.module.css'
import { ExpensesTable } from '@/components/expenses-table'
import { ExpensesFilter } from '@/components/expenses-filter'

export default async function ExpensesPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const supabase = await createClient()

    // 1. Get User & Profile first to determine permissions
    const { data: { user } } = await supabase.auth.getUser()

    // Handle unauthenticated case (though middleware catches this)
    if (!user) return <div>No autenticado</div>

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isManagerOrAdmin = profile?.role === 'manager' || profile?.role === 'branch_manager' || profile?.role === 'admin'
    const role = profile?.role || 'user'

    // Fetch data for filters (only needed if manager/admin)
    let usersList: any[] = []
    let branchesList: any[] = []

    if (isManagerOrAdmin) {
        const { data: uData } = await supabase.from('profiles').select('id, full_name').order('full_name')
        usersList = uData || []

        const { data: bData } = await supabase.from('branches').select('id, name').order('name')
        branchesList = bData || []
    }

    // 2. Build Query
    let query = supabase
        .from('invoices')
        .select('*, profiles(full_name)')
        .order('date', { ascending: false })

    // RLS usually handles this, but we force it here for safety and UI consistency
    if (role === 'user') {
        query = query.eq('user_id', user.id)
    }

    // Apply filters if present
    if (params.status) {
        query = query.eq('status', params.status as string)
    }

    // Advanced Filters (Manager/Admin Only)
    if (isManagerOrAdmin) {
        if (params.user_id) query = query.eq('user_id', params.user_id as string)
        if (params.branch) query = query.eq('branch', params.branch as string)
        if (params.expense_category) query = query.eq('expense_category', params.expense_category as string)
        if (params.payment_method) query = query.eq('payment_method', params.payment_method as string)
    }

    const { data: expenses, error } = await query

    if (error) {
        console.error(error)
        return <div>Error al cargar comprobantes.</div>
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Comprobantes</h1>
                <Link href="/expenses/new" className={styles.newButton}>
                    <PlusCircle size={20} />
                    Nuevo
                </Link>
            </div>

            <ExpensesFilter
                users={usersList}
                branches={branchesList}
                isManagerOrAdmin={isManagerOrAdmin}
            />

            <div className={styles.filters}>
                {/* Simple filter links for now */}
                <Link href="/expenses" className={!params.status ? styles.activeFilter : styles.filter}>Todos</Link>
                <Link href="/expenses?status=pending_approval" className={params.status === 'pending_approval' ? styles.activeFilter : styles.filter}>Pendientes</Link>
                <Link href="/expenses?status=approved" className={params.status === 'approved' ? styles.activeFilter : styles.filter}>Aprobados</Link>
                <Link href="/expenses?status=exceeded_budget" className={params.status === 'exceeded_budget' ? styles.activeFilter : styles.filter}>Excede Límite</Link>
                <Link href="/expenses?status=rejected" className={params.status === 'rejected' ? styles.activeFilter : styles.filter}>Rechazados</Link>
                <Link href="/expenses?status=submitted_to_bc" className={params.status === 'submitted_to_bc' ? styles.activeFilter : styles.filter}>Cargado en BC</Link>
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
        case 'submitted_to_bc': return 'Cargado en BC'
        default: return status
    }
}
