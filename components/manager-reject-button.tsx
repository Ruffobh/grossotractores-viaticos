'use client'

import { useState } from 'react'
import { XCircle, AlertCircle } from 'lucide-react'
import { managerRejectApprovedExpense } from '@/app/(dashboard)/expenses/[id]/actions'
import { RejectOptionsModal } from './reject-options-modal'
import styles from './admin-actions.module.css'

interface ManagerRejectButtonProps {
    invoiceId: string
    totalAmount: number
}

export function ManagerRejectButton({ invoiceId, totalAmount }: ManagerRejectButtonProps) {
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

    const handleRejectConfirm = async (isPartial: boolean, amount: number, rejectComment: string) => {
        setIsSubmitting(true)
        try {
            await managerRejectApprovedExpense(invoiceId, rejectComment, isPartial, amount)
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

            <RejectOptionsModal
                isOpen={isOpen}
                onClose={handleClose}
                onConfirm={handleRejectConfirm}
                maxAmount={totalAmount}
                isLoading={isSubmitting}
            />
        </>
    )
}
