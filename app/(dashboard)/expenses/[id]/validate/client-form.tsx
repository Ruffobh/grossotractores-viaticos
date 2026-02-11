'use client'

import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, Users } from 'lucide-react'
import { updateInvoice } from './actions'
import { deleteExpense } from '../../actions'
import { SplitExpenseModal } from '@/components/split-expense-modal'
import { useRouter } from 'next/navigation'
import { EXPENSE_TYPES, PAYMENT_METHODS, INVOICE_TYPES } from '@/app/constants'

interface ValidationFormProps {
    invoice: any
    cardConsumption: number
    cashConsumption: number
    cardLimit: number
    cashLimit: number
    styles: any
}

export function ValidationForm({ invoice, cardConsumption, cashConsumption, cardLimit, cashLimit, styles }: ValidationFormProps) {
    // 1. Initialize with empty strings if data is missing, forcing user selection
    const [paymentMethod, setPaymentMethod] = useState<string>(invoice.payment_method || '')
    const [expenseCategory, setExpenseCategory] = useState<string>(invoice.expense_category || '')
    const [date, setDate] = useState<string>(invoice.date ? invoice.date.split('T')[0] : '')
    const [isDateInvalid, setIsDateInvalid] = useState(false)

    const [amount, setAmount] = useState<number>(invoice.total_amount || 0)
    const [isExceeded, setIsExceeded] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [showSplitModal, setShowSplitModal] = useState(false)
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

    useEffect(() => {
        if (!date) {
            setIsDateInvalid(false)
            return
        }

        // Force YYYY-MM-DD parsing to avoid locale issues
        // If date comes from type="date" input, it should be YYYY-MM-DD
        const [year, month, day] = date.split('-').map(Number)
        const selectedDate = new Date(year, month - 1, day) // Month is 0-indexed in JS Date

        const today = new Date()
        const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const selectedZero = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())

        // Compare dates only by resetting time or just simple diff
        const diffTime = todayZero.getTime() - selectedZero.getTime()
        const diffDays = diffTime / (1000 * 3600 * 24)

        // Strict check: if date is invalid or diff > 7
        if (isNaN(diffDays) || diffDays > 7) {
            setIsDateInvalid(true)
        } else {
            setIsDateInvalid(false)
        }
    }, [date])

    const handleSubmit = (e: React.FormEvent) => {
        // 2. Validate Mandatory Fields
        if (!paymentMethod || paymentMethod === '') {
            e.preventDefault()
            alert('Por favor seleccione una Forma de Pago')
            return
        }
        if (!expenseCategory || expenseCategory === '') {
            e.preventDefault()
            alert('Por favor seleccione un Tipo de Gasto')
            return
        }

        // REDUNDANT CHECK: Re-calculate to be 100% sure before submitting
        if (date) {
            const [year, month, day] = date.split('-').map(Number)
            const selectedDate = new Date(year, month - 1, day)
            const today = new Date()
            const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            const selectedZero = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
            const diffTime = todayZero.getTime() - selectedZero.getTime()
            const diffDays = diffTime / (1000 * 3600 * 24)

            if (isNaN(diffDays) || diffDays > 7) {
                e.preventDefault()
                alert(`La factura tiene ${diffDays.toFixed(0)} días de antigüedad. El límite es 7 días.`)
                setIsDateInvalid(true)
                return
            }
        } else {
            // Date is required
            e.preventDefault()
            alert('La fecha es obligatoria')
            return
        }

        if (isDateInvalid) {
            e.preventDefault()
            // Alert is shown visually below the input
            return
        }

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
            try {
                const res = await deleteExpense(invoice.id)
                if (res?.error) {
                    alert('Error al cancelar: ' + res.error)
                } else {
                    router.refresh()
                    router.push('/expenses')
                }
            } catch (error) {
                alert('Ocurrió un error inesperado al cancelar.')
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
                                Consumo: <b>${((paymentMethod === 'Cash' || paymentMethod === 'Transfer' ? cashConsumption : cardConsumption)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</b>
                                <span className="mx-2">|</span>
                                Límite: <b>${((paymentMethod === 'Cash' || paymentMethod === 'Transfer' ? cashLimit : cardLimit)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</b>
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

            {/* Error Alert relocated to top to avoid breaking grid layout */}
            {isDateInvalid && (
                <div className={styles.errorAlert} style={{ marginBottom: '1.5rem' }}>
                    <div className={styles.errorIconWrapper}>
                        <AlertTriangle className={styles.errorIcon} />
                    </div>
                    <div className={styles.errorContent}>
                        <div className={styles.errorTitle}>Fecha Inválida</div>
                        <div className={styles.errorText}>
                            La factura no puede tener más de 7 días de antigüedad.
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.formGrid}>
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
                    <label className={styles.label}>
                        Fecha <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        name="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className={`${styles.input} ${isDateInvalid ? 'border-red-500' : ''}`}
                        required
                    />
                </div>

                <div>
                    <label className={styles.label}>Tipo Factura</label>
                    <select name="invoice_type" defaultValue={invoice.invoice_type || 'FACTURA A'} className={styles.input}>
                        {INVOICE_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
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
                    <label className={styles.label}>
                        Tipo de Gasto <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="expense_category"
                        value={expenseCategory}
                        onChange={(e) => setExpenseCategory(e.target.value)}
                        className={`${styles.input} ${!expenseCategory ? styles.inputInvalid : ''}`}
                        required
                    >
                        <option value="" disabled>Seleccione...</option>
                        {EXPENSE_TYPES.map(t => (
                            <option key={t} value={t} className="text-gray-900 bg-white">{t}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className={styles.label}>
                        Forma de Pago <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="payment_method"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className={`${styles.input} ${!paymentMethod ? styles.inputInvalid : ''}`}
                        required
                    >
                        <option value="" disabled>Seleccione...</option>
                        {PAYMENT_METHODS.map(m => (
                            <option key={m.value} value={m.value} className="text-gray-900 bg-white">{m.label}</option>
                        ))}
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

            <div className="flex flex-col sm:flex-row gap-3 p-4 border-t bg-gray-50 mt-6 rounded-xl">
                <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                    Cancelar
                </button>

                <button
                    type="button"
                    onClick={() => setShowSplitModal(true)}
                    className="flex-1 bg-blue-50 border border-blue-200 text-blue-700 font-bold py-3 px-4 rounded-xl hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center justify-center gap-2"
                    title="Dividir este gasto entre varios usuarios"
                >
                    <Users size={20} />
                    <span>Dividir Gasto</span>
                </button>

                <button
                    type="submit"
                    className="flex-[2] bg-red-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-red-500/30"
                    disabled={isDateInvalid}
                >
                    Confirmar y Guardar
                </button>
            </div>

            {/* Split Expense Modal */}
            {showSplitModal && (
                <SplitExpenseModal
                    invoiceId={invoice.id}
                    totalAmount={amount}
                    onClose={() => setShowSplitModal(false)}
                    onSuccess={() => {
                        setShowSplitModal(false)
                        router.refresh()
                        router.push('/expenses')
                    }}
                />
            )}
        </form>
    )
}
