import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../ui/button";
import { useAuth } from "../../contexts/AuthContext";
import {
  LogOut,
  Users,
  BarChart3,
  MessageSquare,
  Home,
  HeartPulse,
} from "lucide-react";

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Function to check if a navigation item is active
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="bg-gradient-to-r from-[#8434d0] to-[#6b2bb8] text-white shadow-lg sticky top-0 z-50">
      {isAuthenticated && (
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-full">
              <HeartPulse className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-medium">
              Guidance Counselor Session Analytics
            </h1>
          </div>

          {isAuthenticated && (
            <div className="flex items-center space-x-4">
              <nav className="hidden md:flex space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/dashboard")}
                  className={`flex items-center space-x-1 rounded-full transition-colors duration-200 ${
                    isActive("/dashboard")
                      ? "bg-white text-[#8434d0]"
                      : "text-white hover:bg-white/90 hover:text-[#8434d0]"
                  }`}
                >
                  <Home size={16} />
                  <span>Dashboard</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/session")}
                  className={`flex items-center space-x-1 rounded-full transition-colors duration-200 ${
                    isActive("/session")
                      ? "bg-white text-[#8434d0]"
                      : "text-white hover:bg-white/90 hover:text-[#8434d0]"
                  }`}
                >
                  <Users size={16} />
                  <span>Session</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/questions")}
                  className={`flex items-center space-x-1 rounded-full transition-colors duration-200 ${
                    isActive("/questions")
                      ? "bg-white text-[#8434d0]"
                      : "text-white hover:bg-white/90 hover:text-[#8434d0]"
                  }`}
                >
                  <MessageSquare size={16} />
                  <span>Questions</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/clients")}
                  className={`flex items-center space-x-1 rounded-full transition-colors duration-200 ${
                    isActive("/clients")
                      ? "bg-white text-[#8434d0]"
                      : "text-white hover:bg-white/90 hover:text-[#8434d0]"
                  }`}
                >
                  <Users size={16} />
                  <span>Clients</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/analytics")}
                  className={`flex items-center space-x-1 rounded-full transition-colors duration-200 ${
                    isActive("/analytics")
                      ? "bg-white text-[#8434d0]"
                      : "text-white hover:bg-white/90 hover:text-[#8434d0]"
                  }`}
                >
                  <BarChart3 size={16} />
                  <span>Analytics</span>
                </Button>
              </nav>

              <div className="flex items-center space-x-3">
                <div className="hidden md:flex items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-full">
                  <div className="bg-white/20 p-1 rounded-full">
                    <div className="bg-gradient-to-br from-[#8434d0] to-[#6b2bb8] rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold text-white">
                      {user?.firstName?.charAt(0)}
                      {user?.lastName?.charAt(0)}
                    </div>
                  </div>
                  <span className="text-sm font-medium">
                    {user?.firstName} {user?.lastName}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center space-x-1 bg-white/10 border-white/20 text-white hover:bg-white/90 hover:text-[#8434d0] rounded-full transition-colors duration-200"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
