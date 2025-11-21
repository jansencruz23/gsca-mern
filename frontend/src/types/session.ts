import type { User } from "./auth";
import type { Client } from "./client";
import type { Question } from "./question";

export interface StressPoint {
    timestamp: number;
    state: 'calm' | 'vigilance' | 'tense';
    question?: string;
}

export interface Session {
    _id: string;
    client: string | Client;
    counselor: string | User;
    description: string;
    date: string;
    stressPoints: StressPoint[];
    questions: string[] | Question[];
    summary?: string;
    suggestions?: string;
}

export interface SessionForm {
    clientId: string;
    description: string;
}