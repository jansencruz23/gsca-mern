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
import type { Question, UsedQuestion } from "../../types/question";
import {
    Camera,
    Square,
    Play,
    User,
    AlertCircle,
    MessageSquare,
    Loader2,
} from "lucide-react";
import {
    MediapipePoseService,
    type StressAnalysis,
} from "@/services/mediapipePose";

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
    const [usedQuestions, setUsedQuestions] = useState<UsedQuestion[]>([]);
    const [stressPoints, setStressPoints] = useState<any[]>([]);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [recognitionStatus, setRecognitionStatus] = useState("");
    const [faceSnapshot, setFaceSnapshot] = useState("");
    const [currentStressState, setCurrentStressState] = useState<
        "calm" | "vigilance" | "tense"
    >("calm");
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
        setRecognitionStatus("Loading face recognition models...");
        const loaded = await loadModels();
        if (loaded) {
            setModelsLoaded(true);
            setRecognitionStatus("");
        } else {
            setRecognitionStatus("Failed to load face recognition models.");
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
            });
            streamRef.current = stream;

            if (videoRef.current && streamRef.current) {
                videoRef.current.srcObject = stream;

                videoRef.current.onloadedmetadata = async () => {
                    try {
                        setPoseLoadingStatus("Initializing pose detection...");
                        mediapipeServiceRef.current =
                            new MediapipePoseService();

                        const initialized =
                            await mediapipeServiceRef.current.initialize(
                                videoRef.current!,
                                canvasRef.current!,
                                (results) => {},
                                (stressAnalysis: StressAnalysis) => {
                                    setCurrentStressState(stressAnalysis.state);

                                    const currentTime =
                                        Date.now() -
                                        sessionStartTimeRef.current;
                                    if (
                                        currentTime -
                                            lastStressUpdateRef.current >=
                                        2000
                                    ) {
                                        lastStressUpdateRef.current =
                                            currentTime;

                                        const newStressPoint = {
                                            timestamp: currentTime,
                                            state: stressAnalysis.state,
                                            confidence:
                                                stressAnalysis.confidence,
                                            details: stressAnalysis.details,
                                        };

                                        setStressPoints((prev) => [
                                            ...prev,
                                            newStressPoint,
                                        ]);
                                    }
                                }
                            );

                        if (initialized) {
                            setPoseLoadingStatus("Starting pose detection...");
                            await mediapipeServiceRef.current.start();

                            videoRef.current?.play();
                            setIsVideoReady(true);
                            setMediapipeReady(true);
                            setPoseLoadingStatus("");
                        } else {
                            setPoseLoadingStatus(
                                "Failed to initialize pose detection."
                            );
                        }
                    } catch (error) {
                        console.error(
                            "Error initializing pose detection:",
                            error
                        );
                        setPoseLoadingStatus(
                            "Error initializing pose detection."
                        );
                    }
                };
            }
        } catch (error) {
            console.error("Error accessing webcam:", error);
            setRecognitionStatus("Error accessing webcam.");
        }
    };

    const recognizeClient = async () => {
        if (!modelsLoaded) {
            setRecognitionStatus("Face recognition models not loaded yet.");
            return;
        }

        if (!videoRef.current || !isVideoReady) {
            setRecognitionStatus("Video not ready for recognition.");
            return;
        }

        setIsRecognizing(true);
        setRecognitionStatus("Detecting face...");

        try {
            const snapshot = getFaceSnapshot(videoRef.current);
            setFaceSnapshot(snapshot);
            const { descriptor } = await detectFace(videoRef.current);

            setRecognitionStatus("Recognizing client...");
            const response = await clientsAPI.recognize({
                faceDescriptor: descriptor,
            });

            if (response.data.client) {
                // Existing client recognized
                setClient(response.data.client);
                setRecognitionStatus(
                    `Recognized client: ${
                        response.data.client.name
                    } (Confidence: ${(response.data.confidence * 100).toFixed(
                        1
                    )}%)`
                );

                setTimeout(() => {
                    setRecognitionStatus("");
                }, 3000);
            } else {
                // No matching client found, prompt to create new
                setRecognitionStatus("No matching client found.");
                setShowNewClientDialog(true);
            }
        } catch (error) {
            console.error("Error during client recognition:", error);
            setRecognitionStatus("Error during client recognition.");
        } finally {
            setIsRecognizing(false);
        }
    };

    const saveNewClient = async () => {
        if (!newClientName.trim() || !faceSnapshot) {
            return;
        }

        try {
            const { descriptor } = await detectFace(videoRef.current!);
            const response = await clientsAPI.create({
                faceDescriptor: descriptor,
                name: newClientName,
                snapshot: faceSnapshot,
            });

            setClient(response.data.client);
            setShowNewClientDialog(false);
            setNewClientName("");
            setRecognitionStatus(
                `New client created: ${response.data.client.name}`
            );

            // Show success message
            setTimeout(() => {
                setRecognitionStatus("");
            }, 3000);
        } catch (error) {
            console.error("Error saving new client:", error);
            setRecognitionStatus("Error saving new client.");
        }
    };

    const startSession = async () => {
        if (!client) {
            alert("Please select or recognize a client first.");
            return;
        }

        try {
            const response = await sessionsAPI.create({
                clientId: client._id,
                description: sessionDescription,
            });

            setSession(response.data);
            setIsSessionStarted(true);
            sessionStartTimeRef.current = Date.now();
            lastStressUpdateRef.current = 0;
            setStressPoints([]);
            setUsedQuestions([]);

            if (!isVideoReady) {
                await startCamera();
            }
        } catch (error) {
            console.error("Error starting session:", error);
        }
    };

    const pauseSession = () => {
        setIsSessionPaused(!isSessionPaused);

        if (mediapipeServiceRef.current) {
            if (isSessionPaused) {
                mediapipeServiceRef.current.start();
            } else {
                mediapipeServiceRef.current.stop();
            }
        }
    };

    const endSession = async () => {
        if (!session) return;

        try {
            if (mediapipeServiceRef.current) {
                mediapipeServiceRef.current.stop();
            }

            await sessionsAPI.updateStressPoints(session._id, stressPoints);
            navigate(`/analytics/${session._id}`);
        } catch (error) {
            console.error("Error ending session:", error);
        }
    };

    const useQuestion = (question: Question) => {
        const currentTime = Date.now() - sessionStartTimeRef.current;
        const usedQuestion: UsedQuestion = {
            ...question,
            timestamp: currentTime,
        };

        setUsedQuestions((prev) => [...prev, usedQuestion]);

        const newStressPoint = {
            timestamp: currentTime,
            state: "vigilance",
            question: question._id,
        };

        setStressPoints((prev) => [...prev, newStressPoint]);
    };

    const getStressStateColor = (state: string) => {
        switch (state) {
            case "calm":
                return "bg-green-500";
            case "vigilance":
                return "bg-yellow-500";
            case "tense":
                return "bg-red-500";
            default:
                return "bg-gray-500";
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Counseling Session</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Video Feed */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Video Feed</span>
                                <div className="flex items-center gap-2">
                                    {client && (
                                        <Badge
                                            variant="outline"
                                            className="flex items-center gap-1"
                                        >
                                            <User size={14} />
                                            {client.name}
                                        </Badge>
                                    )}
                                    {isSessionStarted && (
                                        <Badge
                                            className={`flex items-center gap-1 ${getStressStateColor(
                                                currentStressState
                                            )} text-white`}
                                        >
                                            {currentStressState
                                                .charAt(0)
                                                .toUpperCase() +
                                                currentStressState.slice(1)}
                                        </Badge>
                                    )}
                                </div>
                            </CardTitle>
                            <CardDescription>
                                {isSessionStarted
                                    ? "Session in progress"
                                    : "Start a session to begin stress detection"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                                <video
                                    ref={videoRef}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    style={{ display: "none" }} // Hide video, we'll show the canvas with pose overlay
                                />
                                <canvas
                                    ref={canvasRef}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    width={640}
                                    height={480}
                                />
                                {!isVideoReady && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <p className="text-white">
                                            Camera feed will appear here
                                        </p>
                                    </div>
                                )}
                                {isSessionStarted && (
                                    <div className="absolute top-4 right-4">
                                        <Badge
                                            variant={
                                                isSessionPaused
                                                    ? "secondary"
                                                    : "default"
                                            }
                                        >
                                            {isSessionPaused
                                                ? "Paused"
                                                : "Recording"}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                            {/* Recognition Status */}
                            {recognitionStatus && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        {recognitionStatus}
                                    </AlertDescription>
                                </Alert>
                            )}
                            {/* Pose Loading Status */}
                            {poseLoadingStatus && (
                                <Alert>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <AlertDescription>
                                        {poseLoadingStatus}
                                    </AlertDescription>
                                </Alert>
                            )}
                            <div className="flex justify-center space-x-2">
                                {!isSessionStarted ? (
                                    <>
                                        <Button
                                            onClick={startCamera}
                                            variant="outline"
                                            disabled={isVideoReady}
                                        >
                                            <Camera className="mr-2 h-4 w-4" />
                                            {isVideoReady
                                                ? "Camera Ready"
                                                : "Start Camera"}
                                        </Button>
                                        {!client && (
                                            <Button
                                                onClick={recognizeClient}
                                                variant="outline"
                                                disabled={
                                                    !isVideoReady ||
                                                    isRecognizing ||
                                                    !modelsLoaded
                                                }
                                            >
                                                {isRecognizing ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Recognizing...
                                                    </>
                                                ) : (
                                                    "Recognize Client"
                                                )}
                                            </Button>
                                        )}
                                        <Button
                                            onClick={startSession}
                                            disabled={
                                                !client ||
                                                !isVideoReady ||
                                                !mediapipeReady
                                            }
                                        >
                                            <Play className="mr-2 h-4 w-4" />
                                            Start Session
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            onClick={pauseSession}
                                            variant="outline"
                                        >
                                            {isSessionPaused ? (
                                                <>
                                                    <Play className="mr-2 h-4 w-4" />
                                                    Resume
                                                </>
                                            ) : (
                                                <>
                                                    <Square className="mr-2 h-4 w-4" />
                                                    Pause
                                                </>
                                            )}
                                        </Button>
                                        <Button onClick={endSession}>
                                            End Session
                                        </Button>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Session Details */}
                    {isSessionStarted && (
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Session Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="description">
                                        Session Description
                                    </Label>
                                    <Input
                                        id="description"
                                        value={sessionDescription}
                                        onChange={(e) =>
                                            setSessionDescription(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Enter a description for this session"
                                    />
                                </div>

                                {client && (
                                    <div className="space-y-2">
                                        <Label>Selected Client</Label>
                                        <div className="p-3 bg-gray-50 rounded-md">
                                            <p className="font-medium">
                                                {client.name}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {client.sessions.length}{" "}
                                                previous sessions
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Questions Panel */}
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" />
                                Question Bank
                            </CardTitle>
                            <CardDescription>
                                Click questions to use them during the session
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isSessionStarted ? (
                                <div className="space-y-2">
                                    {questions.map((question) => (
                                        <div
                                            key={question._id}
                                            className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
                                            onClick={() =>
                                                useQuestion(question)
                                            }
                                        >
                                            <p className="text-sm font-medium">
                                                {question.text}
                                            </p>
                                            <Badge
                                                variant="outline"
                                                className="mt-1 text-xs"
                                            >
                                                {question.category}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                                    <p>Start a session to use questions</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Used Questions */}
                    {isSessionStarted && usedQuestions.length > 0 && (
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Used Questions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {usedQuestions.map((question, index) => (
                                        <div
                                            key={index}
                                            className="p-3 bg-gray-50 rounded-md"
                                        >
                                            <p className="text-sm font-medium">
                                                {question.text}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Asked at{" "}
                                                {Math.floor(
                                                    (question.timestamp || 0) /
                                                        1000
                                                )}
                                                s
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* New Client Dialog */}
            <Dialog
                open={showNewClientDialog}
                onOpenChange={setShowNewClientDialog}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New Client Detected</DialogTitle>
                        <DialogDescription>
                            This person is not in our system. Would you like to
                            create a profile for them?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Client Name</Label>
                            <Input
                                id="name"
                                value={newClientName}
                                onChange={(e) =>
                                    setNewClientName(e.target.value)
                                }
                                placeholder="Enter client name"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowNewClientDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={saveNewClient}
                            disabled={!newClientName.trim()}
                        >
                            Save Profile
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
