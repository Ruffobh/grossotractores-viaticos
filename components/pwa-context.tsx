'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface PWAContextType {
    deferredPrompt: any
    isInstallable: boolean
    showInstructions: boolean
    setShowInstructions: (v: boolean) => void
    installApp: () => Promise<void>
}

const PWAContext = createContext<PWAContextType>({
    deferredPrompt: null,
    isInstallable: false,
    showInstructions: false,
    setShowInstructions: () => {},
    installApp: async () => {},
})

export function PWAProvider({ children }: { children: React.ReactNode }) {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [isInstallable, setIsInstallable] = useState(false)
    const [showInstructions, setShowInstructions] = useState(false)

    useEffect(() => {
        let timer: any;

        const checkInstallable = () => {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
            if (isStandalone) {
                setIsInstallable(false)
                return
            }

            const userAgent = window.navigator.userAgent.toLowerCase()
            const isIOS = /iphone|ipad|ipod/.test(userAgent)
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            const isSmallScreen = window.innerWidth <= 1024

            // Si es un dispositivo iOS, forzamos isInstallable a true de inmediato
            // ya que iOS no tiene soporte para beforeinstallprompt y requiere instalación manual.
            if (isIOS) {
                setIsInstallable(true)
            } else if (isMobileDevice || isSmallScreen) {
                // Para Android/PC, si no se ha disparado beforeinstallprompt en 3 segundos,
                // mostramos el botón de todos modos como fallback manual.
                timer = setTimeout(() => {
                    setIsInstallable(true)
                }, 3000)
            }
        }

        checkInstallable()

        const handler = (e: any) => {
            e.preventDefault()
            if (timer) clearTimeout(timer)
            setDeferredPrompt(e)
            setIsInstallable(true)
            console.log('beforeinstallprompt event fired and captured')
        }

        window.addEventListener('beforeinstallprompt', handler)
        return () => {
            if (timer) clearTimeout(timer)
            window.removeEventListener('beforeinstallprompt', handler)
        }
    }, [])

    const installApp = async () => {
        if (deferredPrompt) {
            try {
                deferredPrompt.prompt()
                const { outcome } = await deferredPrompt.userChoice
                if (outcome === 'accepted') {
                    setIsInstallable(false)
                }
            } catch (error) {
                console.error('Error with PWA prompt:', error)
            } finally {
                setDeferredPrompt(null)
            }
        } else {
            // No native prompt available (iOS or delayed Android event)
            setShowInstructions(true)
        }
    }

    return (
        <PWAContext.Provider value={{ deferredPrompt, isInstallable, installApp, showInstructions, setShowInstructions }}>
            {children}
        </PWAContext.Provider>
    )
}

export const usePWA = () => useContext(PWAContext)
