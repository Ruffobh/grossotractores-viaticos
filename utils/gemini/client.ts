import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGeminiModel() {
    // --- SOLUCIÓN DE EMERGENCIA ---
    // Si Hostinger no lee la variable, pega tu clave aquí abajo entre las comillas.
    // Ejemplo: const HARDCODED_KEY = "AIzaSyd....";
    const HARDCODED_KEY = "AIzaSyD4KNM4dI7XZi-nlg2wcP5n7Sa8ZIN7rkM";
    // -----------------------------

    // 1. Get and Trim Key
    let apiKey = process.env.GOOGLE_API_KEY || HARDCODED_KEY;

    // Sanitize: Remove quotes if user added them in Hostinger (common mistake)
    if (apiKey) {
        apiKey = apiKey.trim();
        if (apiKey.startsWith('"') && apiKey.endsWith('"')) apiKey = apiKey.slice(1, -1);
        if (apiKey.startsWith("'") && apiKey.endsWith("'")) apiKey = apiKey.slice(1, -1);
    }

    console.log(`[Gemini Init] Key Available? ${!!apiKey ? 'YES' : 'NO'}`);
    if (apiKey) {
        console.log(`[Gemini Init] Key Length: ${apiKey.length}`);
        console.log(`[Gemini Init] Key First 4: ${apiKey.substring(0, 4)}...`);
    }

    // Fallback: Check for Split keys (Anti-Leak Method 2 - The "Saw" Strategy)
    if (!apiKey && process.env.GOOGLE_API_KEY_PART1 && process.env.GOOGLE_API_KEY_PART2) {
        apiKey = process.env.GOOGLE_API_KEY_PART1 + process.env.GOOGLE_API_KEY_PART2;
        console.log("🧩 Reassembled Google API Key from parts");
    }

    // Fallback: Check for Base64 encoded key
    if (!apiKey && process.env.GOOGLE_API_KEY_B64) {
        try {
            apiKey = Buffer.from(process.env.GOOGLE_API_KEY_B64, 'base64').toString('utf-8');
        } catch (e) { console.error("Base64 Decode Error", e); }
    }

    if (!apiKey) {
        console.error("❌ GOOGLE_API_KEY is missing. Gemini calls will fail.");
    }

    const genAI = new GoogleGenerativeAI(apiKey || "dummy_key_to_prevent_crash");
    // Use Stable 1.5 Flash instead of Experimental 2.0
    return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}
