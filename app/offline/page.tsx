'use client'

import { WifiOff } from 'lucide-react'
import Link from 'next/link'

export default function OfflinePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6 text-center">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full flex flex-col items-center">
                <div className="bg-red-100 p-4 rounded-full mb-4">
                    <WifiOff size={48} className="text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Estás sin conexión</h1>
                <p className="text-gray-600 mb-6">
                    No tienes acceso a internet en este momento. Revisa tu conexión para continuar navegando.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors"
                >
                    Reintentar
                </button>
            </div>
        </div>
    )
}
