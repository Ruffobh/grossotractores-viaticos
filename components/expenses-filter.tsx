'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Filter, X } from 'lucide-react'
import { useState, useEffect } from 'react'

interface FilterProps {
    users: { id: string, full_name: string | null }[]
    branches: { id: string, name: string }[]
    isManagerOrAdmin: boolean
}

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
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-3 text-gray-700 font-semibold text-sm">
                <Filter size={16} />
                <span>Filtros Avanzados</span>
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="ml-auto text-xs text-red-600 flex items-center gap-1 hover:underline"
                    >
                        <X size={12} /> Limpiar todo
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* User Filter */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Usuario</label>
                    <select
                        className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
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
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Sucursal</label>
                    <select
                        className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
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
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Gasto</label>
                    <select
                        className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                        value={filters.expense_category}
                        onChange={(e) => handleChange('expense_category', e.target.value)}
                    >
                        <option value="">Todos</option>
                        <option value="Comida">Comida</option>
                        <option value="Alojamiento">Alojamiento</option>
                        <option value="Combustible">Combustible</option>
                        <option value="Peaje">Peaje</option>
                        <option value="Varios">Varios</option>
                    </select>
                </div>

                {/* Payment Method Filter */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Forma de Pago</label>
                    <select
                        className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                        value={filters.payment_method}
                        onChange={(e) => handleChange('payment_method', e.target.value)}
                    >
                        <option value="">Todas</option>
                        <option value="Cash">Efectivo</option>
                        <option value="Card">Tarjeta</option>
                        <option value="Transfer">Transferencia</option>
                    </select>
                </div>
            </div>
        </div>
    )
}
