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
        .order('full_name')

    // 2. Fetch Consumption for Current Month
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    const { data: invoices } = await supabase
        .from('invoices')
        .select('user_id, total_amount')
        .gte('date', startDate)
        .lte('date', endDate)

    // Aggregate consumption by user
    const consumptionMap = new Map<string, number>()
    invoices?.forEach(inv => {
        const current = consumptionMap.get(inv.user_id) || 0
        consumptionMap.set(inv.user_id, current + (inv.total_amount || 0))
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
                            <th>Límite</th>
                            <th>Consumo</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {profiles?.map((profile) => {
                            const consumed = consumptionMap.get(profile.id) || 0
                            const limit = profile.monthly_limit || 0
                            const isExceeded = consumed > limit

                            return (
                                <tr key={profile.id}>
                                    <td className="font-bold">{profile.full_name || 'Sin Nombre'}</td>
                                    <td>{profile.email}</td>
                                    <td>
                                        <span className={`${styles.badge} ${styles[profile.role || 'user']}`}>
                                            {profile.role || 'user'}
                                        </span>
                                    </td>
                                    <td>{profile.branch || '-'}</td>
                                    <td>{profile.area || '-'}</td>
                                    <td>${limit.toLocaleString()}</td>
                                    <td style={{
                                        color: isExceeded ? '#ef4444' : 'inherit',
                                        fontWeight: isExceeded ? '800' : 'normal'
                                    }}>
                                        ${consumed.toLocaleString()}
                                    </td>
                                    <td>
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
