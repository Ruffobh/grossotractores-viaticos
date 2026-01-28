
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = "AIzaSyB79RTu4XwusFpPPAD6L1UZYoYEkQfL2PQ";
const genAI = new GoogleGenerativeAI(apiKey);

async function checkModels() {
    const candidates = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-001",
        "gemini-1.5-pro",
        "gemini-1.5-pro-001",
        "gemini-pro",
        "gemini-1.0-pro"
    ];

    console.log("Checking available models...");


    // Test v1 version specifically
    const v1Candidates = ["gemini-1.5-flash", "gemini-pro"];
    console.log("\n--- Testing API Version v1 ---");

    for (const modelName of v1Candidates) {
        try {
            console.log(`\nTesting (v1): ${modelName}`);
            // Force v1 API version
            const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1' });
            const result = await model.generateContent("Hello");
            console.log(`✅ SUCCESS: ${modelName} (v1) is working!`);
            return;
        } catch (error) {
            console.log(`❌ FAILED (v1): ${modelName}`);
            if (error.message.includes("404")) {
                console.log("   -> Model not found or not supported.");
            } else {
                console.log("   -> Error:", error.message);
            }
        }
    }

    console.log("\n❌ ALL MODELS FAILED.");
}

checkModels();
