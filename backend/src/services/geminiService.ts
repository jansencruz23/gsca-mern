import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { Question } from "../models/Question.ts";

export interface SessionInsights {
    summary: string;
    sensitiveTopics: string[];
    positivePatterns: string[];
    recommendations: string[];
    nextSessionFocus: string[];
}

dotenv.config();

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateSessionInsights = async (
    sessionData: any
): Promise<SessionInsights> => {
    try {
        const totalPoints = sessionData.stressPoints.length;
        const calmCount = sessionData.stressPoints.filter(
            (p: any) => p.state === "calm"
        ).length;
        const vigilanceCount = sessionData.stressPoints.filter(
            (p: any) => p.state === "vigilance"
        ).length;
        const tenseCount = sessionData.stressPoints.filter(
            (p: any) => p.state === "tense"
        ).length;

        const questionMap = new Map();
        if (sessionData.questions && Array.isArray(sessionData.questions)) {
            sessionData.questions.forEach((q: any) => {
                if (q._id && q.text) {
                    questionMap.set(q._id.toString(), {
                        text: q.text,
                        category: q.category,
                    });
                }
            });
        }

        if (questionMap.size === 0) {
            console.log(
                "No questions found in session data, attempting to fetch..."
            );
            try {
                const questions = await Question.find({});

                questions.forEach((q: any) => {
                    if (q._id && q.text) {
                        questionMap.set(q._id.toString(), {
                            text: q.text,
                            category: q.category,
                        });
                    }
                });
            } catch (error) {
                console.error("Error fetching questions:", error);
            }
        }

        const questionTimestamp = sessionData.stressPoints
                    .filter((p: any) => p.question)
                    .map((p: any) => {
                        const questionId = p.question.toString();
                        const questionText = questionMap.get(questionId)?.text || "N/A";
                        const questionCategory = questionMap.get(questionId)?.category || "N/A";

                        return {
                            timestamp: (p.timestamp / 1000).toFixed(1),
                            questionText: questionText,
                            questionCategory: questionCategory,
                            questionId: questionId, 
                        };
                    });

        const questionImpactAnalysis = questionTimestamp.map((q: any) => {
            const questionTime = parseFloat(q.timestamp);
            const sevenSecondsLater = questionTime + 7.0;

            const stressAfterQuestion = sessionData.stressPoints.filter((p: any) => {
                const pointTime = p.timestamp / 1000;
                return pointTime >= questionTime && pointTime <= sevenSecondsLater;
            });

            const stressLevels = stressAfterQuestion.map((p: any) => p.state);
            const calmCount = stressLevels.filter((state: string) => state === 'calm').length;
            const vigilanceCount = stressLevels.filter((state: string) => state === 'vigilance').length;
            const tenseCount = stressLevels.filter((state: string) => state === 'tense').length;

            let dominantState = 'calm';
            if (vigilanceCount > calmCount && vigilanceCount > tenseCount) {
                dominantState = 'vigilance';
            } else if (tenseCount > calmCount && tenseCount > vigilanceCount) {
                dominantState = 'tense';
            }

            return {
                question: q.questionText,
                category: q.questionCategory,
                timestamp: q.timestamp,
                dominantState: dominantState,
                stressBreakdown: {
                    calm: calmCount,
                    vigilance: vigilanceCount,
                    tense: tenseCount
                }
            }
        });

        const questionImpactText = questionImpactAnalysis.map((q: any) => {
            return `- At ${q.timestamp}s: "${q.question}" (Category: ${q.category}) - Predominant stress level: ${q.dominantState}
            (Calm: ${q.stressBreakdown.calm}, Vigilance: ${q.stressBreakdown.vigilance}, Tense: ${q.stressBreakdown.tense})`;
        }).join("\n            ");

        const prompt = `
            You are an expert guidance counselor AI assistant. Analyze the following session data and provide actionable insights.
            Return your response as a single, valid JSON object only. Do not include any text before or after the JSON.
            
            The JSON object must have the following exact keys:
            - "summary": A brief, one-sentence summary of the session's emotional tone.
            - "sensitiveTopics": An array of strings identifying topics that may have caused stress.
            - "positivePatterns": An array of strings describing moments or topics where the client was engaged or relaxed.
            - "recommendations": An array of 5 concise, actionable strategies for the counselor.
            - "nextSessionFocus": An array of 2-3 specific topics or questions to explore in the next session.

            Session Details:
            - Client: ${sessionData.client.name || "Unknown"}
            - Duration: ${totalPoints > 0 ? Math.floor(sessionData.stressPoints[totalPoints - 1].timeStamp / 60000) : 0} minutes
            - Description: ${sessionData.description || "No description provided."}
            
            Stress Analysis:
            - Total data points: ${totalPoints}
            - Calm: ${calmCount} points (${((calmCount / totalPoints) * 100).toFixed(1)}%)
            - Vigilance: ${tenseCount} points (${((vigilanceCount / totalPoints) * 100).toFixed(1)}%)
            - Tense: ${tenseCount} points (${((tenseCount / totalPoints) * 100).toFixed(1)}%)
            
            Key Moments After Asking Questions:
            ${questionImpactText}
        `;

        console.log("Gemini prompt:", prompt);

        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.2,
            },
        });

        const text = response.text;
        const cleanedText = text?.replace(/```json\n?/, "").replace(/```/, "");
        const insights = JSON.parse(cleanedText || "{}");

        return insights;
    } catch (error) {
        console.error("Error generating insights with Gemini:", error);

        // Return a fallback structured object in case of an API error
        return {
            summary: "Unable to generate a summary at this time.",
            sensitiveTopics: [],
            positivePatterns: [],
            recommendations: [
                "Please review the session data manually for key insights.",
            ],
            nextSessionFocus: ["Revisit the topics discussed in this session."],
        };
    }
};
