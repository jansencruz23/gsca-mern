import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from "../../components/ui/dialog";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { clientsAPI, sessionsAPI, questionsAPI } from "../../services/api";
import {
    loadModels,
    detectFace,
    getFaceSnapshot,
} from "../../services/faceRecognition";
import type { Client } from "../../types/client";
import type { Session } from "../../types/session";
import type { Question } from "../../types/question";
import {
    Camera,
    Square,
    Play,
    User,
    AlertCircle,
    MessageSquare,
    Loader2,
} from "lucide-react";
import { MediapipePoseService } from "@/services/mediapipePose";

export const SessionPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const clientId = searchParams.get("clientId");
    const navigate = useNavigate();

    const [sessionDescription, setSessionDescription] = useState("");
    const [isSessionStarted, setIsSessionStarted] = useState(false);
    const [isSessionPaused, setIsSessionPaused] = useState(false);
    const [session, setSession] = useState<Session | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [showNewClientDialog, setShowNewClientDialog] = useState(false);
    const [newClientName, setNewClientName] = useState("");
    const [questions, setQuestions] = useState<Question[]>([]);
    const [usedQuestions, setUsedQuestions] = useState<Question[]>([]);
    const [stressPoints, setStressPoints] = useState<any[]>([]);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [recognitionStatus, setRecognitionStatus] = useState("");
    const [faceSnapshot, setFaceSnapshot] = useState("");
    const [currentStressState, setCurrentStressState] = useState<'calm' | 'vigilance' | 'tense'>('calm');
    const [mediapipeReady, setMediapipeReady] = useState(false);
    const [poseLoadingStatus, setPoseLoadingStatus] = useState("");

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const mediapipeServiceRef = useRef<MediapipePoseService | null>(null);
    const sessionStartTimeRef = useRef<number>(0);
    const lastStressUpdateRef = useRef<number>(0);

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const response = await questionsAPI.getAll();
                setQuestions(response.data);
            } catch (error) {
                console.error("Error fetching questions:", error);
            }
        };

        fetchQuestions();
        loadFaceApiModels();

        // If clientId is provided, fetch client details
        if (clientId) {
            const fetchClient = async () => {
                try {
                    const response = await clientsAPI.getById(clientId);
                    setClient(response.data);
                } catch (error) {
                    console.error("Error fetching client:", error);
                }
            };

            fetchClient();
        }

        return () => {
            if (mediapipeServiceRef.current) {
                mediapipeServiceRef.current.stop();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, [clientId]);

    const loadFaceApiModels = async () => {
        setRecognitionStatus('Loading face recognition models...');
        const loaded = await loadModels();
        if (loaded) {
            setModelsLoaded(true);
            setRecognitionStatus('');
        } else {
            setRecognitionStatus('Failed to load face recognition models.');
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;

            if (videoRef.current && streamRef.current) {
                videoRef.current.srcObject = stream;

                videoRef.current.onloadedmetadata = async () => {
                    try {
                        setPoseLoadingStatus('Initializing pose detection...');
                        mediapipeServiceRef.current = new MediapipePoseService();
                    }
                };
            }

            initializePoseDetection();
        } catch (error) {
            console.error("Error accessing webcam:", error);
        }
    };

    const initializePoseDetection = () => {

    };
};
