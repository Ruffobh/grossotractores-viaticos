const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// 1. Manually load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^['"]|['"]$/g, ''); // Remove quotes if any
        env[key] = value;
    }
});

console.log('Environment loaded for:', env.SMTP_USER);

// 2. Configure Transporter
const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST || 'smtp.office365.com',
    port: Number(env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
    },
    tls: {
        ciphers: 'SSLv3'
    }
});

// 3. Send Test Email
async function main() {
    try {
        console.log('Attempting to send email...');
        const info = await transporter.sendMail({
            from: `"Test Script" <${env.SMTP_USER}>`,
            to: env.SMTP_USER, // Send to self
            subject: 'Test de SMTP - Grosso Tractores',
            text: 'Si lees esto, la configuración SMTP funciona correctamente 🚀.',
            html: '<b>Si lees esto, la configuración SMTP funciona correctamente 🚀.</b>',
        });

        console.log("Message sent: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    } catch (error) {
        console.error("Error occurred:", error);
    }
}

main();
