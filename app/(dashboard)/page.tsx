import { createClient } from '@/utils/supabase/server'
import styles from './page.module.css'
import { AnalyticsDashboard } from '@/components/analytics-dashboard'
import { DashboardFilters } from '@/components/dashboard-filters'
import { EXPENSE_TYPES, AREAS } from '@/app/constants'

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
    const userBranches = profile?.branches || (profile?.branch ? [profile.branch] : [])

    // 1. Fetch Filter Options
    const { data: branchesData } = await supabase.from('branches').select('name').order('name')
    // ... (skip unchanged lines)

    // 5. Client-side Filtering (for the main list/charts)
    if ((role === 'manager' || role === 'branch_manager') && userBranches.length > 0) {
        invoices = invoices.filter((inv: any) => userBranches.includes(inv.profiles?.branch))
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
                            areas={[...distinctAreas]}
                            types={[...distinctTypes]}
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

                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>Estado de Presupuestos</h3>
                    </div>
                    {selectedMonth === (now.getMonth() + 1) && selectedYear === now.getFullYear() ? (
                        <div className={styles.limitWidget}>
                            {/* CARD LIMIT */}
                            <div className={styles.limitRow}>
                                <div className={styles.limitHeader}>
                                    <div className={styles.limitLabelGroup}>
                                        <span className={styles.limitTitle}>Tarjeta Corporativa</span>
                                        <span className={styles.limitSubtitle}>
                                            {monthlyLimit > 0 ? `Límite: $${monthlyLimit.toLocaleString()}` : 'Sin límite asignado'}
                                        </span>
                                    </div>
                                    <div className={styles.limitStats}>
                                        <span className={`${styles.limitValue} ${monthlyLimit > 0 && myCardConsumption > monthlyLimit ? styles.limitValueRed : ''}`}>
                                            ${myCardConsumption.toLocaleString()}
                                        </span>
                                        {monthlyLimit > 0 && (
                                            <div className={styles.limitPercentage}>
                                                {((myCardConsumption / monthlyLimit) * 100).toFixed(1)}% Consumido
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.limitBarContainer}>
                                    {monthlyLimit > 0 ? (
                                        <div
                                            className={`${styles.limitBar} ${(myCardConsumption / monthlyLimit) > 1 ? styles.bgRed :
                                                (myCardConsumption / monthlyLimit) > 0.85 ? styles.bgYellow :
                                                    styles.bgBlue
                                                }`}
                                            style={{ width: `${Math.min(100, (myCardConsumption / monthlyLimit) * 100)}%` }}
                                        />
                                    ) : (
                                        <div className={styles.barEmpty}>NO ASIGNADO</div>
                                    )}
                                </div>

                                {monthlyLimit > 0 && (
                                    <div className={styles.limitFooter}>
                                        <span className={styles.limitAvailable}>
                                            Disponible: <span className={styles.limitAvailableValue}>${Math.max(0, monthlyLimit - myCardConsumption).toLocaleString()}</span>
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* DIVIDER */}
                            <div className={styles.divider}></div>

                            {/* CASH LIMIT */}
                            <div className={styles.limitRow}>
                                <div className={styles.limitHeader}>
                                    <div className={styles.limitLabelGroup}>
                                        <span className={styles.limitTitle}>Efectivo / Transferencia</span>
                                        <span className={styles.limitSubtitle}>
                                            {(profile?.cash_limit || 0) > 0 ? `Límite: ${(profile?.cash_limit || 0).toLocaleString()}` : 'Sin límite asignado'}
                                        </span>
                                    </div>
                                    <div className={styles.limitStats}>
                                        <span className={`${styles.limitValue} ${(profile?.cash_limit || 0) > 0 && myCashConsumption > (profile?.cash_limit || 0) ? styles.limitValueRed : ''}`}>
                                            ${myCashConsumption.toLocaleString()}
                                        </span>
                                        {(profile?.cash_limit || 0) > 0 && (
                                            <div className={styles.limitPercentage}>
                                                {((myCashConsumption / (profile?.cash_limit || 0)) * 100).toFixed(1)}% Consumido
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.limitBarContainer}>
                                    {(profile?.cash_limit || 0) > 0 ? (
                                        <div
                                            className={`${styles.limitBar} ${(myCashConsumption / (profile?.cash_limit || 0)) > 1 ? styles.bgRed :
                                                (myCashConsumption / (profile?.cash_limit || 0)) > 0.85 ? styles.bgYellow :
                                                    styles.bgGreen
                                                }`}
                                            style={{ width: `${Math.min(100, (myCashConsumption / (profile?.cash_limit || 0)) * 100)}%` }}
                                        />
                                    ) : (
                                        <div className={styles.barEmpty}>NO ASIGNADO</div>
                                    )}
                                </div>

                                {(profile?.cash_limit || 0) > 0 && (
                                    <div className={styles.limitFooter}>
                                        <span className={styles.limitAvailable}>
                                            Disponible: <span className={styles.limitAvailableValue}>${Math.max(0, (profile?.cash_limit || 0) - myCashConsumption).toLocaleString()}</span>
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-lg">
                            <p className="text-gray-400 text-sm font-medium">Este widget solo muestra el mes actual</p>
                            <p className="text-xs text-gray-300 mt-1">Selecciona el mes en curso para ver tu presupuesto.</p>
                        </div>
                    )}
                </div>

                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>Pendientes / Observados</h3>
                    </div>
                    <p className={styles.value}>{pendingCount}</p>
                    {pendingCount > 0 && <p className="text-orange-500 text-sm mt-2 font-medium">En selección</p>}
                </div>
            </div>

            <div className={styles.analyticsSection}>
                <AnalyticsDashboard invoices={invoices as any} role={role} />
            </div>
        </div>
    )
}
