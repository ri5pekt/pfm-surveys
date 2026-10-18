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
            <div class="stats-tabs" role="tablist">
                <button type="button" role="tab" :class="{ active: activeTab === 'overview' }" @click="setTab('overview')">
                    Overview
                </button>
                <button type="button" role="tab" :class="{ active: activeTab === 'daily' }" @click="setTab('daily')">
                    Daily breakdown
                </button>
                <button type="button" role="tab" :class="{ active: activeTab === 'individual' }" @click="setTab('individual')">
                    Individual responses
                </button>
            </div>

            <div v-show="activeTab === 'overview'">
                <ResponseMetricsCards :metrics="overallMetrics" />

                <div class="survey-actions">
                    <RouterLink :to="{ name: 'survey-edit', params: { id: surveyId } }" class="action-btn">
                        Edit Survey
                    </RouterLink>
                    <button type="button" class="action-btn" @click="openExportFromOverview">
                        <span class="action-btn-icon">↓</span> Export Responses
                    </button>
                </div>

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
            </div>

            <DailyBreakdownPanel
                v-if="dailyMounted"
                v-show="activeTab === 'daily'"
                :survey-id="surveyId"
                :survey-name="surveyDetail?.survey?.name ?? 'survey'"
                :questions="questions"
                :question-id="dailyQuestionId"
                @update:question-id="dailyQuestionId = $event"
                @open-day="openDayResponses"
                @export="openExportFromDaily"
            />

            <div v-show="activeTab === 'individual'">
                <div v-if="dayFilter" class="day-filter-banner">
                    Showing responses for {{ formatDayLabel(dayFilter.from) }}
                    <button type="button" @click="clearDayFilter">Show all days</button>
                </div>
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
            </div>
        </template>

        <!-- View response modal -->
        <ViewResponseDialog v-model:visible="viewResponseVisible" :response="viewingResponse" :questions="questions" />

        <!-- Export responses modal -->
        <ExportResponsesModal
            :visible="showExportModal"
            :survey-id="surveyId"
            :survey-name="surveyDetail?.survey?.name ?? 'survey'"
            :questions="questions"
            :initial-layout="exportInitial.layout"
            :initial-range="exportInitial.range"
            :initial-from="exportInitial.from"
            :initial-to="exportInitial.to"
            :initial-question-id="exportInitial.questionId"
            @close="showExportModal = false"
        />

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
import { useRoute, useRouter, RouterLink } from "vue-router";
import Dialog from "primevue/dialog";
import { surveysApi } from "../services/api";
import ResponseMetricsCards from "../components/ResponseMetricsCards.vue";
import QuestionSummaryCard from "../components/QuestionSummaryCard.vue";
import ViewResponseDialog from "../components/ViewResponseDialog.vue";
import ResponsesTable from "../components/ResponsesTable.vue";
import ExportResponsesModal from "../components/ExportResponsesModal.vue";
import DailyBreakdownPanel from "../components/DailyBreakdownPanel.vue";
import { useSurveyResponses, type ResponseDateFilter } from "../composables/useSurveyResponses";
import { browserTimeZone, formatDayLabel } from "../utils/dailySummary";
import { useResponseSelection } from "../composables/useResponseSelection";
import { useResponseDialog } from "../composables/useResponseDialog";
import { useChartData } from "../composables/useChartData";
import { useResponseFormatters } from "../composables/useResponseFormatters";
import type { ResponseRow } from "../types";

const route = useRoute();
const router = useRouter();
const surveyId = computed(() => route.params.id as string);

type StatsTab = "overview" | "daily" | "individual";
const activeTab = computed<StatsTab>(() => {
    const value = route.query.tab;
    if (value === "daily" || value === "individual") return value;
    return "overview";
});
const dailyMounted = ref(activeTab.value === "daily");

function setTab(next: StatsTab) {
    const query = { ...route.query };
    if (next === "overview") delete query.tab;
    else query.tab = next;
    router.replace({ query });
}

