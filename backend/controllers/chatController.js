const axios = require('axios');

// 🔥 SUPER STRICT SYSTEM INSTRUCTION
const systemInstruction = `You are a direct, no-nonsense Spoken English Coach and Technical Interviewer. 

CRITICAL RULES YOU MUST FOLLOW:
1. NO FLUFF: NEVER say things like "How can I help you?", "Hi there!", "Sure, I can do that", or "Let's begin". Jump straight to the point.
2. DYNAMIC MODE SWITCHING:
   - CONVERSATION MODE (Default): If the user is just talking normally, check their grammar. If they made a mistake, correct it in exactly ONE sentence. Then, reply to their statement naturally to keep the conversation going (max 1-2 short sentences). If their English is perfect, correct them .
   - INTERVIEW MODE: If the user explicitly asks for a mock interview (e.g., "Take my interview", "Interview me"), immediately switch to the role of a Software Engineering Interviewer. Ask ONE targeted technical or HR question. Wait for their answer. Then, quickly evaluate their grammar and answer, and ask the next question.
3. BE CONCISE: Your ultimate goal is to save tokens. Keep every response under 3-4 sentences total.`;

const processChat = async (req, res) => {
    try {
        const { message, history } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: "GEMINI_API_KEY is missing in .env file" });
        }

        // SLIDING WINDOW LOGIC (Token Optimization)
        const MAX_HISTORY_LENGTH = 4; // Keep only last 2 exchanges to save tokens
        let optimizedHistory = history || [];
        
        if (optimizedHistory.length > MAX_HISTORY_LENGTH) {
            optimizedHistory = optimizedHistory.slice(optimizedHistory.length - MAX_HISTORY_LENGTH);
        }

        const contents = [
            ...optimizedHistory,
            { role: "user", parts: [{ text: message }] }
        ];

        const payload = {
            system_instruction: {
                parts: [{ text: systemInstruction }]
            },
            contents: contents,
            generationConfig: {
                temperature: 0.5, // Reduced temperature for more direct, less creative/fluffy answers
                maxOutputTokens: 150, // 🔥 STRICT LIMIT: Forces the AI to keep answers short
            }
        };

        // Note: Using the model that is working for you
        const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

        const response = await axios.post(GEMINI_API_URL, payload, {
            headers: { "Content-Type": "application/json" }
        });

        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            const responseText = response.data.candidates[0].content.parts[0].text;

            const newHistory = [
                ...optimizedHistory,
                { role: "user", parts: [{ text: message }] },
                { role: "model", parts: [{ text: responseText }] }
            ];

            return res.json({ reply: responseText, updatedHistory: newHistory });
        } else {
            throw new Error("Invalid AI response structure");
        }

    } catch (error) {
        const errorDetail = error.response?.data || error.message;
        console.error("Direct Axios Gemini Error:", JSON.stringify(errorDetail, null, 2));
        res.status(500).json({ error: "API connection failed. Check terminal for details." });
    }
};

module.exports = { processChat };