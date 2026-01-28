import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
    console.warn("⚠️ GOOGLE_API_KEY is missing! AI features will fail.");
}

const genAI = new GoogleGenerativeAI(apiKey || "missing_key");

export const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
