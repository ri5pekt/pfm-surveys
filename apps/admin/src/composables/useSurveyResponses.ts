import { ref, computed, watch, type Ref } from "vue";
import { surveysApi } from "../services/api";
import type { ResponseSummary, ResponseRow, SurveyQuestion } from "../types";

/**
 * Composable for fetching and managing survey response data
 * Handles survey details, metrics, question data, and paginated responses.
 * When selectedQuestionId is provided, responses are filtered to that question.
 */
export function useSurveyResponses(surveyId: Ref<string>, selectedQuestionId?: Ref<string | null>) {
    // State
    const loading = ref(true);
    const loadingResponses = ref(false);
    const surveyDetail = ref<{ survey: { name?: string; questions: SurveyQuestion[] } } | null>(null);
    const overallMetrics = ref<any>(null);
    const questionData = ref<Record<string, ResponseSummary>>({});
    const allResponsesData = ref<ResponseRow[]>([]);
    const totalResponsesCount = ref(0);

    // Pagination state
    const currentPage = ref(1);
    const pageSize = ref(parseInt(localStorage.getItem("pfm_pageSize") || "10", 10));

    // Computed
    const questions = computed(() => surveyDetail.value?.survey?.questions ?? []);
    const totalResponses = computed(() => totalResponsesCount.value);
    const totalPages = computed(() => Math.max(1, Math.ceil(totalResponsesCount.value / pageSize.value)));

    // Load survey details (questions, etc.)
    async function loadSurvey() {
        if (!surveyId.value) return;
        loading.value = true;
        try {
            const res = await surveysApi.get(surveyId.value);
            surveyDetail.value = res as any;
        } catch (e) {
            console.error("Failed to load survey:", e);
        } finally {
            loading.value = false;
        }
    }

    // Fetch all aggregated data (metrics + question summaries)
    async function fetchAllData() {
        if (!surveyId.value) return;
        try {
            // First fetch responses to get pagination data (optionally for one question)
            const questionId = selectedQuestionId?.value ?? undefined;
            const responsesResp = await surveysApi.getResponses(surveyId.value, {
                page: currentPage.value,
                limit: pageSize.value,
                ...(questionId ? { question_id: questionId } : {}),
            });
            allResponsesData.value = responsesResp.responses || [];
            totalResponsesCount.value = responsesResp.total || 0;

            // Then fetch summary data for each question
            const questionsList = surveyDetail.value?.survey?.questions ?? [];
            if (questionsList.length > 0) {
                // Fetch summary for first question to get metrics
                const firstQuestionSummary = await surveysApi.getResponsesSummary(surveyId.value, questionsList[0].id);
                overallMetrics.value = firstQuestionSummary.metrics;

                // Fetch summary for all questions to build questionData
                const summaries = await Promise.all(
                    questionsList.map((q) => surveysApi.getResponsesSummary(surveyId.value, q.id))
                );

                // Build questionData object
                const newQuestionData: Record<string, ResponseSummary> = {};
                questionsList.forEach((q, index) => {
                    newQuestionData[q.id] = summaries[index];
                });
                questionData.value = newQuestionData;
            } else {
                overallMetrics.value = null;
                questionData.value = {};
            }
        } catch (e) {
            console.error("Failed to fetch data:", e);
        }
    }

    // Fetch only paginated responses (used when page changes)
    async function fetchResponses() {
        if (!surveyId.value) return;
        loadingResponses.value = true;
        try {
            const questionId = selectedQuestionId?.value ?? undefined;
            const responsesResp = await surveysApi.getResponses(surveyId.value, {
                page: currentPage.value,
                limit: pageSize.value,
                ...(questionId ? { question_id: questionId } : {}),
            });
            allResponsesData.value = responsesResp.responses || [];
            totalResponsesCount.value = responsesResp.total || 0;
        } catch (e) {
            console.error("Failed to fetch responses:", e);
        } finally {
            loadingResponses.value = false;
        }
    }

    // Save pageSize preference to localStorage
    watch(pageSize, (newSize) => {
        localStorage.setItem("pfm_pageSize", newSize.toString());
        // Reset to page 1 when changing page size
        currentPage.value = 1;
    });

    return {
        // State
        loading,
        loadingResponses,
        surveyDetail,
        overallMetrics,
        questionData,
        allResponsesData,
        totalResponsesCount, // Export this for template usage
        // Pagination
        currentPage,
        pageSize,
        totalPages,
        // Computed
        questions,
        totalResponses,
        // Methods
        loadSurvey,
        fetchAllData,
        fetchResponses,
    };
}
