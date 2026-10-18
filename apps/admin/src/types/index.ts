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
    creator_email?: string | null;
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

export interface DailyStatOption {
    id: string;
    option_text: string;
    order_index: number;
}

export interface DailyStatDay {
    date: string;
    impressions: number;
    responses: number;
    response_rate: number;
    dismissals: number;
    options: Record<string, number>;
}

export interface DailyStats {
    timezone: string;
    from: string;
    to: string;
    truncated: boolean;
    question: {
        id: string;
        question_text: string;
        question_type: string;
        order_index: number;
        options: DailyStatOption[];
    } | null;
    days: DailyStatDay[];
}

export interface OverviewBenchmark {
    p25: number;
    median: number;
    p75: number;
    scaleMax: number;
}

export interface OverviewShift {
    from: number;
    to: number;
    delta: number;
}

export interface OverviewOption {
    id: string;
    label: string;
    count: number;
    share: number;
    shift: OverviewShift | null;
}

export interface OverviewQuestion {
    id: string;
    order: number;
    number: number;
    text: string;
    short: string;
    type: string;
    typeLabel: string;
    answers: number;
    options?: OverviewOption[];
    averagePicks?: number;
    answeredShare?: number;
    latest?: Array<{
        text: string;
        at: string;
        device: string | null;
        browser: string | null;
        location: string | null;
    }>;
}

export interface OverviewAlert {
    id: "low_response" | "ignored" | "high_close" | "mix_shifted" | "still_live";
    tone: "problem" | "caution";
    kicker: string;
    title: string;
    body: string;
}

export interface OverviewSegmentRow {
    name?: string;
    url?: string;
    responses: number;
    impressions: number;
    rate: number;
    shareOfResponses: number;
}

export interface SurveyOverview {
    survey: {
        name: string;
        active: boolean;
        status: "live" | "ended" | "draft";
        run: { kind: "live" | "ended" | "none"; from: string | null; to: string | null; days: number | null };
        questions: Array<{
            id: string;
            order: number;
            number: number;
            text: string;
            short: string;
            type: string;
            typeLabel: string;
        }>;
        primaryPage: string | null;
    };
    totals: {
        impressions: number;
        responses: number;
        closes: number;
        responseRate: number;
        closeRate: number;
        noAction: number;
        noActionRate: number;
    };
    benchmarks: {
        surveyCount: number;
        responseRate: OverviewBenchmark;
        closeRate: OverviewBenchmark;
        noAction: OverviewBenchmark;
    };
    questions: OverviewQuestion[];
    alerts: {
        comparedTo: number;
        items: OverviewAlert[];
    };
    segments: {
        from: string;
        lifetimeImpressions: number;
        devices: { ready: boolean; taggedImpressions: number; rows: OverviewSegmentRow[] };
        pages: { ready: boolean; taggedImpressions: number; rows: OverviewSegmentRow[] };
    };
    daily: Array<{ date: string; responses: number }>;
    latest: Array<{
        answer: string;
        device: string | null;
        browser: string | null;
        location: string | null;
        at: string;
    }>;
}

export interface ResponseRow {
    id: number;
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
    session_id: string | null;
}
