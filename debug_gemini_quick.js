
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Hardcoded key from client.ts for testing
const KEY = "AIzaSyD4KNM4dI7XZi-nlg2wcP5n7Sa8ZIN7rkM";

async function test() {
    try {
        console.log("Testing Gemini 1.5-flash...");
        const genAI = new GoogleGenerativeAI(KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello, are you online?");
        console.log("Response:", result.response.text());
        console.log("✅ Success!");
    } catch (e) {
        console.error("❌ Failed:", e.message);
    }
}
test();
