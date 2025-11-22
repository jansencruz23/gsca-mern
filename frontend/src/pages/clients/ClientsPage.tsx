import React, { useState, useEffect } from "react";
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
} from "lucide-react";

export const ClientsPage: React.FC = () => {
    const navigate = useNavigate();

    const [allClients, setAllClients] = useState<Client[]>([]);
    const [isLoadingClients, setIsLoadingClients] = useState(true);

    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedClientSessions, setSelectedClientSessions] = useState<
        Session[]
    >([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);

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
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={() => handleSelectClient(client)}
                            >
                                <div className="flex items-center space-x-3">
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
                                <div className="text-right">
                                    <Badge variant="outline">
                                        {client.sessions.length} sessions
                                    </Badge>
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
                <div className="flex items-center space-x-2 mb-6">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBackToList}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Clients
                    </Button>
                    <h1 className="text-3xl font-bold">
                        {selectedClient.name}'s Sessions
                    </h1>
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
                                                    <BarChart3 className="mr-2 h-4 w-4" />
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
        </div>
    );
};
