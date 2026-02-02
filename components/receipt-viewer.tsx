'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, ZoomIn } from 'lucide-react'
import styles from './receipt-viewer.module.css'

interface ReceiptViewerProps {
    fileUrl: string | null
    alt?: string
}

export function ReceiptViewer({ fileUrl, alt = "Comprobante" }: ReceiptViewerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isHovering, setIsHovering] = useState(false)

    // Handle ESC key to close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false)
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [])

    if (!fileUrl) return null

    const isPdf = fileUrl.toLowerCase().endsWith('.pdf')

    if (isPdf) {
        return <iframe src={fileUrl} className={styles.iframe} title={alt} />
    }

    return (
        <>
            {/* Thumbnail View */}
            <div
                className={styles.imageWrapper}
                onClick={() => setIsOpen(true)}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                <Image
                    src={fileUrl}
                    alt={alt}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 50vw"
                />

                {/* Optional: Overlay hint on hover */}
                {isHovering && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none transition-opacity duration-200">
                        <ZoomIn className="text-white drop-shadow-lg opacity-80" size={48} />
                    </div>
                )}
            </div>

            {/* Modal Overlay */}
            {isOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsOpen(false)}>
                    <button className={styles.closeButton} onClick={() => setIsOpen(false)}>
                        <X size={24} />
                    </button>

                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <img
                            src={fileUrl}
                            alt={alt}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '90vh',
                                objectFit: 'contain',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                            }}
                        />
                    </div>
                </div>
            )}
        </>
    )
}
