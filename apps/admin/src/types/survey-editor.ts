export interface QuestionOption {
    text: string;
    requiresComment?: boolean;
    pinToBottom?: boolean;
}

export interface Question {
    text: string;
    type: "radio" | "text" | "checkbox";
    options: QuestionOption[];
    required: boolean;
    randomizeOptions?: boolean;
}

export interface PageRule {
    type: "exact" | "contains";
    value: string;
}

/**
 * Page exclusion rule: "URL doesn't contain". Unlike PageRule (which is OR'd —
 * show if ANY inclusion rule matches), exclude rules are AND'd — the survey is
 * hidden if the URL matches ANY of them, meaning EVERY exclude rule must hold
 * for the survey to show.
 */
export interface PageExcludeRule {
    type: "not_contains";
    value: string;
}

/** User targeting rule: Geo location (country, state, city — each optional = any). */
export interface UserGeoRule {
    type: "geo";
    country?: string;
    state?: string;
    city?: string;
}

export interface SurveyData {
    name: string;
    description: string;
    type: string;
    active: boolean;
    thankYouMessage: string;
    questions: Question[];
    appearance: {
        backgroundColor: string;
        showCloseButton: boolean;
        showMinimizeButton: boolean;
        widgetBackgroundColor: string;
        widgetBackgroundOpacity: number;
        widgetBorderRadius: string;
        textColor: string;
        questionTextSize: string;
        answerFontSize: string;
        buttonBackgroundColor: string;
    };
    targeting: {
        pageType: "all" | "specific";
        pageRules: PageRule[];
        pageExcludeRules: PageExcludeRule[];
        users: "all";
        userType: "all" | "specific";
        userRules: UserGeoRule[];
    };
    behavior: {
        timing: "immediate" | "delay" | "scroll";
        delaySeconds: number;
        scrollPercentage: number;
        frequency: "until_submit" | "once" | "always";
    };
}

export function createDefaultSurveyData(): SurveyData {
    return {
        name: "",
        description: "",
        type: "popover",
        active: false,
        thankYouMessage: "",
        questions: [],
        appearance: {
            backgroundColor: "#667eea",
            showCloseButton: true,
            showMinimizeButton: false,
            widgetBackgroundColor: "#141a2c",
            widgetBackgroundOpacity: 1.0,
            widgetBorderRadius: "8px",
            textColor: "#ffffff",
            questionTextSize: "1em",
            answerFontSize: "0.875em",
            buttonBackgroundColor: "#2a44b7",
        },
        targeting: {
            pageType: "all",
            pageRules: [{ type: "exact", value: "" }],
            pageExcludeRules: [],
            users: "all",
            userType: "all",
            userRules: [],
        },
        behavior: {
            timing: "immediate",
            delaySeconds: 0,
            scrollPercentage: 50,
            frequency: "until_submit",
        },
    };
}
