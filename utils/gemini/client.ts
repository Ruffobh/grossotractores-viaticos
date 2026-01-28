import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGeminiModel() {
    let apiKey = process.env.GOOGLE_API_KEY;

    // Fallback: Check for Base64 encoded key (Anti-Leak measure)
    if (!apiKey && process.env.GOOGLE_API_KEY_B64) {
        try {
            apiKey = Buffer.from(process.env.GOOGLE_API_KEY_B64, 'base64').toString('utf-8');
            console.log("🔓 Using Base64 encoded Google API Key");
        } catch (e) {
            console.error("Failed to decode Base64 API Key", e);
        }
    }

    if (!apiKey) {
        console.error("❌ GOOGLE_API_KEY is missing. Gemini calls will fail.");
        // Return a dummy client or handle gracefully to avoid crashing the whole process if called early
    }

    const genAI = new GoogleGenerativeAI(apiKey || "dummy_key_to_prevent_crash");
    return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}
