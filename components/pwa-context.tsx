'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface PWAContextType {
    deferredPrompt: any
    isInstallable: boolean
    installApp: () => Promise<void>
}

const PWAContext = createContext<PWAContextType>({
    deferredPrompt: null,
    isInstallable: false,
    installApp: async () => {},
})

export function PWAProvider({ children }: { children: React.ReactNode }) {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [isInstallable, setIsInstallable] = useState(false)

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault()
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            const isSmallScreen = window.innerWidth <= 1024

            if (isMobileDevice || isSmallScreen) {
                setDeferredPrompt(e)
                setIsInstallable(true)
            }
        }

        window.addEventListener('beforeinstallprompt', handler)

        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstallable(false)
        }

        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    const installApp = async () => {
        if (!deferredPrompt) return
        
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
            setIsInstallable(false) 
        }
    }

    return (
        <PWAContext.Provider value={{ deferredPrompt, isInstallable, installApp }}>
            {children}
        </PWAContext.Provider>
    )
}

export const usePWA = () => useContext(PWAContext)
