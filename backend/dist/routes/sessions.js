import express from "express";
import { Session } from "../models/Session.js";
import { Client } from "../models/Client.js";
import authMiddleware from "../middleware/auth.js";
const router = express.Router();
// Create a new session
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { clientId, description } = req.body;
        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }
        const session = new Session({
            client: clientId,
            counselor: req.user.id,
            description,
        });
        await session.save();
        client.sessions.push(session._id);
        client.lastSessionDate = new Date();
        await client.save();
        res.status(201).json(session);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});
// Update session with stress points
router.put("/:id/stress-points", authMiddleware, async (req, res) => {
    try {
        const { stressPoints } = req.body;
        const session = await Session.findByIdAndUpdate(req.params.id, { $push: { stressPoints: { $each: stressPoints } } }, { new: true });
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }
        res.json(session);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});
// Update session with summary and suggestions
router.put("/:id/summary", authMiddleware, async (req, res) => {
    try {
        const { summary, suggestions } = req.body;
        const session = await Session.findByIdAndUpdate(req.params.id, { summary, suggestions }, { new: true });
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }
        res.json(session);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});
// Get session by ID
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const session = await Session.findById(req.params.id)
            .populate("client")
            .populate("counselor")
            .populate("questions");
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }
        res.json(session);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});
export default router;
