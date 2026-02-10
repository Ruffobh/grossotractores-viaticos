'use client'

import { useState } from 'react'
import { testAdminAlert, testManagerNotification } from './actions'

export default function TestEmailPage() {
    const [status, setStatus] = useState<string>('')
    const [loading, setLoading] = useState(false)

    async function handleAdminTest(formData: FormData) {
        setLoading(true)
        setStatus('Enviando alerta de admin...')
        const res = await testAdminAlert(formData)
        setLoading(false)
        if (res.success) setStatus(`✅ Enviado Admin Alert: ${res.data?.messageId}`)
        else setStatus(`❌ Error Admin Alert: ${JSON.stringify(res.error)}`)
    }

    async function handleManagerTest(formData: FormData) {
        setLoading(true)
        setStatus('Enviando notificación manager...')
        const res = await testManagerNotification(formData)
        setLoading(false)
        if (res.success) setStatus(`✅ Enviado Manager Notification: ${res.data?.messageId}`)
        else setStatus(`❌ Error Manager Notification: ${JSON.stringify(res.error)}`)
    }

    return (
        <div className="p-8 max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-6">Prueba de Emails</h1>

            <div className="mb-8 p-4 border rounded bg-gray-50">
                <h2 className="font-semibold mb-2">1. Prueba Alerta Admin (Excede Presupuesto)</h2>
                <form action={handleAdminTest} className="flex flex-col gap-2">
                    <input name="email" type="email" placeholder="Tu email para recibir prueba" className="border p-2 rounded" required />
                    <button disabled={loading} className="bg-red-600 text-white p-2 rounded hover:bg-red-700">
                        Probar Alerta Admin
                    </button>
                </form>
            </div>

            <div className="mb-8 p-4 border rounded bg-gray-50">
                <h2 className="font-semibold mb-2">2. Prueba Notificación Manager (Aprobado)</h2>
                <form action={handleManagerTest} className="flex flex-col gap-2">
                    <input name="email" type="email" placeholder="Tu email para recibir prueba" className="border p-2 rounded" required />
                    <button disabled={loading} className="bg-green-600 text-white p-2 rounded hover:bg-green-700">
                        Probar Notificación Manager
                    </button>
                </form>
            </div>

            {status && (
                <div className="p-4 bg-blue-100 text-blue-800 rounded">
                    {status}
                </div>
            )}
        </div>
    )
}
