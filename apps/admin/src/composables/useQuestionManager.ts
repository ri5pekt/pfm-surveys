import type { Ref } from "vue";
import type { SurveyData, UserGeoRule } from "../types/survey-editor";

/**
 * Composable for managing survey questions
 */
export function useQuestionManager(surveyData: Ref<SurveyData>) {
    function addQuestion() {
        surveyData.value.questions.push({
            text: "",
            type: "radio",
            options: [{ text: "" }, { text: "" }],
            required: true,
            randomizeOptions: false,
        });
    }

    function removeQuestion(index: number) {
        surveyData.value.questions.splice(index, 1);
    }

    function handleQuestionTypeChange(index: number) {
        const question = surveyData.value.questions[index];
        if (question.type === "radio" && question.options.length === 0) {
            question.options = [{ text: "" }, { text: "" }];
        }
    }

    function addOption(questionIndex: number) {
        surveyData.value.questions[questionIndex].options.push({ text: "" });
    }

    function removeOption(questionIndex: number, optionIndex: number) {
        surveyData.value.questions[questionIndex].options.splice(optionIndex, 1);
    }

    function addPageRule() {
        surveyData.value.targeting.pageRules.push({ type: "exact", value: "" });
    }

    function removePageRule(index: number) {
        surveyData.value.targeting.pageRules.splice(index, 1);
    }

    function addUserRule() {
        const rule: UserGeoRule = { type: "geo", country: "", state: "", city: "" };
        surveyData.value.targeting.userRules.push(rule);
        if (surveyData.value.targeting.userType !== "specific") {
            surveyData.value.targeting.userType = "specific";
        }
    }

    function removeUserRule(index: number) {
        surveyData.value.targeting.userRules.splice(index, 1);
        if (surveyData.value.targeting.userRules.length === 0) {
            surveyData.value.targeting.userType = "all";
        }
    }

    return {
        addQuestion,
        removeQuestion,
        handleQuestionTypeChange,
        addOption,
        removeOption,
        addPageRule,
        removePageRule,
        addUserRule,
        removeUserRule,
    };
}
