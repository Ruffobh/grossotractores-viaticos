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
export async function sendAdminAlert(expense: ExpenseData) {
    try {
        const supabase = await createClient()

        // 1. Fetch all admins with emails
        const { data: admins } = await supabase
            .from('profiles')
            .select('email')
            .eq('role', 'admin')
            .not('email', 'is', null)

        if (!admins || admins.length === 0) {
            console.warn('No admins found to notify.')
            return { error: 'No admins found' }
        }

        const adminEmails = admins.map(a => a.email!)

        // 2. Send Email
        const info = await transporter.sendMail({
            from: `"Viáticos Grosso" <${SENDER_EMAIL}>`,
            to: adminEmails.join(', '), // Nodemailer accepts comma separated string or array
            subject: `⚠️ Alerta de Gasto: ${expense.user_name} excedió el límite`,
            html: `
                <h2>Atención: Gasto Excedido</h2>
                <p>El usuario <strong>${expense.user_name}</strong> ha cargado un comprobante que requiere tu aprobación manual.</p>
                <ul>
                    <li><strong>Proveedor:</strong> ${expense.vendor_name}</li>
                    <li><strong>Fecha:</strong> ${new Date(expense.date).toLocaleDateString()}</li>
                    <li><strong>Monto:</strong> ${expense.currency} ${expense.total_amount?.toLocaleString()}</li>
                </ul>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/expenses/${expense.id}">Ver Comprobante</a></p>
            `
        })

        console.log('Admin Alert sent: %s', info.messageId)
        return { success: true, data: info }

    } catch (err) {
        console.error('Unexpected error sending admin email:', err)
        return { error: err }
    }
}

/**
 * Sends a notification to the Branch Manager when an expense is Approved (Ready for BC).
 */
export async function sendManagerNotification(expense: ExpenseData, overrideEmail?: string) {
    try {
        const supabase = await createClient()
        let recipients: string[] = [];

        if (overrideEmail) {
            console.log('📧 TEST MODE: Sending email to current user:', overrideEmail)
            recipients = [overrideEmail]
        } else {
            // 1. Find the Branch Manager for this expense
            const { data: userProfile } = await supabase
                .from('profiles')
                .select(`
                branch_id,
                branches (
                    name
                )
            `)
                .eq('id', expense.user_id)
                .single()

            if (!userProfile?.branch_id) {
                console.warn('User has no branch assigned.')
                return { error: 'User has no branch' }
            }

            // 2. Find the Manager of that branch
            const { data: managers } = await supabase
                .from('profiles')
                .select('email')
                .eq('branch_id', userProfile.branch_id)
                .eq('role', 'branch_manager')
                .not('email', 'is', null)

            if (!managers || managers.length === 0) {
                console.warn('No manager found for branch:', userProfile.branch_id)
                return { error: 'No manager found' }
            }

            recipients = managers.map(m => m.email!)
        }

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
                    <li><strong>Monto:</strong> ${expense.currency} ${expense.total_amount?.toLocaleString()}</li>
                </ul>
                <p>Por favor, ingrese al sistema para descargar la información.</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/expenses/${expense.id}">Ver Comprobante</a></p>
                ${overrideEmail ? '<p style="color:red; font-size:12px;">* Email de prueba redirigido al usuario actual</p>' : ''}
            `
        })

        console.log('Manager Notification sent: %s', info.messageId)
        return { success: true, data: info }

    } catch (err) {
        console.error('Unexpected error sending manager email:', err)
        return { error: err }
    }
}
