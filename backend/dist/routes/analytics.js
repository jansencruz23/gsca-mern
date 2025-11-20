import express from "express";
import { Session } from "../models/Session.js";
import { Client } from "../models/Client.js";
import authMiddleware, {} from "../middleware/auth.js";
const router = express.Router();
// Get overall analytics
router.get("/overview", authMiddleware, async (req, res) => {
    try {
        const totalSessions = await Session.countDocuments({ counselor: req.user.id });
        const totalClients = await Client.countDocuments();
        const sessions = await Session.find({ counselor: req.user.id });
        let calmCount = 0;
        let vigilantCount = 0;
        let tenseCount = 0;
        sessions.forEach(session => {
            session.stressPoints.forEach(point => {
                if (point.state === 'calm')
                    calmCount++;
                else if (point.state === 'vigilance')
                    vigilantCount++;
                else if (point.state === 'tense')
                    tenseCount++;
            });
        });
        const totalPoints = calmCount + vigilantCount + tenseCount;
        res.json({
            totalSessions,
            totalClients,
            stressDistribution: {
                calm: totalPoints > 0 ? (calmCount / totalPoints) * 100 : 0,
                vigilance: totalPoints > 0 ? (vigilantCount / totalPoints) * 100 : 0,
                tense: totalPoints > 0 ? (tenseCount / totalPoints) * 100 : 0,
            }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});
export default router;
