'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Filter, X } from 'lucide-react'
import { useState, useEffect } from 'react'

interface FilterProps {
    users: { id: string, full_name: string | null }[]
    branches: { id: string, name: string }[]
    isManagerOrAdmin: boolean
}

import styles from './expenses-filter.module.css'

export function ExpensesFilter({ users, branches, isManagerOrAdmin }: FilterProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Only Managers/Admins can see these extra filters
    if (!isManagerOrAdmin) return null

    const [filters, setFilters] = useState({
        user_id: searchParams.get('user_id') || '',
        branch: searchParams.get('branch') || '',
        expense_category: searchParams.get('expense_category') || '',
        payment_method: searchParams.get('payment_method') || ''
    })

    const handleChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value }
        setFilters(newFilters)

        const params = new URLSearchParams(searchParams.toString())
        if (value) {
            params.set(key, value)
        } else {
            params.delete(key)
        }
        router.push(`/expenses?${params.toString()}`)
    }

    const clearFilters = () => {
        setFilters({
            user_id: '',
            branch: '',
            expense_category: '',
            payment_method: ''
        })
        router.push('/expenses') // or keep status param if we want to separate logic
    }

    const hasActiveFilters = filters.user_id || filters.branch || filters.expense_category || filters.payment_method

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Filter size={16} />
                <span>Filtros Avanzados</span>
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className={styles.clearButton}
                    >
                        <X size={14} /> Limpiar
                    </button>
                )}
            </div>

            <div className={styles.grid}>
                {/* User Filter */}
                <div className={styles.fieldGroup}>
                    <label className={styles.label}>Usuario</label>
                    <select
                        className={styles.select}
                        value={filters.user_id}
                        onChange={(e) => handleChange('user_id', e.target.value)}
                    >
                        <option value="">Todos</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.full_name || 'Sin Nombre'}</option>
                        ))}
                    </select>
                </div>

                {/* Branch Filter */}
                <div className={styles.fieldGroup}>
                    <label className={styles.label}>Sucursal</label>
                    <select
                        className={styles.select}
                        value={filters.branch}
                        onChange={(e) => handleChange('branch', e.target.value)}
                    >
                        <option value="">Todas</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.name}>{b.name}</option>
                        ))}
                    </select>
                </div>

                {/* Expense Category Filter */}
                <div className={styles.fieldGroup}>
                    <label className={styles.label}>Tipo de Gasto</label>
                    <select
                        className={styles.select}
                        value={filters.expense_category}
                        onChange={(e) => handleChange('expense_category', e.target.value)}
                    >
                        <option value="">Todos</option>
                        {EXPENSE_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>

                {/* Payment Method Filter */}
                <div className={styles.fieldGroup}>
                    <label className={styles.label}>Forma de Pago</label>
                    <select
                        className={styles.select}
                        value={filters.payment_method}
                        onChange={(e) => handleChange('payment_method', e.target.value)}
                    >
                        <option value="">Todas</option>
                        {PAYMENT_METHODS.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    )
}
