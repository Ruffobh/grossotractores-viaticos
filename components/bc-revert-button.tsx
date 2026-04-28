'use client'

import { useState } from 'react'
import { RotateCcw, AlertTriangle, CheckCircle, Loader2, XCircle } from 'lucide-react'
import { revertBCInvoice } from '@/app/(dashboard)/expenses/[id]/actions'
import styles from './BCRevertButton.module.css'

interface BCRevertButtonProps {
    invoiceId: string
    bcInvoiceNumber: string
}

export function BCRevertButton({ invoiceId, bcInvoiceNumber }: BCRevertButtonProps) {
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null)

    const handleRevert = async () => {
        setLoading(true)
        setResult(null)
        try {
            const res = await revertBCInvoice(invoiceId)
            if (res.error) {
                setResult({ error: res.error })
            } else {
                setResult({ success: true })
                // Page will auto-refresh via revalidatePath
                setTimeout(() => window.location.reload(), 1500)
            }
        } catch (e: any) {
            setResult({ error: e.message || 'Error desconocido' })
        } finally {
            setLoading(false)
        }
    }

    if (result?.success) {
        return (
            <div className={styles.successBanner}>
                <CheckCircle size={16} />
                <span>Carga revertida exitosamente. La factura {bcInvoiceNumber} fue eliminada de BC.</span>
            </div>
        )
    }

    return (
        <>
            {!showConfirm ? (
                <button
                    onClick={() => setShowConfirm(true)}
                    className={styles.button}
                    title="Revertir carga de BC"
                >
                    <RotateCcw size={14} />
                    Revertir Carga BC
                </button>
            ) : (
                <div className={styles.confirmBox}>
                    <div className={styles.confirmHeader}>
                        <AlertTriangle size={16} className={styles.warningIcon} />
                        <span>¿Revertir carga de <strong>{bcInvoiceNumber}</strong>?</span>
                    </div>
                    <p className={styles.confirmText}>
                        Se eliminará la factura de compra de BC y el comprobante volverá a estado &quot;Aprobado&quot;.
                        Esto solo funciona si la factura NO fue registrada en BC.
                    </p>
                    {result?.error && (
                        <div className={styles.errorBanner}>
                            <XCircle size={14} />
                            <span>{result.error}</span>
                        </div>
                    )}
                    <div className={styles.confirmActions}>
                        <button
                            onClick={() => { setShowConfirm(false); setResult(null) }}
                            className={styles.cancelBtn}
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleRevert}
                            className={styles.revertBtn}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={14} className={styles.spinner} />
                                    Revirtiendo...
                                </>
                            ) : (
                                <>
                                    <RotateCcw size={14} />
                                    Sí, Revertir
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
