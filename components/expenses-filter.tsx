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
import { EXPENSE_TYPES, PAYMENT_METHODS, AREAS } from '@/app/constants'

export function ExpensesFilter({ users, branches, isManagerOrAdmin }: FilterProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [filters, setFilters] = useState({
        user_id: searchParams.get('user_id') || '',
        branch: searchParams.get('branch') || '',
        expense_category: searchParams.get('expense_category') || '',
        payment_method: searchParams.get('payment_method') || '',
        area: searchParams.get('area') || '',
        period: searchParams.get('period') || '',
        date_from: searchParams.get('date_from') || '',
        date_to: searchParams.get('date_to') || ''
    })

    // Sincronizar el estado interno con los parámetros de la URL al cambiar
    useEffect(() => {
        setFilters({
            user_id: searchParams.get('user_id') || '',
            branch: searchParams.get('branch') || '',
            expense_category: searchParams.get('expense_category') || '',
            payment_method: searchParams.get('payment_method') || '',
            area: searchParams.get('area') || '',
            period: searchParams.get('period') || '',
            date_from: searchParams.get('date_from') || '',
            date_to: searchParams.get('date_to') || ''
        })
    }, [searchParams])

    const getPeriodDates = (period: string) => {
        const today = new Date()
        let from = ''
        let to = ''

        if (period === 'this_month') {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
            from = firstDay.toISOString().split('T')[0]
            to = today.toISOString().split('T')[0]
        } else if (period === 'last_month') {
            const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
            const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
            from = firstDayLastMonth.toISOString().split('T')[0]
            to = lastDayLastMonth.toISOString().split('T')[0]
        } else if (period === 'this_year') {
            const firstDayYear = new Date(today.getFullYear(), 0, 1)
            const lastDayYear = new Date(today.getFullYear(), 11, 31)
            from = firstDayYear.toISOString().split('T')[0]
            to = lastDayYear.toISOString().split('T')[0]
        }
        return { from, to }
    }

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

    const handlePeriodChange = (period: string) => {
        const params = new URLSearchParams(searchParams.toString())
        
        if (period && period !== 'custom') {
            const { from, to } = getPeriodDates(period)
            setFilters(prev => ({ ...prev, period, date_from: from, date_to: to }))
            params.set('period', period)
            params.set('date_from', from)
            params.set('date_to', to)
        } else if (period === 'custom') {
            setFilters(prev => ({ ...prev, period }))
            params.set('period', 'custom')
            // Mantener fechas vacías al principio para que el usuario elija
        } else {
            setFilters(prev => ({ ...prev, period: '', date_from: '', date_to: '' }))
            params.delete('period')
            params.delete('date_from')
            params.delete('date_to')
        }
        
        router.push(`/expenses?${params.toString()}`)
    }

    const clearFilters = () => {
        setFilters({
            user_id: '',
            branch: '',
            expense_category: '',
            payment_method: '',
            area: '',
            period: '',
            date_from: '',
            date_to: ''
        })
        router.push('/expenses')
    }

    const hasActiveFilters = filters.user_id || filters.branch || filters.expense_category || filters.payment_method || filters.area || filters.period || filters.date_from || filters.date_to

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
                {/* User Filter (Manager/Admin Only) */}
                {isManagerOrAdmin && (
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
                )}

                {/* Branch Filter (Manager/Admin Only) */}
                {isManagerOrAdmin && (
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
                )}

                {/* Area Filter (Manager/Admin Only) */}
                {isManagerOrAdmin && (
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>Área</label>
                        <select
                            className={styles.select}
                            value={filters.area}
                            onChange={(e) => handleChange('area', e.target.value)}
                        >
                            <option value="">Todas</option>
                            {AREAS.map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Date Period Filter */}
                <div className={styles.fieldGroup}>
                    <label className={styles.label}>Período</label>
                    <select
                        className={styles.select}
                        value={filters.period}
                        onChange={(e) => handlePeriodChange(e.target.value)}
                    >
                        <option value="">Todos</option>
                        <option value="this_month">Este Mes</option>
                        <option value="last_month">Mes Anterior</option>
                        <option value="this_year">Este Año</option>
                        <option value="custom">Rango Personalizado</option>
                    </select>
                </div>

                {/* Custom Date Range: From */}
                {filters.period === 'custom' && (
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>Desde</label>
                        <input
                            type="date"
                            className={styles.input}
                            value={filters.date_from}
                            onChange={(e) => handleChange('date_from', e.target.value)}
                        />
                    </div>
                )}

                {/* Custom Date Range: To */}
                {filters.period === 'custom' && (
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>Hasta</label>
                        <input
                            type="date"
                            className={styles.input}
                            value={filters.date_to}
                            onChange={(e) => handleChange('date_to', e.target.value)}
                        />
                    </div>
                )}

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
