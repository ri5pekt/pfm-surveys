// Database types for Kysely (aligned with API schema)

export interface Database {
    tenants: TenantsTable;
    users: UsersTable;
    sites: SitesTable;
    surveys: SurveysTable;
    questions: QuestionsTable;
    answer_options: AnswerOptionsTable;
    targeting_rules: TargetingRulesTable;
    display_settings: DisplaySettingsTable;
    events: EventsTable;
    answers: AnswersTable;
    rollups_daily: RollupsDailyTable;
    rollup_state: RollupStateTable;
    processed_events: ProcessedEventsTable;
    daily_unique_users: DailyUniqueUsersTable;
    worker_activity_logs: WorkerActivityLogsTable;
}

export interface TenantsTable {
    id: string;
    name: string;
    active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface UsersTable {
    id: string;
    tenant_id: string;
    email: string;
    password_hash: string;
    first_name: string | null;
    last_name: string | null;
    active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface SitesTable {
    id: string;
    tenant_id: string;
    name: string;
    site_id: string;
    site_secret: string;
    domains: string[] | null;
    active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface SurveysTable {
    id: string;
    site_id: string;
    name: string;
    type: string;
    active: boolean;
    created_by: string | null;
    thank_you_message: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface QuestionsTable {
    id: string;
    survey_id: string;
    question_text: string;
    question_type: string;
    image_url: string | null;
    required: boolean;
    randomize_options: boolean;
    order_index: number;
    created_at: Date;
}

export interface AnswerOptionsTable {
    id: string;
    question_id: string;
    option_text: string;
    requires_comment: boolean;
    pin_to_bottom: boolean;
    order_index: number;
    created_at: Date;
}

export interface TargetingRulesTable {
    id: string;
    survey_id: string;
    rule_type: string;
    rule_config: unknown;
    created_at: Date;
}

export interface DisplaySettingsTable {
    id: string;
    survey_id: string;
    position: string;
    show_delay_ms: number;
    auto_close_ms: number | null;
    display_frequency: string;
    sample_rate: number;
    max_responses: number | null;
    show_close_button: boolean;
    show_minimize_button: boolean;
    timing_mode: string;
    scroll_percentage: number;
    created_at: Date;
}

export interface EventsTable {
    id: number;
    site_id: string;
    survey_id: string | null;
    event_type: string;
    client_event_id: string;
    anonymous_user_id: string | null;
    session_id: string | null;
    page_url: string | null;
    event_data: unknown;
    timestamp: Date;
}

export interface AnswersTable {
    id: number;
    event_id: number;
    survey_id: string;
    question_id: string;
    answer_option_id: string | null;
    answer_text: string | null;
    answer_index: number;
    anonymous_user_id: string | null;
    page_url: string | null;
    timestamp: Date;
}

export interface RollupsDailyTable {
    id: number;
    site_id: string;
    survey_id: string;
    date: Date;
    impressions: number;
    responses: number;
    dismissals: number;
    unique_users: number;
    created_at: Date;
    updated_at: Date;
}

export interface RollupStateTable {
    id: number;
    site_id: string;
    last_processed_event_id: number;
    last_processed_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface ProcessedEventsTable {
    event_id: number;
}

export interface DailyUniqueUsersTable {
    site_id: string;
    survey_id: string;
    date: Date;
    anonymous_user_id: string;
}

export interface WorkerActivityLogsTable {
    id: number;
    created_at: Date;
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
    meta: unknown;
}
