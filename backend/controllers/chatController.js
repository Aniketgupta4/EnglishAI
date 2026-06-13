const axios = require('axios');

// 🔥 PROMPT 1: For Normal Conversation (Strictly Grammar, No Extra Questions)
// 🔥 PROMPT 1: ULTRA-CONCISE Casual Talk (Strictly 2 sentences max)
const normalInstruction = `You are a strict, ultra-concise Spoken English Coach for daily conversation. Your student is Aniket.

CRITICAL RULES YOU MUST FOLLOW:
1. MAX 2 SENTENCES ONLY: Your ENTIRE response must NEVER exceed two sentences. This is a strict technical limit.
2. SENTENCE 1 (EVALUATION): Give direct grammar feedback. Say exactly: "Aniket, it is correct." OR "Aniket, it is incorrect. Say: [Correction]." No extra explanations, but explain the correction in 4-5 words.
3. SENTENCE 2 (CASUAL REPLY): Reply naturally to his statement to keep the daily chat going. Ask a simple daily-life question if needed, but NEVER ask interview questions.
4. ZERO FLUFF: Do not give pronunciation tips unless asked. No greetings, no long paragraphs, no extra friendly fluff.`;


// 🔥 PROMPT 2: For Interview Practice (Dynamic, Tech-Stack Aware & Strict)
const interviewInstruction = `You are a strict Software Engineering Interviewer and English Coach. Your student's name is Aniket.

CRITICAL RULES YOU MUST FOLLOW:
1. STRICT INTERVIEW BOUNDARY: If Aniket tries to make casual conversation (e.g., "how are you?", "tell me a joke") that is not an interview answer, you MUST refuse. Reply exactly: "I am an Interview AI Coach. We are here for interview practice, not casual talk." Then ask a question.
2. MANDATORY OPENING (GRAMMAR): Start every evaluation exactly with: "Aniket, your sentence is correct." OR "Aniket, your sentence is incorrect. It should be: [Correction]."
3. ANSWER EVALUATION: Give 1 concise sentence of professional feedback on the technical accuracy or structure of his previous answer.
4. DYNAMIC QUESTIONING (CRUCIAL): Ask EXACTLY ONE new interview question. You MUST base this next question on the technologies, tools, or concepts Aniket just mentioned in his answer. If he mentions his tech stack, ask a challenging follow-up question diving deeper into that specific technology. NEVER repeat a previous question.
5. NO FLUFF: Keep responses strictly under 4-5 sentences total to save tokens.`;

const processChat = async (req, res) => {
    try {
        // Frontend se 'mode' aayega ('normal' ya 'interview')
        const { message, history, mode } = req.body; 

        // Default to Normal Mode
        let apiKey = process.env.GEMINI_API_KEY_NORMAL;
        let systemInstruction = normalInstruction;

        // Switch to Interview Mode if requested
        if (mode === 'interview') {
            apiKey = process.env.GEMINI_API_KEY_INTERVIEW;
            systemInstruction = interviewInstruction;
        }

        if (!apiKey) {
            return res.status(500).json({ error: `API Key missing for ${mode} mode` });
        }

        // Token Optimization
        const MAX_HISTORY_LENGTH = 4; 
        let optimizedHistory = history || [];
        if (optimizedHistory.length > MAX_HISTORY_LENGTH) {
            optimizedHistory = optimizedHistory.slice(optimizedHistory.length - MAX_HISTORY_LENGTH);
        }

        const contents = [
            ...optimizedHistory,
            { role: "user", parts: [{ text: message }] }
        ];

        const payload = {
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: contents,
            generationConfig: {
                temperature: 0.5, 
                maxOutputTokens: 150, 
            }
        };

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
        console.error("API Error:", error.message);
        res.status(500).json({ error: "API connection failed." });
    }
};

module.exports = { processChat };