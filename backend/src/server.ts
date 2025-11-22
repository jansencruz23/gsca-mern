import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import clientRoutes from "./routes/clients.ts";
import sessionRoutes from "./routes/sessions.ts";
import questionRoutes from "./routes/questions.ts";
import analyticsRoutes from "./routes/analytics.ts";
import authRoutes from "./routes/auth.ts";

dotenv.config();

const allowedOrigins = [
    "http://localhost:3000",
    "https://gsca-mern-frontend.vercel.app",
];

const app = express();

// Middleware
app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
    })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Connect to MongoDB
mongoose
    .connect(process.env.MONGODB_URI || "")
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/analytics", analyticsRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
