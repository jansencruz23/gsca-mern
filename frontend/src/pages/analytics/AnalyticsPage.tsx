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
  User,
  BarChart3,
  AlertCircle,
  Target,
  CheckCircle,
  BookOpen,
} from "lucide-react";
import { SuggestionsSkeleton } from "@/components/analytics/SuggestionsSkeleton";

export const AnalyticsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [, setIsGeneratingSuggestions] = useState(false);

  const [isGeneratingInitialSuggestions, setIsGeneratingInitialSuggestions] =
    useState(false);
  const [parsedSuggestions, setParsedSuggestions] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
    setParsedSuggestions(null);
    setIsLoadingDetails(false);
  }, [selectedSession]);

  useEffect(() => {
    if (!selectedSession || !selectedSession.suggestions) return;

    setParsedSuggestions(selectedSession.suggestions);
  }, [selectedSession]);

  useEffect(() => {
    if (!id) {
      setSelectedSession(null);
      setParsedSuggestions(null);
      setIsLoadingDetails(false);
      setError(null);
      return;
    }

    const fetchSessionDetails = async () => {
      setIsLoadingDetails(true);
      setError(null);

      try {
        const response = await sessionsAPI.getById(id);
        const sessionData = response.data;

        setSelectedSession(sessionData);

        if (
          sessionData.suggestions &&
          typeof sessionData.suggestions === "object" &&
          sessionData.suggestions.summary
        ) {
          setParsedSuggestions(sessionData.suggestions);
        } else {
          setIsGeneratingInitialSuggestions(true);
          try {
            console.log("Generating initial suggestions for session:", id);
            const insightsResponse = await sessionsAPI.generateInsights(
              sessionData._id
            );
            setParsedSuggestions(insightsResponse.data.suggestions);
          } catch (error) {
            console.error("Error generating initial suggestions:", error);
            setError("Failed to generate suggestions. Please try again.");
          } finally {
            setIsGeneratingInitialSuggestions(false);
          }
        }
      } catch (error) {
        console.error("Error fetching session details:", error);
        setError("Failed to load session details. Please try again.");
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchSessionDetails();
  }, [id]);

  const handleSelectSession = (session: Session) => {
    setSelectedSession(session);
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
    setError(null);

    try {
      const response = await sessionsAPI.generateInsights(selectedSession._id);
      setParsedSuggestions(response.data.suggestions);
    } catch (error) {
      console.error("Error generating suggestions:", error);
      setError("Failed to regenerate suggestions. Please try again.");
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
    if (!selectedSession || !selectedSession.stressPoints?.length) return [];

    return selectedSession.stressPoints.map((point) => ({
      time: formatTimestamp(point.timestamp),
      timestamp: point.timestamp,
      state: stateMap[point.state as keyof typeof stateMap] ?? 0,
      question: point.question ? "Question Asked" : null,
    }));
  };

  const POSTURE_WEIGHT = 0.25;
  const FIDGETING_WEIGHT = 0.5;
  const MOVEMENT_WEIGHT = 0.25;

  const processDetailedStressData = () => {
    if (!selectedSession || !selectedSession.stressPoints?.length)
      return {
        chartData: [],
        questionMarkers: [],
      };

    const questionMap = new Map();
    if (selectedSession.questions) {
      (Array.isArray(selectedSession.questions)
        ? selectedSession.questions
        : []
      ).forEach((q: any) => {
        if (q._id) {
          questionMap.set(q._id.toString(), {
            text: q.text,
            category: q.category || "Uncategorized",
          });
        } else {
          console.warn("Question without ID found:", q);
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
      const posture = point.details?.posture || 0;
      const fidgeting = point.details?.fidgeting || 0;
      const movement = point.details?.movement || 0;

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

    return { chartData, questionMarkers };
  };

  const calculateStressDistribution = () => {
    if (!selectedSession || !selectedSession.stressPoints?.length) return [];

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

  // Custom dot component for the stress state chart
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;

    let fillColor = "#8434d0"; // Default purple

    if (payload.state === 0) fillColor = "#10b981"; // Green for calm
    else if (payload.state === 1) fillColor = "#f59e0b"; // Orange for vigilance
    else if (payload.state === 2) fillColor = "#ef4444"; // Red for tense

    return <circle cx={cx} cy={cy} r={4} fill={fillColor} />;
  };

  // Custom tooltip component for the stress state chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      let stateText = "";
      let stateColor = "";

      if (data.state === 0) {
        stateText = "Calm";
        stateColor = "#10b981";
      } else if (data.state === 1) {
        stateText = "Vigilance";
        stateColor = "#f59e0b";
      } else if (data.state === 2) {
        stateText = "Tense";
        stateColor = "#ef4444";
      }

      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="text-xs font-semibold mb-2 text-gray-700">{label}</p>
          <p className="text-sm" style={{ color: stateColor }}>
            State: {stateText}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoadingDetails) {
    return (
      <div className="flex justify-center items-center h-screen bg-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-lg font-medium text-purple-700">
            Loading analytics...
          </p>
        </div>
      </div>
    );
  }

  const getSessionDuration = (session: Session) => {
    if (!session.stressPoints?.length) return "0:00";
    const lastPoint = session.stressPoints[session.stressPoints.length - 1];
    return formatTimestamp(lastPoint.timestamp);
  };

  const renderSuggestions = () => {
    if (isGeneratingInitialSuggestions) {
      return <SuggestionsSkeleton />;
    }

    if (error) {
      return (
        <Card className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden">
          <CardHeader className="pb-1">
            <div>
              <CardTitle className="text-xl font-bold text-[#1e2939] flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                AI Insights Error
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center py-8">
            <p className="text-red-500">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={generateSuggestions}
              className="mt-4 rounded-full"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (!parsedSuggestions || typeof parsedSuggestions !== "object") {
      return (
        <Card className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden">
          <CardHeader className="pb-1">
            <div>
              <CardTitle className="text-xl font-bold text-[#1e2939]">
                AI-Generated Insights
              </CardTitle>
              <CardDescription className="text-gray-600 mt-1">
                Get intelligent analysis of this counseling session
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">
              No insights available. Click "Generate Suggestions" to analyze
              this session.
            </p>
            <Button
              onClick={generateSuggestions}
              className="mt-4 rounded-full bg-[#8434d0] hover:bg-[#6b2bb8] text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Generate Suggestions
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden">
        <CardHeader className="pb-1">
          <div>
            <CardTitle className="text-xl font-bold text-[#1e2939]">
              AI-Generated Insights
            </CardTitle>
            <CardDescription className="text-gray-600 mt-1">
              Intelligent analysis of this counseling session
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {parsedSuggestions && parsedSuggestions.summary && (
            <div className="bg-[#f8faff] p-4 rounded-xl border border-[#e6e9ff]">
              <div className="flex items-start gap-3">
                <div className="bg-[#8434d0] rounded-full p-2 mt-1">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-[#1e2939]">
                    Summary
                  </h3>
                  <p className="text-sm text-[#1e2939]">
                    {parsedSuggestions.summary}
                  </p>
                </div>
              </div>
            </div>
          )}

          {parsedSuggestions &&
            parsedSuggestions.sensitiveTopics &&
            Array.isArray(parsedSuggestions.sensitiveTopics) &&
            parsedSuggestions.sensitiveTopics.length > 0 && (
              <div className="bg-[#fff5f5] p-4 rounded-xl border border-[#ffe6e6]">
                <div className="flex items-start gap-3">
                  <div className="bg-[#ef4444] rounded-full p-2 mt-1">
                    <AlertCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-[#1e2939]">
                      Potential Sensitive Topics
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-[#1e2939]">
                      {parsedSuggestions.sensitiveTopics.map(
                        (topic: string, index: number) => (
                          <li key={index}>{topic}</li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

          {parsedSuggestions &&
            parsedSuggestions.positivePatterns &&
            Array.isArray(parsedSuggestions.positivePatterns) &&
            parsedSuggestions.positivePatterns.length > 0 && (
              <div className="bg-[#f0fdf4] p-4 rounded-xl border border-[#dcfce7]">
                <div className="flex items-start gap-3">
                  <div className="bg-[#10b981] rounded-full p-2 mt-1">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-[#1e2939]">
                      Positive Engagement Patterns
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-[#1e2939]">
                      {parsedSuggestions.positivePatterns.map(
                        (pattern: string, index: number) => (
                          <li key={index}>{pattern}</li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

          {parsedSuggestions &&
            parsedSuggestions.recommendations &&
            parsedSuggestions.recommendations.length > 0 && (
              <div className="bg-[#f0f9ff] p-4 rounded-xl border border-[#e0f2fe]">
                <div className="flex items-start gap-3">
                  <div className="bg-[#3b82f6] rounded-full p-2 mt-1">
                    <Target className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-[#1e2939]">
                      Recommendations
                    </h3>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-[#1e2939]">
                      {parsedSuggestions.recommendations.map(
                        (rec: string, index: number) => (
                          <li key={index}>{rec}</li>
                        )
                      )}
                    </ol>
                  </div>
                </div>
              </div>
            )}

          {parsedSuggestions &&
            parsedSuggestions.nextSessionFocus &&
            parsedSuggestions.nextSessionFocus.length > 0 && (
              <div className="bg-[#fefce8] p-4 rounded-xl border border-[#fef3c7]">
                <div className="flex items-start gap-3">
                  <div className="bg-[#f59e0b] rounded-full p-2 mt-1">
                    <BookOpen className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-[#1e2939]">
                      Next Session Focus
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-[#1e2939]">
                      {parsedSuggestions.nextSessionFocus.map(
                        (focus: string, index: number) => (
                          <li key={index}>{focus}</li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
        </CardContent>
      </Card>
    );
  };

  const renderSessionList = () => {
    if (isLoadingSessions) {
      return (
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
      );
    }

    if (allSessions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-16 w-16 text-[#8434d0] mb-6" />
          <h3 className="text-xl font-bold text-gray-800 mb-3">
            No sessions yet
          </h3>
          <p className="text-gray-600 mb-6 text-center max-w-md">
            Once you conduct counseling sessions, they will appear here for
            analysis.
          </p>
          <Button
            onClick={() => navigate("/session")}
            className="rounded-full bg-[#8434d0] hover:bg-[#6b2bb8] text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Start New Session
          </Button>
        </div>
      );
    }

    return (
      <>
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#8434d0]">
            Analytics
          </h1>
        </div>

        <Card className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden mb-8">
          <CardHeader className="pb-1">
            <div>
              <CardTitle className="text-xl font-bold text-gray-800">
                Recent Sessions
              </CardTitle>
              <CardDescription className="text-gray-600 mt-1">
                Select a session to view detailed analytics
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allSessions.map((session) => (
                <div
                  key={session._id}
                  className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-white shadow-sm"
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-3 rounded-full">
                      <User className="h-6 w-6 text-purple-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {typeof session.client === "object"
                          ? session.client?.name
                          : "Unknown Client"}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDate(session.date)}
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
                      onClick={() => handleSelectSession(session)}
                      className="rounded-full bg-[#8434d0] hover:bg-[#6b2bb8] text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      View Analytics
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </>
    );
  };

  const renderSessionDetails = () => {
    if (!selectedSession) return null;

    const stressData = processStressData();
    const { chartData, questionMarkers } = processDetailedStressData();
    const stressDistribution = calculateStressDistribution();
    const totalPoints = selectedSession.stressPoints?.length || 0;

    //const averageScores = calculateAverageScores();
    //const avgPosture = averageScores?.avgPosture ?? 0;
    //const totalFidgeting = averageScores?.totalFidgeting ?? 0;

    return (
      <div className="min-h-screen bg-purple-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center mb-6">
            <Button
              onClick={() => navigate("/dashboard")}
              className="rounded-full bg-[#8434d0] hover:bg-[#6b2bb8] text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>

          {/* Session Info */}
          <Card className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden mb-8">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4 mb-4">
                <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-4 rounded-full">
                  <User className="h-8 w-8 text-purple-700" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-[#1e2939]">
                    {typeof selectedSession.client === "object"
                      ? selectedSession.client?.name
                      : "Unknown Client"}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-gray-600">
                      {formatDate(selectedSession.date)}
                    </p>
                    <Badge className="rounded-full px-3 py-1 text-base bg-[#f0e6ff] text-[#8434d0] border border-[#d9c2f5]">
                      {selectedSession.stressPoints?.length > 0
                        ? formatTimestamp(
                            selectedSession.stressPoints[
                              selectedSession.stressPoints.length - 1
                            ].timestamp
                          )
                        : "0:00"}
                    </Badge>
                  </div>
                  <p className="text-gray-600 mt-2">
                    {selectedSession.description || "No description provided"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <Card className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium text-gray-700">
                    Calm State
                  </CardTitle>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-green-500"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-bold text-gray-800">
                  {totalPoints > 0
                    ? `${(
                        (selectedSession.stressPoints?.filter(
                          (p) => p.state === "calm"
                        ).length /
                          totalPoints) *
                        100
                      ).toFixed(1)}%`
                    : "0%"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {
                    selectedSession.stressPoints?.filter(
                      (p) => p.state === "calm"
                    ).length
                  }{" "}
                  of {totalPoints} points
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium text-gray-700">
                    Vigilance State
                  </CardTitle>
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-yellow-500"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-bold text-gray-800">
                  {totalPoints > 0
                    ? `${(
                        (selectedSession.stressPoints?.filter(
                          (p) => p.state === "vigilance"
                        ).length /
                          totalPoints) *
                        100
                      ).toFixed(1)}%`
                    : "0%"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {
                    selectedSession.stressPoints?.filter(
                      (p) => p.state === "vigilance"
                    ).length
                  }{" "}
                  of {totalPoints} points
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium text-gray-700">
                    Tense State
                  </CardTitle>
                  <div className="p-2 bg-red-100 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-red-500"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-bold text-gray-800">
                  {totalPoints > 0
                    ? `${(
                        (selectedSession.stressPoints?.filter(
                          (p) => p.state === "tense"
                        ).length /
                          totalPoints) *
                        100
                      ).toFixed(1)}%`
                    : "0%"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {
                    selectedSession.stressPoints?.filter(
                      (p) => p.state === "tense"
                    ).length
                  }{" "}
                  of {totalPoints} points
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium text-gray-700">
                    Questions Asked
                  </CardTitle>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-purple-500"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-bold text-gray-800">
                  {
                    selectedSession.stressPoints?.filter((p) => p.question)
                      .length
                  }
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Array.isArray(selectedSession.questions)
                    ? selectedSession.questions.length
                    : 0}{" "}
                  total questions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <Tabs defaultValue="timeline" className="mb-10">
            <TabsList className="grid w-full grid-cols-3 rounded-full bg-white p-1 h-12">
              <TabsTrigger
                value="timeline"
                className="rounded-full h-10 flex items-center justify-center data-[state=active]:bg-[#f0e6ff] data-[state=active]:text-[#8434d0] text-[#1e2939]"
              >
                Stress Timeline
              </TabsTrigger>
              <TabsTrigger
                value="detailed"
                className="rounded-full h-10 flex items-center justify-center data-[state=active]:bg-[#f0e6ff] data-[state=active]:text-[#8434d0] text-[#1e2939]"
              >
                Detailed Analysis
              </TabsTrigger>
              <TabsTrigger
                value="distribution"
                className="rounded-full h-10 flex items-center justify-center data-[state=active]:bg-[#f0e6ff] data-[state=active]:text-[#8434d0] text-[#1e2939]"
              >
                Stress Distribution
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="space-y-4">
              <Card className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-[#1e2939]">
                    Stress State Over Time
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Visualization of stress states throughout the session
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stressData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={stressData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="time"
                          stroke="#6b7280"
                          tick={{ fill: "#4b5563" }}
                        />
                        <YAxis
                          domain={[0, 2]}
                          ticks={[0, 1, 2]}
                          tickFormatter={(value) => {
                            if (value === 0) return "Calm";
                            if (value === 1) return "Vigilance";
                            if (value === 2) return "Tense";
                            return "";
                          }}
                          stroke="#6b7280"
                          tick={{ fill: "#4b5563" }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="state"
                          stroke="#8434d0"
                          dot={<CustomDot />}
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
            <TabsContent value="detailed" className="space-y-4">
              <Card className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-[#1e2939]">
                    Detailed Stress Metrics Over Time
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Visualization of overall stress and fidgeting scores
                    throughout the session
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="time"
                          stroke="#6b7280"
                          tick={{ fill: "#4b5563" }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          ticks={[0, 25, 50, 75, 100]}
                          stroke="#6b7280"
                          tick={{ fill: "#4b5563" }}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const dataPoint = payload[0].payload;
                              const questionAtPoint = questionMarkers?.find(
                                (q) =>
                                  Math.abs(q.timestamp - dataPoint.timestamp) <
                                  1000
                              );

                              return (
                                <div
                                  className="bg-white p-3 border border-gray-200 rounded shadow-lg"
                                  style={{
                                    minWidth: "200px",
                                  }}
                                >
                                  <p className="text-xs font-semibold mb-2 text-gray-700">
                                    {label}
                                  </p>
                                  {payload.map((entry, index) => {
                                    let displayName = "";
                                    let displayValue = entry.value;

                                    if (entry.dataKey === "overallStress") {
                                      displayName = "Stress";
                                      displayValue = `${Number(
                                        entry.value
                                      ).toFixed(1)}`;
                                    } else if (entry.dataKey === "fidgeting") {
                                      displayName = "Fidgeting";
                                      displayValue = `${Number(
                                        entry.value
                                      ).toFixed(1)}%`;
                                    } else if (
                                      entry.dataKey === "questionMarker"
                                    ) {
                                      return null;
                                    } else {
                                      displayName = entry.name || "";
                                    }

                                    return (
                                      <p
                                        key={index}
                                        className="text-sm flex justify-between"
                                        style={{
                                          color: entry.color,
                                        }}
                                      >
                                        <span>{displayName}:</span>
                                        <span className="font-medium">
                                          {displayValue}
                                        </span>
                                      </p>
                                    );
                                  })}

                                  {questionAtPoint && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                      <p className="text-xs font-semibold text-red-600 mb-1">
                                        Question Asked:
                                      </p>
                                      <p className="text-sm text-gray-700">
                                        {questionAtPoint.questionText}
                                      </p>
                                      <Badge
                                        variant="outline"
                                        className="mt-2 text-xs rounded-full bg-[#f0e6ff] text-[#8434d0] border-[#d9c2f5]"
                                      >
                                        {questionAtPoint.questionCategory}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          }}
                          contentStyle={{
                            backgroundColor: "#fff",
                            borderColor: "#e5e7eb",
                            borderRadius: "0.5rem",
                            color: "#1e2939",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="overallStress"
                          stroke="#8434d0"
                          strokeWidth={2}
                          dot={false}
                          name="Overall Stress"
                        />
                        <Line
                          type="monotone"
                          dataKey="fidgeting"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={false}
                          name="Fidgeting Score"
                        />
                        <Line
                          type="monotone"
                          dataKey="questionMarker"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={{ fill: "#ef4444", r: 6 }}
                          activeDot={{ r: 8 }}
                          name="Question Asked"
                          connectNulls={false}
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
              <Card className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-[#1e2939]">
                    Stress State Distribution
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Percentage breakdown of stress states during the session
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
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {stressDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            borderColor: "#e5e7eb",
                            borderRadius: "0.5rem",
                            color: "#1e2939",
                          }}
                        />
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
          {renderSuggestions()}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {selectedSession ? renderSessionDetails() : renderSessionList()}
      </div>
    </div>
  );
};
