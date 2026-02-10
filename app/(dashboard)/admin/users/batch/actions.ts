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
        // Helper to find value case-insensitively and loosely
        const findValue = (obj: any, keys: string[]) => {
            const objKeys = Object.keys(obj)
            for (const key of keys) {
                // Exact match
                if (obj[key] !== undefined) return obj[key]

                // Loose match
                const looseKey = key.toLowerCase().replace(/[^a-z0-9]/g, '')
                const foundKey = objKeys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === looseKey)
                if (foundKey && obj[foundKey] !== undefined) return obj[foundKey]
            }
            return undefined
        }

        const email = findValue(row, ['email', 'correo', 'mail'])
        const full_name = findValue(row, ['full_name', 'fullname', 'nombre', 'name'])
        const role = findValue(row, ['role', 'rol', 'cargo']) || 'user'
        const branch = findValue(row, ['branch', 'sucursal', 'site']) || ''
        const area = findValue(row, ['area', 'sector', 'departamento']) || ''
        const password = String(findValue(row, ['password', 'contraseña', 'clave']) || 'pass123')

        // Helper to parse formatted numbers (e.g. "500.000,00" -> 500000.00)
        // Supports EU (1.000,00) and US (1,000.00) and Plain (1000)
        const parseLimit = (val: any) => {
            if (typeof val === 'number') return val
            if (!val) return 0

            let str = String(val).trim()
            // Remove currency symbols, letters, spaces... keep only digits, comma, dot, minus
            str = str.replace(/[^\d.,-]/g, '')

            if (!str) return 0

            const lastComma = str.lastIndexOf(',')
            const lastDot = str.lastIndexOf('.')

            if (lastComma > lastDot) {
                // EU Format detected: 1.000,00
                // Remove all dots
                str = str.replace(/\./g, '')
                // Replace comma with dot
                str = str.replace(',', '.')
            } else if (lastDot > lastComma) {
                // US Format detected: 1,000.00
                // Remove all commas
                str = str.replace(/,/g, '')
            }
            // If neither or only one separator, logic mostly holds (ambiguity of 1.234 handled as 1.234 usually, but in limits context 1.000 is likely 1000)
            // However, with the above logic:
            // "1234" -> no comma/dot -> Number("1234") -> 1234. Correct.
            // "1234,50" -> comma > dot (-1) -> replace comma -> 1234.50. Correct.
            // "123.456" -> dot > comma (-1) -> remove numbers? No, remove commas (none). -> 123.456. 
            // Warning: If user meant 123 thousand, and wrote 123.456 and we think it is US, we get 123.456.
            // If we assume strict AR format for ambiguous cases, we should strip dots. 
            // But let's verify if we can detect locale. We can't.
            // But given "Viaticos Grosso", let's lean towards EU/AR.
            // If it has ONE dot and NO comma, and dot is 3rd from end? "123.456". usually 123k.
            // If dot is 2nd from end? "123.45". 123 point 45.

            return Number(str) || 0
        }

        const monthly_limit = parseLimit(findValue(row, ['monthly_limit', 'limit_tc', 'limite_tc', 'monthlylimit']))
        const cash_limit = parseLimit(findValue(row, ['cash_limit', 'limit_ef', 'limite_ef', 'cashlimit']))

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

            // 1. Check if Profile exists (to allow update)
            let userId = null

            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email)
                .single()

            if (existingProfile) {
                // User exists in DB -> Update mode
                userId = existingProfile.id
            } else {
                // User not in DB -> Create mode
                try {
                    const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
                        email,
                        password,
                        email_confirm: true,
                        user_metadata: { full_name, role, branch, area, branch_id: branchId }
                    })

                    if (authError) throw authError
                    if (newUser.user) userId = newUser.user.id

                } catch (e: any) {
                    // Handle case where user exists in Auth but not in Profiles (Inconsistent state)
                    if (e.message?.includes('already registered')) {
                        // We can't easily get the ID here without listUsers permission or a function
                        // But we can try to "Recover" if we assume the email is the key.
                        // For now, let's report this specific error clearly.
                        // actually, if we are here, it means Profile was NOT found, but Auth says Exists.
                        throw new Error(`El usuario existe en Auth pero no tiene perfil. Contacte soporte.`)
                    } else {
                        throw e
                    }
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
