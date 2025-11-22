import React, { createContext, useContext, useReducer, useEffect } from "react";
import { authAPI } from "../services/api";
import type { AuthState, User } from "../types/auth";

type AuthAction =
    | { type: "LOGIN_START" }
    | { type: "LOGIN_SUCCESS"; payload: { user: User; token: string } }
    | { type: "LOGIN_FAILURE" }
    | { type: "LOGOUT" }
    | { type: "SET_LOADING"; payload: boolean };

const token = localStorage.getItem("token");
const initialState: AuthState = {
    user: null,
    token: token,
    isAuthenticated: !!token, // Set to true if a token exists, false otherwise
    isLoading: false,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
    switch (action.type) {
        case "LOGIN_START":
            return { ...state, isLoading: true };
        case "LOGIN_SUCCESS":
            localStorage.setItem("token", action.payload.token);
            return {
                ...state,
                isLoading: false,
                isAuthenticated: true,
                user: action.payload.user,
                token: action.payload.token,
            };
        case "LOGIN_FAILURE":
            localStorage.removeItem("token");
            return {
                ...state,
                isLoading: false,
                isAuthenticated: false,
                user: null,
                token: null,
            };
        case "LOGOUT":
            localStorage.removeItem("token");
            return {
                ...state,
                isAuthenticated: false,
                user: null,
                token: null,
            };
        case "SET_LOADING":
            return { ...state, isLoading: action.payload };
        default:
            return state;
    }
};

interface AuthContextType extends AuthState {
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    register: (userData: {
        username: string;
        password: string;
        firstName: string;
        lastName: string;
        email: string;
    }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    useEffect(() => {
        // This effect should only run once on component mount to check the initial token.
        if (state.token) {
            // We have a token, let's verify it.
            authAPI.validateToken()
                .then(response => {
                    dispatch({
                        type: "LOGIN_SUCCESS",
                        payload: { user: response.data, token: state.token || '' },
                    });
                })
                .catch(error => {
                    // Token is invalid, clear it and log the user out.
                    console.error("Token validation failed:", error);
                    dispatch({ type: "LOGIN_FAILURE" });
                });
        }
    }, []);

    const login = async (username: string, password: string) => {
        dispatch({ type: "LOGIN_START" });
        try {
            const response = await authAPI.login({ username, password });
            dispatch({
                type: "LOGIN_SUCCESS",
                payload: {
                    user: response.data.counselor,
                    token: response.data.token,
                },
            });
        } catch (error) {
            dispatch({ type: "LOGIN_FAILURE" });
            throw error;
        }
    };

    const logout = () => {
        dispatch({ type: "LOGOUT" });
    };

    const register = async (userData: {
        username: string;
        password: string;
        firstName: string;
        lastName: string;
        email: string;
    }) => {
        dispatch({ type: "LOGIN_START" });
        try {
            const response = await authAPI.register(userData);
            dispatch({
                type: "LOGIN_SUCCESS",
                payload: {
                    user: response.data.counselor,
                    token: response.data.token,
                },
            });
        } catch (error) {
            dispatch({ type: "LOGIN_FAILURE" });
            throw error;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                ...state,
                login,
                logout,
                register,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
