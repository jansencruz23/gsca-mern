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
        const response = await sessionsAPI.getByClientId(selectedClient._id);
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
          c._id === editingClient._id ? { ...c, name: editClientName } : c
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
          <div className="text-center">
            <div className="relative inline-block">
              <div className="w-16 h-16 rounded-full bg-purple-100"></div>
              <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-transparent border-t-purple-600 border-r-purple-600 animate-spin"></div>
            </div>
            <p className="mt-4 text-lg font-medium text-purple-700">
              Loading clients...
            </p>
          </div>
        </div>
      );
    }

    if (allClients.length === 0) {
      return (
        <Card className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <User className="h-16 w-16 text-[#8434d0] mb-6" />
            <h3 className="text-xl font-bold text-gray-800 mb-3">
              No clients yet
            </h3>
            <p className="text-gray-600 mb-6 text-center max-w-md">
              Once you conduct counseling sessions, your clients will appear
              here.
            </p>
            <Button
              onClick={() => navigate("/session")}
              className="rounded-full bg-[#8434d0] hover:bg-[#6b2bb8] text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Start New Session
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allClients.map((client) => (
          <Card
            key={client._id}
            className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={() => handleSelectClient(client)}
          >
            <CardHeader className="pb-1">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-3 rounded-full">
                    <User className="h-6 w-6 text-purple-700" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-800">
                      {client.name}
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Last session: {formatDate(client.lastSessionDate)}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditDialog(client);
                  }}
                  className="rounded-full text-[#8434d0] hover:bg-[#f0e6ff] hover:text-[#6b2bb8] h-10 w-10"
                  aria-label="Edit Client"
                >
                  <Edit className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <Badge
                  variant="outline"
                  className="rounded-full bg-purple-50 text-purple-700 border-purple-200"
                >
                  {client.sessions.length} sessions
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderClientDetail = () => {
    if (!selectedClient) return null;

    return (
      <div className="min-h-screen bg-purple-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleBackToList}
                className="rounded-full bg-[#8434d0] hover:bg-[#6b2bb8] text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Clients
              </Button>
            </div>
            {/* Update Face Button */}
            {selectedClient._id !== import.meta.env.VITE_UNKNOWN_CLIENT_ID && (
              <Button
                onClick={handleOpenUpdateFaceDialog}
                className="rounded-full bg-[#8434d0] hover:bg-[#6b2bb8] text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Camera className="mr-2 h-4 w-4" /> Update Face Recognition
              </Button>
            )}
          </div>

          {/* Client Profile Header */}
          <Card className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
                <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-4 rounded-full">
                  <User className="h-12 w-12 text-purple-700" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {selectedClient.name}
                  </h2>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-gray-500" />
                      <span className="text-gray-600">
                        Last session:{" "}
                        {formatDate(selectedClient.lastSessionDate)}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="rounded-full bg-purple-50 text-purple-700 border-purple-200"
                    >
                      {selectedClient.sessions.length} sessions
                    </Badge>
                  </div>
                  <div className="flex justify-center md:justify-start space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => handleOpenEditDialog(selectedClient)}
                      className="rounded-full"
                    >
                      <Edit className="mr-2 h-4 w-4" /> Edit Profile
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sessions Section */}
          <Card className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden">
            <CardHeader className="pb-1">
              <div>
                <CardTitle className="text-xl font-bold text-gray-800">
                  Session History
                </CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  All counseling sessions with this client
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoadingSessions ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-center">
                    <div className="relative inline-block">
                      <div className="w-16 h-16 rounded-full bg-purple-100"></div>
                      <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-transparent border-t-purple-600 border-r-purple-600 animate-spin"></div>
                    </div>
                    <p className="mt-4 text-lg font-medium text-purple-700">
                      Loading sessions...
                    </p>
                  </div>
                </div>
              ) : selectedClientSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-16 w-16 text-[#8434d0] mb-6" />
                  <h3 className="text-xl font-bold text-gray-800 mb-3">
                    No sessions yet
                  </h3>
                  <p className="text-gray-600 mb-6 text-center max-w-md">
                    This client has not had any sessions recorded.
                  </p>
                  <Button
                    onClick={() =>
                      navigate(`/session?clientId=${selectedClient._id}`)
                    }
                    className="rounded-full bg-[#8434d0] hover:bg-[#6b2bb8] text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Start New Session
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedClientSessions.map((session) => (
                    <div
                      key={session._id}
                      className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-white shadow-sm"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-3 rounded-full">
                          <Calendar className="h-6 w-6 text-purple-700" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {formatDate(session.date)}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {session.description || "No description provided."}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge
                          variant="outline"
                          className="rounded-full bg-purple-50 text-purple-700 border-purple-200"
                        >
                          {getSessionDuration(session)}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/analytics/${session._id}`)}
                          className="rounded-full bg-[#8434d0] hover:bg-[#6b2bb8] text-white shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          View Analytics
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {selectedClient ? (
          renderClientDetail()
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-[#8434d0]">
                Clients
              </h1>
            </div>
            {renderClientList()}
          </>
        )}

        {/* Edit Client Dialog */}
        <Dialog open={showEditDialog} onOpenChange={handleCloseEditDialog}>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800">
                Edit Client Name
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Make changes to the client's name here. Click save when you're
                done.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-sm font-medium text-[#1e2939]"
                >
                  Name
                </Label>
                <Input
                  id="name"
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  placeholder="Enter client name"
                  className="rounded-2xl h-11"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCloseEditDialog}
                className="rounded-full h-11 px-6"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={!editClientName.trim() || isSaving}
                className="rounded-full bg-[#8434d0] hover:bg-[#6b2bb8] text-white h-11 px-6 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isSaving && (
                  <div className="relative inline-block w-4 h-4 mr-2">
                    <div className="w-4 h-4 rounded-full bg-purple-100"></div>
                    <div className="absolute top-0 left-0 w-4 h-4 rounded-full border-2 border-transparent border-t-purple-600 border-r-purple-600 animate-spin"></div>
                  </div>
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Face Dialog */}
        {selectedClient &&
          selectedClient._id !== import.meta.env.VITE_UNKNOWN_CLIENT_ID && (
            <Dialog
              open={showUpdateFaceDialog}
              onOpenChange={setShowUpdateFaceDialog}
            >
              <DialogContent className="rounded-2xl max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-gray-800">
                    Update Face Recognition
                  </DialogTitle>
                  <DialogDescription className="text-gray-600">
                    Center your face in the camera and click "Update" to improve
                    recognition accuracy.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
                    <video
                      ref={videoRef}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {!isVideoReady && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="relative inline-block">
                            <div className="w-16 h-16 rounded-full bg-purple-100"></div>
                            <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-transparent border-t-purple-600 border-r-purple-600 animate-spin"></div>
                          </div>
                          <p className="mt-4 text-lg font-medium text-purple-700">
                            Loading camera...
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  {updateStatus && (
                    <Alert className="rounded-2xl">
                      {updateStatus.includes("Error") ||
                      updateStatus.includes("No face") ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <div className="relative inline-block w-4 h-4 mr-2">
                          <div className="w-4 h-4 rounded-full bg-purple-100"></div>
                          <div className="absolute top-0 left-0 w-4 h-4 rounded-full border-2 border-transparent border-t-purple-600 border-r-purple-600 animate-spin"></div>
                        </div>
                      )}
                      <AlertDescription className="text-[#1e2939]">
                        {updateStatus}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={handleCloseUpdateFaceDialog}
                    className="rounded-full h-11 px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateFace}
                    disabled={isUpdatingFace || !isVideoReady || !modelsLoaded}
                    className="rounded-full bg-[#8434d0] hover:bg-[#6b2bb8] text-white h-11 px-6 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isUpdatingFace && (
                      <div className="relative inline-block w-4 h-4 mr-2">
                        <div className="w-4 h-4 rounded-full bg-purple-100"></div>
                        <div className="absolute top-0 left-0 w-4 h-4 rounded-full border-2 border-transparent border-t-purple-600 border-r-purple-600 animate-spin"></div>
                      </div>
                    )}
                    Update Face Data
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
      </div>
    </div>
  );
};
