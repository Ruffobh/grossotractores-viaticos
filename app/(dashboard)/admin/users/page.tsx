import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import styles from './style.module.css'
import { UserPlus, Edit, Trash2 } from 'lucide-react'

export default async function UsersListPage() {
    const supabase = await createClient()

    // Verify Admin Access
    const { data: { user } } = await supabase.auth.getUser()
    const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

    if (currentUserProfile?.role !== 'admin') {
        return <div className="p-8">Acceso denegado. Se requieren permisos de administrador.</div>
    }

    // Fetch all profiles
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true })

    // 2. Fetch Consumption for Current Month (Split by Type)
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    const { data: invoices } = await supabase
        .from('invoices')
        .select('user_id, total_amount, payment_method, status') // Added status
        .gte('date', startDate)
        .lte('date', endDate)

    // Aggregate consumption by user and type
    const consumptionMap = new Map<string, { card: number, cash: number }>()

    invoices?.forEach(inv => {
        if (inv.status === 'rejected') return // Exclude rejected
        const current = consumptionMap.get(inv.user_id) || { card: 0, cash: 0 }

        if (inv.payment_method === 'Cash' || inv.payment_method === 'Transfer') {
            current.cash += (inv.total_amount || 0)
        } else {
            current.card += (inv.total_amount || 0)
        }

        consumptionMap.set(inv.user_id, current)
    })

    if (error) {
        return <div>Error al cargar usuarios: {error.message}</div>
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Gestión de Usuarios</h1>
                <Link href="/admin/users/new" className={styles.newButton}>
                    <UserPlus size={20} />
                    Nuevo Usuario
                </Link>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Sucursal</th>
                            <th>Área</th>
                            <th>Límite TC</th>
                            <th>Consumo TC</th>
                            <th>Límite EF</th>
                            <th>Consumo EF</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {profiles?.map((profile) => {
                            const userConsumption = consumptionMap.get(profile.id) || { card: 0, cash: 0 }

                            const limitCard = profile.monthly_limit || 0
                            const limitCash = profile.cash_limit || 0

                            const cardExceeded = userConsumption.card > limitCard
                            const cashExceeded = userConsumption.cash > limitCash

                            return (
                                <tr key={profile.id}>
                                    <td data-label="Nombre" className="font-bold">{profile.full_name || 'Sin Nombre'}</td>
                                    <td data-label="Email" className={styles.emailCell} title={profile.email}>{profile.email}</td>
                                    <td data-label="Rol">
                                        <span className={`${styles.badge} ${profile.role === 'branch_manager' ? styles.manager :
                                            styles[profile.role || 'user']
                                            }`}>
                                            {profile.role === 'branch_manager' ? 'MANAGER' : (profile.role || 'user')}
                                        </span>
                                    </td>
                                    <td data-label="Sucursal">{profile.branch || '-'}</td>
                                    <td data-label="Área">{profile.area || '-'}</td>

                                    {/* Credit Card Stats */}
                                    <td data-label="Límite TC">${limitCard.toLocaleString()}</td>
                                    <td data-label="Consumo TC" style={{
                                        color: cardExceeded ? '#ef4444' : 'inherit',
                                        fontWeight: cardExceeded ? '800' : 'normal'
                                    }}>
                                        ${userConsumption.card.toLocaleString()}
                                    </td>

                                    {/* Cash Stats */}
                                    <td data-label="Límite EF">${limitCash.toLocaleString()}</td>
                                    <td data-label="Consumo EF" style={{
                                        color: cashExceeded ? '#ef4444' : 'inherit',
                                        fontWeight: cashExceeded ? '800' : 'normal'
                                    }}>
                                        ${userConsumption.cash.toLocaleString()}
                                    </td>

                                    <td data-label="Acciones">
                                        <div className={styles.actions}>
                                            <Link href={`/admin/users/${profile.id}`} className={styles.editButton}>
                                                <Edit size={16} /> Editar
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
