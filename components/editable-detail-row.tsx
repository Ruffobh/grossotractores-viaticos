'use client'

import { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { updateInvoiceField } from '@/app/(dashboard)/expenses/[id]/actions'
import styles from './editable-detail-row.module.css'

interface EditableDetailRowProps {
    label: string
    value: string | number | null
    field: string
    invoiceId: string
    canEdit: boolean
    type?: 'text' | 'date' | 'number' | 'select'
    options?: { label: string, value: string }[]
    isLarge?: boolean
}

export function EditableDetailRow({
    label,
    value,
    field,
    invoiceId,
    canEdit,
    type = 'text',
    options = [],
    isLarge = false
}: EditableDetailRowProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [currentValue, setCurrentValue] = useState(value || '')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleSave = async () => {
        setIsLoading(true)
        const result = await updateInvoiceField(invoiceId, field, currentValue)
        setIsLoading(false)

        if (result?.error) {
            alert(result.error)
        } else {
            setIsEditing(false)
            router.refresh()
        }
    }

    const handleCancel = () => {
        setCurrentValue(value || '')
        setIsEditing(false)
    }

    // Determine display value
    let displayValue = value
    if (type === 'select' && options.length > 0) {
        const option = options.find(o => o.value === value)
        if (option) displayValue = option.label
    } else if (type === 'date' && value) {
        // If it's a date string yyyy-mm-dd, format it
        // But input type=date needs yyyy-mm-dd
        // Display needs locale
        try {
            displayValue = new Date(value as string).toLocaleDateString('es-AR', { timeZone: 'UTC' })
        } catch (e) { displayValue = value }
    }

    return (
        <div className={styles.detailRow}>
            <label className={styles.label}>{label}</label>

            {isEditing ? (
                <div className={styles.editContainer}>
                    {type === 'select' ? (
                        <select
                            className={styles.input}
                            value={currentValue as string}
                            onChange={(e) => setCurrentValue(e.target.value)}
                            disabled={isLoading}
                        >
                            {options.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            type={type}
                            className={styles.input}
                            value={currentValue as string | number}
                            onChange={(e) => setCurrentValue(e.target.value)}
                            disabled={isLoading}
                        />
                    )}

                    <div className={styles.actions}>
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className={styles.saveButton}
                            title="Guardar"
                        >
                            <Check size={16} />
                        </button>
                        <button
                            onClick={handleCancel}
                            disabled={isLoading}
                            className={styles.cancelButton}
                            title="Cancelar"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            ) : (
                <div className={`${isLarge ? styles.valueLarge : styles.value} ${canEdit ? styles.editableValue : ''}`}>
                    <span>{displayValue || '-'}</span>
                    {canEdit && (
                        <button
                            className={styles.editButton}
                            onClick={() => setIsEditing(true)}
                            title="Editar"
                        >
                            <Pencil size={14} />
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
