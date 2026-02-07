# GSCA - Guidance and Stress Counseling Assistant

A web-based counseling session management system that combines real-time body language analysis with AI-powered insights to help counselors better understand and support their clients.

## What It Does

GSCA provides counselors with tools to conduct and analyze counseling sessions. During a session, the system uses the client's webcam to track body movements and posture in real-time, identifying stress indicators like fidgeting, leg bouncing, and posture changes. After the session, an AI generates insights including session summaries, potential sensitive topics, and recommendations for future sessions.

The system also includes face recognition to automatically identify returning clients, making it easier to track progress across multiple sessions.

## Features

- **Real-time Stress Detection**: Uses MediaPipe Pose to analyze body language and categorize the client's state as calm, vigilant, or tense
- **Pose Visualization**: Draws skeleton overlays on the video feed showing tracked body landmarks
- **Question Bank**: Counselors can use predefined questions during sessions, with timestamps recorded for later analysis
- **Session Analytics**: View stress state distribution over time with interactive charts
- **AI-Generated Insights**: Powered by Google's Gemini API to provide session summaries, identify sensitive topics, highlight positive patterns, and suggest next steps
- **Client Recognition**: Optional face recognition using face-api.js to identify and track clients across sessions
- **Client Management**: Create and manage client profiles with session history
- **Session History**: Review past sessions with full analytics and AI insights

## Tech Stack

**Frontend**
- React 19 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- Radix UI for accessible components
- Recharts for data visualization
- MediaPipe Pose for body tracking
- face-api.js for face recognition

**Backend**
- Node.js with Express 5
- TypeScript
- MongoDB with Mongoose
- Google Gemini API for AI insights
- JWT for authentication
- bcryptjs for password hashing

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- MongoDB instance (local or cloud)
- Google Cloud API key with Gemini access

### Installation

1. Clone the repository:
```bash
git clone https://github.com/jansencruz23/gsca-mern.git
cd gsca-mern
```

2. Install dependencies for both frontend and backend:
```bash
cd frontend
npm install

cd ../backend
npm install
```

3. Set up environment variables:

Backend `.env`:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GOOGLE_API_KEY=your_gemini_api_key
PORT=5000
```

Frontend `.env`:
```
VITE_API_URL=http://localhost:5000/api
```

4. Download face-api.js models and place them in `frontend/public/models/`

5. Start the development servers:

Backend:
```bash
cd backend
npm run dev
```

Frontend:
```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:5000`.

## How the Stress Detection Works

The stress analysis algorithm evaluates three main factors:

- **Posture**: Shoulder and hip alignment, head position relative to shoulders, spine alignment
- **Movement**: Overall body movement velocity averaged over time
- **Fidgeting**: Hand movements near ears/shoulders and leg/knee bouncing

These factors are weighted and combined to classify the client's current state. The system records stress points every second during a session, creating a timeline that can be correlated with specific questions asked.

## Project Structure

```
gsca-mern/
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── services/      # API calls and ML services
│   │   ├── contexts/      # React contexts
│   │   └── types/         # TypeScript interfaces
│   └── public/
│       └── models/        # face-api.js models
├── backend/
│   └── src/
│       ├── controllers/   # Request handlers
│       ├── models/        # MongoDB schemas
│       ├── routes/        # API routes
│       ├── middleware/    # Auth middleware
│       └── services/      # Business logic
```

## API Endpoints

- `POST /api/auth/register` - Register a new counselor
- `POST /api/auth/login` - Login and receive JWT
- `GET /api/clients` - List all clients
- `POST /api/clients` - Create a client with face descriptor
- `POST /api/clients/recognize` - Identify client by face
- `GET /api/sessions` - List all sessions
- `POST /api/sessions` - Create a new session
- `PUT /api/sessions/:id/stress-points` - Update session stress data
- `POST /api/sessions/:id/insights` - Generate AI insights
- `GET /api/questions` - Get available session questions

## Deployment

The application is configured for deployment on Vercel. The frontend connects to the backend using the environment variable `VITE_API_URL`.