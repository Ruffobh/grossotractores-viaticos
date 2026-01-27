'use client'

import { useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { BCCopyModal } from '@/components/bc-copy-modal'
import styles from './BCExportButton.module.css'

interface BCExportButtonProps {
    invoice: any
    profile: any
}

export function BCExportButton({ invoice, profile }: BCExportButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className={styles.button}
            >
                <FileSpreadsheet size={16} className={styles.icon} />
                Exportar a BC
            </button>

            <BCCopyModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                invoice={invoice}
                profile={profile}
            />
        </>
    )
}
