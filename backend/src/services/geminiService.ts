import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateSessionInsights = async (sessionData: any): Promise<string> => {
    try {
        const totalPoints = sessionData.stressPoints.length;
        const calmCount = sessionData.stressPoints.filter((p: any) => p.state === "calm").length;
        const vigilanceCount = sessionData.stressPoints.filter((p: any) => p.state === "vigilance").length;
        const tenseCount = sessionData.stressPoints.filter((p: any) => p.state === "tense").length;

        const tenseMoments = sessionData.stressPoints
            .filter((p: any) => p.state === "tense")
            .map((p: any) => ({
                timestamp: p.timestamp,
                question: sessionData.questions.find((q: any) => q._id === p.question)?.text || 'N/A'
            }));

        const prompt = `
            You are an expert guidance counselor AI assistant. Analyze the following session data and provide actionable insights for the counselor.
            
            Session Details:
            - Client: ${sessionData.client.name || 'Unknown'}
            - Duration: ${totalPoints > 0 ? Math.floor(sessionData.stressPoints[totalPoints - 1].timeStamp / 60000) : 0} minutes
            - Description: ${sessionData.description || 'No description provided.'}
            
            Stress Analysis:
            - Total data points: ${totalPoints}
            - Calm: ${calmCount} points (${((calmCount / totalPoints) * 100).toFixed(1)}%)
            - Vigilance: ${tenseCount} points (${((vigilanceCount / totalPoints) * 100).toFixed(1)}%)
            - Tense: ${tenseCount} points (${((tenseCount / totalPoints) * 100).toFixed(1)}%)
            
            Key Moments of Tension:
            ${tenseMoments.length > 0 ? tenseMoments.map((m: any) => `- At ${Math.floor(m.timestamp / 60000)}:${Math.floor((m.timestamp % 60000) / 1000).toString().padStart(2, '0')}s, question asked was: "${m.question}"`).join('\n') : '- No significant tension detected.'}
            
            Based on this data, provde 5 concise, numbered suggestions for the counselor. Focus on:
            1. Identifying potential sensitive topics.
            2. Suggesting effective communication strategies.
            3. Recommending follow-up activities or questions.
            4. Noting positive engagement patterns to reinforce.
            5. Advising on how to approach the next session.
        `;

        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.2,
            }
        });

        const text = response.text;
        return text || "No insights generated.";
    } catch (error) {
        console.error("Error generating session insights:", error);
        return 'Unable to generate AI insights at this time. Please review the session data manually.';
    }
};