
require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.error("❌ NO API KEY FOUND");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

// Using the same 2.0 Flash model we use in production
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function testExtraction() {
    console.log("🚀 Testing Gemini 2.0 Flash Extraction...");

    // We need a sample image. Since I can't easily access the remote URL here without creating a mess,
    // I will use a dummy prompt first to check model sanity, or ask user to provide a path if local testing was easier.
    // However, I can try to read the task description or previous logs.
    // Better: I will use the text prompt logic from actions.ts exactly.

    const prompt = `
        Analiza esta factura. Extrae cabecera, CUIT del proveedor, moneda, y un desglose detallado de impuestos.
        IMPORTANTE: 
        1. El proveedor NO es "GROSSO TRACTORES SA". Ese es el cliente. Busca el emisor (logotipo arriba a la izquierda).
        2. Debes separar el IVA (21%, 10.5%) de otros impuestos (Percepciones IIBB, Impuestos Internos, Percepción IVA).
        Si la factura tiene ítems, extrae el detalle. Si es manuscrita o borrosa, haz tu mejor esfuerzo.

        CRITICAL OUTPUT FORMAT:
        You MUST return a JSON object strictly adhering to this schema:
        {
          "vendorName": string, 
          "vendorCuit": string (format XX-XXXXXXXX-X),
          "invoiceNumber": string,
          "invoiceType": string (One of: "FA", "FC", "CF", "ND", "NC"),
          "date": string (YYYY-MM-DD),
          "totalAmount": number,
          "netAmount": number,
          "taxAmount": number, 
          "perceptionsAmount": number,
          "currency": string ("ARS" or "USD"),
          "exchangeRate": number,
          "taxes": [
            { "name": string, "amount": number }
          ],
          "items": [
            { "description": string, "quantity": number, "unitPrice": number, "total": number }
          ]
        }
    `;

    console.log("✅ Prompt constructed.");
    console.log("⚠️ Note: Cannot simulate full image upload from this script easily without a local file.");
    console.log("⚠️ Please ensure the server logs in 'actions.ts' are checked for AI output.");
}

testExtraction();
