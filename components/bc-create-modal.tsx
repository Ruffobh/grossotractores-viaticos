'use client'

import { useState, useMemo, useEffect } from 'react'
import { X, Search, FileText, CheckCircle, AlertTriangle, Loader2, Building2, ExternalLink } from 'lucide-react'
import { InvoiceData, generateBCRowsForInvoice } from '@/utils/excel'
import { searchVendorByCuit, createPurchaseInvoiceInBC } from '@/app/(dashboard)/expenses/actions'
import { BC_BRANCH_MAP, BC_AREA_TO_PURCHASER, BC_ACCOUNTS, BC_PURCHASER_CODES, BC_BRANCH_CODES, BC_AREA_CODES } from '@/app/constants'
import { useRouter } from 'next/navigation'
import styles from './BCCreateModal.module.css'

interface BCCreateModalProps {
    isOpen: boolean
    onClose: () => void
    invoice: any
    profile: any
    ownerProfile: any // Profile of the invoice owner (may differ from current user)
}

type Step = 'idle' | 'searching_vendor' | 'vendor_found' | 'vendor_not_found' | 'preview' | 'creating' | 'success' | 'error'

export function BCCreateModal({ isOpen, onClose, invoice, profile, ownerProfile }: BCCreateModalProps) {
    const router = useRouter()
    const [step, setStep] = useState<Step>('idle')
    const [vendor, setVendor] = useState<any>(null)
    const [errorMessage, setErrorMessage] = useState('')
    const [bcInvoiceNumber, setBcInvoiceNumber] = useState('')
    const [bcInvoiceId, setBcInvoiceId] = useState('')
    const [rows, setRows] = useState<any[]>([])

    // Editable header fields
    const defaultPurchaser = ownerProfile?.bc_purchaser_code
        || BC_AREA_TO_PURCHASER[ownerProfile?.area || ''] || ''
    const defaultBcUserId = ownerProfile?.bc_user_id || ''

    const [editPurchaser, setEditPurchaser] = useState(defaultPurchaser)
    const [editBcUserId, setEditBcUserId] = useState(defaultBcUserId)

    // Generate preview rows
    useEffect(() => {
        if (!invoice || !isOpen) return
        const parsed = invoice.parsed_data || {}
        const invoiceData: InvoiceData = {
            vendorName: parsed.vendorName || invoice.vendor_name,
            vendorCuit: parsed.vendorCuit || invoice.vendor_cuit,
            invoiceNumber: parsed.invoiceNumber || invoice.invoice_number,
            invoiceType: invoice.invoice_type || parsed.invoiceType || 'FC',
            date: parsed.date || invoice.date,
            totalAmount: parsed.totalAmount || invoice.total_amount || 0,
            netAmount: parsed.netAmount,
            perceptionsAmount: parsed.perceptionsAmount,
            currency: parsed.currency || invoice.currency || 'ARS',
            exchangeRate: parsed.exchangeRate || 1,
            taxes: parsed.taxes || [],
            items: parsed.items || [],
            userBranch: invoice.branch || ownerProfile?.branch,
            userArea: ownerProfile?.area,
            expenseType: invoice.expense_category
        }
        if ((!invoiceData.taxes || invoiceData.taxes.length === 0) && parsed.tax_amount) {
            invoiceData.taxes = [{ name: "IVA Estimado", amount: parsed.tax_amount }]
        }
        setRows(generateBCRowsForInvoice(invoiceData))
    }, [invoice, ownerProfile, isOpen])

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setStep('idle')
            setVendor(null)
            setErrorMessage('')
            setBcInvoiceNumber('')
            setBcInvoiceId('')
            setEditPurchaser(defaultPurchaser)
            setEditBcUserId(defaultBcUserId)
        }
    }, [isOpen])

    const handleStart = async () => {
        const cuit = (invoice.vendor_cuit || '').trim()
        if (!cuit) {
            setErrorMessage('El comprobante no tiene CUIT de proveedor')
            setStep('error')
            return
        }

        setStep('searching_vendor')
        const result = await searchVendorByCuit(cuit)

        if (result.error) {
            if (result.error === 'VENDOR_NOT_FOUND') {
                setErrorMessage(`No se encontró un proveedor con CUIT ${cuit} en Business Central. Verifique que el proveedor esté cargado en BC con ese CUIT.`)
                setStep('vendor_not_found')
            } else {
                setErrorMessage(`Error al buscar el CUIT ${cuit} en Business Central: ${result.error}`)
                setStep('error')
            }
            return
        }

        if (!result.found || !result.vendors?.length) {
            setErrorMessage(`No se encontró un proveedor con CUIT ${cuit} en Business Central. Verifique que el proveedor esté dado de alta en BC con ese número de CUIT.`)
            setStep('vendor_not_found')
            return
        }

        setVendor(result.vendors[0])
        setStep('vendor_found')
    }

    const handleCreate = async () => {
        setStep('creating')
        const customLines = rows.map(row => ({
            account: row.n,
            description: row.descripcion || '',
            unitCost: parseFloat(String(row.coste_unit).replace(/\./g, '').replace(',', '.')) || 0,
            sucursal: row.sucursal,
            area: row.area,
            vatGroup: row.grupo_iva,
            areaDim: row.area,
            taxAreaCode: row.cod_area_impuesto,
        }))
        const overrides = editPurchaser !== defaultPurchaser ? { purchaser: editPurchaser } : undefined
        const result = await createPurchaseInvoiceInBC(invoice.id, customLines, overrides)

        if (result.error) {
            if (result.error === 'VENDOR_NOT_FOUND') {
                setErrorMessage((result as any).message || 'Proveedor no encontrado')
                setStep('vendor_not_found')
            } else {
                setErrorMessage(typeof result.error === 'string' ? result.error : 'Error desconocido')
                setStep('error')
            }
            return
        }

        setBcInvoiceNumber(result.bcInvoiceNumber || '')
        setBcInvoiceId(result.bcInvoiceId || '')
        setStep('success')
    }

    const handleClose = () => {
        if (step === 'success') {
            window.location.reload()
        } else {
            onClose()
        }
    }

    const purchaserCode = ownerProfile?.bc_purchaser_code
        || BC_AREA_TO_PURCHASER[ownerProfile?.area || ''] || '—'
    const branchCode = BC_BRANCH_MAP[invoice?.branch || ownerProfile?.branch || ''] || 'GRAL'

    if (!isOpen) return null

    const isCompact = step !== 'vendor_found'

    return (
        <div className={styles.overlay}>
            <div className={`${styles.modal} ${isCompact ? styles.modalCompact : ''}`}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <div className={styles.iconWrapper}>
                            <Building2 size={24} />
                        </div>
                        <div>
                            <h2 className={styles.title}>Cargar a Business Central</h2>
                            <p className={styles.subtitle}>Crear factura de compra en BC automáticamente</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className={styles.closeButton} disabled={step === 'creating'}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>

                    {/* IDLE - Initial state */}
                    {step === 'idle' && (
                        <div className={styles.stepContainer}>
                            <div className={styles.summaryCard}>
                                <h3>Resumen del comprobante</h3>
                                <div className={styles.summaryGrid}>
                                    <div><span className={styles.label}>Proveedor</span><span className={styles.value}>{invoice.vendor_name}</span></div>
                                    <div><span className={styles.label}>CUIT</span><span className={styles.value}>{invoice.vendor_cuit || '—'}</span></div>
                                    <div><span className={styles.label}>Nº Factura</span><span className={styles.value}>{invoice.invoice_number || '—'}</span></div>
                                    <div><span className={styles.label}>Fecha</span><span className={styles.value}>{invoice.date}</span></div>
                                    <div><span className={styles.label}>Total</span><span className={styles.value}>${Number(invoice.total_amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>
                                    <div><span className={styles.label}>Tipo</span><span className={styles.value}>{invoice.invoice_type || '—'}</span></div>
                                    <div><span className={styles.label}>Cód. Comprador</span><span className={styles.value}>{purchaserCode}</span></div>
                                    <div><span className={styles.label}>Sucursal</span><span className={styles.value}>{branchCode}</span></div>
                                </div>
                            </div>
                            <button onClick={handleStart} className={styles.primaryButton}>
                                <Search size={18} />
                                Buscar proveedor y continuar
                            </button>
                        </div>
                    )}

                    {/* SEARCHING */}
                    {step === 'searching_vendor' && (
                        <div className={styles.stepContainer}>
                            <div className={styles.statusIcon}>
                                <Loader2 size={48} className={styles.spinner} />
                            </div>
                            <p className={styles.statusText}>Buscando proveedor en Business Central...</p>
                            <p className={styles.statusSubtext}>CUIT: {invoice.vendor_cuit}</p>
                        </div>
                    )}

                    {/* VENDOR NOT FOUND */}
                    {step === 'vendor_not_found' && (
                        <div className={styles.stepContainer}>
                            <div className={`${styles.statusIcon} ${styles.warning}`}>
                                <AlertTriangle size={48} />
                            </div>
                            <p className={styles.statusText}>Proveedor no encontrado</p>
                            <p className={styles.statusSubtext}>{errorMessage}</p>
                            <div className={styles.buttonGroup}>
                                <button onClick={handleStart} className={styles.secondaryButton}>
                                    <Search size={18} />
                                    Reintentar búsqueda
                                </button>
                                <button onClick={handleClose} className={styles.cancelButton}>Cerrar</button>
                            </div>
                        </div>
                    )}

                    {/* VENDOR FOUND - Preview with full editable data */}
                    {(step === 'vendor_found') && (
                        <div className={styles.stepContainer}>
                            <div className={`${styles.statusIcon} ${styles.successSmall}`}>
                                <CheckCircle size={32} />
                            </div>
                            <p className={styles.vendorFound}>
                                Proveedor encontrado: <strong>{vendor?.number} — {vendor?.displayName}</strong>
                            </p>
                            {vendor?.city && (
                                <p className={styles.vendorCounty}>Ciudad: {vendor.city}</p>
                            )}

                            {/* Invoice Header - Editable */}
                            <div className={styles.headerPreview}>
                                <h4>Cabecera de factura:</h4>
                                <div className={styles.headerGrid}>
                                    <div className={styles.headerField}>
                                        <label>Nº Proveedor</label>
                                        <span className={styles.headerValue}>{vendor?.number}</span>
                                    </div>
                                    <div className={styles.headerField}>
                                        <label>Fecha</label>
                                        <span className={styles.headerValue}>{invoice.date}</span>
                                    </div>
                                    <div className={styles.headerField}>
                                        <label>Nº Factura</label>
                                        <span className={styles.headerValue}>{invoice.invoice_number || '—'}</span>
                                    </div>
                                    <div className={styles.headerField}>
                                        <label>Cód. Comprador</label>
                                        <select
                                            className={styles.editSelect}
                                            value={editPurchaser}
                                            onChange={(e) => setEditPurchaser(e.target.value)}
                                        >
                                            <option value="">Sin asignar</option>
                                            {BC_PURCHASER_CODES.map(pc => (
                                                <option key={pc.code} value={pc.code}>
                                                    {pc.code}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={styles.headerField}>
                                        <label>Id. Usuario BC</label>
                                        <span className={styles.headerValue}>{editBcUserId || '—'}</span>
                                    </div>
                                </div>
                            </div>

                            {invoice.comments && (
                                <div className={styles.commentsPreview}>
                                    <h4>Comentarios del usuario:</h4>
                                    <div className={styles.commentBox}>
                                        <p>{invoice.comments}</p>
                                    </div>
                                </div>
                            )}

                            {/* Lines preview - full columns, scrollable */}
                            <div className={styles.previewSection}>
                                <h4>Líneas a crear:</h4>
                                <div className={styles.previewTableScroll}>
                                    <table className={styles.fullTable}>
                                        <thead>
                                            <tr>
                                                <th>Tipo</th>
                                                <th>Cuenta</th>
                                                <th>Descripción</th>
                                                <th>Grupo IVA</th>
                                                <th>Cant.</th>
                                                <th>Costo Unit.</th>
                                                <th>Cód. Área Imp.</th>
                                                <th>Desc.</th>
                                                <th>Importe</th>
                                                <th>Sucursal</th>
                                                <th>Área</th>
                                                <th>OP</th>
                                                <th>Prov.</th>
                                                <th>UDN</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((row, idx) => (
                                                <tr key={idx}>
                                                    <td><code>{row.tipo}</code></td>
                                                    <td>
                                                        <select
                                                            className={styles.editSelect}
                                                            value={row.n}
                                                            onChange={(e) => {
                                                                const updated = [...rows]
                                                                updated[idx] = { ...updated[idx], n: e.target.value }
                                                                setRows(updated)
                                                            }}
                                                        >
                                                            {BC_ACCOUNTS.map(acc => (
                                                                <option key={acc.code} value={acc.code}>
                                                                    {acc.code} - {acc.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className={styles.editInput}
                                                            value={row.descripcion}
                                                            onChange={(e) => {
                                                                const updated = [...rows]
                                                                updated[idx] = { ...updated[idx], descripcion: e.target.value }
                                                                setRows(updated)
                                                            }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <span className={`${styles.badge} ${row.grupo_iva.includes('21') ? styles.badgePurple : styles.badgeGray}`}>
                                                            {row.grupo_iva}
                                                        </span>
                                                    </td>
                                                    <td className={styles.mono}>{row.cantidad}</td>
                                                    <td className={styles.mono}>${row.coste_unit}</td>
                                                    <td><code>{row.cod_area_impuesto}</code></td>
                                                    <td>{row.descuento || '—'}</td>
                                                    <td className={styles.mono}>${row.importe}</td>
                                                    <td>
                                                        <select
                                                            className={styles.editSelect}
                                                            value={row.sucursal}
                                                            onChange={(e) => {
                                                                const updated = [...rows]
                                                                updated[idx] = { ...updated[idx], sucursal: e.target.value }
                                                                setRows(updated)
                                                            }}
                                                        >
                                                            {BC_BRANCH_CODES.map(b => (
                                                                <option key={b.code} value={b.code}>
                                                                    {b.code} - {b.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <select
                                                            className={styles.editSelect}
                                                            value={row.area}
                                                            onChange={(e) => {
                                                                const updated = [...rows]
                                                                updated[idx] = { ...updated[idx], area: e.target.value }
                                                                setRows(updated)
                                                            }}
                                                        >
                                                            {BC_AREA_CODES.map(a => (
                                                                <option key={a.code} value={a.code}>
                                                                    {a.code}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td>{row.op || '—'}</td>
                                                    <td>{row.provincia || '—'}</td>
                                                    <td><code>{row.udn}</code></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <button onClick={handleCreate} className={`${styles.primaryButton} ${styles.fullWidth}`}>
                                <FileText size={18} />
                                Confirmar y crear factura en BC
                            </button>
                        </div>
                    )}

                    {/* CREATING */}
                    {step === 'creating' && (
                        <div className={styles.stepContainer}>
                            <div className={styles.statusIcon}>
                                <Loader2 size={48} className={styles.spinner} />
                            </div>
                            <p className={styles.statusText}>Creando factura de compra en BC...</p>
                            <p className={styles.statusSubtext}>Esto puede tomar unos segundos</p>
                        </div>
                    )}

                    {/* SUCCESS */}
                    {step === 'success' && (
                        <div className={styles.stepContainer}>
                            <div className={`${styles.statusIcon} ${styles.success}`}>
                                <CheckCircle size={64} />
                            </div>
                            <p className={styles.statusText}>¡Factura creada exitosamente!</p>
                            {bcInvoiceNumber && (
                                <div className={styles.invoiceNumber}>
                                    <span>Nº en BC:</span>
                                    <strong>{bcInvoiceNumber}</strong>
                                </div>
                            )}
                            <p className={styles.statusSubtext}>
                                El comprobante fue marcado como cargado a BC.
                            </p>
                            <div className={styles.buttonGroup}>
                                {bcInvoiceNumber && (
                                    <a
                                        href={`https://businesscentral.dynamics.com/4af316b5-92f0-4e36-9242-99fd5953ae01/Production?company=GROSSO%20TRACTORES%20S.A&page=51&filter='No.'%20IS%20'${encodeURIComponent(bcInvoiceNumber)}'`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.secondaryButton}
                                    >
                                        <ExternalLink size={18} />
                                        Abrir en BC
                                    </a>
                                )}
                                <button onClick={handleClose} className={styles.primaryButton}>
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ERROR */}
                    {step === 'error' && (
                        <div className={styles.stepContainer}>
                            <div className={`${styles.statusIcon} ${styles.errorIcon}`}>
                                <AlertTriangle size={48} />
                            </div>
                            <p className={styles.statusText}>Error</p>
                            <p className={styles.statusSubtext}>{errorMessage}</p>
                            <div className={styles.buttonGroup}>
                                <button onClick={handleStart} className={styles.secondaryButton}>Reintentar</button>
                                <button onClick={handleClose} className={styles.cancelButton}>Cerrar</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
