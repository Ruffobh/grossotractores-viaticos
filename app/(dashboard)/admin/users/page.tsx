import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import styles from './style.module.css'
import { UserPlus, Edit, Trash2, FileUp } from 'lucide-react'
import UserList from './user-list'
import DownloadTemplateButton from './download-template-button'

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
        .select('user_id, total_amount, payment_method, status')
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

    // Convert Map to Plain Object for Client Component
    const consumptionData = Object.fromEntries(consumptionMap)

    if (error) {
        return <div>Error al cargar usuarios: {error.message}</div>
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Gestión de Usuarios</h1>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <DownloadTemplateButton />
                    <Link href="/admin/users/batch" className={styles.newButton} style={{ backgroundColor: '#10b981', marginRight: '10px' }}>
                        <FileUp size={20} />
                        Importar
                    </Link>
                    <Link href="/admin/users/new" className={styles.newButton}>
                        <UserPlus size={20} />
                        Nuevo Usuario
                    </Link>
                </div>
            </div>

            <UserList profiles={profiles || []} consumptionData={consumptionData} />
        </div>
    )
}
