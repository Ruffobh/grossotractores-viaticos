'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { approveExpense, rejectExpense } from '@/app/(dashboard)/expenses/[id]/actions'
import { RejectOptionsModal } from './reject-options-modal'
import styles from './admin-actions.module.css'

interface AdminActionsProps {
    invoiceId: string
    totalAmount: number
}

export function AdminActions({ invoiceId, totalAmount }: AdminActionsProps) {
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

        setIsSubmitting(true)
        try {
            if (actionType === 'approve') {
                await approveExpense(invoiceId, comment)
            }
            // Reject is handled by the new modal now
        } catch (error: any) {
            if (error.message === 'NEXT_REDIRECT' || error.digest?.includes('NEXT_REDIRECT')) {
                setIsSubmitting(true)
                return
            }
            console.error(error)
            alert('Ocurrió un error al procesar la solicitud.')
            setIsSubmitting(false)
        }
    }

    const handleRejectConfirm = async (isPartial: boolean, amount: number, rejectComment: string) => {
        setIsSubmitting(true)
        try {
            await rejectExpense(invoiceId, rejectComment, isPartial, amount)
        } catch (error: any) {
            if (error.message === 'NEXT_REDIRECT' || error.digest?.includes('NEXT_REDIRECT')) {
                setIsSubmitting(true)
                return
            }
            console.error(error)
            alert('Ocurrió un error al rechazar el comprobante.')
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

            {actionType === 'approve' && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={`${styles.modalIconWrapper} ${styles.approve}`}>
                            <CheckCircle size={32} />
                        </div>

                        <h3 className={styles.modalTitle}>
                            Aprobar Comprobante
                        </h3>

                        <p className={styles.modalText}>
                            ¿Estás seguro de que deseas aprobar este comprobante? Puedes dejar un comentario opcional.
                        </p>

                        <textarea
                            className={styles.textarea}
                            placeholder="Comentario (Opcional)"
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
                                className={`${styles.modalButtonConfirm} ${styles.approve}`}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Procesando...' : 'Confirmar Aprobación'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <RejectOptionsModal
                isOpen={actionType === 'reject'}
                onClose={handleClose}
                onConfirm={handleRejectConfirm}
                maxAmount={totalAmount}
                isLoading={isSubmitting}
            />
        </>
    )
}
