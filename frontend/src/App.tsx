import React from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { DashboardPage } from "./pages/dashboard/DashboadPage";
import { SessionPage } from "./pages/session/SessionPage";
import { Header } from "./components/layout/Header";
import { AnalyticsPage } from "./pages/analytics/AnalyticsPage";
import { QuestionsPage } from "./pages/questions/QuestionsPage";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

const AppRoutes: React.FC = () => {
    return (
        <Router>
            <div className="min-h-screen bg-background">
                <Header />
                <main>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <DashboardPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/session/:id?"
                            element={
                                <ProtectedRoute>
                                    <SessionPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/analytics/:id"
                            element={
                                <ProtectedRoute>
                                    <AnalyticsPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/questions/"
                            element={
                                <ProtectedRoute>
                                    <QuestionsPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/"
                            element={<Navigate to="/dashboard" />}
                        />
                    </Routes>
                </main>
            </div>
        </Router>
    );
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    );
};

export default App;