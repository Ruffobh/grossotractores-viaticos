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
            // Fetch all users with emails
            const { data: users, error: usersError } = await adminClient
                .from('profiles')
                .select('email, role, area, permissions')
                .not('email', 'is', null)

            if (usersError) {
                console.error('Error fetching users for email alert:', usersError)
            }

            const expenseArea = expense.area
            const validUsers = users?.filter(u => {
                const perms = u.permissions as any || {}
                
                // If ANY user specifically toggled OFF the email notifications, respect it
                if (perms.receive_new_expense_emails === false) return false

                // Admins receive all emails by default unless opted out above
                if (u.role === 'admin') return true

                // For Non-Admins: They must have permission enabled
                const hasPerm = perms.receive_new_expense_emails === true || perms.approve_area_expenses === true
                if (!hasPerm) return false

                // And they must match the expense area
                if (expenseArea && u.area !== expenseArea) return false

                return true
            }) || []

            const allRecipients = new Set(validUsers.map(u => u.email!))
            
            adminEmails = Array.from(allRecipients)
        }
        if (adminEmails.length === 0) {
            console.warn('[sendAdminAlert] No recipients found to notify.')
            return { error: 'No recipients found' }
        }

        console.log(`[sendAdminAlert] Recipients calculated: [${adminEmails.join(', ')}]`)

        // 3. Send Email
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://grossotractores-viaticos.vercel.app'
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
                <p><a href="${baseUrl}/expenses/${expense.id}">Ver Comprobante</a></p>
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
            const branchData = userProfile.branches as any
            const branchName = Array.isArray(branchData) ? branchData[0]?.name : branchData?.name || null

            if (!branchName) {
                console.warn('[sendManagerNotification] Could not resolve branch name for id:', userProfile.branch_id)
                return { error: 'Branch name not found' }
            }

            const { data: potentialRecipients, error: recError } = await adminClient
                .from('profiles')
                .select('email, role, branch, branches, permissions')
                .not('email', 'is', null)

            if (recError) {
                console.error('[sendManagerNotification] Error fetching users:', recError)
            }

            if (!potentialRecipients || potentialRecipients.length === 0) {
                console.warn('[sendManagerNotification] No users found in system.')
                return { error: 'No users found' }
            }

            // Filter managers who cover this branch OR users who have receive_approval_emails enabled
            const relevantRecipients = potentialRecipients.filter(u => {
                const perms = u.permissions as any || {}
                
                // 1. Is branch manager of this branch?
                let isManagerForThisBranch = false;
                if (u.role === 'branch_manager') {
                     if (u.branch === branchName) {
                         isManagerForThisBranch = true;
                     } else {
                         let managerBranches: string[] = []
                         if (Array.isArray(u.branches)) {
                             managerBranches = u.branches
                         } else if (typeof u.branches === 'string') {
                             try { managerBranches = JSON.parse(u.branches) } catch { managerBranches = [u.branches] }
                         }
                         if (managerBranches.includes(branchName)) {
                             isManagerForThisBranch = true;
                         }
                     }
                }

                // 2. Or has the explicit permission enabled?
                const wantsApprovalEmails = perms.receive_approval_emails === true;

                return isManagerForThisBranch || wantsApprovalEmails;
            })

            if (relevantRecipients.length === 0) {
                console.warn('[sendManagerNotification] No recipient found for branch:', branchName)
                return { error: 'No manager or recipient found for this branch' }
            }

            recipients = relevantRecipients.map(m => m.email!)
        }

        console.log(`[sendManagerNotification] Recipients calculated: [${recipients.join(', ')}]`)

        // 3. Send Email
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://grossotractores-viaticos.vercel.app'
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
                <p><a href="${baseUrl}/expenses/${expense.id}">Ver Comprobante</a></p>
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

/**
 * Sends a notification to the user when an expense is Rejected by a Branch Manager.
 */
export async function sendRejectionEmail(expense: ExpenseData, userEmail: string, comment: string, overrideEmail?: string) {
    console.log(`[sendRejectionEmail] Triggered for expense: ${expense.id} (User ID: ${expense.user_id})`)
    try {
        const recipient = overrideEmail || userEmail;

        if (!recipient) {
            console.warn('[sendRejectionEmail] No email provided for user.')
            return { error: 'No email provided for user' }
        }

        console.log(`[sendRejectionEmail] Recipient: ${recipient}`)

        // Send Email
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://grossotractores-viaticos.vercel.app'
        const info = await transporter.sendMail({
            from: `"Viáticos Grosso" <${SENDER_EMAIL}>`,
            to: recipient,
            subject: `❌ Comprobante Rechazado - ${expense.vendor_name}`,
            html: `
                <h2>Comprobante Rechazado</h2>
                <p>Hola ${expense.user_name},</p>
                <p>Tu comprobante cargado ha sido revisado y <strong>rechazado</strong>.</p>
                <ul>
                    <li><strong>Proveedor:</strong> ${expense.vendor_name}</li>
                    <li><strong>Fecha:</strong> ${new Date(expense.date).toLocaleDateString()}</li>
                    <li><strong>Monto:</strong> ${expense.currency} ${expense.total_amount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</li>
                </ul>
                <div style="background-color: #fce4e4; padding: 15px; border-left: 4px solid #f44336; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Motivo del rechazo:</strong></p>
                    <p style="margin: 5px 0 0 0;">${comment}</p>
                </div>
                <p>Puedes ingresar al sistema para ver más detalles.</p>
                <p><a href="${baseUrl}/expenses/${expense.id}">Ver Comprobante</a></p>
                ${overrideEmail ? '<p style="color:red; font-size:12px;">* Email de prueba redirigido</p>' : ''}
            `
        })

        console.log('[sendRejectionEmail] Email sent successfully: %s', info.messageId)
        return { success: true, data: info }

    } catch (err) {
        console.error('[sendRejectionEmail] Unexpected fatal error:', err)
        return { error: err }
    }
}
