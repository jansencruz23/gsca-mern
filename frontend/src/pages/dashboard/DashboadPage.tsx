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
import { Users, Calendar, Activity, BarChart3, User } from "lucide-react";

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
      <div className="flex justify-center items-center h-screen bg-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-lg font-medium text-purple-700">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#8434d0]">
              Dashboard
            </h1>
          </div>
          <Button
            onClick={() => navigate("/session")}
            size="lg"
            className="rounded-full bg-[#8434d0] hover:bg-[#6b2bb8] text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Start New Session
          </Button>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <Card className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium text-gray-700">
                    Total Sessions
                  </CardTitle>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-bold text-gray-800">
                  {analytics.totalSessions}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium text-gray-700">
                    Total Clients
                  </CardTitle>
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Users className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-bold text-gray-800">
                  {analytics.totalClients}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium text-gray-700">
                    Calm State
                  </CardTitle>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Activity className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-bold text-gray-800">
                  {analytics.stressDistribution.calm.toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium text-gray-700">
                    Tense State
                  </CardTitle>
                  <div className="p-2 bg-rose-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-rose-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-bold text-gray-800">
                  {analytics.stressDistribution.tense.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Clients */}
        <Card className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden">
          <CardHeader className="pb-1">
            <div>
              <CardTitle className="text-xl font-bold text-gray-800">
                Recent Clients
              </CardTitle>
              <CardDescription className="text-gray-600 mt-1">
                Clients who have had recent counseling sessions
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            {clients.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-purple-600" />
                </div>
                <p className="text-lg font-medium text-gray-700">
                  No clients yet
                </p>
                <p className="text-gray-500 mt-2">
                  Start by adding your first client
                </p>
                <Button
                  onClick={() => navigate("/clients/new")}
                  className="mt-4 rounded-full bg-[#8434d0] hover:bg-[#6b2bb8] text-white"
                >
                  Add Client
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {clients.slice(0, 5).map((client) => (
                  <div
                    key={client._id}
                    className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-white shadow-sm"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-3 rounded-full">
                        <User className="h-6 w-6 text-purple-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {client.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Last session: {formatDate(client.lastSessionDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge
                        variant="outline"
                        className="rounded-full bg-purple-50 text-purple-700 border-purple-200"
                      >
                        {client.sessions.length} sessions
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() =>
                          navigate(`/session?clientId=${client._id}`)
                        }
                        className="rounded-full bg-green-600 hover:bg-green-700 text-white shadow hover:shadow-md transition-all duration-300"
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
      </div>
    </div>
  );
};
