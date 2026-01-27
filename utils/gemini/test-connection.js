
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const apiKeyMatch = envContent.match(/GOOGLE_API_KEY=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : "";

const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(modelName) {
    try {
        console.log(`Testing ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello");
        console.log(`[PASS] ${modelName}:`, result.response.text().substring(0, 50) + "...");
        return true;
    } catch (error) {
        console.error(`[FAIL] ${modelName}:`, error.message.split('\n')[0]);
        return false;
    }
}

async function runTests() {
    await testModel("gemini-2.5-flash-lite");
    // await testModel("gemini-1.5-pro-001");
}

runTests();
