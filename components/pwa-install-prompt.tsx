'use client'

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

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
            setDeferredPrompt(e)
            setIsVisible(true)
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
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white p-4 rounded-xl shadow-2xl border border-gray-100 z-50 animate-in slide-in-from-bottom-4 duration-500">
            <button
                onClick={() => setIsVisible(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
                <X size={20} />
            </button>
            <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
                    <Download size={24} />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">Instalar App</h3>
                    <p className="text-sm text-gray-600 mb-3">
                        Instala Viáticos Grosso en tu dispositivo para un acceso más rápido y sin conexión.
                    </p>
                    <button
                        onClick={handleInstallClick}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                        Instalar ahora
                    </button>
                </div>
            </div>
        </div>
    )
}
