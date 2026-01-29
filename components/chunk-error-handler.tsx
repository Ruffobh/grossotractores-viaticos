'use client'

import { useEffect } from 'react'

export function ChunkErrorHandler() {
    useEffect(() => {
        // Handler for Error Events (Script errors, Runtime errors)
        const handleError = (event: ErrorEvent) => {
            const isChunkError =
                event?.error?.name === 'ChunkLoadError' ||
                event?.message?.toLowerCase().includes('loading chunk') ||
                event?.message?.toLowerCase().includes('missing')

            if (isChunkError) {
                console.warn('ChunkLoadError detected, forcing reload...')
                window.location.reload()
            }
        }

        // Handler for Unhandled Promise Rejections (Dynamic imports failing)
        const handleRejection = (event: PromiseRejectionEvent) => {
            const reason = event?.reason
            const isChunkError =
                reason?.name === 'ChunkLoadError' ||
                reason?.message?.toLowerCase().includes('loading chunk') ||
                reason?.message?.toLowerCase().includes('missing')

            if (isChunkError) {
                console.warn('ChunkLoadError (Promise) detected, forcing reload...')
                window.location.reload()
            }
        }

        window.addEventListener('error', handleError)
        window.addEventListener('unhandledrejection', handleRejection)

        return () => {
            window.removeEventListener('error', handleError)
            window.removeEventListener('unhandledrejection', handleRejection)
        }
    }, [])

    return null
}
