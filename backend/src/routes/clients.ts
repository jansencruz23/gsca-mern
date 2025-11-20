import express from "express";
import { Client } from "../models/Client.js";
import { Session } from "../models/Session.js";
//import authMiddleware from "..middleware/auth";

const router = express.Router();

// Get all clients for the logged-in counselor
router.get("/", authMiddleware, async (req, res) => {
    try {
        const clients = await Client.find().sort({ lastSessionDate: -1 });
        res.json(clients);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Get a specific client by ID
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const client = await Client.findById(req.params.id).populate(
            "sessions"
        );
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }
        res.json(client);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Create or update client (used for face recognition)
router.post("/recognize", authMiddleware, async (req, res) => {
    try {
        const { faceDescriptor } = req.body;

        if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
            return res.status(400).json({ message: "Invalid face descriptor" });
        }

        const clients = await Client.find({
            faceDescriptors: { $exists: true, $ne: [] },
        });

        let bestMatch = null;
        let bestDistance = 0.6;

        for (const client of clients) {
            for (const storedDescriptor of client.faceDescriptors) {
                const distance = calculateEuclideanDistance(
                    faceDescriptor,
                    storedDescriptor.descriptor
                );

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestMatch = {
                        client,
                        descriptor: storedDescriptor,
                        distance,
                    };
                }
            }
        }

        if (bestMatch) {
            bestMatch.client.lastSessionDate = new Date();
            await bestMatch.client.save();

            return res.json({
                client: bestMatch.client,
                isNew: false,
                confidence: 1 - bestDistance,
                matchedDescriptor: bestMatch.descriptor,
            });
        } else {
            return res.json({
                message: "No matching client found",
                isNew: true,
                client: null,
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Create or update client with face descriptor
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { name, faceDescriptor, snapshot } = req.body;

        if (!name || !faceDescriptor || !snapshot) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        let client = await Client.findOne({ name });

        if (client) {
            // Add new face descriptor to existing client
            client.faceDescriptors.push({
                descriptor: faceDescriptor,
                snapshot,
            });
            client.lastSessionDate = new Date();
            await client.save();
            return res.json({ client, isNew: false });
        } else {
            // Create new client
            client = new Client({
                name,
                faceDescriptors: [{ descriptor: faceDescriptor, snapshot }],
            });
            await client.save();
            return res.json({ client, isNew: true });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

function calculateEuclideanDistance(descriptor1: any, descriptor2: any) {
    if (descriptor1.length !== descriptor2.length) {
        return Infinity;
    }

    let sum = 0;
    for (let i = 0; i < descriptor1.length; i++) {
        const diff = descriptor1[i] - descriptor2[i];
        sum += diff * diff;
    }

    return Math.sqrt(sum);
}

export default router;