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
import type { Session, StressPoint } from "../../types/session";
import type { Question, UsedQuestion } from "../../types/question";
import {
    Camera,
    Square,
    Play,
    AlertCircle,
    MessageSquare,
    Loader2,
    X,
    Search,
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
    const [allClients, setAllClients] = useState<Client[]>([]);
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [clientSearchTerm, setClientSearchTerm] = useState("");
    const [showClientSearchResults, setShowClientSearchResults] = useState(false);
    const [showNewClientDialog, setShowNewClientDialog] = useState(false);
    const [showPermissionDialog, setShowPermissionDialog] = useState(false);
    const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
    const [recognizedClient, setRecognizedClient] = useState<Client | null>(
        null
    );
    const [recognitionConfidence, setRecognitionConfidence] = useState(0);
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
        const fetchData = async () => {
            try {
                const [questionRes, clientRes] = await Promise.all([
                    questionsAPI.getAll(),
                    clientsAPI.getAll(),
                ]);
                setQuestions(questionRes.data);
                setAllClients(clientRes.data);
            } catch (error) {
                console.error("Error fetching questions:", error);
            }
        };

        fetchData();
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
    }, [clientId]);

    useEffect(() => {
        startCamera();
        return () => {
            if (mediapipeServiceRef.current) {
                mediapipeServiceRef.current.stop();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

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
                                () => {},
                                (stressAnalysis: StressAnalysis) => {
                                    setCurrentStressState(stressAnalysis.state);

                                    const currentTime =
                                        Date.now() -
                                        sessionStartTimeRef.current;
                                    if (
                                        currentTime -
                                            lastStressUpdateRef.current >
                                        1000
                                    ) {
                                        lastStressUpdateRef.current =
                                            currentTime;

                                        const newStressPoint: StressPoint = {
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
        if (!modelsLoaded || !videoRef.current || !isVideoReady) {
            setRecognitionStatus("Video or models not ready for recognition.");
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
                setRecognizedClient(response.data.client);
                setRecognitionConfidence(response.data.confidence);
                setShowConfirmationDialog(true);
                setRecognitionStatus("");
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

    const confirmRecognizedClient = () => {
        if (recognizedClient) {
            setClient(recognizedClient);
            setShowConfirmationDialog(false);
            setRecognitionStatus(`Client confirmed: ${recognizedClient.name}`);

            setTimeout(() => {
                setRecognitionStatus("");
            }, 3000);
        }
    };

    const retryRecognition = () => {
        setShowConfirmationDialog(false);
        setRecognizedClient(null);
        setRecognitionConfidence(0);
        recognizeClient();
    };

    const saveNewClient = async () => {
        if (!newClientName.trim() || !faceSnapshot || !videoRef.current) return;
        
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
        try {
            const response = await sessionsAPI.create({
                clientId: client?._id || "",
                description: sessionDescription,
            });

            setSession(response.data);
            setIsSessionStarted(true);
            sessionStartTimeRef.current = Date.now();
            lastStressUpdateRef.current = 0;
            setStressPoints([]);
            setUsedQuestions([]);
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
            await sessionsAPI.updateDescription(session._id, sessionDescription);
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

    const filteredClients = allClients.filter((c) => 
        c.name.toLowerCase().includes(clientSearchTerm.toLowerCase())
    );

    const handleClientSelect = (selectedClient: Client) => {
        setClient(selectedClient);
        setClientSearchTerm("");
        setShowClientSearchResults(false);
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSessionDescription(e.target.value);
        console.log(`Session Description changed to: ${e.target.value}`);
    };

    const handleClientDeselect = () => {
        setClient(null);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Counseling Session</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Video Feed */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Video Feed</span>
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
                            </CardTitle>
                            <CardDescription>
                                {isSessionStarted
                                    ? "Session in progress"
                                    : "Camera is ready. Select a client (optional) and start the session."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                                <video
                                    ref={videoRef}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    style={{ display: "none" }}
                                />
                                <canvas
                                    ref={canvasRef}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    width={640}
                                    height={480}
                                />
                                {!isVideoReady && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Loader2 className="h-8 w-8 text-white animate-spin" />
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
                            {/* Status Alerts */}
                            {recognitionStatus && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{recognitionStatus}</AlertDescription>
                                </Alert>
                            )}
                            {poseLoadingStatus && (
                                <Alert>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <AlertDescription>{poseLoadingStatus}</AlertDescription>
                                </Alert>
                            )}
                            <div className="flex justify-center space-x-2">
                                {!isSessionStarted ? (
                                    <Button
                                        onClick={startSession}
                                        disabled={!isVideoReady || !mediapipeReady}
                                    >
                                        <Play className="mr-2 h-4 w-4" />
                                        Start Session
                                    </Button>
                                ) : (
                                    <>
                                        <Button onClick={pauseSession} variant="outline">
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
                                        <Button onClick={endSession}>End Session</Button>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Session Details */}
                    {isSessionStarted && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Session Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="description">Session Description</Label>
                                    <Input
                                        id="description"
                                        value={sessionDescription}
                                        onChange={handleDescriptionChange}
                                        placeholder="Enter a description for this session"
                                    />
                                </div>
                                {client && (
                                    <div className="space-y-2">
                                        <Label>Selected Client</Label>
                                        <div className="p-3 bg-gray-50 rounded-md flex justify-between items-center">
                                            <div>
                                                <p className="font-medium">{client.name}</p>
                                                <p className="text-sm text-gray-500">{client.sessions.length} previous sessions</p>
                                            </div>
                                            <Button size="sm" variant="ghost" onClick={handleClientDeselect}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Client Selection Card */}
                    {!isSessionStarted && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Client Selection</CardTitle>
                                <CardDescription>
                                    Associate this session with a client (optional).
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {!client ? (
                                    <>
                                        {/* Search Input */}
                                        <div className="relative">
                                            <Label htmlFor="client-search">Search for a client</Label>
                                            <div className="relative mt-2">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <Input
                                                    id="client-search"
                                                    placeholder="Type client name..."
                                                    value={clientSearchTerm}
                                                    onChange={(e) => {
                                                        setClientSearchTerm(e.target.value);
                                                        setShowClientSearchResults(true);
                                                    }}
                                                    onFocus={() => setShowClientSearchResults(true)}
                                                    className="pl-10"
                                                />
                                            </div>
                                            {/* Search Results Dropdown */}
                                            {showClientSearchResults && clientSearchTerm && (
                                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                    {filteredClients.length > 0 ? (
                                                        filteredClients.map((c) => (
                                                            <div
                                                                key={c._id}
                                                                className="px-4 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                                                                onClick={() => handleClientSelect(c)}
                                                            >
                                                                <span>{c.name}</span>
                                                                <Badge variant="outline">{c.sessions.length} sessions</Badge>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-2 text-gray-500">No clients found.</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-center">
                                            <span className="text-gray-400">OR</span>
                                        </div>

                                        {/* Face Recognition Button */}
                                        <Button
                                            onClick={recognizeClient}
                                            variant="outline"
                                            className="w-full"
                                            disabled={isRecognizing || !modelsLoaded}
                                        >
                                            {isRecognizing ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Recognizing...
                                                </>
                                            ) : (
                                                <>
                                                    <Camera className="mr-2 h-4 w-4" />
                                                    Recognize Client (Optional)
                                                </>
                                            )}
                                        </Button>
                                    </>
                                ) : (
                                    <div className="p-3 bg-gray-50 rounded-md flex justify-between items-center">
                                        <div>
                                            <p className="font-medium">{client.name}</p>
                                            <p className="text-sm text-gray-500">{client.sessions.length} previous sessions</p>
                                        </div>
                                        <Button size="sm" variant="ghost" onClick={handleClientDeselect}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Questions Panel */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" />
                                Question Bank
                            </CardTitle>
                            <CardDescription>Click questions to use them during the session</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isSessionStarted ? (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {questions.map((question) => (
                                        <div
                                            key={question._id}
                                            className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
                                            onClick={() => useQuestion(question)}
                                        >
                                            <p className="text-sm font-medium">{question.text}</p>
                                            <Badge variant="outline" className="mt-1 text-xs">
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
                        <Card>
                            <CardHeader>
                                <CardTitle>Used Questions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {usedQuestions.map((question, index) => (
                                        <div key={index} className="p-3 bg-gray-50 rounded-md">
                                            <p className="text-sm font-medium">{question.text}</p>
                                            <p className="text-xs text-gray-500">
                                                Asked at {Math.floor((question.timestamp || 0) / 1000)}s
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Dialogs */}
            <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Face Recognition</DialogTitle>
                        <DialogDescription>
                            We've detected a face that's not in our system. Would you like to create a profile for this person?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPermissionDialog(false)}>
                            No, thanks
                        </Button>
                        <Button onClick={() => { setShowPermissionDialog(false); setShowNewClientDialog(true); }}>
                            Yes, create profile
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Client Recognition</DialogTitle>
                        <DialogDescription>
                            We've recognized this person as {recognizedClient?.name} with {(recognitionConfidence * 100).toFixed(1)}% confidence. Is this correct?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={retryRecognition}>
                            Retry
                        </Button>
                        <Button onClick={confirmRecognizedClient}>Confirm</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Client Profile</DialogTitle>
                        <DialogDescription>Enter the name for the new client profile.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Client Name</Label>
                            <Input
                                id="name"
                                value={newClientName}
                                onChange={(e) => setNewClientName(e.target.value)}
                                placeholder="Enter client name"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowNewClientDialog(false);
                                setNewClientName("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={saveNewClient} disabled={!newClientName.trim()}>
                            Save Profile
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
