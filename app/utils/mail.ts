import { Resend } from 'resend'
import { createClient } from '@/utils/supabase/server'

// Initialize Resend with the API key from env
const resend = new Resend(process.env.RESEND_API_KEY)

// Sender email - Resend requires a verified domain or 'onboarding@resend.dev' for testing
// For production, this should be 'notifications@grossotractores.com.ar' (after verifying domain)
const SENDER_EMAIL = 'onboarding@resend.dev'

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
        const { data, error } = await resend.emails.send({
            from: SENDER_EMAIL,
            to: adminEmails,
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

        if (error) {
            console.error('Error sending admin email:', error)
            return { error }
        }

        return { success: true, data }

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
            // We need to look up the user's details first to find their branch
            const { data: userProfile } = await supabase
                .from('profiles')
                .select(`
                branch_id,
                branches (
                    name
                )
            `)
                .eq('id', expense.user_id) // Assuming expense has user_id
                .single()

            if (!userProfile?.branch_id) {
                console.warn('User has no branch assigned.')
                return { error: 'User has no branch' }
            }

            // 2. Find the Manager of that branch (or Admins if no manager?)
            // Let's find Branch Managers for this specific branch
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
        const { data, error } = await resend.emails.send({
            from: SENDER_EMAIL,
            to: recipients,
            subject: `✅ Nuevo Comprobante Aprobado - ${expense.vendor_name}`,
            html: `
                <h2>Listo para Business Central</h2>
                <p>Un comprobante de <strong>${expense.user_name}</strong> ha sido aprobado y está listo para ser contabilizado.</p>
                <ul>
                    <li><strong>Proveedor:</strong> ${expense.vendor_name}</li>
                    <li><strong>Monto:</strong> ${expense.currency} ${expense.total_amount?.toLocaleString()}</li>
                </ul>
                <p>Por favor, ingrese al sistema para descargar la información.</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/expenses">Ir al Panel</a></p>
                ${overrideEmail ? '<p style="color:red; font-size:12px;">* Email de prueba redirigido al usuario actual</p>' : ''}
            `
        })

        if (error) {
            console.error('Error sending manager email:', error)
            return { error }
        }

        return { success: true, data }

    } catch (err) {
        console.error('Unexpected error sending manager email:', err)
        return { error: err }
    }
}

