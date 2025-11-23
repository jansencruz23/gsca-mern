import mongoose, { mongo, set } from "mongoose";
const stressPointSchema = new mongoose.Schema({
    timestamp: { type: Number, required: true },
    state: { type: String, enum: ["calm", "vigilance", "tense"], required: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    confidence: { type: Number, default: null },
    details: {
        posture: { type: Number, default: null },
        movement: { type: Number, default: null },
        fidgeting: { type: Number, default: null },
        handFidgeting: { type: Number, default: null },
        legBouncing: { type: Number, default: null },
    }
});
const sessionSchema = new mongoose.Schema({
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: false, default: null, set: (value) => value === "" ? null : value },
    counselor: { type: mongoose.Schema.Types.ObjectId, ref: 'Counselor', required: true },
    description: { type: String },
    date: { type: Date, default: Date.now },
    stressPoints: [stressPointSchema],
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    summary: { type: String },
    suggestions: {
        summary: { type: String, required: false },
        sensitiveTopics: [{ type: String }],
        positivePatterns: [{ type: String }],
        recommendations: [{ type: String }],
        nextSessionFocus: [{ type: String }]
    }
});
export const Session = mongoose.model("Session", sessionSchema);
