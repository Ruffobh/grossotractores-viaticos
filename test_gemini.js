const { GoogleGenerativeAI } = require("@google/generative-ai");

async function main() {
    const key = "AIzaSyD4KNM4dI7XZi-nlg2wcP5n7Sa8ZIN7rkM"; // The user's key
    const genAI = new GoogleGenerativeAI(key);

    try {
        console.log("Fetching available models...");
        // Hack: The SDK might not expose listModels directly on genAI instance in some versions, 
        // but typically it's on the ModelManager or similar. 
        // Actually, for @google/generative-ai, we might need to assume a model and try.
        // But let's try to get the model directly.

        // TEST 1: v1 (Stable)
        try {
            console.log("\n--- Testing API Version: v1 ---");
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", apiVersion: "v1" });
            const result = await model.generateContent("Test v1");
            console.log(`✅ SUCCESS with v1: gemini-1.5-flash`);
        } catch (e) {
            console.log(`❌ FAIL with v1: ${e.message}`);
        }

        // TEST 2: v1beta (Default)
        try {
            console.log("\n--- Testing API Version: v1beta ---");
            // const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", apiVersion: "v1beta" });
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Default
            const result = await model.generateContent("Test v1beta");
            console.log(`✅ SUCCESS with v1beta: gemini-1.5-flash`);
        } catch (e) {
            console.log(`❌ FAIL with v1beta: ${e.message}`);
        }

        // TEST 3: Raw REST API List Models
        try {
            console.log("\n--- Testing Raw REST API (List Models) ---");
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            const data = await response.json();

            if (data.models) {
                console.log("✅ API is Working! Filtered Models (flash/pro):");
                data.models.forEach(m => {
                    if (m.name.includes("flash") || m.name.includes("pro")) {
                        console.log(` - ${m.name}`);
                    }
                });
            } else {
                console.log("❌ API Response valid but no models:", JSON.stringify(data));
            }
        } catch (e) {
            console.log(`❌ FAIL Raw Fetch: ${e.message}`);
        }

    } catch (error) {
        console.error("Fatal Error:", error);
    }
}

main();
