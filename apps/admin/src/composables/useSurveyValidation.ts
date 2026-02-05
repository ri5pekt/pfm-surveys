import type { Ref } from "vue";
import type { SurveyData } from "../types/survey-editor";

/**
 * Composable for validating survey data
 */
export function useSurveyValidation(surveyData: Ref<SurveyData>) {
    function isSectionComplete(section: string): boolean {
        switch (section) {
            case "details":
                return !!surveyData.value.name;
            case "questions":
                return (
                    surveyData.value.questions.length > 0 &&
                    surveyData.value.questions.every(
                        (q) =>
                            q.text &&
                            (q.type === "text" || q.options.every((o) => (typeof o === "string" ? o : o.text)))
                    )
                );
            case "appearance":
                return !!surveyData.value.appearance.backgroundColor;
            case "targeting":
                return true; // Always complete with defaults
            case "behavior":
                return true; // Always complete with defaults
            default:
                return false;
        }
    }

    function validateSurvey(): { valid: boolean; message?: string; targetSection?: string } {
        // Validate name
        if (!surveyData.value.name) {
            return {
                valid: false,
                message: "Please enter a survey name",
                targetSection: "details",
            };
        }

        // Validate questions exist
        if (surveyData.value.questions.length === 0) {
            return {
                valid: false,
                message: "Please add at least one question",
                targetSection: "questions",
            };
        }

        // Validate each question
        for (let i = 0; i < surveyData.value.questions.length; i++) {
            const q = surveyData.value.questions[i];
            if (!q.text.trim()) {
                return {
                    valid: false,
                    message: `Please enter text for question ${i + 1}`,
                    targetSection: "questions",
                };
            }

            // Validate radio options
            if (q.type === "radio") {
                const validOptions = q.options.filter((o) => (typeof o === "string" ? o.trim() : o.text?.trim()));
                if (validOptions.length < 2) {
                    return {
                        valid: false,
                        message: `Question ${i + 1} needs at least 2 answer options`,
                        targetSection: "questions",
                    };
                }
            }
        }

        return { valid: true };
    }

    return {
        isSectionComplete,
        validateSurvey,
    };
}
