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
import { questionsAPI, sessionsAPI } from "../../services/api";
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
    BarChart3,
} from "lucide-react";

export const AnalyticsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [allSessions, setAllSessions] = useState<Session[]>([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(true);

    const [selectedSession, setSelectedSession] = useState<Session | null>(
        null
    );
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [isGeneratingSuggestions, setIsGeneratingSuggestions] =
        useState(false);

    useEffect(() => {
        const fetchAllSessions = async () => {
            try {
                const response = await sessionsAPI.getAll();
                setAllSessions(response.data);
            } catch (error) {
                console.error("Error fetching all sessions:", error);
            } finally {
                setIsLoadingSessions(false);
            }
        };

        fetchAllSessions();
    }, []);

    useEffect(() => {
        if (!selectedSession) return;

        setIsLoadingSessions(true);
        setIsLoadingDetails(false);
    }, [selectedSession]);

    const handleSelectSession = (session: Session) => {
        setSelectedSession(session);
    };

    const handleBackToList = () => {
        setSelectedSession(null);
    };

    useEffect(() => {
        const fetchSession = async () => {
            if (!id) return;

            try {
                const response = await sessionsAPI.getById(id);
                setSelectedSession(response.data);
            } catch (error) {
                console.error("Error fetching session data:", error);
            } finally {
                setIsLoadingDetails(false);
            }
        };

        fetchSession();
    }, [id]);

    const generateSuggestions = async () => {
        if (!selectedSession) return;

        setIsGeneratingSuggestions(true);

        try {
            const response = await sessionsAPI.generateInsights(
                selectedSession._id
            );

            setSelectedSession({
                ...selectedSession,
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

    const stateMap = {
        calm: 0,
        vigilance: 1,
        tense: 2,
    };

    const processStressData = () => {
        if (!selectedSession || !selectedSession.stressPoints.length) return [];

        console.log("Processing stress data:", selectedSession.stressPoints);

        return selectedSession.stressPoints.map((point) => ({
            time: formatTimestamp(point.timestamp),
            timestamp: point.timestamp,
            state: stateMap[point.state],
            question: point.question ? "Question Asked" : null,
        }));
    };

    const POSTURE_WEIGHT = 0.25;
    const FIDGETING_WEIGHT = 0.5;
    const MOVEMENT_WEIGHT = 0.25;

    const processDetailedStressData = () => {
        if (!selectedSession || !selectedSession.stressPoints.length)
            return {
                chartData: [],
                questionMarkers: [], // NEW
            };

        const questionMap = new Map();
        if (selectedSession.questions) {
            (Array.isArray(selectedSession.questions)
                ? selectedSession.questions
                : []
            ).forEach((q: any) => {
                // Check if q._id exists before using it as a key
                console.log("Question in session:", q);
                if (q._id) {
                    questionMap.set(q._id.toString(), {
                        text: q.text,
                        category: q.category || "Uncategorized",
                    });
                } else {
                    console.warn("Question without ID found:", q);
                    // For questions without ID, we could use the text as a key
                    // but this might not be reliable if there are duplicate texts
                    if (q.text) {
                        questionMap.set(q.text, {
                            text: q.text,
                            category: q.category || "Uncategorized",
                        });
                    }
                }
            });
        }
        
        const chartData = selectedSession.stressPoints.map((point) => {
            const posture = point.details?.posture || 0; // higher is better posture (lower stress)
            const fidgeting = point.details?.fidgeting || 0; // higher is more fidgeting (higher stress)
            const movement = point.details?.movement || 0; // higher is more movement (higher stress)

            // Weighting: posture reduces stress, fidgeting & movement increase stress
            const overallStress =
                ((1 - posture) * POSTURE_WEIGHT +
                    fidgeting * FIDGETING_WEIGHT +
                    movement * MOVEMENT_WEIGHT) *
                100;

            let questionInfo = null;
            if (point.question !== null && point.question !== undefined) {
                const questionId = point.question.toString();
                questionInfo = questionMap.get(questionId) || {
                    text: "Unknown Question",
                    category: "Uncategorized",
                };
            }

            console.log("QQQQ:", questionInfo);

            return {
                time: formatTimestamp(point.timestamp),
                timestamp: point.timestamp,
                overallStress,
                posture: posture * 100,
                fidgeting: fidgeting * 100,
                movement: movement * 100,
                questionMarker: questionInfo ? overallStress : null,
            };
        });

        console.log('Question Map:', questionMap);

        const questionMarkers = selectedSession.stressPoints
            .filter((point) => point.question)
            .map((point) => ({
                timestamp: point.timestamp,
                questionText:
                    questionMap.get(point.question?.toString())?.text ||
                    "Unknown Question",
                questionCategory:
                    questionMap.get(point.question?.toString())?.category ||
                    "Uncategorized",
            }));

        console.log("Session questions:", selectedSession);
        return { chartData, questionMarkers };
    };

    const calculateAverageScores = () => {
        if (!selectedSession || !selectedSession.stressPoints.length) {
            return { avgPosture: 0, totalFidgeting: 0 };
        }

        const validPoints = selectedSession.stressPoints.filter(
            (p) => p.details
        );
        const totalPosture = validPoints.reduce(
            (sum, p) => sum + (p.details?.posture || 0),
            0
        );

        const totalFidgetingCount = validPoints.filter(
            (p) => (p.details?.fidgeting || 0) > 0
        ).length;

        console.log("Total Fidgeting Count:", totalFidgetingCount);
        console.log("Valid Points Length:", validPoints.length);

        const totalFidgetingPercentage =
            (totalFidgetingCount / validPoints.length) * 100;
        return {
            avgPosture: (totalPosture / validPoints.length) * 100,
            totalFidgeting: totalFidgetingPercentage,
        };
    };

    const calculateStressDistribution = () => {
        if (!selectedSession || !selectedSession.stressPoints.length) return [];

        const calmCount = selectedSession.stressPoints.filter(
            (p) => p.state === "calm"
        ).length;
        const vigilanceCount = selectedSession.stressPoints.filter(
            (p) => p.state === "vigilance"
        ).length;
        const tenseCount = selectedSession.stressPoints.filter(
            (p) => p.state === "tense"
        ).length;

        return [
            { name: "Calm", value: calmCount, color: "#10b981" },
            { name: "Vigilance", value: vigilanceCount, color: "#f59e0b" },
            { name: "Tense", value: tenseCount, color: "#ef4444" },
        ];
    };

    if (isLoadingDetails) {
        return (
            <div className="flex justify-center items-center h-screen">
                Loading...
            </div>
        );
    }

    const getSessionDuration = (session: Session) => {
        if (!session.stressPoints || session.stressPoints.length === 0)
            return "0:00";
        const lastPoint = session.stressPoints[session.stressPoints.length - 1];
        return formatTimestamp(lastPoint.timestamp);
    };

    const renderSessionList = () => {
        if (isLoadingSessions) {
            return (
                <div className="flex justify-center items-center h-64">
                    Loading sessions...
                </div>
            );
        }

        if (allSessions.length === 0) {
            return (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <BarChart3 className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium mb-2">
                            No sessions yet
                        </h3>
                        <p className="text-gray-500 text-center mb-4">
                            Once you conduct counseling sessions, they will
                            appear here for analysis.
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
                    <CardTitle>Recent Sessions</CardTitle>
                    <CardDescription>
                        Select a session to view detailed analytics
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {allSessions.map((session) => (
                            <div
                                key={session._id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                                onClick={() => handleSelectSession(session)}
                            >
                                <div className="flex items-center space-x-3">
                                    <User className="h-8 w-8 text-gray-400" />
                                    <div>
                                        <p className="font-medium">
                                            {typeof session.client === "object"
                                                ? session.client.name
                                                : "Unknown Client"}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {formatDate(session.date)}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium">
                                        Duration
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {getSessionDuration(session)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderSessionDetails = () => {
        if (!selectedSession) return null;

        const stressData = processStressData();
        const { chartData, questionMarkers } = processDetailedStressData();
        const stressDistribution = calculateStressDistribution();
        const totalPoints = selectedSession.stressPoints.length;
        const { avgPosture, totalFidgeting } = calculateAverageScores();

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
                        <h1 className="text-3xl font-bold">
                            Session Analytics
                        </h1>
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
                                {formatDate(selectedSession.date)}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center space-x-2">
                                <User className="h-5 w-5 text-gray-500" />
                                <div>
                                    <p className="text-sm font-medium">
                                        Client
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {typeof selectedSession.client ===
                                        "object"
                                            ? selectedSession.client.name
                                            : "Unknown Client"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Calendar className="h-5 w-5 text-gray-500" />
                                <div>
                                    <p className="text-sm font-medium">Date</p>
                                    <p className="text-sm text-gray-500">
                                        {formatDate(selectedSession.date)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Clock className="h-5 w-5 text-gray-500" />
                                <div>
                                    <p className="text-sm font-medium">
                                        Duration
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {selectedSession.stressPoints.length > 0
                                            ? formatTimestamp(
                                                  selectedSession.stressPoints[
                                                      selectedSession
                                                          .stressPoints.length -
                                                          1
                                                  ].timestamp
                                              )
                                            : "0:00"}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {selectedSession.description && (
                            <div className="mt-4">
                                <p className="text-sm font-medium">
                                    Description
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {selectedSession.description}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                                          (selectedSession.stressPoints.filter(
                                              (p) => p.state === "calm"
                                          ).length /
                                              totalPoints) *
                                          100
                                      ).toFixed(1)}%`
                                    : "0%"}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {
                                    selectedSession.stressPoints.filter(
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
                                          (selectedSession.stressPoints.filter(
                                              (p) => p.state === "vigilance"
                                          ).length /
                                              totalPoints) *
                                          100
                                      ).toFixed(1)}%`
                                    : "0%"}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {
                                    selectedSession.stressPoints.filter(
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
                                          (selectedSession.stressPoints.filter(
                                              (p) => p.state === "tense"
                                          ).length /
                                              totalPoints) *
                                          100
                                      ).toFixed(1)}%`
                                    : "0%"}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {
                                    selectedSession.stressPoints.filter(
                                        (p) => p.state === "tense"
                                    ).length
                                }{" "}
                                of {totalPoints} points
                            </p>
                        </CardContent>
                    </Card>
                    {/* NEW: Average Posture Score KPI */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">
                                Avg. Posture Score
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">
                                {avgPosture.toFixed(1)}%
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Higher is better posture
                            </p>
                        </CardContent>
                    </Card>
                    {/* NEW: Average Fidgeting Score KPI */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">
                                Fidgeting Percentage
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-600">
                                {totalFidgeting.toFixed(1)}%
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Lower is less fidgeting
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
                                    selectedSession.stressPoints.filter(
                                        (p) => p.question
                                    ).length
                                }
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {Array.isArray(selectedSession.questions)
                                    ? selectedSession.questions.length
                                    : 0}{" "}
                                total questions
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts */}
                <Tabs defaultValue="timeline" className="mb-6">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="timeline">
                            Stress Timeline
                        </TabsTrigger>
                        <TabsTrigger value="detailed">
                            Detailed Analysis
                        </TabsTrigger>
                        <TabsTrigger value="distribution">
                            Stress Distribution
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="timeline" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Stress State Over Time</CardTitle>
                                <CardDescription>
                                    Visualization of stress states throughout
                                    the session
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {stressData.length > 0 ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height={300}
                                    >
                                        <LineChart data={stressData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="time" />
                                            <YAxis
                                                domain={[0, 2]}
                                                ticks={[0, 1, 2]}
                                                tickFormatter={(value) => {
                                                    if (value === 0)
                                                        return "Calm";
                                                    if (value === 1)
                                                        return "Vigilance";
                                                    if (value === 2)
                                                        return "Tense";
                                                    return "";
                                                }}
                                            />
                                            <Tooltip
                                                formatter={(value: any) => {
                                                    if (value === 0)
                                                        return [
                                                            "Calm",
                                                            "State",
                                                        ];
                                                    if (value === 1)
                                                        return [
                                                            "Vigilance",
                                                            "State",
                                                        ];
                                                    if (value === 2)
                                                        return [
                                                            "Tense",
                                                            "State",
                                                        ];
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
                    {/* NEW: TabsContent for detailed analysis */}
                    <TabsContent value="detailed" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Detailed Stress Metrics Over Time
                                </CardTitle>
                                <CardDescription>
                                    Visualization of overall stress and
                                    fidgeting scores throughout the session
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height={300}
                                    >
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="time" />
                                            <YAxis
                                                domain={[0, 100]} // Scores normalized to 0-100
                                                ticks={[0, 25, 50, 75, 100]}
                                            />
                                            <Tooltip
                                                content={({
                                                    active,
                                                    payload,
                                                    label,
                                                }) => {
                                                    if (
                                                        active &&
                                                        payload &&
                                                        payload.length
                                                    ) {
                                                        const dataPoint =
                                                            payload[0].payload;

                                                        // Find if there's a question at this timestamp
                                                        // Look for questions within 500ms (0.5 seconds) of the current point
                                                        const questionAtPoint =
                                                            questionMarkers?.find(
                                                                (q) =>
                                                                    Math.abs(
                                                                        q.timestamp -
                                                                            dataPoint.timestamp
                                                                    ) < 1000
                                                            );

                                                        return (
                                                            <div
                                                                className="bg-white p-3 border border-gray-200 rounded shadow-lg"
                                                                style={{
                                                                    minWidth:
                                                                        "200px",
                                                                }}
                                                            >
                                                                {/* Data Section */}
                                                                <div>
                                                                    <p className="text-xs font-semibold mb-2 text-gray-700">
                                                                        {label}
                                                                    </p>
                                                                    {payload.map(
                                                                        (
                                                                            entry,
                                                                            index
                                                                        ) => {
                                                                            let displayName =
                                                                                "";
                                                                            let displayValue =
                                                                                entry.value;

                                                                            if (
                                                                                entry.dataKey ===
                                                                                "overallStress"
                                                                            ) {
                                                                                displayName =
                                                                                    "Stress";
                                                                                displayValue = `${Number(
                                                                                    entry.value
                                                                                ).toFixed(
                                                                                    1
                                                                                )}`;
                                                                            } else if (
                                                                                entry.dataKey ===
                                                                                "fidgeting"
                                                                            ) {
                                                                                displayName =
                                                                                    "Fidgeting";
                                                                                displayValue = `${Number(
                                                                                    entry.value
                                                                                ).toFixed(
                                                                                    1
                                                                                )}%`;
                                                                            } else if (
                                                                                entry.dataKey ===
                                                                                "questionMarker"
                                                                            ) {
                                                                                // Skip displaying questionMarker as a metric
                                                                                return null;
                                                                            } else {
                                                                                displayName =
                                                                                    entry.name ||
                                                                                    "";
                                                                            }

                                                                            return (
                                                                                <p
                                                                                    key={
                                                                                        index
                                                                                    }
                                                                                    className="text-sm flex justify-between"
                                                                                    style={{
                                                                                        color: entry.color,
                                                                                    }}
                                                                                >
                                                                                    <span>
                                                                                        {
                                                                                            displayName
                                                                                        }

                                                                                        :
                                                                                    </span>
                                                                                    <span className="font-medium">
                                                                                        {
                                                                                            displayValue
                                                                                        }
                                                                                    </span>
                                                                                </p>
                                                                            );
                                                                        }
                                                                    )}

                                                                    {/* Question Section */}
                                                                    {questionAtPoint && (
                                                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                                                            <p className="text-xs font-semibold text-red-600 mb-1">
                                                                                Question
                                                                                Asked:
                                                                            </p>
                                                                            <p className="text-sm text-gray-700">
                                                                                {
                                                                                    questionAtPoint.questionText
                                                                                }
                                                                            </p>
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="mt-2 text-xs"
                                                                            >
                                                                                {
                                                                                    questionAtPoint.questionCategory
                                                                                }
                                                                            </Badge>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="overallStress"
                                                stroke="#3b82f6" // Blue
                                                strokeWidth={2}
                                                dot={false}
                                                name="Overall Stress"
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="fidgeting"
                                                stroke="#a855f7" // Purple
                                                strokeWidth={2}
                                                dot={false}
                                                name="Fidgeting Score"
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="questionMarker"
                                                stroke="#ef4444" // 🔥 give it a stroke color for the legend
                                                strokeWidth={2}
                                                dot={{ fill: "#ef4444", r: 6 }}
                                                activeDot={{ r: 8 }}
                                                name="Question Asked"
                                                connectNulls={false} // prevents the red line from appearing
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        No detailed stress data available
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
                                    Percentage breakdown of stress states during
                                    the session
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {stressDistribution.length > 0 ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height={300}
                                    >
                                        <PieChart>
                                            <Pie
                                                data={stressDistribution}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({
                                                    name,
                                                    percent = 0,
                                                }) =>
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
                            {!selectedSession.suggestions && (
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
                        {selectedSession.suggestions ? (
                            <div className="prose prose-sm max-w-none">
                                <pre className="whitespace-pre-wrap font-sans text-sm">
                                    {selectedSession.suggestions}
                                </pre>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                                <p>No insights generated yet</p>
                                <p className="text-sm">
                                    Click "Generate Suggestions" to get
                                    AI-powered insights based on this session.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Session Analytics</h1>
                <Button onClick={() => navigate("/session")}>
                    Start New Session
                </Button>
            </div>

            {/* Conditionally render list or details view */}
            {selectedSession ? renderSessionDetails() : renderSessionList()}
        </div>
    );
};
