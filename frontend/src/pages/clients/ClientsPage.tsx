import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { clientsAPI, sessionsAPI } from "../../services/api";
import type { Client } from "../../types/client";
import type { Session } from "../../types/session";
import {
    ArrowLeft,
    Calendar,
    User,
    Clock,
    BarChart3,
    Loader2,
    Edit,
    Camera,
    AlertCircle,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    detectFace,
    getFaceSnapshot,
    loadModels,
} from "@/services/faceRecognition";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const ClientsPage: React.FC = () => {
    const navigate = useNavigate();

    // State for the list of all clients
    const [allClients, setAllClients] = useState<Client[]>([]);
    const [isLoadingClients, setIsLoadingClients] = useState(true);

    // State for the selected client and their sessions
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedClientSessions, setSelectedClientSessions] = useState<
        Session[]
    >([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);

    // State for the edit client dialog
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [editClientName, setEditClientName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // --- State for the Update Face Dialog ---
    const [showUpdateFaceDialog, setShowUpdateFaceDialog] = useState(false);
    const [isUpdatingFace, setIsUpdatingFace] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [updateStatus, setUpdateStatus] = useState("");
    const [isVideoReady, setIsVideoReady] = useState(false);

    // Refs for the video and canvas elements inside the dialog
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const response = await clientsAPI.getAll();
                setAllClients(response.data);
            } catch (error) {
                console.error("Error fetching clients:", error);
            } finally {
                setIsLoadingClients(false);
            }
        };

        fetchClients();
    }, []);

    useEffect(() => {
        if (!selectedClient) {
            setSelectedClientSessions([]);
            return;
        }

        const fetchClientSessions = async () => {
            setIsLoadingSessions(true);
            try {
                const response = await sessionsAPI.getByClientId(
                    selectedClient._id
                );
                setSelectedClientSessions(response.data);
            } catch (error) {
                console.error("Error fetching client sessions:", error);
            } finally {
                setIsLoadingSessions(false);
            }
        };

        fetchClientSessions();
    }, [selectedClient]);

    const handleSelectClient = (client: Client) => {
        setSelectedClient(client);
    };

    const handleBackToList = () => {
        setSelectedClient(null);
    };

    // --- Edit Client Handlers ---

    const handleOpenEditDialog = (client: Client) => {
        setEditingClient(client);
        setEditClientName(client.name);
        setShowEditDialog(true);
    };

    const handleCloseEditDialog = () => {
        setShowEditDialog(false);
        clientsAPI;
        setEditingClient(null);
        setEditClientName("");
    };

    const handleSaveEdit = async () => {
        if (!editingClient || !editClientName.trim()) return;

        setIsSaving(true);
        try {
            await clientsAPI.update({
                id: editingClient._id,
                name: editClientName.trim(),
            });

            setAllClients((prevClients) =>
                prevClients.map((c) =>
                    c._id === editingClient._id
                        ? { ...c, name: editClientName }
                        : c
                )
            );

            if (selectedClient && selectedClient._id === editingClient._id) {
                setSelectedClient({ ...selectedClient, name: editClientName });
            }

            handleCloseEditDialog();
        } catch (error) {
            console.error("Error updating client:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // --- Update Face Handlers ---
    const handleOpenUpdateFaceDialog = () => {
        setShowUpdateFaceDialog(true);
        setUpdateStatus("");
        setIsVideoReady(false);
        loadFaceApiModels();
    };

    const handleCloseUpdateFaceDialog = () => {
        setShowUpdateFaceDialog(false);
        // Stop the camera stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
        }
    };

    const loadFaceApiModels = async () => {
        setUpdateStatus("Loading face recognition models...");
        const loaded = await loadModels();
        if (loaded) {
            setModelsLoaded(true);
            setUpdateStatus("");
            startCameraForUpdate();
        } else {
            setUpdateStatus("Failed to load models.");
        }
    };

    const startCameraForUpdate = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
            });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    setIsVideoReady(true);
                };
            }
        } catch (error) {
            console.error("Error accessing webcam:", error);
            setUpdateStatus("Error accessing webcam.");
        }
    };

    const handleUpdateFace = async () => {
        if (
            !selectedClient ||
            !videoRef.current ||
            !isVideoReady ||
            !modelsLoaded
        ) {
            return;
        }

        setIsUpdatingFace(true);
        setUpdateStatus("Detecting face...");

        try {
            const snapshot = getFaceSnapshot(videoRef.current);
            const { descriptor } = await detectFace(videoRef.current);

            if (!descriptor) {
                setUpdateStatus("No face detected. Please try again.");
                setIsUpdatingFace(false);
                return;
            }

            setUpdateStatus("Updating face recognition data...");
            // Assumes you have an API endpoint to update the face descriptor
            await clientsAPI.updateFaceDescriptor(selectedClient._id, {
                faceDescriptor: descriptor,
                snapshot: snapshot,
            });

            setUpdateStatus("Face recognition data updated successfully!");
            setTimeout(() => {
                handleCloseUpdateFaceDialog();
            }, 1500);
        } catch (error) {
            console.error("Error updating face:", error);
            setUpdateStatus("An error occurred. Please try again.");
        } finally {
            setIsUpdatingFace(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const getSessionDuration = (session: Session) => {
        if (!session.stressPoints || session.stressPoints.length === 0)
            return "0:00";
        const lastPoint = session.stressPoints[session.stressPoints.length - 1];
        const minutes = Math.floor(lastPoint.timestamp / 60000);
        const seconds = Math.floor((lastPoint.timestamp % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    const renderClientList = () => {
        if (isLoadingClients) {
            return (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            );
        }

        if (allClients.length === 0) {
            return (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <User className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium mb-2">
                            No clients yet
                        </h3>
                        <p className="text-gray-500 text-center mb-4">
                            Once you conduct counseling sessions, your clients
                            will appear here.
                        </p>
                        <Button onClick={() => navigate("/session")}>
                            Start New Session
                        </Button>
                    </CardContent>
                </Card>
            );
        }

        return (
            <Card>
                <CardHeader>
                    <CardTitle>All Clients</CardTitle>
                    <CardDescription>
                        Click on a client to view their session history.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {allClients.map((client) => (
                            <div
                                key={client._id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div
                                    className="flex items-center space-x-3 flex-grow cursor-pointer"
                                    onClick={() => handleSelectClient(client)}
                                >
                                    <User className="h-8 w-8 text-gray-400" />
                                    <div>
                                        <p className="font-medium">
                                            {client.name}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Last session:{" "}
                                            {formatDate(client.lastSessionDate)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Badge variant="outline">
                                        {client.sessions.length} sessions
                                    </Badge>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenEditDialog(client);
                                        }}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderClientDetail = () => {
        if (!selectedClient) return null;

        return (
            <div>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBackToList}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to
                            Clients
                        </Button>
                        <h1 className="text-3xl font-bold">
                            {selectedClient.name}'s Sessions
                        </h1>
                    </div>
                    {/* NEW: Update Face Button */}
                    <Button
                        variant="outline"
                        onClick={handleOpenUpdateFaceDialog}
                    >
                        <Camera className="mr-2 h-4 w-4" /> Update Face
                        Recognition
                    </Button>
                </div>

                {isLoadingSessions ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {selectedClientSessions.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                                    <h3 className="text-lg font-medium mb-2">
                                        No sessions yet
                                    </h3>
                                    <p className="text-gray-500 text-center mb-4">
                                        This client has not had any sessions
                                        recorded.
                                    </p>
                                    <Button
                                        onClick={() =>
                                            navigate(
                                                `/session?clientId=${selectedClient._id}`
                                            )
                                        }
                                    >
                                        Start New Session
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            selectedClientSessions.map((session) => (
                                <Card key={session._id}>
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-medium">
                                                    Session on{" "}
                                                    {formatDate(session.date)}
                                                </h3>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {session.description ||
                                                        "No description provided."}
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <div className="text-right">
                                                    <p className="text-sm font-medium">
                                                        Duration
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {getSessionDuration(
                                                            session
                                                        )}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    onClick={() =>
                                                        navigate(
                                                            `/analytics/${session._id}`
                                                        )
                                                    }
                                                >
                                                    <BarChart3 className="mr-2 h-4 w-4" />{" "}
                                                    View Analytics
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {selectedClient ? renderClientDetail() : renderClientList()}

            {/* Edit Client Dialog */}
            <Dialog open={showEditDialog} onOpenChange={handleCloseEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Client Name</DialogTitle>
                        <DialogDescription>Make changes to the client's name here. Click save when you're done.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" value={editClientName} onChange={(e) => setEditClientName(e.target.value)} placeholder="Enter client name" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseEditDialog}>Cancel</Button>
                        <Button onClick={handleSaveEdit} disabled={!editClientName.trim() || isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* NEW: Update Face Dialog */}
            <Dialog open={showUpdateFaceDialog} onOpenChange={setShowUpdateFaceDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Update Face Recognition</DialogTitle>
                        <DialogDescription>
                            Center your face in the camera and click "Update" to improve recognition accuracy.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
                            {!isVideoReady && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                                </div>
                            )}
                        </div>
                        {updateStatus && (
                            <Alert>
                                {updateStatus.includes("Error") || updateStatus.includes("No face") ? <AlertCircle className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                                <AlertDescription>{updateStatus}</AlertDescription>
                            </Alert>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseUpdateFaceDialog}>Cancel</Button>
                        <Button onClick={handleUpdateFace} disabled={isUpdatingFace || !isVideoReady || !modelsLoaded}>
                            {isUpdatingFace && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Face Data
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
