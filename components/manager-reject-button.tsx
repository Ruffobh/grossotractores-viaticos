'use client'

import { useState } from 'react'
import { XCircle, AlertCircle } from 'lucide-react'
import { managerRejectApprovedExpense } from '@/app/(dashboard)/expenses/[id]/actions'
import styles from './admin-actions.module.css' // Reusing styles from AdminActions

interface ManagerRejectButtonProps {
    invoiceId: string
}

export function ManagerRejectButton({ invoiceId }: ManagerRejectButtonProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [comment, setComment] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleOpen = () => {
        setIsOpen(true)
        setComment('')
    }

    const handleClose = () => {
        setIsOpen(false)
        setComment('')
    }

    const handleSubmit = async () => {
        if (!comment.trim()) {
            alert('Por favor, indica un motivo para el rechazo.')
            return
        }

        setIsSubmitting(true)
        try {
            await managerRejectApprovedExpense(invoiceId, comment)
            // Server action redirects, so it might not reach here, but we set submitting just in case
        } catch (error: any) {
            if (error.message === 'NEXT_REDIRECT' || error.digest?.includes('NEXT_REDIRECT')) {
                setIsSubmitting(true)
                return
            }
            console.error(error)
            alert(error.message || 'Ocurrió un error al procesar la solicitud.')
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <button
                onClick={handleOpen}
                className={styles.compactRejectButton}
                disabled={isSubmitting}
            >
                <XCircle size={16} />
                Rechazar
            </button>

            {isOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={`${styles.modalIconWrapper} ${styles.reject}`}>
                            <AlertCircle size={32} />
                        </div>

                        <h3 className={styles.modalTitle}>
                            Rechazar Comprobante
                        </h3>

                        <p className={styles.modalText}>
                            Por favor, indica el motivo del rechazo para que el usuario pueda corregirlo. El presupuesto será devuelto al usuario.
                        </p>

                        <textarea
                            className={styles.textarea}
                            placeholder="Motivo del rechazo (Requerido)"
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
                                className={`${styles.modalButtonConfirm} ${styles.reject}`}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Procesando...' : 'Confirmar Rechazo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
