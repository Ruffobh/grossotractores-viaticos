'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { approveExpense, rejectExpense } from '@/app/(dashboard)/expenses/[id]/actions'
import styles from './admin-actions.module.css'

interface AdminActionsProps {
    invoiceId: string
}

export function AdminActions({ invoiceId }: AdminActionsProps) {
    const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
    const [comment, setComment] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleAction = (type: 'approve' | 'reject') => {
        setActionType(type)
        setComment('')
    }

    const handleClose = () => {
        setActionType(null)
        setComment('')
    }

    const handleSubmit = async () => {
        if (!actionType) return
        if (actionType === 'reject' && !comment.trim()) {
            alert('Por favor, indica un motivo para el rechazo.')
            return
        }

        setIsSubmitting(true)
        try {
            if (actionType === 'approve') {
                await approveExpense(invoiceId, comment)
            } else {
                await rejectExpense(invoiceId, comment)
            }
            // Server action redirects, so no need to close manually or reset state usually
        } catch (error: any) {
            if (error.message === 'NEXT_REDIRECT' || error.digest?.includes('NEXT_REDIRECT')) {
                // Redirecting, do nothing or explicitly set submitting false
                setIsSubmitting(true) // Keep it true while redirecting
                return
            }
            console.error(error)
            alert('Ocurrió un error al procesar la solicitud.')
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <div className={styles.actions}>
                <button
                    onClick={() => handleAction('approve')}
                    className={styles.approveButton}
                    disabled={isSubmitting}
                >
                    <CheckCircle size={20} />
                    Aprobar
                </button>
                <button
                    onClick={() => handleAction('reject')}
                    className={styles.rejectButton}
                    disabled={isSubmitting}
                >
                    <XCircle size={20} />
                    Rechazar
                </button>
            </div>

            {actionType && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={`${styles.modalIconWrapper} ${styles[actionType]}`}>
                            {actionType === 'approve' ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
                        </div>

                        <h3 className={styles.modalTitle}>
                            {actionType === 'approve' ? 'Aprobar Comprobante' : 'Rechazar Comprobante'}
                        </h3>

                        <p className={styles.modalText}>
                            {actionType === 'approve'
                                ? '¿Estás seguro de que deseas aprobar este comprobante? Puedes dejar un comentario opcional.'
                                : 'Por favor, indica el motivo del rechazo para que el usuario pueda corregirlo.'}
                        </p>

                        <textarea
                            className={styles.textarea}
                            placeholder={actionType === 'approve' ? "Comentario (Opcional)" : "Motivo del rechazo (Requerido)"}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                            autoFocus
                        />

                        <div className={styles.modalButtons}>
                            <button
                                onClick={handleClose}
                                className={styles.modalButtonCancel}
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                className={`${styles.modalButtonConfirm} ${styles[actionType]}`}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Procesando...' : (actionType === 'approve' ? 'Confirmar Aprobación' : 'Confirmar Rechazo')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
