export interface QuestionOption {
    text: string;
    requiresComment?: boolean;
    pinToBottom?: boolean;
}

export interface Question {
    text: string;
    type: "radio" | "text";
    options: QuestionOption[];
    required: boolean;
    randomizeOptions?: boolean;
}

export interface PageRule {
    type: "exact" | "contains";
    value: string;
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
        users: "all";
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
            users: "all",
        },
        behavior: {
            timing: "immediate",
            delaySeconds: 0,
            scrollPercentage: 50,
            frequency: "until_submit",
        },
    };
}
