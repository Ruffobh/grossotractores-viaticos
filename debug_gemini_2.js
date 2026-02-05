
const { GoogleGenerativeAI } = require('@google/generative-ai');

const KEY = "AIzaSyD4KNM4dI7XZi-nlg2wcP5n7Sa8ZIN7rkM";

async function test() {
    try {
        console.log("Testing gemini-2.0-flash...");
        const genAI = new GoogleGenerativeAI(KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent("Hello?");
        console.log("Response:", result.response.text());
        console.log("✅ gemini-2.0-flash WORKS!");
    } catch (e) {
        console.error("❌ Failed:", e.message);
    }
}
test();
