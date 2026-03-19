'use client'

import { Download, X, Share } from 'lucide-react'
import styles from './pwa-install-prompt.module.css'
import { usePWA } from './pwa-context'
import { useState, useEffect } from 'react'

export default function InstallPrompt() {
    const { isInstallable, installApp, showInstructions, setShowInstructions } = usePWA()
    const [isVisible, setIsVisible] = useState(false)
    const [hasDismissed, setHasDismissed] = useState(false)
    const [isIOS, setIsIOS] = useState(false)

    useEffect(() => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        setIsIOS(/iphone|ipad|ipod/.test(userAgent));
        
        if (isInstallable && !hasDismissed) {
             setIsVisible(true)
        } else {
             setIsVisible(false)
        }
    }, [isInstallable, hasDismissed])

    if (showInstructions) {
        return (
            <div className={styles.overlay}>
                <div className={styles.card}>
                    <button
                        onClick={() => setShowInstructions(false)}
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
                            <h3 className={styles.title}>Instalar en {isIOS ? 'iOS' : 'tu dispositivo'}</h3>
                            <p className={styles.description} style={{ marginTop: '0.5rem', lineHeight: '1.4' }}>
                                {isIOS ? (
                                    <>
                                        1. Toca el botón <strong>Compartir</strong> <Share size={14} style={{display: 'inline', verticalAlign: 'middle'}}/> en el navegador.<br/><br/>
                                        2. Selecciona <strong>"Agregar a inicio"</strong> en el menú.
                                    </>
                                ) : (
                                    <>Para instalar la app, abre las opciones de tu navegador y selecciona "Instalar aplicación" o "Agregar a la pantalla principal".</>
                                )}
                            </p>
                            <button
                                onClick={() => setShowInstructions(false)}
                                className={styles.installButton}
                                style={{ marginTop: '1rem' }}
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

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
