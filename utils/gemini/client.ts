import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGeminiModel() {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        console.error("❌ GOOGLE_API_KEY is missing. Gemini calls will fail.");
        // Return a dummy client or handle gracefully to avoid crashing the whole process if called early
    }

    const genAI = new GoogleGenerativeAI(apiKey || "dummy_key_to_prevent_crash");
    return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}
