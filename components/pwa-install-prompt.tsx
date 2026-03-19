'use client'

import { Download, X } from 'lucide-react'
import styles from './pwa-install-prompt.module.css'
import { usePWA } from './pwa-context'
import { useState, useEffect } from 'react'

export default function InstallPrompt() {
    const { isInstallable, installApp } = usePWA()
    const [isVisible, setIsVisible] = useState(false)
    const [hasDismissed, setHasDismissed] = useState(false)

    useEffect(() => {
        if (isInstallable && !hasDismissed) {
             setIsVisible(true)
        } else {
             setIsVisible(false)
        }
    }, [isInstallable, hasDismissed])

    if (!isVisible) return null

    return (
        <div className={styles.overlay}>
            <div className={styles.card}>
                <button
                    onClick={() => { setIsVisible(false); setHasDismissed(true) }}
                    className={styles.closeButton}
                    aria-label="Cerrar"
                >
                    <X size={20} />
                </button>
                <div className={styles.contentWrapper}>
                    <div className={styles.iconWrapper}>
                        <Download size={24} />
                    </div>
                    <div className={styles.textContent}>
                        <h3 className={styles.title}>Instalar App</h3>
                        <p className={styles.description}>
                            Instala Viáticos Grosso en tu dispositivo para un acceso más rápido y sin conexión.
                        </p>
                        <button
                            onClick={async () => {
                                await installApp()
                                setHasDismissed(true)
                            }}
                            className={styles.installButton}
                        >
                            Instalar ahora
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
