'use client'

import { useState } from 'react'
import { X, AlertCircle } from 'lucide-react'
import styles from './reject-options-modal.module.css'

interface RejectOptionsModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (isPartial: boolean, amount: number, comment: string) => void
    maxAmount: number
    isLoading?: boolean
}

export function RejectOptionsModal({ isOpen, onClose, onConfirm, maxAmount, isLoading = false }: RejectOptionsModalProps) {
    const [rejectionType, setRejectionType] = useState<'full' | 'partial'>('full')
    const [comment, setComment] = useState('')
    const [amount, setAmount] = useState<number | ''>('')
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const handleConfirm = () => {
        setError(null)
        if (!comment.trim()) {
            setError('Debes ingresar un motivo para el rechazo.')
            return
        }

        let finalAmount = 0
        if (rejectionType === 'partial') {
            if (amount === '' || Number(amount) <= 0) {
                setError('Debes ingresar un monto válido mayor a 0.')
                return
            }
            if (Number(amount) > maxAmount) {
                setError(`El monto rechazado no puede superar el total del comprobante ($${maxAmount}).`)
                return
            }
            finalAmount = Number(amount)
        } else {
            finalAmount = maxAmount // Full rejection means the whole amount is rejected
        }

        onConfirm(rejectionType === 'partial', finalAmount, comment)
    }

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <button onClick={onClose} className={styles.closeButton} disabled={isLoading}>
                    <X size={20} />
                </button>

                <h3 className={styles.title}>Rechazar Comprobante</h3>

                <div className={styles.typeSelector}>
                    <button
                        className={`${styles.typeButton} ${rejectionType === 'full' ? styles.activeFull : ''}`}
                        onClick={() => { setRejectionType('full'); setError(null); }}
                        disabled={isLoading}
                        type="button"
                    >
                        <div className={styles.typeIconFull}><AlertCircle size={20} /></div>
                        <div>
                            <strong>Rechazo Completo</strong>
                            <p>El comprobante es inválido en su totalidad.</p>
                        </div>
                    </button>

                    <button
                        className={`${styles.typeButton} ${rejectionType === 'partial' ? styles.activePartial : ''}`}
                        onClick={() => { setRejectionType('partial'); setError(null); }}
                        disabled={isLoading}
                        type="button"
                    >
                        <div className={styles.typeIconPartial}><AlertCircle size={20} /></div>
                        <div>
                            <strong>Rechazo Parcial</strong>
                            <p>Descontar un monto específico (ej. alcohol).</p>
                        </div>
                    </button>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Motivo del Rechazo</label>
                    <textarea
                        className={styles.textarea}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Explica por qué se rechaza..."
                        disabled={isLoading}
                        rows={3}
                    />
                </div>

                {rejectionType === 'partial' && (
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Monto a Rechazar ($)</label>
                        <input
                            type="number"
                            className={styles.input}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                            placeholder={`Máximo: $${maxAmount}`}
                            disabled={isLoading}
                            min="1"
                            max={maxAmount}
                            step="0.01"
                        />
                        <p className={styles.helperText}>Este monto se debitará al empleado. El resto se pagará/exportará.</p>
                    </div>
                )}

                {error && <div className={styles.errorMessage}>{error}</div>}

                <div className={styles.actions}>
                    <button onClick={onClose} className={styles.cancelButton} disabled={isLoading}>
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`${styles.confirmButton} ${rejectionType === 'full' ? styles.confirmFull : styles.confirmPartial}`}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Procesando...' : `Confirmar Rechazo ${rejectionType === 'full' ? 'Completo' : 'Parcial'}`}
                    </button>
                </div>
            </div>
        </div>
    )
}
