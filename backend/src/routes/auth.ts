import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Counselor } from "../models/Counselor.js";

const router = express.Router();

// Counselor Registration
router.post("/register", async (req, res) => {
    try {
        const { username, password, firstName, lastName, email } = req.body;

        const existingCounselor = await Counselor.findOne({
            $or: [{ username }, { email }],
        });
        if (existingCounselor) {
            return res
                .status(400)
                .json({ message: "Username or email already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const counselor = new Counselor({
            username,
            password: hashedPassword,
            firstName,
            lastName,
            email,
        });

        await counselor.save();

        const token = jwt.sign(
            { id: counselor._id },
            process.env.JWT_SECRET || "fallback_secret",
            {
                expiresIn: "1d",
            }
        );

        res.status(201).json({
            token,
            counselor: {
                id: counselor._id,
                username: counselor.username,
                firstName: counselor.firstName,
                lastName: counselor.lastName,
                email: counselor.email,
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Counselor Login
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        const counselor = await Counselor.findOne({ username });
        if (!counselor) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, counselor.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: counselor._id },
            process.env.JWT_SECRET || "fallback_secret",
            {
                expiresIn: "1d",
            }
        );

        res.json({
            token,
            counselor: {
                id: counselor._id,
                username: counselor.username,
                firstName: counselor.firstName,
                lastName: counselor.lastName,
                email: counselor.email,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
