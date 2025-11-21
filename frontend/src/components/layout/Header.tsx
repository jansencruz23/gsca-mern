import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { useAuth } from "../../contexts/AuthContext";
import { LogOut, Users, BarChart3, MessageSquare, Home } from "lucide-react";

export const Header: React.FC = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <header className="bg-primary text-primary-foreground shadow-md">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <h1 className="text-xl font-bold">
                        Stress Detection System
                    </h1>
                </div>

                {isAuthenticated && (
                    <div className="flex items-center space-x-4">
                        <nav className="hidden md:flex space-x-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate("/dashboard")}
                                className="flex items-center space-x-1"
                            >
                                <Home size={16} />
                                <span>Dashboard</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate("/session")}
                                className="flex items-center space-x-1"
                            >
                                <Users size={16} />
                                <span>Session</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate("/questions")}
                                className="flex items-center space-x-1"
                            >
                                <MessageSquare size={16} />
                                <span>Questions</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate("/analytics")}
                                className="flex items-center space-x-1"
                            >
                                <BarChart3 size={16} />
                                <span>Analytics</span>
                            </Button>
                        </nav>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm">
                                {user?.firstName} {user?.lastName}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleLogout}
                                className="flex items-center space-x-1"
                            >
                                <LogOut size={16} />
                                <span>Logout</span>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};
