'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function processBatchUsers(users: any[]) {
    if (!users || users.length === 0) return { errors: ['No se enviaron datos para procesar.'] }

    // Init Admin Client
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) return { errors: ['Error de configuración del servidor (Missing Key).'] }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    let successCount = 0
    let failureCount = 0
    let errors: string[] = []

    for (const [index, row] of users.entries()) {
        const email = row.email || row.Email
        const full_name = row.full_name || row.Nombre
        const role = row.role || row.Rol || 'user'
        const branch = row.branch || row.Sucursal || ''
        const area = row.area || row.Area || ''
        const password = String(row.password || row.Contraseña || 'pass123')
        const monthly_limit = Number(row.monthly_limit || 0)
        const cash_limit = Number(row.cash_limit || 0)

        // Basic Validation
        if (!email || !String(email).includes('@')) {
            failureCount++
            errors.push(`Fila ${index + 1}: Email inválido (${email})`)
            continue
        }

        try {
            // 1. Create Auth User
            const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
                email,
                password, // Should be random or default
                email_confirm: true,
                user_metadata: { full_name, role, branch, area }
            })

            if (authError) throw authError
            if (!newUser.user) throw new Error("No user returned")

            // 2. Create Profile
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: newUser.user.id,
                    email,
                    full_name,
                    role: role.toLowerCase(),
                    branch: branch || null,
                    branches: [branch].filter(Boolean),
                    area,
                    monthly_limit,
                    cash_limit
                })

            if (profileError) throw profileError

            successCount++

        } catch (e: any) {
            failureCount++
            if (e.message?.includes('already registered')) {
                errors.push(`Fila ${index + 1}: El usuario ${email} ya existe.`)
            } else {
                errors.push(`Fila ${index + 1}: ${email} - ${e.message}`)
            }
        }
    }

    revalidatePath('/admin/users')
    return { success: successCount, failed: failureCount, errors }
}
