import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import nodemailer from 'nodemailer';

export async function GET() {
    const supabase = createAdminClient();

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

    const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
            id, date, vendor_name, total_amount, currency, user_id,
            profiles!invoices_user_id_fkey(full_name, area)
        `)
        .in('status', ['pending_approval', 'exceeded_budget']);

    if (error) return NextResponse.json({ error: error.message });

    const { data: permissionUsers } = await supabase.from('profiles').select('email, area, permissions').not('email', 'is', null);

    const results = [];
    for (const invoice of invoices || []) {
        const profileInfo = Array.isArray(invoice.profiles) ? invoice.profiles[0] : invoice.profiles;
        const expenseArea = profileInfo?.area;
        const userName = profileInfo?.full_name || 'Usuario';

        const omittedUsers = (permissionUsers || []).filter(u => {
            const perms = u.permissions as any || {};
            const hasApprove = perms.approve_area_expenses;
            const hasReceive = perms.receive_approval_emails;

            if (!hasApprove || hasReceive) return false;
            if (expenseArea && u.area !== expenseArea) return false;
            return true;
        });

        if (omittedUsers.length === 0) continue;

        const emails = omittedUsers.map(u => u.email).filter(Boolean);
        if (emails.length === 0) continue;

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://grossotractores-viaticos.vercel.app';
        const html = `
            <h2>Atención: Gasto Excedido (Aviso Retransmitido para Encargados de Área)</h2>
            <p>El usuario <strong>${userName}</strong> ha cargado un comprobante que requiere tu aprobación manual en el área de ${expenseArea}.</p>
            <ul>
                <li><strong>Proveedor:</strong> ${invoice.vendor_name}</li>
                <li><strong>Fecha:</strong> ${new Date(invoice.date).toLocaleDateString()}</li>
                <li><strong>Monto:</strong> ${invoice.currency} ${invoice.total_amount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</li>
            </ul>
            <p><a href="${baseUrl}/expenses/${invoice.id}">Ver Comprobante</a></p>
        `;

        try {
            await transporter.sendMail({
                from: '"Viáticos Grosso" <' + SENDER_EMAIL + '>',
                to: emails.join(', '),
                subject: `⚠️ Alerta de Gasto: ${userName} excedió el límite`,
                html
            });
            results.push({ id: invoice.id, status: 'sent', user: userName, emails });
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (e) {
            results.push({ id: invoice.id, status: 'error', detail: String(e) });
        }
    }

    return NextResponse.json({ success: true, count: invoices?.length, emails_dispatched: results.length, results });
}
