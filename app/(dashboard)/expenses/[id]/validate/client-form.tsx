'use client'

import { useState, useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { updateInvoice } from './actions'
import { deleteExpense } from '../../actions'
import { useRouter } from 'next/navigation'

interface ValidationFormProps {
    invoice: any
    cardConsumption: number
    cashConsumption: number
    cardLimit: number
    cashLimit: number
    styles: any
}

export function ValidationForm({ invoice, cardConsumption, cashConsumption, cardLimit, cashLimit, styles }: ValidationFormProps) {
    const [amount, setAmount] = useState<number>(invoice.total_amount || 0)
    const [paymentMethod, setPaymentMethod] = useState<string>(invoice.payment_method || 'Cash')
    const [isExceeded, setIsExceeded] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const formRef = useRef<HTMLFormElement>(null)
    const isConfirmedRef = useRef(false)
    const router = useRouter()

    useEffect(() => {
        // Calculate based on selected method
        const isCash = paymentMethod === 'Cash' || paymentMethod === 'Transfer'
        const currentUsage = isCash ? cashConsumption : cardConsumption
        const limit = isCash ? cashLimit : cardLimit

        const projectedTotal = currentUsage + amount
        setIsExceeded(projectedTotal > limit)
    }, [amount, paymentMethod, cardConsumption, cashConsumption, cardLimit, cashLimit])

    const handleSubmit = (e: React.FormEvent) => {
        if (isExceeded && !isConfirmedRef.current) {
            e.preventDefault()
            setShowModal(true)
            return
        }
        // If not exceeded or confirmed, allow default submission
    }

    const confirmSubmission = () => {
        isConfirmedRef.current = true
        formRef.current?.requestSubmit()
        setShowModal(false)
    }

    const handleCancel = async () => {
        if (confirm('¿Estás seguro de cancelar la subida? El comprobante se eliminará.')) {
            const res = await deleteExpense(invoice.id)
            if (res?.error) {
                alert('Error al cancelar: ' + res.error)
            } else {
                router.push('/expenses')
            }
        }
    }

    return (
        <form action={updateInvoice} ref={formRef} onSubmit={handleSubmit}>
            <input type="hidden" name="id" value={invoice.id} />

            {/* Modal Logic handled via state and effectively "intercepting" submit */}
            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalIconWrapper}>
                            <AlertTriangle className="text-red-600 w-8 h-8" />
                        </div>
                        <h3 className={styles.modalTitle}>Alerta de Presupuesto</h3>
                        <p className={styles.modalText}>
                            El monto total supera tu límite mensual de <b>{paymentMethod === 'Cash' || paymentMethod === 'Transfer' ? 'Efectivo' : 'Tarjeta'}</b>.
                            <span className={styles.modalStats}>
                                Consumo: <b>${((paymentMethod === 'Cash' || paymentMethod === 'Transfer' ? cashConsumption : cardConsumption)).toLocaleString()}</b>
                                <span className="mx-2">|</span>
                                Límite: <b>${((paymentMethod === 'Cash' || paymentMethod === 'Transfer' ? cashLimit : cardLimit)).toLocaleString()}</b>
                            </span>
                        </p>

                        <div className={styles.modalButtons}>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className={styles.modalButtonCancel}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmSubmission}
                                className={styles.modalButtonConfirm}
                            >
                                Solicitar Aprobación
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.formGrid}>
                {/* ... existing fields ... */}

                <div className={styles.fullWidth}>
                    <label className={styles.label}>Proveedor (Razón Social)</label>
                    <input
                        name="vendor_name"
                        defaultValue={invoice.vendor_name || ''}
                        className={styles.input}
                        required
                    />
                </div>

                <div>
                    <label className={styles.label}>CUIT</label>
                    <input
                        name="vendor_cuit"
                        defaultValue={invoice.vendor_cuit || ''}
                        className={styles.input}
                    />
                </div>

                <div>
                    <label className={styles.label}>Fecha</label>
                    <input
                        type="date"
                        name="date"
                        defaultValue={invoice.date ? invoice.date.split('T')[0] : ''}
                        className={styles.input}
                        required
                    />
                </div>

                <div>
                    <label className={styles.label}>Tipo Factura</label>
                    <select name="invoice_type" defaultValue={invoice.invoice_type || 'Ticket'} className={styles.input}>
                        <option value="A">Factura A</option>
                        <option value="B">Factura B</option>
                        <option value="C">Factura C</option>
                        <option value="M">Factura M</option>
                        <option value="Ticket">Ticket</option>
                    </select>
                </div>

                <div>
                    <label className={styles.label}>Total</label>
                    <input
                        type="number"
                        step="0.01"
                        name="total_amount"
                        value={amount}
                        onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                        className={styles.input}
                        required
                    />
                </div>

                <div>
                    <label className={styles.label}>Moneda</label>
                    <select name="currency" defaultValue={invoice.currency || 'ARS'} className={styles.input}>
                        <option value="ARS">ARS</option>
                        <option value="USD">USD</option>
                    </select>
                </div>

                <div>
                    <label className={styles.label}>Tipo de Gasto</label>
                    <select name="expense_category" defaultValue={invoice.expense_category || 'Varios'} className={styles.input}>
                        <option value="Comida">Comida</option>
                        <option value="Alojamiento">Alojamiento</option>
                        <option value="Combustible">Combustible</option>
                        <option value="Peaje">Peaje</option>
                        <option value="Varios">Varios</option>
                    </select>
                </div>

                <div>
                    <label className={styles.label}>Forma de Pago</label>
                    <select
                        name="payment_method"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className={styles.input}
                    >
                        <option value="Cash">Efectivo</option>
                        <option value="Card">Tarjeta</option>
                        <option value="Transfer">Transferencia</option>
                    </select>
                </div>

                <div className={styles.fullWidth}>
                    <label className={styles.label}>Comentarios</label>
                    <textarea
                        name="comments"
                        rows={3}
                        defaultValue={invoice.comments || ''}
                        className={styles.input}
                    />
                </div>
            </div>

            <div className={styles.actions}>
                <button
                    type="button"
                    onClick={handleCancel}
                    className={styles.deleteActionBtn}
                >
                    Cancelar
                </button>
                <button type="submit" className={styles.saveButton}>Confirmar y Guardar</button>
            </div>
        </form>
    )
}
