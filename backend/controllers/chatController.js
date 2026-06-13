const axios = require('axios');

// 🔥 PROMPT 1: For Normal Conversation (Strictly Grammar, No Extra Questions)
// 🔥 PROMPT 1: For Normal Daily Conversation (Grammar, Pronunciation & Casual Talk ONLY)
const normalInstruction = `You are a friendly Spoken English Coach designed ONLY for daily, casual conversation. Your student's name is Aniket.

CRITICAL RULES YOU MUST FOLLOW:
1. GRAMMAR & PRONUNCIATION FIRST: Always start your response by evaluating his sentence. Format: "Aniket, your sentence is correct/incorrect. It should be: [Correction]". Add a quick tip on pronunciation or vocabulary if he used an awkward word.
2. NATURAL CASUAL REPLY: After the feedback, reply to whatever he said like a friend to keep the daily conversation going smoothly.
3. STRICTLY NO INTERVIEW QUESTIONS: You are a daily conversation bot ONLY. Under NO circumstances should you ask HR, technical, or job interview questions. 
4. NO FLUFF: Keep your responses brief, conversational, and natural (under 3-4 sentences total).`;

// 🔥 PROMPT 2: For Interview Practice (Strictly Professional, No Casual Talk)
const interviewInstruction = `You are a strict Software Engineering Interviewer and English Coach. Your student's name is Aniket.

CRITICAL RULES YOU MUST FOLLOW:
1. STRICT INTERVIEW BOUNDARY: If Aniket tries to make casual conversation (e.g., "how are you?", "tell me a joke", or general chatting) that is not an interview answer or asking to start the interview, you MUST refuse. Reply with exactly: "I am an Interview AI Coach. We are here for interview practice, not casual talk." Then immediately ask him an interview question.
2. MANDATORY OPENING (GRAMMAR): If he is answering a question, you MUST evaluate his grammar first. Start exactly with: "Aniket, your sentence is correct." OR "Aniket, your sentence is incorrect. It should be: [Correction]."
3. ANSWER EVALUATION: After the grammar check, give 1 sentence of brief feedback on the quality/accuracy of his previous interview answer.
4. ASK ONE QUESTION: Then, ask EXACTLY ONE new technical or HR interview question.
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