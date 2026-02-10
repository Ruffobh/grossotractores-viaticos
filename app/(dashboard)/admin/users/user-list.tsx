'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import styles from './style.module.css'
import { Edit, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

interface UserProfile {
    id: string
    full_name: string | null
    email: string | null
    role: string | null
    branch: string | null
    area: string | null
    monthly_limit: number
    cash_limit: number
}

interface ConsumptionData {
    card: number
    cash: number
}

interface UserListProps {
    profiles: UserProfile[]
    consumptionData: Record<string, ConsumptionData>
}

type SortKey = 'full_name' | 'email' | 'role' | 'branch' | 'area' | 'monthly_limit' | 'consumption_card' | 'cash_limit' | 'consumption_cash'

interface SortConfig {
    key: SortKey
    direction: 'asc' | 'desc'
}

export default function UserList({ profiles, consumptionData }: UserListProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'full_name', direction: 'asc' })

    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const filteredAndSortedProfiles = useMemo(() => {
        // 1. Filter
        let data = profiles.filter(profile => {
            const searchLower = searchTerm.toLowerCase()
            return (
                (profile.full_name?.toLowerCase() || '').includes(searchLower) ||
                (profile.email?.toLowerCase() || '').includes(searchLower) ||
                (profile.branch?.toLowerCase() || '').includes(searchLower) ||
                (profile.area?.toLowerCase() || '').includes(searchLower) ||
                (profile.role?.toLowerCase() || '').includes(searchLower)
            )
        })

        // 2. Sort
        data.sort((a, b) => {
            const aConsumption = consumptionData[a.id] || { card: 0, cash: 0 }
            const bConsumption = consumptionData[b.id] || { card: 0, cash: 0 }

            let aValue: any
            let bValue: any

            switch (sortConfig.key) {
                case 'consumption_card':
                    aValue = aConsumption.card
                    bValue = bConsumption.card
                    break
                case 'consumption_cash':
                    aValue = aConsumption.cash
                    bValue = bConsumption.cash
                    break
                default:
                    aValue = a[sortConfig.key as keyof UserProfile]
                    bValue = b[sortConfig.key as keyof UserProfile]
            }

            // Handle nulls/undefined for strings
            if (typeof aValue === 'string') aValue = aValue.toLowerCase()
            if (typeof bValue === 'string') bValue = bValue.toLowerCase()

            if (aValue === bValue) return 0

            // Standard comparison
            if (aValue === null || aValue === undefined) return 1
            if (bValue === null || bValue === undefined) return -1

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1
            }
            return 0
        })

        return data
    }, [profiles, consumptionData, searchTerm, sortConfig])

    const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className={styles.sortIconInactive} />
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className={styles.sortIconActive} />
            : <ArrowDown size={14} className={styles.sortIconActive} />
    }

    return (
        <div>
            {/* Search Bar */}
            <div className={styles.searchContainer}>
                <div className={styles.searchWrapper}>
                    <Search className={styles.searchIcon} size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, email, sucursal..."
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('full_name')} className={styles.sortableHeader}>
                                <div className={styles.headerContent}>Nombre <SortIcon columnKey="full_name" /></div>
                            </th>
                            <th onClick={() => handleSort('email')} className={styles.sortableHeader}>
                                <div className={styles.headerContent}>Email <SortIcon columnKey="email" /></div>
                            </th>
                            <th onClick={() => handleSort('role')} className={styles.sortableHeader}>
                                <div className={styles.headerContent}>Rol <SortIcon columnKey="role" /></div>
                            </th>
                            <th onClick={() => handleSort('branch')} className={styles.sortableHeader}>
                                <div className={styles.headerContent}>Sucursal <SortIcon columnKey="branch" /></div>
                            </th>
                            <th onClick={() => handleSort('area')} className={styles.sortableHeader}>
                                <div className={styles.headerContent}>Área <SortIcon columnKey="area" /></div>
                            </th>
                            <th onClick={() => handleSort('monthly_limit')} className={styles.sortableHeader}>
                                <div className={styles.headerContent}>Límite TC <SortIcon columnKey="monthly_limit" /></div>
                            </th>
                            <th onClick={() => handleSort('consumption_card')} className={styles.sortableHeader}>
                                <div className={styles.headerContent}>Consumo TC <SortIcon columnKey="consumption_card" /></div>
                            </th>
                            <th onClick={() => handleSort('cash_limit')} className={styles.sortableHeader}>
                                <div className={styles.headerContent}>Límite EF <SortIcon columnKey="cash_limit" /></div>
                            </th>
                            <th onClick={() => handleSort('consumption_cash')} className={styles.sortableHeader}>
                                <div className={styles.headerContent}>Consumo EF <SortIcon columnKey="consumption_cash" /></div>
                            </th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSortedProfiles.map((profile) => {
                            const userConsumption = consumptionData[profile.id] || { card: 0, cash: 0 }
                            const limitCard = profile.monthly_limit || 0
                            const limitCash = profile.cash_limit || 0
                            const cardExceeded = userConsumption.card > limitCard
                            const cashExceeded = userConsumption.cash > limitCash

                            return (
                                <tr key={profile.id}>
                                    <td data-label="Nombre" className="font-bold">{profile.full_name || 'Sin Nombre'}</td>
                                    <td data-label="Email" className={styles.emailCell} title={profile.email || ''}>{profile.email}</td>
                                    <td data-label="Rol">
                                        <span className={`${styles.badge} ${profile.role === 'branch_manager' ? styles.manager : styles[profile.role || 'user']}`}>
                                            {profile.role === 'branch_manager' ? 'MANAGER' : (profile.role || 'user')}
                                        </span>
                                    </td>
                                    <td data-label="Sucursal">{profile.branch || '-'}</td>
                                    <td data-label="Área">{profile.area || '-'}</td>

                                    <td data-label="Límite TC">${limitCard.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                                    <td data-label="Consumo TC" style={{
                                        color: cardExceeded ? '#ef4444' : 'inherit',
                                        fontWeight: cardExceeded ? '800' : 'normal'
                                    }}>
                                        ${userConsumption.card.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                    </td>

                                    <td data-label="Límite EF">${limitCash.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                                    <td data-label="Consumo EF" style={{
                                        color: cashExceeded ? '#ef4444' : 'inherit',
                                        fontWeight: cashExceeded ? '800' : 'normal'
                                    }}>
                                        ${userConsumption.cash.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
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
                        {filteredAndSortedProfiles.length === 0 && (
                            <tr>
                                <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
                                    No se encontraron usuarios.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
