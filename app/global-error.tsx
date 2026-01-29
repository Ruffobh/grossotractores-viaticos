'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const router = useRouter()

    useEffect(() => {
        // Check for ChunkLoadError or related webpack/turbopack errors
        const isChunkError =
            error.message?.toLowerCase().includes('chunk') ||
            error.message?.toLowerCase().includes('loading') ||
            error.name === 'ChunkLoadError' ||
            error.digest?.includes('MINIFIED_REACT_ERROR') // sometimes manifests as minified error in prod

        if (isChunkError) {
            console.error('Global Error Boundary caught ChunkLoadError. Reloading...')
            // Force reload to get fresh assets
            window.location.href = window.location.href.split('?')[0] + '?t=' + Date.now()
        } else {
            console.error('Global Error:', error)
        }
    }, [error])

    return (
        <html>
            <body className="flex min-h-screen flex-col items-center justify-center bg-gray-100 text-center font-sans">
                <div className="rounded-xl bg-white p-8 shadow-xl">
                    <h2 className="mb-4 text-2xl font-bold text-gray-800">Algo salió mal</h2>
                    <p className="mb-6 text-gray-600">
                        Ocurrió un error inesperado en la aplicación.
                        {error.message?.toLowerCase().includes('chunk') && <br /> + "(Error de actualización detectado)"}
                    </p>
                    <button
                        onClick={() => {
                            window.location.href = window.location.href.split('?')[0] + '?t=' + Date.now()
                        }}
                        className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
                    >
                        Recargar Aplicación
                    </button>
                </div>
            </body>
        </html>
    )
}
