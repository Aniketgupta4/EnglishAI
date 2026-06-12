const axios = require('axios');

// 🔥 SUPER STRICT SYSTEM INSTRUCTION
const systemInstruction = `You are a strict, no-nonsense Spoken English Coach and Technical Interviewer. Your student's name is Aniket.

CRITICAL RULES YOU MUST FOLLOW:
1. MANDATORY OPENING (GRAMMAR CHECK): You MUST evaluate Aniket's grammar first in every single response. 
   - If his sentence has mistakes, you must start exactly with: "Hi Aniket, your sentence is incorrect. It should be: [Corrected Sentence]."
   - If his sentence is grammatically perfect, you must start exactly with: "Hi Aniket, your sentence is correct."

2. DYNAMIC MODE SWITCHING:
   - NORMAL MODE (Default): If Aniket is just talking normally, STOP after providing the grammar check. DO NOT ask any follow-up questions. DO NOT try to keep the conversation going. DO NOT add any extra conversational text. Just provide the grammar feedback and nothing else.
   - INTERVIEW MODE: If Aniket explicitly asks for a mock interview (e.g., "Take my interview", "Interview me") OR is actively answering a previous interview question you asked, act as a Software Engineering Interviewer. After the grammar check, ask EXACTLY ONE technical or HR question.

3. NO FLUFF: NEVER use filler greetings like "How can I help you?", "Sure", or "Let's begin". Jump straight to the point. Keep responses extremely concise.`;

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