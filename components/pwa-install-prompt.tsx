'use client'

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import styles from './pwa-install-prompt.module.css'

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [isVisible, setIsVisible] = useState(false)
    const [isIOS, setIsIOS] = useState(false)

    useEffect(() => {
        // Check if iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        const handler = (e: any) => {
            e.preventDefault()

            // Solo mostrar en dispositivos móviles o tablets (pantallas pequeñas)
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            const isSmallScreen = window.innerWidth <= 1024

            if (isMobileDevice || isSmallScreen) {
                setDeferredPrompt(e)
                setIsVisible(true)
            }
        }

        window.addEventListener('beforeinstallprompt', handler)

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsVisible(false)
        }

        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    const handleInstallClick = async () => {
        if (!deferredPrompt) return

        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {
            setDeferredPrompt(null)
            setIsVisible(false)
        }
    }

    if (!isVisible && !isIOS) return null

    // For iOS, we might want to show instructions if not standalone
    // But let's focus on Android/Desktop first where 'beforeinstallprompt' works.
    // Use isIOS state if we want to show a specific iOS instruction banner.
    // For now, only show if beforeinstallprompt fired (Android/Desktop).

    if (!isVisible) return null

    return (
        <div className={styles.overlay}>
            <div className={styles.card}>
                <button
                    onClick={() => setIsVisible(false)}
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
                            onClick={handleInstallClick}
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
