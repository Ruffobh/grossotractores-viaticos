require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

async function run() {
    console.log("Starting missing users resend script...");
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error("Missing Supabase env vars!");
        return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.office365.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
        tls: { ciphers: 'SSLv3' }
    });

    const SENDER_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'comprobantes@grossotractores.com.ar';

    // 1. Fetch pending invoices
    console.log("Fetching invoices...");
    const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, date, vendor_name, total_amount, currency, user_id, profiles!invoices_user_id_fkey(full_name, area)')
        .in('status', ['pending_approval', 'exceeded_budget']);

    if (error) {
        console.error("Error fetching invoices:", error);
        return;
    }

    // 2. Fetch permission users
    const { data: permissionUsers } = await supabase.from('profiles').select('email, area, permissions').not('email', 'is', null);

    let sentEmails = 0;

    for (const invoice of invoices) {
        const profileInfo = Array.isArray(invoice.profiles) ? invoice.profiles[0] : invoice.profiles;
        const expenseArea = profileInfo?.area;
        const userName = profileInfo?.full_name || 'Usuario';

        // Filter ONLY managers who have approve_area_expenses but NOT receive_approval_emails
        // Since the previous script already sent to those with receive_approval_emails
        const omittedUsers = (permissionUsers || []).filter(u => {
            const perms = u.permissions || {};
            const hasApprove = perms.approve_area_expenses;
            const hasReceive = perms.receive_approval_emails;

            if (!hasApprove || hasReceive) return false;
            if (expenseArea && u.area !== expenseArea) return false;
            return true;
        });

        if (omittedUsers.length === 0) {
            continue; // Nobody omitted for this invoice
        }

        const emails = omittedUsers.map(u => u.email).filter(Boolean);
        if (emails.length === 0) continue;

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://grossotractores-viaticos.vercel.app';
        const html = `
            <h2>Atención: Gasto Excedido (Aviso Retransmitido)</h2>
            <p>El usuario <strong>${userName}</strong> ha cargado un comprobante que requiere tu aprobación manual.</p>
            <ul>
                <li><strong>Proveedor:</strong> ${invoice.vendor_name}</li>
                <li><strong>Fecha:</strong> ${new Date(invoice.date).toLocaleDateString()}</li>
                <li><strong>Monto:</strong> ${invoice.currency} ${invoice.total_amount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</li>
            </ul>
            <p><a href="${baseUrl}/expenses/${invoice.id}">Ver Comprobante</a></p>
        `;

        console.log(`Sending to OMITTED users [${emails.join(', ')}] for invoice ${invoice.id} (${userName}, Area: ${expenseArea})...`);

        try {
            await transporter.sendMail({
                from: '"Viáticos Grosso" <' + SENDER_EMAIL + '>',
                to: emails.join(', '),
                subject: `⚠️ Alerta de Gasto: ${userName} excedió el límite`,
                html
            });
            console.log(`✅ Sent for ${invoice.id}`);
            sentEmails++;
            await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
            console.error(`❌ Error sending for ${invoice.id}:`, e);
        }
    }

    console.log(`Done. Sent missing emails for ${sentEmails} invoices.`);
}

run();
