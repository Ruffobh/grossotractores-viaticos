import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGeminiModel() {
    let apiKey = process.env.GOOGLE_API_KEY;

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
    return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}
