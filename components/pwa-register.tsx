'use client'

import { useEffect } from 'react'

export function PwaRegister() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
                window.addEventListener('load', function () {
                    navigator.serviceWorker
                        .register('/sw.js')
                        .then(
                            function (registration) {
                                console.log('Service Worker registration successful with scope: ', registration.scope)
                            },
                            function (err) {
                                console.log('Service Worker registration failed: ', err)
                            }
                        )
                })
            }
        }
    }, [])

    return null
}
