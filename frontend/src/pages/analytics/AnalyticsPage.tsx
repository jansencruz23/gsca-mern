import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "../../components/ui/tabs";
import { sessionsAPI } from "../../services/api";
import type { Session } from "../../types/session";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import {
    ArrowLeft,
    Download,
    Calendar,
    User,
    Clock,
    TrendingUp,
    AlertTriangle,
} from "lucide-react";

export const AnalyticsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setLoading] = useState(true);
    const [isGeneratingSuggestions, setIsGeneratingSuggestions] =
        useState(false);

    useEffect(() => {
        const fetchSession = async () => {
            if (!id) return;

            try {
                const response = await sessionsAPI.getById(id);
                setSession(response.data);
            } catch (error) {
                console.error("Error fetching session data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSession();
    }, [id]);

    const generateSuggestions = async () => {
        if (!session) return;

        setIsGeneratingSuggestions(true);

        try {
            const response = await sessionsAPI.generateInsights(session._id);

            setSession({
                ...session,
                suggestions: response.data.suggestions,
            });
        } catch (error) {
            console.error("Error generating suggestions:", error);
        } finally {
            setIsGeneratingSuggestions(false);
        }
    };

    const formatTimestamp = (timestamp: number) => {
        if (timestamp < 1000) {
            timestamp = timestamp * 1000;
        }

        const minutes = Math.floor(timestamp / 60000);
        const seconds = Math.floor((timestamp % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const processStressData = () => {
        if (!session || !session.stressPoints.length) return [];

        console.log("Processing stress data:", session.stressPoints);

        return session.stressPoints.map((point) => ({
            time: formatTimestamp(point.timestamp),
            timestamp: point.timestamp,
            state: point.state,
            question: point.question ? "Question Asked" : null,
        }));
    };

    const calculateStressDistribution = () => {
        if (!session || !session.stressPoints.length) return [];

        const calmCount = session.stressPoints.filter(
            (p) => p.state === "calm"
        ).length;
        const vigilanceCount = session.stressPoints.filter(
            (p) => p.state === "vigilance"
        ).length;
        const tenseCount = session.stressPoints.filter(
            (p) => p.state === "tense"
        ).length;

        return [
            { name: "Calm", value: calmCount, color: "#10b981" },
            { name: "Vigilance", value: vigilanceCount, color: "#f59e0b" },
            { name: "Tense", value: tenseCount, color: "#ef4444" },
        ];
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                Loading...
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex justify-center items-center h-screen">
                Session not found
            </div>
        );
    }

    const stressData = processStressData();
    const stressDistribution = calculateStressDistribution();
    const totalPoints = session.stressPoints.length;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/dashboard")}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>
                    <h1 className="text-3xl font-bold">Session Analytics</h1>
                </div>
                <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                </Button>
            </div>

            {/* Session Info */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Session Information</span>
                        <Badge variant="outline">
                            {formatDate(session.date)}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2">
                            <User className="h-5 w-5 text-gray-500" />
                            <div>
                                <p className="text-sm font-medium">Client</p>
                                <p className="text-sm text-gray-500">
                                    {typeof session.client === "object"
                                        ? session.client.name
                                        : "Unknown Client"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Calendar className="h-5 w-5 text-gray-500" />
                            <div>
                                <p className="text-sm font-medium">Date</p>
                                <p className="text-sm text-gray-500">
                                    {formatDate(session.date)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Clock className="h-5 w-5 text-gray-500" />
                            <div>
                                <p className="text-sm font-medium">Duration</p>
                                <p className="text-sm text-gray-500">
                                    {session.stressPoints.length > 0
                                        ? formatTimestamp(
                                              session.stressPoints[
                                                  session.stressPoints.length -
                                                      1
                                              ].timestamp
                                          )
                                        : "0:00"}
                                </p>
                            </div>
                        </div>
                    </div>
                    {session.description && (
                        <div className="mt-4">
                            <p className="text-sm font-medium">Description</p>
                            <p className="text-sm text-gray-500 mt-1">
                                {session.description}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                            Calm State
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {totalPoints > 0
                                ? `${(
                                      (session.stressPoints.filter(
                                          (p) => p.state === "calm"
                                      ).length /
                                          totalPoints) *
                                      100
                                  ).toFixed(1)}%`
                                : "0%"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {
                                session.stressPoints.filter(
                                    (p) => p.state === "calm"
                                ).length
                            }{" "}
                            of {totalPoints} points
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                            Vigilance State
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {totalPoints > 0
                                ? `${(
                                      (session.stressPoints.filter(
                                          (p) => p.state === "vigilance"
                                      ).length /
                                          totalPoints) *
                                      100
                                  ).toFixed(1)}%`
                                : "0%"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {
                                session.stressPoints.filter(
                                    (p) => p.state === "vigilance"
                                ).length
                            }{" "}
                            of {totalPoints} points
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                            Tense State
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {totalPoints > 0
                                ? `${(
                                      (session.stressPoints.filter(
                                          (p) => p.state === "tense"
                                      ).length /
                                          totalPoints) *
                                      100
                                  ).toFixed(1)}%`
                                : "0%"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {
                                session.stressPoints.filter(
                                    (p) => p.state === "tense"
                                ).length
                            }{" "}
                            of {totalPoints} points
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                            Questions Asked
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {
                                session.stressPoints.filter((p) => p.question)
                                    .length
                            }
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {Array.isArray(session.questions)
                                ? session.questions.length
                                : 0}{" "}
                            total questions
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <Tabs defaultValue="timeline" className="mb-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="timeline">Stress Timeline</TabsTrigger>
                    <TabsTrigger value="distribution">
                        Stress Distribution
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="timeline" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Stress State Over Time</CardTitle>
                            <CardDescription>
                                Visualization of stress states throughout the
                                session
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {stressData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={stressData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="time" />
                                        <YAxis
                                            domain={[0, 2]}
                                            ticks={[0, 1, 2]}
                                            tickFormatter={(value) => {
                                                if (value === 0) return "Calm";
                                                if (value === 1)
                                                    return "Vigilance";
                                                if (value === 2) return "Tense";
                                                return "";
                                            }}
                                        />
                                        <Tooltip
                                            formatter={(value: any) => {
                                                if (value === 0)
                                                    return ["Calm", "State"];
                                                if (value === 1)
                                                    return [
                                                        "Vigilance",
                                                        "State",
                                                    ];
                                                if (value === 2)
                                                    return ["Tense", "State"];
                                                return [value, "State"];
                                            }}
                                        />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="state"
                                            stroke="#8884d8"
                                            dot={{ fill: "#8884d8" }}
                                            name="Stress State"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No stress data available
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="distribution" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Stress State Distribution</CardTitle>
                            <CardDescription>
                                Percentage breakdown of stress states during the
                                session
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {stressDistribution.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={stressDistribution}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent = 0 }) =>
                                                `${name}: ${(
                                                    percent * 100
                                                ).toFixed(0)}%`
                                            }
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {stressDistribution.map(
                                                (entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={entry.color}
                                                    />
                                                )
                                            )}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No stress data available
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* AI Suggestions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            AI-Generated Insights
                        </span>
                        {!session.suggestions && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={generateSuggestions}
                                disabled={isGeneratingSuggestions}
                            >
                                {isGeneratingSuggestions
                                    ? "Generating..."
                                    : "Generate Suggestions"}
                            </Button>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {session.suggestions ? (
                        <div className="prose prose-sm max-w-none">
                            <pre className="whitespace-pre-wrap font-sans text-sm">
                                {session.suggestions}
                            </pre>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                            <p>No insights generated yet</p>
                            <p className="text-sm">
                                Click "Generate Suggestions" to get AI-powered
                                insights based on this session.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
