'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import styles from './style.module.css'

export default function LoginPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [envError, setEnvError] = useState<string | null>(null)

    // Check Env Vars on Mount
    useState(() => {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            setEnvError('Error Crítico: Faltan variables de entorno (Supabase URL/Key). Contacte al administrador.')
        }
    })

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string
        const password = formData.get('password') as string

        if (!email || !password) {
            setError('Por favor complete todos los campos.')
            setIsLoading(false)
            return
        }

        const supabase = createClient()
        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (authError) {
            console.error('Login Error:', authError)
            setError(authError.message === 'Invalid login credentials'
                ? 'Credenciales inválidas. Intente nuevamente.'
                : 'Error al iniciar sesión: ' + authError.message)
            setIsLoading(false)
            return
        }

        // Force full reload to ensure cookies are sent strictly
        window.location.href = '/'
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.logo}>GROSSO TRACTORES</div>
                    <div className={styles.subtitle}>Gestión de Viáticos</div>
                </div>

                {/* Critical Env Error */}
                {envError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm font-bold">
                        {envError}
                    </div>
                )}

                {error && (
                    <div className={styles.error}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} autoComplete="on">
                    <div className={styles.formGroup}>
                        <label htmlFor="email" className={styles.label}>
                            Correo Electrónico
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="username"
                            placeholder="usuario@grossotractores.com"
                            required
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="password" className={styles.label}>
                            Contraseña
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            placeholder="••••••••"
                            required
                            className={styles.input}
                        />
                    </div>

                    <button type="submit" className={styles.button} disabled={isLoading || !!envError}>
                        {isLoading ? 'Iniciando sesión...' : 'Ingresar'}
                    </button>
                </form>
            </div>
        </div>
    )
}
