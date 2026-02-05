export interface User {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    tenant_id: string;
    tenant_name: string;
}

export interface Site {
    id: string;
    tenant_id: string;
    name: string;
    site_id: string;
    site_secret: string;
    domains: string[] | null;
    allow_any_domain: boolean | null;
    active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Survey {
    id: string;
    site_id: string;
    name: string;
    type: string;
    active: boolean;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    site_name?: string;
    creator_first_name?: string | null;
    creator_last_name?: string | null;
    responses?: number;
    interactions?: number;
    impressions?: number;
    dismissals?: number;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    tenant_name: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

// Survey responses screen
export interface SurveyAnswerOption {
    id: string;
    question_id: string;
    option_text: string;
    order_index: number;
    created_at: string;
}

export interface SurveyQuestion {
    id: string;
    survey_id: string;
    question_text: string;
    question_type: string;
    image_url: string | null;
    required: boolean;
    order_index: number;
    created_at: string;
    options: SurveyAnswerOption[];
}

export interface ResponseSummary {
    totalResponses: number;
    totalAnswers: number;
    topAnswer: { label: string; percentage: number; count: number } | null;
    bars: { label: string; count: number; percentage: number }[];
    /** For open-text questions: most used 2-word phrases (phrase + how many answers contain it) */
    twoWordPhrases?: { phrase: string; answerCount: number }[];
    metrics?: {
        interactions: number;
        impressions: number;
        responses: number;
        dismissals: number;
        closeCount: number;
        minimizeCount: number;
        autoCloseCount: number;
    };
}

export interface ResponseRow {
    id: number;
    event_id: number;
    question_id: string;
    answer_option_id: string | null;
    answer_text: string | null;
    display_label: string;
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
}
