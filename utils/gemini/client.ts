import { GoogleGenerativeAI } from "@google/generative-ai";

// Verified models available to this API key
const MODELS_TO_TRY = [
    "gemini-1.5-flash",           // New primary: Fast, cost-effective
    "gemini-2.0-flash",           // Original primary: Standard, fast
    "gemini-1.5-pro",             // New option: More capable, higher cost
    "gemini-2.0-flash-001",       // Backup: Versioned alias
    "gemini-2.5-flash",           // Upgrade: Newer model (verified in list)
    "gemini-2.0-flash-lite-001"   // Fallback: Lightweight/Fast
];

export async function generateWithFallback(prompt: string, inlineData: any) {
    // 1. Get Key from Env Var (Try B64 first for evasion/robustness)
    let apiKey = process.env.GOOGLE_API_KEY;
    const apiKeyB64 = process.env.GOOGLE_API_KEY_B64;

    if (apiKeyB64) {
        try {
            const decoded = Buffer.from(apiKeyB64, 'base64').toString('utf-8').trim();
            if (decoded && decoded.length > 20) {
                console.log("🔑 Using GOOGLE_API_KEY_B64 from env.");
                apiKey = decoded;
            }
        } catch (e) {
            console.error("⚠️ Failed to decode GOOGLE_API_KEY_B64:", e);
        }
    }

    // Sanitize
    if (apiKey) {
        apiKey = apiKey.trim();
        if (apiKey.startsWith('"') && apiKey.endsWith('"')) apiKey = apiKey.slice(1, -1);
        if (apiKey.startsWith("'") && apiKey.endsWith("'")) apiKey = apiKey.slice(1, -1);
    }

    if (!apiKey) {
        console.error("❌ GOOGLE_API_KEY (and B64 variant) is missing. Gemini calls will fail.");
        throw new Error("Missing API Key");
    } else {
        // Obfuscated log check
        console.log(`🔑 API Key loaded (Length: ${apiKey.length}, Ends with: ...${apiKey.slice(-4)})`);
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    let lastError = null;

    // Delay helper
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (const modelName of MODELS_TO_TRY) {
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            attempts++;
            try {
                console.log(`🤖 Trying AI Model: ${modelName} (Attempt ${attempts}/${maxAttempts})...`);
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
                const isRetryable = error.message?.includes('429') || error.message?.includes('503') || error.message?.includes('Overloaded');

                if (isRetryable && attempts < maxAttempts) {
                    const waitTime = 2000 * attempts; // 2s, 4s, 6s...
                    console.warn(`⏳ Rate Limited/Overloaded (${modelName}). Waiting ${waitTime}ms...`);
                    await delay(waitTime);
                    continue; // Retry same model
                }

                console.warn(`⚠️ Failed with ${modelName}:`, error.message);
                lastError = error;
                break; // Move to next model if not retryable or max attempts reached
            }
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
