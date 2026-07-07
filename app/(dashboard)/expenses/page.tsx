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

    const selectedArea = params.area as string | undefined

    // 2. Build Query
    // Explicitly specify the FK column for profiles to avoid ambiguity now that we have two FKs (user_id and loaded_by)
    let query = supabase
        .from('invoices')
        .select(`
            *,
            profiles:profiles!invoices_user_id_fkey${selectedArea ? '!inner' : ''}(full_name, branch, area),
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
    if (params.date_from) {
        query = query.gte('date', params.date_from as string)
    }
    if (params.date_to) {
        query = query.lte('date', params.date_to as string)
    }

    const userBranches = profile?.branches || (profile?.branch ? [profile.branch] : [])

    // --- Count queries using head:true (no row limit, returns only count via HTTP header) ---
    const buildCountQuery = (status?: string) => {
        let selectStr = '*'
        if (isManagerOrAdmin && selectedArea) {
            selectStr = '*, profiles:profiles!invoices_user_id_fkey!inner(area)'
        }
        let q = supabase.from('invoices').select(selectStr, { count: 'exact', head: true }).neq('status', 'draft')
        if (role === 'user' && !hasApproveArea) q = q.eq('user_id', user.id)
        // Manager: only count invoices from their branches
        if ((role === 'manager' || role === 'branch_manager') && userBranches.length > 0 && !params.branch) {
            q = q.in('branch', userBranches)
        }
        if (isManagerOrAdmin) {
            if (params.user_id) q = q.eq('user_id', params.user_id as string)
            if (params.branch) q = q.eq('branch', params.branch as string)
            if (params.expense_category) q = q.eq('expense_category', params.expense_category as string)
            if (params.payment_method) q = q.eq('payment_method', params.payment_method as string)
            if (selectedArea) q = q.eq('profiles.area', selectedArea)
        }
        if (params.date_from) q = q.gte('date', params.date_from as string)
        if (params.date_to) q = q.lte('date', params.date_to as string)
        if (status) q = q.eq('status', status)
        return q
    }

    const [
        { count: allCount },
        { count: pendingCount },
        { count: approvedCount },
        { count: exceededCount },
        { count: rejectedCount },
        { count: partiallyRejectedCount },
        { count: bcCount }
    ] = await Promise.all([
        buildCountQuery(),
        buildCountQuery('pending_approval'),
        buildCountQuery('approved'),
        buildCountQuery('exceeded_budget'),
        buildCountQuery('rejected'),
        buildCountQuery('partially_rejected'),
        buildCountQuery('submitted_to_bc')
    ])

    const totalCount = allCount || 0
    const statusCounts: Record<string, number> = {
        'pending_approval': pendingCount || 0,
        'approved': approvedCount || 0,
        'exceeded_budget': exceededCount || 0,
        'rejected': rejectedCount || 0,
        'partially_rejected': partiallyRejectedCount || 0,
        'submitted_to_bc': bcCount || 0,
    }

    // --- Main data query (paginated) ---
    // Advanced Filters (Manager/Admin Only)
    if (isManagerOrAdmin) {
        if (params.user_id) query = query.eq('user_id', params.user_id as string)
        if (params.branch) query = query.eq('branch', params.branch as string)
        if (params.expense_category) query = query.eq('expense_category', params.expense_category as string)
        if (params.payment_method) query = query.eq('payment_method', params.payment_method as string)
        if (selectedArea) query = query.eq('profiles.area', selectedArea)
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
    if (selectedArea) activeFilters.area = selectedArea
    if (params.date_from) activeFilters.date_from = params.date_from as string
    if (params.date_to) activeFilters.date_to = params.date_to as string

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
