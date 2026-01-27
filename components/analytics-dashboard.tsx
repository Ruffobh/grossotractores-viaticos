'use client'

import React from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line
} from 'recharts'
import styles from './analytics.module.css'

interface Invoice {
    id: string
    total_amount: number | null
    currency: string | null
    invoice_type: string | null
    date: string
    vendor_name: string | null
    profiles?: {
        branch: string | null
        area: string | null
    } | null
}

interface AnalyticsDashboardProps {
    invoices: Invoice[]
}

const COLORS = ['#004589', '#FFD300', '#00C49F', '#FF8042', '#8884d8', '#82ca9d']

export function AnalyticsDashboard({ invoices }: AnalyticsDashboardProps) {

    // 1. Process Data: Total by Branch
    const branchDataMap = new Map<string, number>()
    invoices.forEach(inv => {
        const branch = inv.profiles?.branch || 'Sin Sucursal'
        const amount = inv.total_amount || 0
        if (inv.currency === 'ARS') {
            branchDataMap.set(branch, (branchDataMap.get(branch) || 0) + amount)
        }
    })
    const branchData = Array.from(branchDataMap.entries()).map(([name, value]) => ({ name, value }))

    // 2. Process Data: Invoice Type Distribution
    const typeDataMap = new Map<string, number>()
    invoices.forEach(inv => {
        const type = inv.invoice_type || 'Otros'
        typeDataMap.set(type, (typeDataMap.get(type) || 0) + 1)
    })
    const typeData = Array.from(typeDataMap.entries()).map(([name, value]) => ({ name, value }))

    // 3. Process Data: Timeline
    const timelineDataMap = new Map<string, number>()
    invoices.forEach(inv => {
        const date = new Date(inv.date).toLocaleDateString()
        const amount = inv.total_amount || 0
        if (inv.currency === 'ARS') {
            timelineDataMap.set(date, (timelineDataMap.get(date) || 0) + amount)
        }
    })
    const timelineData = Array.from(timelineDataMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())

    return (
        <div className={styles.container}>
            <div className={styles.grid}>

                {/* Gastos por Sucursal */}
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Gastos por Sucursal (ARS)</h3>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={branchData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} tick={{ fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                <YAxis fontSize={12} tick={{ fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                                <Tooltip
                                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Monto']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Bar dataKey="value" fill="#004589" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distribución por Tipo */}
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Distribución por Tipo de Factura</h3>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={typeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {typeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Monto']} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Evolución Temporal */}
                <div className={`${styles.card} ${styles.fullWidth}`}>
                    <h3 className={styles.cardTitle}>Evolución de Gastos</h3>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={timelineData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} tick={{ fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                <YAxis fontSize={12} tick={{ fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                                <Tooltip
                                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Monto']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#FFD300"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#FFD300', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    )
}
