import mongoose from "mongoose";
const questionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    category: { type: String, required: true },
    counselor: { type: mongoose.Schema.Types.ObjectId, ref: 'Counselor', required: true },
    createdAt: { type: Date, default: Date.now },
});
export const Question = mongoose.model("Question", questionSchema);
