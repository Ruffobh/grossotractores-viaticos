'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function processBatchUsers(formData: FormData) {
    const file = formData.get('file') as File
    if (!file) return { errors: ['No se seleccionó ningún archivo.'] }

    const text = await file.text()
    const rows = text.split('\n').map(row => row.trim()).filter(row => row.length > 0)

    // Remove header if present (heuristic: checks for "email" in first row)
    const header = rows[0].toLowerCase()
    if (header.includes('email') && header.includes('role')) {
        rows.shift()
    }

    if (rows.length === 0) return { errors: ['El archivo está vacío.'] }

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

    for (const [index, row] of rows.entries()) {
        const cols = row.split(',').map(c => c.trim().replace(/^"|"$/g, '')) // Simple CSV parse handling quotes

        // Expected columns: email, full_name, role, branch, area, password, monthly_limit, cash_limit
        // Allow comma or semicolon separator
        const values = row.includes(';') ? row.split(';').map(c => c.trim()) : cols

        if (values.length < 2) continue // Skip invalid lines

        const [
            email,
            full_name,
            role = 'user',
            branch = '',
            area = '',
            password = 'password123', // Default if missing
            monthly_limit = '0',
            cash_limit = '0'
        ] = values

        if (!email || !email.includes('@')) {
            failureCount++
            errors.push(`Fila ${index + 1}: Email inválido (${email})`)
            continue
        }

        try {
            // 1. Create Auth User
            const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
                email,
                password,
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
                    role,
                    branch: branch || null,
                    branches: [branch].filter(Boolean), // Default single branch to array
                    area,
                    monthly_limit: Number(monthly_limit) || 0,
                    cash_limit: Number(cash_limit) || 0
                })

            if (profileError) throw profileError

            successCount++

        } catch (e: any) {
            failureCount++
            // Don't log "User already registered" as a critical error, just skip
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
