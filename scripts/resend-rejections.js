const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

// Initialize Nodemailer Transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
    tls: {
        ciphers: 'SSLv3'
    }
});

const SENDER_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'comprobantes@grossotractores.com.ar';

const expenses = [
    {
        id: 'b8cce75c-cf34-4f6e-bdac-e683ae9576f1',
        vendor_name: 'AMIUN S.A TOYOTA',
        total_amount: 608999.99,
        currency: 'ARS',
        admin_comments: 'este comprobante de debe pasar al área de Recursos Materiales',
        user_email: 'diego.patinio@grossotractores.com.ar',
        user_name: 'Diego Patiño',
        expense_date: '2026-02-24',
        user_area: 'Maquinaria',
        expense_user_id: '67a2f422-5c52-40a3-a4b3-ffa5a8e0763f'
    },
    {
        id: '81264628-5eea-4b14-b3d5-c9be3f8af1e2',
        vendor_name: 'Operadora de Estaciones de Servicios S.A.',
        total_amount: 11000,
        currency: 'ARS',
        admin_comments: 'Diego, este comprobante no se puede cargar.',
        user_email: 'diego.patinio@grossotractores.com.ar',
        user_name: 'Diego Patiño',
        expense_date: '2026-02-24',
        user_area: 'Maquinaria',
        expense_user_id: '67a2f422-5c52-40a3-a4b3-ffa5a8e0763f'
    },
    {
        id: '7a5de3d6-771f-440f-8082-de486e5922b4',
        vendor_name: 'GRUPO LAVALLE SRL',
        total_amount: 76000,
        currency: 'ARS',
        admin_comments: 'Diego, este comprobante no lo podemos paras por el detalle del ticket. contiene bebida alcohólica',
        user_email: 'diego.patinio@grossotractores.com.ar',
        user_name: 'Diego Patiño',
        expense_date: '2026-02-24',
        user_area: 'Maquinaria',
        expense_user_id: '67a2f422-5c52-40a3-a4b3-ffa5a8e0763f'
    },
    {
        id: '6a324eec-270e-49b9-ae0e-45448f43f916',
        vendor_name: 'PUMA ENERGY',
        total_amount: 39059.33,
        currency: 'ARS',
        admin_comments: 'Motivo rechazo: El gasto pertenece a combustible insumos taller - no forma parte de viático.',
        user_email: 'german.mainero@grossotractores.com.ar',
        user_name: 'German Mainero',
        expense_date: '2026-02-19',
        user_area: 'Servicios',
        expense_user_id: '1d65c745-f762-4ccd-bc21-39e9cb1261c8'
    }
];

async function sendEmails() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://grossotractores-viaticos.vercel.app';

    for (const exp of expenses) {
        console.log(`Sending rejection email for ${exp.vendor_name} to ${exp.user_email}...`);

        try {
            const amountStr = exp.total_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 });
            const dateStr = new Date(exp.expense_date + 'T12:00:00Z').toLocaleDateString('es-AR');

            const info = await transporter.sendMail({
                from: `"Viáticos Grosso" <${SENDER_EMAIL}>`,
                to: exp.user_email,
                subject: `❌ Comprobante Rechazado - ${exp.vendor_name}`,
                html: `
                    <h2>Comprobante Rechazado</h2>
                    <p>Hola ${exp.user_name},</p>
                    <p>Tu comprobante cargado ha sido revisado y <strong>rechazado</strong>.</p>
                    <ul>
                        <li><strong>Proveedor:</strong> ${exp.vendor_name}</li>
                        <li><strong>Fecha:</strong> ${dateStr}</li>
                        <li><strong>Monto:</strong> ${exp.currency} ${amountStr}</li>
                    </ul>
                    <div style="background-color: #fce4e4; padding: 15px; border-left: 4px solid #f44336; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Motivo del rechazo:</strong></p>
                        <p style="margin: 5px 0 0 0;">${exp.admin_comments}</p>
                    </div>
                    <p>Puedes ingresar al sistema para ver más detalles.</p>
                    <p><a href="${baseUrl}/expenses/${exp.id}">Ver Comprobante</a></p>
                `
            });

            console.log(`Success: ${info.messageId}`);
        } catch (err) {
            console.error(`Error sending email to ${exp.user_email}:`, err);
        }
    }
    console.log('Finished.');
}

sendEmails();
