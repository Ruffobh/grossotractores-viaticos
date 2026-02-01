'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trash2, Search, Download, ArrowUp, ArrowDown } from 'lucide-react'
import styles from './expenses-table.module.css'
import { deleteExpense } from '@/app/(dashboard)/expenses/actions'
import { useRouter } from 'next/navigation'

interface Expense {
    id: string
    date: string
    vendor_name: string | null
    invoice_number: string | null
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
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' }) // Default sort
    const router = useRouter()

    const handleDeleteClick = (id: string) => {
        setDeleteId(id)
    }

    const confirmDelete = async () => {
        if (!deleteId) return

        setIsDeleting(true)
        const result = await deleteExpense(deleteId)

        if (result?.error) {
            alert(result.error)
            setIsDeleting(false)
            setDeleteId(null) // Close modal on error? Or keep open? Let's close.
        } else {
            router.refresh()
            setIsDeleting(false)
            setDeleteId(null)
        }
    }

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedExpenses = () => {
        let filtered = [...expenses];

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(expense =>
                (expense.vendor_name?.toLowerCase().includes(lowerTerm)) ||
                (expense.invoice_number?.toLowerCase().includes(lowerTerm)) ||
                (expense.profiles?.full_name?.toLowerCase().includes(lowerTerm)) ||
                (expense.total_amount?.toString().includes(lowerTerm))
            );
        }

