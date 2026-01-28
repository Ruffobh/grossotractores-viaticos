'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar, Filter, ChevronDown } from 'lucide-react'
import { MultiSelect } from './multi-select'
import styles from './dashboard-filters.module.css'

interface DashboardFiltersProps {
    branches: string[]
    areas: string[]
    types: string[]
    role: string
}

export function DashboardFilters({ branches, areas, types, role }: DashboardFiltersProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // 1. Date State
    const currentMonth = searchParams.get('month') || (new Date().getMonth() + 1).toString()
    const currentYear = searchParams.get('year') || new Date().getFullYear().toString()

    // 2. Filter State (Arrays)
    const selectedBranches = searchParams.get('branches')?.split(',').filter(Boolean) || []
    const selectedAreas = searchParams.get('areas')?.split(',').filter(Boolean) || []
    const selectedTypes = searchParams.get('types')?.split(',').filter(Boolean) || []

    // Helper to update URL
    const updateParams = (key: string, value: string | string[]) => {
        const params = new URLSearchParams(searchParams)

        if (Array.isArray(value)) {
            if (value.length > 0) params.set(key, value.join(','))
            else params.delete(key)
        } else {
            params.set(key, value)
        }

        // Reset to page 1 if pagination existed (optional)
        router.replace(`/?${params.toString()}`, { scroll: false })
    }

    const months = [
        { value: 'all', label: 'Todo el Año' },
        { value: '1', label: 'Enero' }, { value: '2', label: 'Febrero' },
        { value: '3', label: 'Marzo' }, { value: '4', label: 'Abril' },
        { value: '5', label: 'Mayo' }, { value: '6', label: 'Junio' },
        { value: '7', label: 'Julio' }, { value: '8', label: 'Agosto' },
        { value: '9', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
        { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
    ]
    const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString())

    // Convert string arrays to Option objects
    const branchOptions = branches.map(b => ({ label: b, value: b }))
    const areaOptions = areas.map(a => ({ label: a, value: a }))
    const typeOptions = types.map(t => ({ label: t, value: t }))

    return (
        <div className={styles.container}>
            <div className={styles.filterBar}>
                {/* Date Selection */}
                <div className={styles.dateGroup}>
                    <Calendar size={18} className={styles.dateIcon} />
                    <div className="relative">
                        <select
                            value={currentMonth}
                            onChange={(e) => updateParams('month', e.target.value)}
                            className={styles.select}
                        >
                            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>
                    <div className={styles.divider}></div>
                    <div className="relative">
                        <select
                            value={currentYear}
                            onChange={(e) => updateParams('year', e.target.value)}
                            className={styles.select}
                        >
                            {years.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>

                {/* Filters Group */}
                <div className={styles.filterGroup}>
                    <div className={styles.filterLabel}>
                        <Filter size={16} />
                        <span>Filtros:</span>
                    </div>

                    {(role === 'admin' || role === 'manager') && (
                        <>
                            <div style={{ minWidth: '200px' }}>
                                <MultiSelect
                                    placeholder="Todas las Sucursales"
                                    options={branchOptions}
                                    selected={selectedBranches}
                                    onChange={(val) => updateParams('branches', val)}
                                    disabled={role === 'manager'} // Managers usually only see their branch, but if they manage multiple, let's leave enabled or handled by logic
                                />
                            </div>

                            <div style={{ minWidth: '180px' }}>
                                <MultiSelect
                                    placeholder="Todas las Áreas"
                                    options={areaOptions}
                                    selected={selectedAreas}
                                    onChange={(val) => updateParams('areas', val)}
                                />
                            </div>

                            <div style={{ minWidth: '180px' }}>
                                <MultiSelect
                                    placeholder="Todos los Tipos"
                                    options={typeOptions}
                                    selected={selectedTypes}
                                    onChange={(val) => updateParams('types', val)}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
