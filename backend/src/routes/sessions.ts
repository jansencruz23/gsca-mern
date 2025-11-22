import express from "express";
import type { AuthRequest } from "../middleware/auth.ts";
import { Session } from "../models/Session.ts";
import { Client } from "../models/Client.ts";
import authMiddleware from "../middleware/auth.ts";
import { generateSessionInsights } from "../services/geminiService.ts";

const router = express.Router();

router.get("/", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const sessions = await Session.find({ counselor: req.user.id })
            .populate("client")
            .populate("counselor")
            .populate("questions")
            .sort({ date: -1});

        res.json(sessions);
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ message: "Server error" });
    }
});

// Create a new session
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { clientId, description } = req.body;

        let newClientId = clientId;
        let client = null;
        if (!clientId) {
            newClientId = '6921f64b07da921ab4e5dc64';
        }

        client = await Client.findById(newClientId);
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }

        const session = new Session({
            client: newClientId,
            counselor: req.user.id,
            description,
        });

        await session.save();

        client.sessions.push(session._id);
        client.lastSessionDate = new Date();
        await client.save();

        res.status(201).json(session);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Update session with stress points
router.put(
    "/:id/stress-points",
    authMiddleware,
    async (req: AuthRequest, res) => {
        try {
            const { stressPoints } = req.body;

            if (!Array.isArray(stressPoints)) {
                return res
                    .status(400)
                    .json({ message: "Invalid stress points data" });
            }

            const session = await Session.findById(req.params.id);
            if (!session) {
                return res.status(404).json({ message: "Session not found" });
            }

            const newQuestionIds = stressPoints
                .filter(point => point.question)
                .map(point => point.question)
                .filter((id, index, arr) => arr.indexOf(id) === index); // Unique IDs

            const updatedQuestions = [...new Set([...session.questions.map(String), ...newQuestionIds.map(String)])];
            const updatedSession = await Session.findByIdAndUpdate(req.params.id, {
                $push: { stressPoints: { $each: stressPoints } },
                questions: updatedQuestions,
            }, { new: true });

            if (!updatedSession) {
                return res.status(404).json({ message: "Session not found" });
            }

            res.json(updatedSession);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Server error" });
        }
    }
);

// Update session with summary and suggestions
router.put("/:id/summary", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { summary, suggestions } = req.body;
        const session = await Session.findByIdAndUpdate(
            req.params.id,
            { summary, suggestions },
            { new: true }
        );

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        res.json(session);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Get session by ID
router.get("/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const session = await Session.findById(req.params.id)
            .populate("client")
            .populate("counselor")
            .populate("questions");

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        res.json(session);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

router.post(
    "/:id/generate-insights",
    authMiddleware,
    async (req: AuthRequest, res) => {
        try {
            const { id } = req.params;

            const session = await Session.findById(id)
                .populate("client")
                .populate("questions");

            if (!session) {
                return res.status(404).json({ message: "Session not found" });
            }

            const suggestions = await generateSessionInsights(session);
            session.suggestions = suggestions;
            await session.save();

            res.json({ suggestions });
        } catch (error) {
            console.error("Error generating insights:", error);
            res.status(500).json({ message: "Server error" });
        }
    }
);

router.get("/client/:clientId", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { clientId } = req.params;
        const sessions = await Session.find({ 
            counselor: req.user.id,
            client: clientId 
        })
        .populate("client")
        .populate("counselor")
        .populate("questions")
        .sort({ date: -1});

        if (sessions.length === 0) {
            return res.status(404).json({ message: "No sessions found for this client" });
        }

        res.json(sessions);
    } catch (error) {
        console.error('Error fetching sessions for client:', error);
        res.status(500).json({ message: "Server error" });
    }
});

router.put('/:id/description', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { description } = req.body;
        const session = await Session.findByIdAndUpdate(
            req.params.id,
            { description },
            { new: true }
        );

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        res.json(session);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
