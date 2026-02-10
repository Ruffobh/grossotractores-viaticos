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
        // Helper to parse formatted numbers (e.g. "500.000,00" -> 500000.00)
        const parseLimit = (val: any) => {
            if (typeof val === 'number') return val
            if (!val) return 0
            const str = String(val).trim()
            // Remove thousands separator (.) and replace decimal separator (,) with (.)
            const cleanStr = str.replace(/\./g, '').replace(',', '.')
            return Number(cleanStr) || 0
        }

        const monthly_limit = parseLimit(row.monthly_limit || row.Monthly_Limit || row.Limite_TC)
        const cash_limit = parseLimit(row.cash_limit || row.Cash_Limit || row.Limite_EF)

        // Basic Validation
        if (!email || !String(email).includes('@')) {
            failureCount++
            errors.push(`Fila ${index + 1}: Email inválido (${email})`)
            continue
        }

        try {
            // Resolve Branch ID if branch name is provided
            let branchId = null
            if (branch) {
                const { data: branchRecord } = await supabase
                    .from('branches')
                    .select('id')
                    .ilike('name', branch) // Use ilike for case-insensitivity
                    .single()

                if (branchRecord) {
                    branchId = branchRecord.id
                }
            }

            // 1. Create or Find Auth User
            let userId = null

            try {
                const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
                    email,
                    password, // Should be random or default
                    email_confirm: true,
                    user_metadata: { full_name, role, branch, area, branch_id: branchId }
                })

                if (authError) throw authError
                if (newUser.user) userId = newUser.user.id

            } catch (e: any) {
                // If user exists, find their ID from profiles to allow update
                if (e.message?.includes('already registered')) {
                    const { data: existingProfile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('email', email)
                        .single()

                    if (existingProfile) {
                        userId = existingProfile.id
                    } else {
                        throw new Error("Usuario existe en Auth pero no tiene perfil en base de datos.")
                    }
                } else {
                    throw e
                }
            }

            if (!userId) throw new Error("No se pudo obtener el ID del usuario")

            // 2. Create/Update Profile
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
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
