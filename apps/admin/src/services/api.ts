import axios from "axios";
import type {
    LoginCredentials,
    RegisterData,
    AuthResponse,
    User,
    Site,
    Survey,
    ResponseSummary,
    ResponseRow,
} from "../types";

// Use relative URLs - works in both dev and production
// Dev: Vite proxy forwards /api/* to localhost:3000
// Prod: Caddy routes /api/* to API container (same domain)
const API_BASE_URL = "";

// Debug logging
console.log("🔧 API Configuration:", {
    mode: import.meta.env.MODE,
    API_BASE_URL: API_BASE_URL || "(relative URLs)",
    VITE_EMBED_API_URL: import.meta.env.VITE_EMBED_API_URL,
});

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 errors (expired/invalid token) - auto logout and redirect to login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear auth data
            localStorage.removeItem("auth_token");
            localStorage.removeItem("auth_user");

            // Redirect to login page
            if (window.location.pathname !== "/login") {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        const { data } = await api.post("/api/auth/login", credentials);
        return data;
    },

    async register(registerData: RegisterData): Promise<AuthResponse> {
        const { data } = await api.post("/api/auth/register", registerData);
        return data;
    },

    async getCurrentUser(): Promise<User> {
        const { data } = await api.get("/api/auth/me");
        return data;
    },
};

// Sites API
export const sitesApi = {
    async getAll(): Promise<{ sites: Site[] }> {
        const { data } = await api.get("/api/sites");
        return data;
    },

    async create(siteData: { name: string; domains?: string[]; allow_any_domain?: boolean }): Promise<{ site: Site }> {
        const { data } = await api.post("/api/sites", siteData);
        return data;
    },

    async get(id: string): Promise<{ site: Site }> {
        const { data } = await api.get(`/api/sites/${id}`);
        return data;
    },

    async update(
        id: string,
        siteData: { name: string; domains?: string[]; allow_any_domain?: boolean }
    ): Promise<{ site: Site }> {
        const { data } = await api.put(`/api/sites/${id}`, siteData);
        return data;
    },

    async delete(id: string): Promise<{ success: boolean }> {
        const { data } = await api.delete(`/api/sites/${id}`);
        return data;
    },
};

// Surveys API
export const surveysApi = {
    async getAll(filters?: { site_id?: string; active?: boolean }): Promise<{ surveys: Survey[] }> {
        const { data } = await api.get("/api/surveys", { params: filters });
        return data;
    },

    async create(surveyData: any): Promise<{ survey: Survey }> {
        const { data } = await api.post("/api/surveys", surveyData);
        return data;
    },

    async get(id: string): Promise<{ survey: Survey }> {
        const { data } = await api.get(`/api/surveys/${id}`);
        return data;
    },

    async update(id: string, surveyData: any): Promise<{ survey: Survey }> {
        const { data } = await api.put(`/api/surveys/${id}`, surveyData);
        return data;
    },

    async copy(id: string): Promise<{ survey: Survey }> {
        const { data } = await api.post(`/api/surveys/${id}/copy`);
        return data;
    },

    async delete(id: string): Promise<{ success: boolean }> {
        const { data } = await api.delete(`/api/surveys/${id}`);
        return data;
    },

    async getResponsesSummary(surveyId: string, questionId?: string): Promise<ResponseSummary> {
        const { data } = await api.get(`/api/surveys/${surveyId}/responses/summary`, {
            params: questionId ? { question_id: questionId } : undefined,
        });
        return data;
    },

    async getResponses(
        surveyId: string,
        params?: { question_id?: string; page?: number; limit?: number; session_id?: string }
    ): Promise<{ responses: ResponseRow[]; total: number }> {
        const { data } = await api.get(`/api/surveys/${surveyId}/responses`, {
            params,
        });
        return data;
    },

    async deleteResponses(surveyId: string, answerIds: number[]): Promise<{ deleted: number }> {
        const { data } = await api.delete(`/api/surveys/${surveyId}/responses`, {
            data: { answer_ids: answerIds },
        });
        return data;
    },
};

// Operations API (worker activity logs, read-only)
export interface WorkerActivityLog {
    id: number;
    created_at: string;
    env: string | null;
    service: string;
    worker_id: string | null;
    job_name: string;
    job_id: string | null;
    queue: string | null;
    site_id: string | null;
    survey_id: string | null;
    from_event_id: number | null;
    to_event_id: number | null;
    items_in: number | null;
    items_out: number | null;
    status: string;
    duration_ms: number | null;
    attempt: number | null;
    error_code: string | null;
    error_message: string | null;
    meta: Record<string, unknown> | null;
}

export interface OperationsHealth {
    last_ingestion_success: string | null;
    last_rollup_success: string | null;
}

export const operationsApi = {
    async getActivity(params?: {
        service?: string;
        status?: string;
        site_id?: string;
        from_date?: string;
        to_date?: string;
        limit?: number;
    }): Promise<{ logs: WorkerActivityLog[]; total: number }> {
        const { data } = await api.get("/api/operations/activity", { params });
        return data;
    },

    async getHealth(): Promise<OperationsHealth> {
        const { data } = await api.get("/api/operations/health");
        return data;
    },

    async getEvents(params?: {
        site_id?: string;
        survey_id?: string;
        event_type?: string;
        from_date?: string;
        to_date?: string;
        limit?: number;
    }): Promise<{ events: OperationsEvent[]; total: number }> {
        const { data } = await api.get("/api/operations/events", { params });
        return data;
    },

    async getResponses(params?: {
        site_id?: string;
        survey_id?: string;
        limit?: number;
    }): Promise<{ responses: OperationsResponse[]; total: number }> {
        const { data } = await api.get("/api/operations/responses", { params });
        return data;
    },
};

export interface OperationsEvent {
    id: number;
    site_id: string;
    survey_id: string | null;
    event_type: string;
    client_event_id: string;
    anonymous_user_id: string | null;
    session_id: string | null;
    page_url: string | null;
    timestamp: string;
}

export interface OperationsResponse {
    id: number;
    site_id: string;
    survey_id: string;
    question_id: string;
    answer_option_id: string | null;
    answer_text: string | null;
    answer_index: number;
    anonymous_user_id: string | null;
    page_url: string | null;
    timestamp: string;
    browser: string | null;
    os: string | null;
    device: string | null;
    ip: string | null;
    country: string | null;
    state: string | null;
    state_name: string | null;
    city: string | null;
    session_id: string | null;
}

export default api;
