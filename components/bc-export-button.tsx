'use client'

import { useState } from 'react'
import { Building2 } from 'lucide-react'
import { BCCreateModal } from '@/components/bc-create-modal'
import styles from './BCExportButton.module.css'

interface BCExportButtonProps {
    invoice: any
    profile: any
    ownerProfile?: any
}

export function BCExportButton({ invoice, profile, ownerProfile }: BCExportButtonProps) {
    const [isOpen, setIsModalOpen] = useState(false)

    // Use ownerProfile if provided, otherwise fallback to profile (backward compat)
    const effectiveOwnerProfile = ownerProfile || profile

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className={styles.button}
            >
                <Building2 size={16} className={styles.icon} />
                Cargar a BC
            </button>

            {isOpen && (
                <BCCreateModal
                    isOpen={isOpen}
                    onClose={() => setIsModalOpen(false)}
                    invoice={invoice}
                    profile={profile}
                    ownerProfile={effectiveOwnerProfile}
                />
            )}
        </>
    )
}
