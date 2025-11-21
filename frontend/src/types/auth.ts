export interface User {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface RegisterCredentials {
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    email: string;
}