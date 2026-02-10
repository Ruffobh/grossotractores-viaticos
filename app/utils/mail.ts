import nodemailer from 'nodemailer'
import { createClient } from '@/utils/supabase/server'

// Initialize Nodemailer Transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
    tls: {
        ciphers: 'SSLv3'
    }
})

const SENDER_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'comprobantes@grossotractores.com.ar'

interface ExpenseData {
    id: string
    date: string
    vendor_name: string
    total_amount: number
    currency: string
    user_name: string
    [key: string]: any
}

/**
 * Sends an alert to all Admins when an expense exceeds the limit.
 */
export async function sendAdminAlert(expense: ExpenseData, overrideEmail?: string) {
    console.log(`[sendAdminAlert] Triggered for expense: ${expense.id} (User: ${expense.user_name})`)
    try {
        const { createAdminClient } = await import('@/utils/supabase/admin')
        const adminClient = createAdminClient()
        let adminEmails: string[] = []

        if (overrideEmail) {
            console.log('[sendAdminAlert] TEST MODE: Sending email to:', overrideEmail)
            adminEmails = [overrideEmail]
        } else {
            // 1. Fetch all admins with emails (Using Admin Client to bypass RLS)
            const { data: admins, error: adminError } = await adminClient
                .from('profiles')
                .select('email')
                .eq('role', 'admin')
                .not('email', 'is', null)

            if (adminError) {
                console.error('[sendAdminAlert] Error fetching admins:', adminError)
            }

            // 2. Fetch users with "receive_approval_emails" permission
            const { data: permissionUsers, error: permError } = await adminClient
                .from('profiles')
                .select('email, area, permissions')
                .not('email', 'is', null)

            if (permError) {
                console.error('[sendAdminAlert] Error fetching permission users:', permError)
            }

            const expenseArea = expense.area
            const validPermissionUsers = permissionUsers?.filter(u => {
                const hasPerm = (u.permissions as any)?.receive_approval_emails
                if (!hasPerm) return false
                if (expenseArea && u.area !== expenseArea) return false
                return true
            }) || []

            const allRecipients = new Set([
                ...(admins?.map(a => a.email!) || []),
                ...validPermissionUsers.map(u => u.email!)
            ])

            if (allRecipients.size === 0) {
                console.warn('[sendAdminAlert] No recipients found to notify.')
                return { error: 'No recipients found' }
            }

            adminEmails = Array.from(allRecipients)
        }

        console.log(`[sendAdminAlert] Recipients calculated: [${adminEmails.join(', ')}]`)

        // 3. Send Email
        const info = await transporter.sendMail({
            from: `"Viáticos Grosso" <${SENDER_EMAIL}>`,
            to: adminEmails.join(', '),
            subject: `⚠️ Alerta de Gasto: ${expense.user_name} excedió el límite`,
            html: `
                <h2>Atención: Gasto Excedido</h2>
                <p>El usuario <strong>${expense.user_name}</strong> ha cargado un comprobante que requiere tu aprobación manual.</p>
                <ul>
                    <li><strong>Proveedor:</strong> ${expense.vendor_name}</li>
                    <li><strong>Fecha:</strong> ${new Date(expense.date).toLocaleDateString()}</li>
                    <li><strong>Monto:</strong> ${expense.currency} ${expense.total_amount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</li>
                </ul>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/expenses/${expense.id}">Ver Comprobante</a></p>
                ${overrideEmail ? '<p style="color:red; font-size:12px;">* Email de prueba redirigido</p>' : ''}
            `
        })

        console.log('[sendAdminAlert] Email sent successfully: %s', info.messageId)
        return { success: true, data: info }

    } catch (err) {
        console.error('[sendAdminAlert] Unexpected fatal error:', err)
        return { error: err }
    }
}

/**
 * Sends a notification to the Branch Manager when an expense is Approved (Ready for BC).
 */
