import mongoose, { mongo } from "mongoose";

const stressPointSchema = new mongoose.Schema({ 
    timestamp: { type: Number, required: true },
    state: { type: String, enum: ["calm", "vigilance", "tense"], required: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' }
});

const sessionSchema = new mongoose.Schema({ 
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    counselor: { type: mongoose.Schema.Types.ObjectId, ref: 'Counselor', required: true },
    description: { type: String},
    date: { type: Date, default: Date.now },
    stressPoints: [stressPointSchema],
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    summary: { type: String },
    suggestions: { type: String }
});

export const Session = mongoose.model("Session", sessionSchema);