import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    user?: any;
}

export default (req: AuthRequest, res: Response, next: NextFunction) => {
    const bearerHeader = req.header("authorization");
    let token = null;

    if (bearerHeader && bearerHeader.startsWith("Bearer ")) {
        token = bearerHeader.replace("Bearer ", "");
    } else {
        token = req.header("x-auth-token");
    }

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};