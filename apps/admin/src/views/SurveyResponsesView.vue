<template>
    <div class="responses-view">
        <div class="header-section">
            <div class="header-left">
                <RouterLink to="/" class="back-link">← Back to surveys</RouterLink>
                <h2 v-if="surveyDetail?.survey?.name" class="survey-title">{{ surveyDetail.survey.name }}</h2>
                <h2 class="response-count">{{ totalResponses }} responses</h2>
            </div>
        </div>

        <div v-if="loading" class="loading">Loading...</div>

        <template v-else>
            <!-- Interaction Metrics -->
            <ResponseMetricsCards :metrics="overallMetrics" />

            <!-- Questions - Loop through all questions -->
            <QuestionSummaryCard
                v-for="(question, qIndex) in questions"
                :key="question.id"
                :question="question"
                :index="qIndex"
                :data="questionData[question.id]"
                :pie-chart-data="getPieData(question)"
                :selected-for-responses-table="selectedQuestionIdForResponses === question.id"
                @toggle-expanded="toggleShowAllBars"
                @show-individual-responses="showIndividualResponsesForQuestion"
            />

            <!-- Individual responses table -->
            <ResponsesTable
                :responses="allResponses"
                :selected-ids="selectedIds"
                :is-all-selected="isAllSelected"
                :is-some-selected="isSomeSelected"
                :loading-responses="loadingResponses"
                :open-menu-id="openMenuId"
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :total="totalResponsesCount"
                :total-pages="totalPages"
                @toggle-select="toggleSelect"
                @toggle-select-all="toggleSelectAll"
                @bulk-delete="confirmBulkDelete"
                @view-response="openViewResponseWithSession"
                @toggle-menu="toggleRowMenu"
                @close-menu="openMenuId = null"
                @copy-answer="copyAnswer"
                @delete-one="openDeleteOneDialog"
            />
        </template>

        <!-- View response modal -->
        <ViewResponseDialog v-model:visible="viewResponseVisible" :response="viewingResponse" :questions="questions" />

        <!-- Delete confirmation -->
        <Dialog v-model:visible="showDeleteDialog" modal :closable="true" :style="{ width: '28rem' }">
            <template #header>
                <div class="dialog-header-content">
                    <h3>Delete {{ deleteTarget === "bulk" ? selectedIds.length + " responses" : "response" }}?</h3>
                </div>
            </template>
            <p>This action cannot be undone.</p>
            <template #footer>
                <button class="btn-dialog-secondary" @click="showDeleteDialog = false">Cancel</button>
                <button class="btn-dialog-danger" @click="executeDelete">
                    {{ deleting ? "Deleting..." : "Delete" }}
                </button>
            </template>
        </Dialog>
    </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted, ref } from "vue";
import { useRoute, RouterLink } from "vue-router";
import Dialog from "primevue/dialog";
import { surveysApi } from "../services/api";
import ResponseMetricsCards from "../components/ResponseMetricsCards.vue";
import QuestionSummaryCard from "../components/QuestionSummaryCard.vue";
import ViewResponseDialog from "../components/ViewResponseDialog.vue";
import ResponsesTable from "../components/ResponsesTable.vue";
import { useSurveyResponses } from "../composables/useSurveyResponses";
import { useResponseSelection } from "../composables/useResponseSelection";
import { useResponseDialog } from "../composables/useResponseDialog";
import { useChartData } from "../composables/useChartData";
import { useResponseFormatters } from "../composables/useResponseFormatters";
import type { ResponseRow } from "../types";

const route = useRoute();
const surveyId = computed(() => route.params.id as string);

// Which question's responses are shown in the Individual responses table (default: first question)
const selectedQuestionIdForResponses = ref<string | null>(null);

// Data fetching and state
const {
    loading,
    loadingResponses,
    surveyDetail,
    overallMetrics,
    questionData,
    allResponsesData,
    totalResponsesCount,
    currentPage,
    pageSize,
    totalPages,
    questions,
    totalResponses,
    loadSurvey,
    fetchAllData,
    fetchResponses,
} = useSurveyResponses(surveyId, selectedQuestionIdForResponses);

function showIndividualResponsesForQuestion(questionId: string) {
    selectedQuestionIdForResponses.value = questionId;
    currentPage.value = 1;
    fetchResponses();
}

// Computed for responses
const allResponses = computed(() => allResponsesData.value);

