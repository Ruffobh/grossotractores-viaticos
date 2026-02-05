
const { GoogleGenerativeAI } = require('@google/generative-ai');

const KEY = "AIzaSyD4KNM4dI7XZi-nlg2wcP5n7Sa8ZIN7rkM";

async function listModels() {
    try {
        console.log("Listing available models...");
        const genAI = new GoogleGenerativeAI(KEY);
        // We can't easily list models via this SDK helper directly without a model instance sometimes, 
        // but let's try the model.generateContent with a known stable one 'gemini-pro' just to check auth first.

        // Actually, let's try 'gemini-1.5-flash-latest' and 'gemini-1.0-pro'
        const models = ["gemini-1.5-flash-latest", "gemini-1.5-flash-001", "gemini-pro", "gemini-1.0-pro"];

        for (const m of models) {
            console.log(`Trying ${m}...`);
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("Test");
                console.log(`✅ ${m} WORKS!`);
                return;
            } catch (e) {
                console.log(`❌ ${m} failed: ${e.message}`);
            }
        }
    } catch (e) {
        console.error("Critical Fail:", e.message);
    }
}
listModels();
