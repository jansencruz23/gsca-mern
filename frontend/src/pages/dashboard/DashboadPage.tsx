import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { clientsAPI, analyticsAPI } from "../../services/api";
import type { Client } from "../../types/client";
import { Users, Calendar, Activity, BarChart3 } from "lucide-react";

interface AnalyticsData {
    totalSessions: number;
    totalClients: number;
    stressDistribution: {
        calm: number;
        vigilance: number;
        tense: number;
    };
}

export const DashboardPage: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [clientsResponse, analyticsResponse] = await Promise.all([
                    clientsAPI.getAll(),
                    analyticsAPI.getOverview(),
                ]);

                setClients(clientsResponse.data);
                setAnalytics(analyticsResponse.data);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                Loading...
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

            {/* Analytics Cards */}
            {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Sessions
                            </CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {analytics.totalSessions}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Clients
                            </CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {analytics.totalClients}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Calm State
                            </CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {analytics.stressDistribution.calm.toFixed(1)}%
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Tense State
                            </CardTitle>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {analytics.stressDistribution.tense.toFixed(1)}%
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Recent Clients */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Clients</CardTitle>
                    <CardDescription>
                        Clients who have had recent counseling sessions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {clients.length === 0 ? (
                        <p className="text-center py-4 text-muted-foreground">
                            No clients yet
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {clients.slice(0, 5).map((client) => (
                                <div
                                    key={client._id}
                                    className="flex items-center justify-between p-4 border rounded-lg"
                                >
                                    <div>
                                        <h3 className="font-medium">
                                            {client.name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Last session:{" "}
                                            {formatDate(client.lastSessionDate)}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Badge variant="outline">
                                            {client.sessions.length} sessions
                                        </Badge>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                navigate(
                                                    `/session?clientId=${client._id}`
                                                )
                                            }
                                        >
                                            New Session
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="mt-6 flex justify-center">
                <Button onClick={() => navigate('/session')} size="lg">
                    Start New Session
                </Button>
            </div>
        </div>
    );
};