export async function sendManagerNotification(expense: ExpenseData, overrideEmail?: string) {
    console.log(`[sendManagerNotification] Triggered for expense: ${expense.id} (User ID: ${expense.user_id})`)
    try {
        const { createAdminClient } = await import('@/utils/supabase/admin')
        const adminClient = createAdminClient()
        let recipients: string[] = [];

        if (overrideEmail) {
            console.log('[sendManagerNotification] TEST MODE: Sending email to current user:', overrideEmail)
            recipients = [overrideEmail]
        } else {
            // 1. Find the Branch Manager for this expense (Using Admin Client for RLS bypass)
            const { data: userProfile, error: profileError } = await adminClient
                .from('profiles')
                .select(`
                    branch_id,
                    branches (
                        name
                    )
                `)
                .eq('id', expense.user_id)
                .single()

            if (profileError) {
                console.error('[sendManagerNotification] Error fetching user profile:', profileError)
                return { error: profileError.message }
            }

            if (!userProfile?.branch_id) {
                console.warn('[sendManagerNotification] User has no branch assigned.')
                return { error: 'User has no branch' }
            }

            // 2. Find the Manager of that branch
            // Logic updated to support Multi-Branch Managers:
            // Managers store their branches in a 'branches' JSONB column (array of strings).
            // We need to find managers who have the user's branch name in their list.

            // First, get the branch NAME of the user (we have branch_id, let's get the name)
            // Note: Supabase types the relation as an array
            const branchData = userProfile.branches as any
            const branchName = Array.isArray(branchData) ? branchData[0]?.name : branchData?.name || null

            if (!branchName) {
                console.warn('[sendManagerNotification] Could not resolve branch name for id:', userProfile.branch_id)
                return { error: 'Branch name not found' }
            }

            // Fetch all branch managers. 
            // Ideally we would filter by JSON containment (branches @> '["Name"]'), but simple array check in JS is robust for now.
            const { data: managers, error: managerError } = await adminClient
                .from('profiles')
                .select('email, branch, branches')
                .eq('role', 'branch_manager')
                .not('email', 'is', null)

            if (managerError) {
                console.error('[sendManagerNotification] Error fetching branch managers:', managerError)
            }

            if (!managers || managers.length === 0) {
                console.warn('[sendManagerNotification] No managers found in system.')
                return { error: 'No managers found' }
            }

            // Filter managers who cover this branch
            const relevantManagers = managers.filter(m => {
                // Check legacy single branch
                if (m.branch === branchName) return true
                // Check multi-branch array
                // branches is stored as JSONB, usually string[] or string
                let managerBranches: string[] = []
                if (Array.isArray(m.branches)) {
                    managerBranches = m.branches
                } else if (typeof m.branches === 'string') {
                    try {
                        managerBranches = JSON.parse(m.branches)
                    } catch {
                        managerBranches = [m.branches]
                    }
                }

                return managerBranches.includes(branchName)
            })

            if (relevantManagers.length === 0) {
                console.warn('[sendManagerNotification] No manager found for branch:', branchName)
                return { error: 'No manager found for this branch' }
            }

            recipients = relevantManagers.map(m => m.email!)
        }

        console.log(`[sendManagerNotification] Recipients calculated: [${recipients.join(', ')}]`)

        // 3. Send Email
        const info = await transporter.sendMail({
            from: `"Viáticos Grosso" <${SENDER_EMAIL}>`,
            to: recipients.join(', '),
            subject: `✅ Nuevo Comprobante Aprobado - ${expense.vendor_name}`,
            html: `
                <h2>Listo para Business Central</h2>
                <p>Un comprobante de <strong>${expense.user_name}</strong> ha sido aprobado y está listo para ser contabilizado.</p>
                <ul>
                    <li><strong>Proveedor:</strong> ${expense.vendor_name}</li>
                    <li><strong>Monto:</strong> ${expense.currency} ${expense.total_amount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</li>
                </ul>
                <p>Por favor, ingrese al sistema para descargar la información.</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/expenses/${expense.id}">Ver Comprobante</a></p>
                ${overrideEmail ? '<p style="color:red; font-size:12px;">* Email de prueba redirigido al usuario actual</p>' : ''}
            `
        })

        console.log('[sendManagerNotification] Email sent successfully: %s', info.messageId)
        return { success: true, data: info }

    } catch (err) {
        console.error('[sendManagerNotification] Unexpected fatal error:', err)
        return { error: err }
    }
}
