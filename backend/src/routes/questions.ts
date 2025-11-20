import express from "express";
import { Question } from "../models/Question.js";
import authMiddleware, { type AuthRequest } from "../middleware/auth.js";

const router = express.Router();

// Get all questions
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const questions = await Question.find({ councelor: req.user.id });
        res.json(questions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Create a new question
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { text, category } = req.body;
        const question = new Question({
            text,
            category,
            councelor: req.user.id,
        });

        await question.save();
        res.status(201).json(question);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;