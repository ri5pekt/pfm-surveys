/**
 * Types for the embed widget (browser environment).
 * Matches the shape returned by the API.
 */

export interface EmbedConfig {
    apiUrl: string;
    siteId: string;
}

export interface DisplaySettings {
    position?: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center";
    show_delay_ms?: number;
    auto_close_ms?: number;
    display_frequency?: "once_per_user" | "once_per_session";
    sample_rate?: number;
    show_close_button?: boolean;
    show_minimize_button?: boolean;
    widget_background_color?: string;
    widget_background_opacity?: number;
    widget_border_radius?: string;
    text_color?: string;
    question_text_size?: string;
    answer_font_size?: string;
    button_background_color?: string;
}

export interface PageRule {
    type: "exact" | "contains";
    value: string;
}

/** User targeting rule: Geo location (country, state, city — each optional = any). */
export interface UserGeoRule {
    type: "geo";
    country?: string;
    state?: string;
    city?: string;
}

export interface UserGeo {
    country?: string;
    state?: string;
    city?: string;
}

export interface Targeting {
    pageType?: "all" | "specific";
    pageRules?: PageRule[];
    userType?: "all" | "specific";
    userRules?: UserGeoRule[];
}

export interface AnswerOption {
    id: string;
    option_text: string;
    requires_comment?: boolean;
    pin_to_bottom?: boolean;
    order_index?: number;
}

export interface Question {
    id: string;
    question_text: string;
    question_type: "radio" | "checkbox" | "text" | "rating";
    image_url?: string | null;
    required?: boolean;
    randomize_options?: boolean;
    order_index?: number;
    options?: AnswerOption[];
}

export interface Survey {
    id: string;
    name: string;
    type?: string;
    thank_you_message?: string | null;
    questions: Question[];
    displaySettings?: DisplaySettings | null;
    targeting?: Targeting | null;
}

export type AnswerValue = string | string[] | null;
