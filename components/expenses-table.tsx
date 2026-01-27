'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import styles from './expenses-table.module.css'
import { deleteExpense } from '@/app/(dashboard)/expenses/actions'
import { useRouter } from 'next/navigation'

interface Expense {
    id: string
    date: string
    vendor_name: string | null
    invoice_type: string | null
    total_amount: number | null
    currency: string | null
    status: string | null
    profiles?: {
        full_name: string | null
    } | null
    [key: string]: any
}

export function ExpensesTable({ expenses, isManagerOrAdmin }: { expenses: Expense[], isManagerOrAdmin: boolean }) {
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const router = useRouter()

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este comprobante? Esta acción no se puede deshacer.')) return

        setIsDeleting(id)
        const result = await deleteExpense(id)

        if (result?.error) {
            alert(result.error)
            setIsDeleting(null)
        } else {
            router.refresh()
            setIsDeleting(null)
        }
    }

    return (
        <div>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            {isManagerOrAdmin && <th>Usuario</th>}
                            <th>Proveedor</th>
                            <th>Tipo</th>
                            <th>Monto</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {expenses.map((expense) => (
                            <tr key={expense.id}>
                                <td data-label="Fecha">{new Date(expense.date).toLocaleDateString()}</td>
                                {isManagerOrAdmin && <td data-label="Usuario">{expense.profiles?.full_name || 'Desconocido'}</td>}
                                <td data-label="Proveedor">{expense.vendor_name}</td>
                                <td data-label="Tipo">{expense.invoice_type}</td>
                                <td className={styles.amount} data-label="Monto">
                                    {expense.currency} {expense.total_amount?.toLocaleString()}
                                </td>
                                <td data-label="Estado">
                                    <span className={`${styles.badge} ${styles[expense.status || 'pending']}`}>
                                        {formatStatus(expense.status)}
                                    </span>
                                </td>
                                <td className={styles.actionsWrapper}>
                                    <Link href={`/expenses/${expense.id}`} className={styles.link}>
                                        Ver
                                    </Link>

                                    {expense.status !== 'submitted_to_bc' && (
                                        <button
                                            onClick={() => handleDelete(expense.id)}
                                            disabled={isDeleting === expense.id}
                                            className={styles.deleteButton}
                                            title="Eliminar"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {expenses.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center p-4 text-gray-500">No se encontraron comprobantes.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function formatStatus(status: string | null) {
    if (!status) return 'Pendiente'
    switch (status) {
        case 'pending_approval': return 'Pendiente'
        case 'approved': return 'Aprobado'
        case 'rejected': return 'Rechazado'
        case 'exceeded_budget': return 'Excede Límite'
        case 'submitted_to_bc': return 'Cargado en BC'
        default: return status
    }
}
