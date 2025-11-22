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
    ReferenceLine,
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

    const stateMap = {
        calm: 0,
        vigilance: 1,
        tense: 2,
    };

    const processStressData = () => {
        if (!session || !session.stressPoints.length) return [];

        console.log("Processing stress data:", session.stressPoints);

        return session.stressPoints.map((point) => ({
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
        if (!session || !session.stressPoints.length)
            return {
                chartData: [],
                questionMarker: [],
            };

        const questionMap = new Map();
        if (session.questions) {
            (Array.isArray(session.questions) ? session.questions : []).forEach(
                (q: any) => {
                    questionMap.set(q._id.toString(), {
                        text: q.text,
                        category: q.category || "Uncategorized",
                    });
                }
            );
        }

        const chartData = session.stressPoints.map((point) => {
            const posture = point.details?.posture || 0; // higher is better posture (lower stress)
            const fidgeting = point.details?.fidgeting || 0; // higher is more fidgeting (higher stress)
            const movement = point.details?.movement || 0; // higher is more movement (higher stress)

            // Weighting: posture reduces stress, fidgeting & movement increase stress
            const overallStress =
                ((1 - posture) * POSTURE_WEIGHT +
                    fidgeting * FIDGETING_WEIGHT +
                    movement * MOVEMENT_WEIGHT) *
                100;

            const questionInfo = point.question
                ? questionMap.get(point.question.toString()) || {
                      text: "Unknown Question",
                      category: "Uncategorized",
                  }
                : null;

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

        const questionMarkers = session.stressPoints
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

        console.log("Session questions:", session);
        return { chartData, questionMarkers };
    };

    const calculateAverageScores = () => {
        if (!session || !session.stressPoints.length) {
            return { avgPosture: 0, totalFidgeting: 0 };
        }

        const validPoints = session.stressPoints.filter((p) => p.details);
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
    const { chartData, questionMarkers } = processDetailedStressData();
    const stressDistribution = calculateStressDistribution();
    const totalPoints = session.stressPoints.length;
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
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="timeline">Stress Timeline</TabsTrigger>
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
                {/* NEW: TabsContent for detailed analysis */}
                <TabsContent value="detailed" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Detailed Stress Metrics Over Time
                            </CardTitle>
                            <CardDescription>
                                Visualization of overall stress and fidgeting
                                scores throughout the session
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
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
