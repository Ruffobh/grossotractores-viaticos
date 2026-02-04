import { GoogleGenerativeAI } from "@google/generative-ai";

// Verified models from user's API key list
const MODELS_TO_TRY = [
    "gemini-2.0-flash",           // Primary: Standard, fast
    "gemini-2.0-flash-001",       // Backup: Versioned alias
    "gemini-2.5-flash",           // Upgrade: Newer model (verified in list)
    "gemini-2.0-flash-lite-001"   // Fallback: Lightweight/Fast
];

export async function generateWithFallback(prompt: string, inlineData: any) {
    // --- SOLUCIÓN DE EMERGENCIA ---
    // Si Hostinger no lee la variable, pega tu clave aquí abajo entre las comillas.
    // Ejemplo: const HARDCODED_KEY = "AIzaSyd....";
    const HARDCODED_KEY = "AIzaSyD4KNM4dI7XZi-nlg2wcP5n7Sa8ZIN7rkM";
    // -----------------------------

    // 1. Get and Trim Key (Env Var Limit First!)
    let apiKey = process.env.GOOGLE_API_KEY || HARDCODED_KEY;

    // Sanitize
    if (apiKey) {
        apiKey = apiKey.trim();
        if (apiKey.startsWith('"') && apiKey.endsWith('"')) apiKey = apiKey.slice(1, -1);
        if (apiKey.startsWith("'") && apiKey.endsWith("'")) apiKey = apiKey.slice(1, -1);
    }

    if (!apiKey) {
        console.error("❌ GOOGLE_API_KEY is missing. Gemini calls will fail.");
        throw new Error("Missing API Key");
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    let lastError = null;

    for (const modelName of MODELS_TO_TRY) {
        try {
            console.log(`🤖 Trying AI Model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });

            const result = await model.generateContent([
                prompt,
                { inlineData: inlineData },
            ]);

            const response = await result.response;
            const text = response.text();

            if (text) {
                console.log(`✅ Success with ${modelName}`);
                return text;
            }
        } catch (error: any) {
            console.warn(`⚠️ Failed with ${modelName}:`, error.message);
            lastError = error;
            // Continue to next model...
        }
    }

    // If we get here, all models failed
    console.error("❌ All Gemini Models failed.");
    throw lastError || new Error("All AI models failed");
}

// Keep legacy for backward compatibility if needed, but prefer generateWithFallback
export function getGeminiModel() {
    // ... legacy implementation if strictly needed, or just return primary ...
    let apiKey = process.env.GOOGLE_API_KEY || "dummy";
    return new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: "gemini-2.0-flash" });
}
