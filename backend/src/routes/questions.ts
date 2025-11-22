import express from "express";
import { Question } from "../models/Question.ts";
import authMiddleware, { type AuthRequest } from "../middleware/auth.ts";

const router = express.Router();

// Get all questions
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const questions = await Question.find({ counselor: req.user.id });
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
            counselor: req.user.id,
        });

        await question.save();
        res.status(201).json(question);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Update a question
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { text, category } = req.body;
        const question = await Question.findOne( {_id: req.params.id, counselor: req.user.id });

        if (!question) {
            return res.status(404).json({ message: "'Question not found or you do not have permission to edit it" });
        }

        question.text = text;
        question.category = category;
        await question.save();

        res.json(question);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Delete a question
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const question = await Question.findOne( {_id: req.params.id, counselor: req.user.id });

        if (!question) {
            return res.status(404).json({ message: "Question not found or you do not have permission to delete it" });
        }

        await Question.findByIdAndDelete(req.params.id);
        res.json({ message: "Question deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;