// Which question's responses are shown in the Individual responses table (default: first question)
const selectedQuestionIdForResponses = ref<string | null>(null);
const dailyQuestionId = ref<string | null>(null);
const dayFilter = ref<ResponseDateFilter | null>(null);

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
} = useSurveyResponses(surveyId, selectedQuestionIdForResponses, dayFilter);

function showIndividualResponsesForQuestion(questionId: string) {
    selectedQuestionIdForResponses.value = questionId;
    dayFilter.value = null;
    currentPage.value = 1;
    setTab("individual");
    fetchResponses();
}

function openDayResponses(date: string) {
    if (dailyQuestionId.value) selectedQuestionIdForResponses.value = dailyQuestionId.value;
    dayFilter.value = { from: date, to: date, timezone: browserTimeZone() };
    currentPage.value = 1;
    setTab("individual");
    fetchResponses();
}

function clearDayFilter() {
    dayFilter.value = null;
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

// Export modal. Overview keeps the original defaults. The daily tab pre-selects a daily summary.
const showExportModal = ref(false);
const exportInitial = ref({
    layout: "individual" as "individual" | "daily" | "both",
    range: "all" as "all" | "range" | "day",
    from: "",
    to: "",
    questionId: null as string | null,
});

function openExportFromOverview() {
    exportInitial.value = { layout: "individual", range: "all", from: "", to: "", questionId: null };
    showExportModal.value = true;
}

function openExportFromDaily(range: { from: string; to: string; preset: "7" | "14" | "all" | "custom" }) {
    const sameDay = range.from && range.from === range.to;
    exportInitial.value = {
        layout: "daily",
        range: range.preset === "all" ? "all" : sameDay ? "day" : "range",
        from: range.from,
        to: range.to,
        questionId: dailyQuestionId.value,
    };
    showExportModal.value = true;
}

// Delete state and logic
const showDeleteDialog = ref(false);
const deleteTarget = ref<"one" | "bulk">("one");
const responseToDelete = ref<ResponseRow | null>(null);
const deleting = ref(false);

// View-specific helpers (not in composables because they're unique to this view)
async function openViewResponseWithSession(row: ResponseRow) {
    // Fetch all answers for this submission (session) so the dialog can show every question's answer
    const { responses: sessionResponses } = await surveysApi.getResponses(surveyId.value, {
        session_id: row.session_id ?? undefined,
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
        dailyQuestionId.value = questions.value[0].id;
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
    dailyQuestionId.value = null;
    dayFilter.value = null;
    await loadSurvey();
    if (questions.value.length > 0) {
        selectedQuestionIdForResponses.value = questions.value[0].id;
        dailyQuestionId.value = questions.value[0].id;
    }
    await fetchAllData();
});

watch(activeTab, (tab) => {
    if (tab === "daily") dailyMounted.value = true;
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

.stats-tabs {
    display: flex;
    gap: 20px;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 20px;
}
.stats-tabs button {
    background: none;
    border: 0;
    border-bottom: 2px solid transparent;
    padding: 10px 2px;
    margin-bottom: -1px;
    font-size: 14px;
    color: #718096;
    cursor: pointer;
}
.stats-tabs button.active {
    color: #3730a3;
    border-bottom-color: #4f46e5;
    font-weight: 600;
}
.day-filter-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    padding: 10px 14px;
    background: #eef2ff;
    border-radius: 8px;
    color: #3730a3;
    font-size: 14px;
}
.day-filter-banner button {
    border: 0;
    background: white;
    color: #3730a3;
    border-radius: 6px;
    padding: 6px 10px;
    cursor: pointer;
}
/* Survey Action Bar */
.survey-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 20px 0;
    padding: 12px 16px;
    background: #f7fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
}

.action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 16px;
    background: white;
    color: #667eea;
    border: 1px solid #667eea;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.15s, color 0.15s;
}
.action-btn:hover {
    background: #667eea;
    color: white;
}
.action-btn-icon {
    font-size: 15px;
    line-height: 1;
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
