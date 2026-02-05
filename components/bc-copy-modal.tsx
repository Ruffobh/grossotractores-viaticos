'use client'

import { useState, useMemo, useEffect } from 'react'
import { Copy, Check, X, Sheet, UploadCloud } from 'lucide-react'
import { InvoiceData, generateBCRowsForInvoice, rowsToTSV } from '@/utils/excel'
import styles from './BCCopyModal.module.css'
import { markInvoiceAsSubmitted } from '@/app/(dashboard)/expenses/actions'
import { useRouter } from 'next/navigation'

interface BCCopyModalProps {
    isOpen: boolean
    onClose: () => void
    invoice: any
    profile: any
}

export function BCCopyModal({ isOpen, onClose, invoice, profile }: BCCopyModalProps) {
    const [copied, setCopied] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()

    const [rows, setRows] = useState<any[]>([])

    useEffect(() => {
        if (!invoice) return

        // Extract the rich data from the JSONB column 'parsed_data'
        // Fallback to top-level columns if parsed_data is missing or old format
        const parsed = invoice.parsed_data || {};

        const invoiceData: InvoiceData = {
            // Prefer parsed_data fields (camelCase) from new logic, fallback to legacy
            vendorName: parsed.vendorName || invoice.vendor_name,
            vendorCuit: parsed.vendorCuit || invoice.vendor_cuit,
            invoiceNumber: parsed.invoiceNumber || invoice.invoice_number,
            invoiceType: parsed.invoiceType || invoice.invoice_type || 'FC', // Default to FC/C
            date: parsed.date || invoice.date,
            totalAmount: parsed.totalAmount || invoice.total_amount || 0,
            // Fallback for Net Amount if explicit
            netAmount: parsed.netAmount,
            // Fallback for Perceptions if explicit
            perceptionsAmount: parsed.perceptionsAmount,

            currency: parsed.currency || invoice.currency || 'ARS',
            exchangeRate: parsed.exchangeRate || 1,

            // Taxes are CRITICAL. If old format (no taxes array), we might need to simulate it 
            // from tax_amount/perceptions_amount headers if valid, or just empty.
            taxes: parsed.taxes || [],

            items: parsed.items || [],

            // Context
            userBranch: invoice.branch || profile?.branch,
            userArea: profile?.area
        }

        // Backward compatibility: If no taxes array but we have tax_amount (old logic), 
        // try to reconstruct basic IVA.
        if ((!invoiceData.taxes || invoiceData.taxes.length === 0) && parsed.tax_amount) {
            invoiceData.taxes = [{ name: "IVA Estimado", amount: parsed.tax_amount }];
        }

        // Same for perceptions if explicit
        if (parsed.perceptions_amount && (!invoiceData.taxes || !invoiceData.taxes.find((t: any) => t.name.includes('Percep')))) {
            invoiceData.taxes.push({ name: "Percepciones Estimadas", amount: parsed.perceptions_amount });
        }

        setRows(generateBCRowsForInvoice(invoiceData))

    }, [invoice, profile])

    const handleRowChange = (index: number, field: string, value: string) => {
        const newRows = [...rows]
        newRows[index] = { ...newRows[index], [field]: value }
        setRows(newRows)
    }

    const handleCopy = async () => {
        const text = rowsToTSV(rows)
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy logic', err)
        }
    }

    const handleMarkAsSubmitted = async () => {
        if (!confirm('¿Estás seguro de que deseas marcar este comprobante como CARGADO en Business Central?')) return

        setIsSubmitting(true)
        const result = await markInvoiceAsSubmitted(invoice.id)

        if (result?.error) {
            alert(result.error)
            setIsSubmitting(false)
        } else {
            router.refresh()
            onClose()
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>

                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <div className={styles.iconWrapper}>
                            <Sheet size={24} />
                        </div>
                        <div>
                            <h2 className={styles.title}>Copiar para Business Central</h2>
                            <p className={styles.subtitle}>Filas listas para pegar en la grilla de BC (formato Excel).</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={24} />
                    </button>
                </div>

                {/* Table Content */}
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Nº</th>
                                <th>Descripción</th>
                                <th>Grupo IVA</th>
                                <th style={{ textAlign: 'right' }}>Cant.</th>
                                <th style={{ textAlign: 'right' }}>Coste</th>
                                <th>Cód. Área</th>
                                <th>% Desc</th>
                                <th style={{ textAlign: 'right' }}>Importe</th>
                                <th>Sucursal</th>
                                <th>Área</th>
                                <th>OP</th>
                                <th>Prov</th>
                                <th>UDN</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => (
                                <tr key={idx}>
                                    <td>
                                        <input
                                            value={row.tipo}
                                            onChange={(e) => handleRowChange(idx, 'tipo', e.target.value)}
                                            className={styles.tableInput}
                                            style={{ fontWeight: 500 }}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            value={row.n}
                                            onChange={(e) => handleRowChange(idx, 'n', e.target.value)}
                                            className={styles.tableInput}
                                            style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            value={row.descripcion}
                                            onChange={(e) => handleRowChange(idx, 'descripcion', e.target.value)}
                                            className={styles.tableInput}
                                            title={row.descripcion}
                                        />
                                    </td>
                                    <td>
                                        <span className={`${styles.badge} ${row.grupo_iva.includes('21') ? styles.badgePurple : styles.badgeGray}`}>
                                            {row.grupo_iva}
                                        </span>
                                    </td>
                                    <td>
                                        <input
                                            value={row.cantidad}
                                            onChange={(e) => handleRowChange(idx, 'cantidad', e.target.value)}
                                            className={styles.tableInput}
                                            style={{ textAlign: 'right' }}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            value={row.coste_unit}
                                            onChange={(e) => handleRowChange(idx, 'coste_unit', e.target.value)}
                                            className={styles.tableInput}
                                            style={{ textAlign: 'right', fontFamily: 'monospace' }}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            value={row.cod_area_impuesto}
                                            onChange={(e) => handleRowChange(idx, 'cod_area_impuesto', e.target.value)}
                                            className={styles.tableInput}
                                            style={{ color: '#9ca3af' }}
                                        />
                                    </td>
                                    <td></td>
                                    <td>
                                        <input
                                            value={row.importe}
                                            onChange={(e) => handleRowChange(idx, 'importe', e.target.value)}
                                            className={styles.tableInput}
                                            style={{ textAlign: 'right', fontWeight: 'bold', color: '#111827' }}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            value={row.sucursal}
                                            onChange={(e) => handleRowChange(idx, 'sucursal', e.target.value)}
                                            className={styles.tableInput}
                                            style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#6b7280' }}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            value={row.area}
                                            onChange={(e) => handleRowChange(idx, 'area', e.target.value)}
                                            className={styles.tableInput}
                                            style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#6b7280' }}
                                        />
                                    </td>
                                    <td></td>
                                    <td>
                                        <input
                                            value={row.provincia}
                                            onChange={(e) => handleRowChange(idx, 'provincia', e.target.value)}
                                            className={styles.tableInput}
                                            style={{ fontSize: '0.75rem' }}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            value={row.udn}
                                            onChange={(e) => handleRowChange(idx, 'udn', e.target.value)}
                                            className={styles.tableInput}
                                            style={{ fontSize: '0.75rem' }}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <p className={styles.footerText}>
                        <span style={{ fontWeight: 'bold', color: '#111827' }}>{rows.length}</span> líneas generadas.
                    </p>
                    <div className={styles.buttonGroup}>
                        <button
                            onClick={handleMarkAsSubmitted}
                            disabled={isSubmitting}
                            className={`${styles.submitButton} ${isSubmitting ? styles.loading : ''}`}
                        >
                            <UploadCloud size={18} />
                            {isSubmitting ? 'Cargando...' : 'Cargado a BC'}
                        </button>

                        <div style={{ width: '1px', background: '#ccc', height: '24px', margin: '0 8px' }}></div>

                        <button
                            onClick={onClose}
                            className={styles.cancelButton}
                        >
                            Cerrar
                        </button>
                        <button
                            onClick={handleCopy}
                            className={`${styles.copyButton} ${copied ? styles.copyButtonCopied : ''}`}
                        >
                            {copied ? (
                                <>
                                    <Check size={18} />
                                    ¡Copiado!
                                </>
                            ) : (
                                <>
                                    <Copy size={18} />
                                    Copiar Filas
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