        if (sortConfig) {
            filtered.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle nested profile name
                if (sortConfig.key === 'user') {
                    aValue = a.profiles?.full_name || '';
                    bValue = b.profiles?.full_name || '';
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return filtered;
    };

    const exportToExcel = async () => {
        const ExcelJS = (await import('exceljs')).default;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Comprobantes');

        // Set column widths but NOT headers (Table will handle headers)
        worksheet.getColumn(1).width = 12; // Fecha
        worksheet.getColumn(2).width = 25; // Usuario
        worksheet.getColumn(3).width = 25; // Proveedor
        worksheet.getColumn(4).width = 20; // N° Comp
        worksheet.getColumn(5).width = 15; // Tipo
        worksheet.getColumn(6).width = 15; // Monto
        worksheet.getColumn(7).width = 10; // Moneda
        worksheet.getColumn(8).width = 15; // Estado

        // Prepare data
        const rows = getSortedExpenses().map(exp => [
            new Date(exp.date).toLocaleDateString('es-AR'),
            exp.profiles?.full_name || 'Desconocido',
            exp.vendor_name || '',
            exp.invoice_number || '',
            exp.invoice_type || '',
            exp.total_amount || 0,
            exp.currency || 'ARS',
            formatStatus(exp.status)
        ]);

        // Add Table with "TableStyleMedium2" (Blue with headers and filters)
        worksheet.addTable({
            name: 'ComprobantesTable',
            ref: 'A1',
            headerRow: true,
            style: {
                theme: 'TableStyleMedium2',
                showRowStripes: true,
            },
            columns: [
                { name: 'Fecha', filterButton: true },
                { name: 'Usuario', filterButton: true },
                { name: 'Proveedor', filterButton: true },
                { name: 'N° Comprobante', filterButton: true },
                { name: 'Tipo', filterButton: true },
                { name: 'Monto', filterButton: true },
                { name: 'Moneda', filterButton: true },
                { name: 'Estado', filterButton: true },
            ],
            rows: rows,
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `comprobantes_${new Date().toISOString().split('T')[0]}.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const displayedExpenses = getSortedExpenses();

    return (
        <div>
            {isManagerOrAdmin && (
                <div className={styles.controlsBar}>
                    <div className={styles.searchWrapper}>
                        <Search className={styles.searchIcon} size={18} />
                        <input
                            type="text"
                            placeholder="Buscar (Proveedor, Usuario, N°...)"
                            className={styles.searchInput}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button onClick={exportToExcel} className={styles.exportButton}>
                        <Download size={18} /> Exportar Excel
                    </button>
                </div>
            )}

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th onClick={() => isManagerOrAdmin && handleSort('date')} className={isManagerOrAdmin ? styles.sortableHeader : ''}>
                                Fecha {isManagerOrAdmin && sortConfig?.key === 'date' && (sortConfig.direction === 'asc' ? <ArrowUp size={14} className={styles.sortIcon} /> : <ArrowDown size={14} className={styles.sortIcon} />)}
                            </th>
                            {isManagerOrAdmin && (
                                <th onClick={() => handleSort('user')} className={styles.sortableHeader}>
                                    Usuario {sortConfig?.key === 'user' && (sortConfig.direction === 'asc' ? <ArrowUp size={14} className={styles.activeSort} /> : <ArrowDown size={14} className={styles.activeSort} />)}
                                </th>
                            )}
                            <th onClick={() => isManagerOrAdmin && handleSort('vendor_name')} className={isManagerOrAdmin ? styles.sortableHeader : ''}>
                                Proveedor {isManagerOrAdmin && sortConfig?.key === 'vendor_name' && (sortConfig.direction === 'asc' ? <ArrowUp size={14} className={styles.sortIcon} /> : <ArrowDown size={14} className={styles.sortIcon} />)}
                            </th>
                            <th>N° Comp.</th>
                            <th onClick={() => isManagerOrAdmin && handleSort('invoice_type')} className={isManagerOrAdmin ? styles.sortableHeader : ''}>
                                Tipo {isManagerOrAdmin && sortConfig?.key === 'invoice_type' && (sortConfig.direction === 'asc' ? <ArrowUp size={14} className={styles.sortIcon} /> : <ArrowDown size={14} className={styles.sortIcon} />)}
                            </th>
                            <th onClick={() => isManagerOrAdmin && handleSort('total_amount')} className={isManagerOrAdmin ? styles.sortableHeader : ''}>
                                Monto {isManagerOrAdmin && sortConfig?.key === 'total_amount' && (sortConfig.direction === 'asc' ? <ArrowUp size={14} className={styles.sortIcon} /> : <ArrowDown size={14} className={styles.sortIcon} />)}
                            </th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedExpenses.map((expense) => (
                            <tr key={expense.id}>
                                <td data-label="Fecha"><span className={styles.tableValue}>{new Date(expense.date).toLocaleDateString('es-AR', { timeZone: 'UTC' })}</span></td>
                                {isManagerOrAdmin && <td data-label="Usuario"><span className={styles.cellContent}>{expense.profiles?.full_name || 'Desconocido'}</span></td>}
                                <td data-label="Proveedor"><span className={styles.cellContent}>{expense.vendor_name}</span></td>
                                <td data-label="N° Comp."><span className={styles.cellContent}>{expense.invoice_number || '-'}</span></td>
                                <td data-label="Tipo"><span className={styles.cellContent}>{expense.invoice_type}</span></td>
                                <td className={styles.amount} data-label="Monto">
                                    <span className={styles.tableValue}>
                                        {expense.currency} {expense.total_amount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                    </span>
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

                                    <button
                                        onClick={() => handleDeleteClick(expense.id)}
                                        className={styles.deleteButton}
                                        title="Eliminar"
                                    >
                                        <Trash2 size={16} />
                                    </button>


                                </td>
                            </tr>
                        ))}
                        {displayedExpenses.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center p-4 text-gray-500">No se encontraron comprobantes.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {deleteId && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalIconWrapper}>
                            <Trash2 className="text-red-600 w-8 h-8" />
                        </div>
                        <h3 className={styles.modalTitle}>¿Eliminar Comprobante?</h3>
                        <p className={styles.modalText}>
                            ¿Estás seguro de que deseas eliminar este comprobante permanentemente? Esta acción no se puede deshacer.
                        </p>

                        <div className={styles.modalButtons}>
                            <button
                                onClick={() => setDeleteId(null)}
                                className={styles.modalButtonCancel}
                                disabled={isDeleting}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                className={styles.modalButtonConfirm}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