// Selection logic
const { selectedIds, isAllSelected, isSomeSelected, toggleSelect, toggleSelectAll } =
    useResponseSelection(allResponses);

// View response dialog
const { viewResponseVisible, viewingResponse, openMenuId, toggleRowMenu } = useResponseDialog();

// Chart data
const { getPieChartData: getPieChartDataFn, toggleShowAllBars } = useChartData();

// Formatters
const { copyToClipboard } = useResponseFormatters();

// Delete state and logic
const showDeleteDialog = ref(false);
const deleteTarget = ref<"one" | "bulk">("one");
const responseToDelete = ref<ResponseRow | null>(null);
const deleting = ref(false);

// View-specific helpers (not in composables because they're unique to this view)
async function openViewResponseWithSession(row: ResponseRow) {
    // Fetch all answers for this submission (event) so the dialog can show every question's answer
    const { responses: sessionResponses } = await surveysApi.getResponses(surveyId.value, {
        event_id: row.event_id,
    });
    viewingResponse.value = {
        ...row,
        allAnswers: sessionResponses ?? [],
    } as any;
    viewResponseVisible.value = true;
}

function copyAnswer(row: ResponseRow) {
    copyToClipboard(row.display_label);
}

function openDeleteOneDialog(row: ResponseRow) {
    responseToDelete.value = row;
    deleteTarget.value = "one";
    showDeleteDialog.value = true;
}

function confirmBulkDelete() {
    deleteTarget.value = "bulk";
    showDeleteDialog.value = true;
}

async function executeDelete() {
    if (deleteTarget.value === "one" && responseToDelete.value) {
        deleting.value = true;
        try {
            await surveysApi.deleteResponses(surveyId.value, [responseToDelete.value.id]);
            responseToDelete.value = null;
            showDeleteDialog.value = false;
            await fetchAllData();
        } catch (e) {
            console.error("Failed to delete response:", e);
        } finally {
            deleting.value = false;
        }
        return;
    }
    if (deleteTarget.value === "bulk" && selectedIds.value.length > 0) {
        deleting.value = true;
        try {
            await surveysApi.deleteResponses(surveyId.value, selectedIds.value);
            selectedIds.value = [];
            showDeleteDialog.value = false;
            await fetchAllData();
        } catch (e) {
            console.error("Failed to delete responses:", e);
        } finally {
            deleting.value = false;
        }
    }
}

function handleClickOutside(event: MouseEvent) {
    if (!(event.target as HTMLElement).closest(".menu-wrapper")) {
        openMenuId.value = null;
    }
}

// Wrapper for pie chart data (limit to 5 slices for text-answer questions)
function getPieData(question: { id: string; question_type: string }) {
    const maxSlices = question.question_type === "text" ? 5 : undefined;
    return getPieChartDataFn(question.id, questionData.value, maxSlices);
}

// Lifecycle
onMounted(async () => {
    await loadSurvey();
    if (questions.value.length > 0 && selectedQuestionIdForResponses.value === null) {
        selectedQuestionIdForResponses.value = questions.value[0].id;
    }
    await fetchAllData();
    document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener("click", handleClickOutside);
});

// Watchers
watch(surveyId, async () => {
    selectedQuestionIdForResponses.value = null;
    await loadSurvey();
    if (questions.value.length > 0) {
        selectedQuestionIdForResponses.value = questions.value[0].id;
    }
    await fetchAllData();
});

watch([currentPage, pageSize], async () => {
    if (surveyId.value) {
        await fetchResponses();
    }
});
</script>

<style scoped>
/* Layout & Container Styles */
.responses-view {
    background: white;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Header Section */
.header-section {
    margin-bottom: 24px;
}

.header-left {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px;
}

.back-link {
    color: #667eea;
    text-decoration: none;
    font-size: 14px;
}
.back-link:hover {
    text-decoration: underline;
}

.survey-title {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    color: #1a202c;
}

.response-count {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
    color: #718096;
}
/* Loading State */
.loading {
    padding: 48px;
    text-align: center;
    color: #666;
}

/* Delete Dialog Buttons */
.dialog-header-content h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
}

.btn-dialog-secondary {
    padding: 8px 16px;
    margin-right: 8px;
    font-size: 14px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    cursor: pointer;
}

.btn-dialog-danger {
    padding: 8px 16px;
    font-size: 14px;
    background: #e53e3e;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
}
.btn-dialog-danger:hover:not(:disabled) {
    background: #c53030;
}
.btn-dialog-danger:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}
</style>
