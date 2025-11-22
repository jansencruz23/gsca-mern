import type { VercelRequest, VercelResponse } from "@vercel/node";

const allowedOrigins = [
    'http://localhost:5173',
    'https://gsca-mern-frontend.vercel.app'
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // --- DYNAMIC CORS HANDLING ---
    const origin = req.headers.origin;
    
    // Check if the request's origin is in our allowed list
    if (allowedOrigins.includes(origin!)) {
        res.setHeader("Access-Control-Allow-Origin", "*");
    }
    
    // You can also use a wildcard for simplicity, but it's less secure
    // res.setHeader("Access-Control-Allow-Origin", "*");

    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    // Handle preflight OPTIONS request
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // --- YOUR LOGIN LOGIC ---
    if (req.method === "POST") {
        // You would typically get email/password from req.body
        // const { email, password } = req.body;
        
        // For now, returning a success message as in your example
        // Replace this with your actual database check and JWT generation
        return res.status(200).json({ 
            message: "Login successful!",
            // user: { ... },
            // token: "..."
        });
    }

    // Handle other methods if needed
    return res.status(405).json({ message: "Method Not Allowed" });
}