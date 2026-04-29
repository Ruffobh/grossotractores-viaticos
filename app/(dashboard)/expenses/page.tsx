import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { PlusCircle, Filter } from 'lucide-react'
import styles from './style.module.css'
import { ExpensesTable } from '@/components/expenses-table'
import { ExpensesFilter } from '@/components/expenses-filter'

// Allow server actions (processReceipt, etc.) up to 60 seconds
export const maxDuration = 60

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

    const { data: profile } = await supabase.from('profiles').select('role, branch, branches, permissions').eq('id', user.id).single()
    const isManagerOrAdmin = profile?.role === 'manager' || profile?.role === 'branch_manager' || profile?.role === 'admin'
    const role = profile?.role || 'user'
    const hasApproveArea = (profile?.permissions as any)?.approve_area_expenses === true

    // Fetch data for filters (only needed if manager/admin)
    let usersList: any[] = []
    let branchesList: any[] = []

    if (isManagerOrAdmin) {
        const { data: uData } = await supabase.from('profiles').select('id, full_name').order('full_name', { ascending: true })
        usersList = uData || []

        const { data: bData } = await supabase.from('branches').select('id, name').order('name')
        branchesList = bData || []
    }

    // 2. Build Query
    // Explicitly specify the FK column for profiles to avoid ambiguity now that we have two FKs (user_id and loaded_by)
    let query = supabase
        .from('invoices')
        .select(`
            *,
            profiles!invoices_user_id_fkey(full_name, branch, area),
            loaded_by_profile:profiles!invoices_loaded_by_fkey(full_name, branch, area)
        `)
        .order('date', { ascending: false })
        .neq('status', 'draft') // Exclude incomplete uploads

    // RLS usually handles this, but we force it here for safety and UI consistency
    if (role === 'user' && !hasApproveArea) {
        query = query.eq('user_id', user.id)
    }

    // Apply filters if present
    if (params.status) {
        query = query.eq('status', params.status as string)
    }

    const userBranches = profile?.branches || (profile?.branch ? [profile.branch] : [])

    // --- Lightweight count query (only status + branch, no heavy data) ---
    let countQuery = supabase
        .from('invoices')
        .select('status, profiles!invoices_user_id_fkey(branch)')
        .neq('status', 'draft')
    if (role === 'user' && !hasApproveArea) {
        countQuery = countQuery.eq('user_id', user.id)
    }
    // Apply advanced filters (except status) so counts reflect current filter context
    if (isManagerOrAdmin) {
        if (params.user_id) countQuery = countQuery.eq('user_id', params.user_id as string)
        if (params.branch) countQuery = countQuery.eq('branch', params.branch as string)
        if (params.expense_category) countQuery = countQuery.eq('expense_category', params.expense_category as string)
        if (params.payment_method) countQuery = countQuery.eq('payment_method', params.payment_method as string)
    }
    const { data: allStatusData } = await countQuery.range(0, 9999)
    let statusItems = allStatusData || []
    // Manager branch filter for counts
    if ((role === 'manager' || role === 'branch_manager') && userBranches.length > 0) {
        statusItems = statusItems.filter((inv: any) => userBranches.includes(inv.profiles?.branch))
    }
    const statusCounts: Record<string, number> = {}
    statusItems.forEach((inv: any) => {
        const s = inv.status || 'pending_approval'
        statusCounts[s] = (statusCounts[s] || 0) + 1
    })
    const totalCount = statusItems.length

    // --- Main data query (paginated) ---
    // Advanced Filters (Manager/Admin Only)
    if (isManagerOrAdmin) {
        if (params.user_id) query = query.eq('user_id', params.user_id as string)
        if (params.branch) query = query.eq('branch', params.branch as string)
        if (params.expense_category) query = query.eq('expense_category', params.expense_category as string)
        if (params.payment_method) query = query.eq('payment_method', params.payment_method as string)
    }

    const { data: rawExpenses, error } = await query.range(0, 199)

    if (error) {
        console.error("DASHBOARD QUERY ERROR:", JSON.stringify(error, null, 2))
        return <div>Error al cargar comprobantes: {error.message}</div>
    }

    const hasMoreFromDB = (rawExpenses?.length || 0) >= 200
    let expenses = rawExpenses || []

    // Client-side branch filtering for managers
    if ((role === 'manager' || role === 'branch_manager') && userBranches.length > 0) {
        expenses = expenses.filter((inv: any) => userBranches.includes(inv.profiles?.branch))
    }

    // Serialize filters for the load-more action
    const activeFilters: Record<string, string> = {}
    if (params.status) activeFilters.status = params.status as string
    if (params.user_id) activeFilters.user_id = params.user_id as string
    if (params.branch) activeFilters.branch = params.branch as string
    if (params.expense_category) activeFilters.expense_category = params.expense_category as string
    if (params.payment_method) activeFilters.payment_method = params.payment_method as string

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
                <Link href="/expenses" className={!params.status ? styles.activeFilter : styles.filter}>Todos ({totalCount})</Link>
                <Link href="/expenses?status=pending_approval" className={params.status === 'pending_approval' ? styles.activeFilter : styles.filter}>Pendientes ({statusCounts['pending_approval'] || 0})</Link>
                <Link href="/expenses?status=approved" className={params.status === 'approved' ? styles.activeFilter : styles.filter}>Aprobados ({statusCounts['approved'] || 0})</Link>
                <Link href="/expenses?status=exceeded_budget" className={params.status === 'exceeded_budget' ? styles.activeFilter : styles.filter}>Excede Límite ({statusCounts['exceeded_budget'] || 0})</Link>
                <Link href="/expenses?status=rejected" className={params.status === 'rejected' ? styles.activeFilter : styles.filter}>Rechazados ({(statusCounts['rejected'] || 0) + (statusCounts['partially_rejected'] || 0)})</Link>
                <Link href="/expenses?status=submitted_to_bc" className={params.status === 'submitted_to_bc' ? styles.activeFilter : styles.filter}>Cargado en BC ({statusCounts['submitted_to_bc'] || 0})</Link>
            </div>

            <ExpensesTable
                key={JSON.stringify(activeFilters)}
                expenses={expenses as any}
                isManagerOrAdmin={isManagerOrAdmin || hasApproveArea}
                currentUserId={user.id}
                currentUserRole={role}
                hasMore={hasMoreFromDB}
                filters={activeFilters}
                userBranches={userBranches as string[]}
            />
        </div>
    )
}
