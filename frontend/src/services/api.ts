import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Setup axios instance with default headers
const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add token to headers if it exists in localStorage
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (credentials: { username: string; password: string }) =>
        api.post('/auth/login', credentials),
    register: (userData: {
        username: string;
        password: string;
        firstName: string;
        lastName: string;
        email: string;
    }) => api.post('/auth/register', userData),
    validateToken: () => api.get('/auth/me'),
};


// Clients API
export const clientsAPI = {
    getAll: () => api.get('/clients'),
    getById: (id: string) => api.get(`/clients/${id}`),
    recognize: (data: {
        faceDescriptor: number[];
    }) => api.post('/clients/recognize', data),
    create: (data: { name: string; faceDescriptor: number[]; snapshot: string; }) =>
        api.post('/clients', data),
}

// Sessions API
export const sessionsAPI = {
    create: (sessionData: { clientId: string; description: string; }) =>
        api.post('/sessions', sessionData),
    getById: (id: string) => api.get(`/sessions/${id}`),
    updateStressPoints: (id: string, stressPoints: any[]) => 
        api.put(`/sessions/${id}/stress-points`, { stressPoints }),
    updateSummary: (id: string, summary: string, suggestions: string) =>
        api.put(`/sessions/${id}/summary`, { summary, suggestions }),
};

// Questions API
export const questionsAPI = {
    getAll: () => api.get('/questions'),
    create: (questionData: { text: string; category: string }) =>
        api.post('/questions', questionData),
};

// Analytics API
export const analyticsAPI = {
    getOverview: () => api.get('/analytics/overview'),
};

export default api;