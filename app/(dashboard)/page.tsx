import { createClient } from '@/utils/supabase/server'
import styles from './page.module.css'
import { AnalyticsDashboard } from '@/components/analytics-dashboard'
import { DashboardFilters } from '@/components/dashboard-filters'

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const params = await searchParams

    if (!user) return <div>Cargando...</div>

    // Get User Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    const role = profile?.role || 'user'
    const userBranch = profile?.branch

    // 1. Fetch Filter Options
    const { data: branchesData } = await supabase.from('branches').select('name').order('name')
    const branchesOptions = branchesData?.map(b => b.name) || []

    const distinctTypes = ['Comida', 'Combustible', 'Hotel', 'Peaje', 'Varios', 'Repuestos']
    const distinctAreas = ['Gerencia', 'Ventas', 'Posventa', 'Administracion', 'Repuestos', 'Servicio']

    // 2. Parse Filters
    const now = new Date()
    const selectedMonth = params.month === 'all' ? 'all' : (params.month ? parseInt(params.month as string) : (now.getMonth() + 1))
    const selectedYear = params.year ? parseInt(params.year as string) : now.getFullYear()

    const filterBranches = params.branches ? (params.branches as string).split(',') : []
    const filterAreas = params.areas ? (params.areas as string).split(',') : []
    const filterTypes = params.types ? (params.types as string).split(',') : []

    // 3. Main Query
    let startDate: string, endDate: string

    if (selectedMonth === 'all') {
        startDate = new Date(selectedYear, 0, 1).toISOString()
        endDate = new Date(selectedYear, 11, 31, 23, 59, 59).toISOString()
    } else {
        startDate = new Date(selectedYear, (selectedMonth as number) - 1, 1).toISOString()
        endDate = new Date(selectedYear, (selectedMonth as number), 0, 23, 59, 59).toISOString()
    }

    let query = supabase
        .from('invoices')
        .select('*, profiles(branch, area, full_name)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

    if (role === 'user') {
        query = query.eq('user_id', user.id)
    }

    const { data: rawInvoices, error } = await query

    if (error) {
        console.error("Dashboard Load Error:", error)
        return <div>Error al cargar datos.</div>
    }

    let invoices = rawInvoices || []

    // 4. Calculate Personal Consumption (Independent of Dashboard Filters)
    // Always fetch the user's consumption for the CURRENT month to show in the budget widget
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const startOfCurrentMonth = new Date(currentYear, currentMonth - 1, 1).toISOString()
    const endOfCurrentMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString()

    const { data: myInvoices } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('user_id', user.id)
        .gte('date', startOfCurrentMonth)
        .lte('date', endOfCurrentMonth)

    const myConsumption = myInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0


    // 5. Client-side Filtering (for the main list/charts)
    if (role === 'manager' && userBranch) {
        invoices = invoices.filter((inv: any) => inv.profiles?.branch === userBranch)
    }

    if (filterBranches.length > 0 && role === 'admin') {
        invoices = invoices.filter((inv: any) => filterBranches.includes(inv.profiles?.branch))
    }
    if (filterAreas.length > 0) {
        invoices = invoices.filter((inv: any) => filterAreas.includes(inv.profiles?.area))
    }
    if (filterTypes.length > 0) {
        invoices = invoices.filter((inv: any) => filterTypes.includes(inv.invoice_type))
    }

    // KPI Calculations
    const consumedAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
    const pendingCount = invoices.filter(inv => inv.status === 'pending_approval' || inv.status === 'exceeded_budget').length
    const monthlyLimit = profile?.monthly_limit || 0

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className="w-full">
                    <h1 className={styles.title}>Panel Principal</h1>
                    <p className={styles.subtitle}>
                        {profile?.full_name}
                        {userBranch ? ` | ${userBranch}` : ''}
                    </p>

                    <div className="mt-4">
                        <DashboardFilters
                            branches={branchesOptions}
                            areas={distinctAreas}
                            types={distinctTypes}
                            role={role}
                        />
                    </div>
                </div>
            </header>

            <div className={styles.grid}>
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>
                            {role === 'user' ? 'Mis Gastos' : 'Total Filtrado'}
                        </h3>
                    </div>
                    <p className={styles.value}>${consumedAmount.toLocaleString()}</p>
                    {role === 'user' && (
                        <>
                            <p className="text-gray-400 text-sm mt-2">de ${monthlyLimit.toLocaleString()} autorizado</p>
                            <p className="text-xs text-gray-400 mt-1">Este mes ({selectedMonth === 'all' ? 'Año Completo' : `${selectedMonth}/${selectedYear}`})</p>
                        </>
                    )}
                </div>

                {monthlyLimit > 0 && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>Límite Restante</h3>
                        </div>
                        {selectedMonth === (now.getMonth() + 1) && selectedYear === now.getFullYear() ? (
                            <>
                                <p className={styles.value}>${Math.max(0, monthlyLimit - myConsumption).toLocaleString()}</p>


                                {/* Progress Bar Logic */}
                                <div className={styles.progressContainer}>
                                    <div
                                        className={`${styles.progressBar} ${(myConsumption / monthlyLimit) < 0.6 ? styles.progressBarSuccess : (myConsumption / monthlyLimit) <= 0.85 ? styles.progressBarWarning : styles.progressBarDanger}`}
                                        style={{ width: `${Math.min(100, (myConsumption / monthlyLimit) * 100)}%` }}
                                    />
                                </div>
                                <p className={`text-xs mt-2 font-medium ${(myConsumption / monthlyLimit) < 0.6 ? styles.textSuccess : (myConsumption / monthlyLimit) <= 0.85 ? styles.textWarning : styles.textDanger}`}>
                                    {Math.round((myConsumption / monthlyLimit) * 100)}% consumido
                                </p>
                            </>
                        ) : (
                            <p className="text-gray-400 mt-2">Este widget solo muestra el mes actual</p>
                        )}
                    </div>
                )}

                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>Pendientes / Observados</h3>
                    </div>
                    <p className={styles.value}>{pendingCount}</p>
                    {pendingCount > 0 && <p className="text-orange-500 text-sm mt-2 font-medium">En selección</p>}
                </div>
            </div>

            <div className="mt-8">
                <AnalyticsDashboard invoices={invoices as any} />
            </div>
        </div>
    )
}
