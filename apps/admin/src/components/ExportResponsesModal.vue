<template>
    <div v-if="visible" class="modal-overlay" @click.self="close">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Export Responses</h3>
                <button type="button" class="modal-close-btn" @click="close" :disabled="exporting">×</button>
            </div>

            <div class="modal-body">
                <!-- Date range -->
                <div class="field-group">
                    <span class="field-label">Date range</span>
                    <div class="radio-group">
                        <label class="radio-option">
                            <input type="radio" v-model="exportMode" value="all" :disabled="exporting" />
                            <span>Export all</span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" v-model="exportMode" value="range" :disabled="exporting" />
                            <span>Custom range</span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" v-model="exportMode" value="day" :disabled="exporting" />
                            <span>Single day</span>
                        </label>
                    </div>
                </div>

                <div v-if="exportMode === 'range'" class="date-range">
                    <div class="date-field">
                        <label for="export-from-date">From</label>
                        <input id="export-from-date" type="date" v-model="fromDate" :disabled="exporting" />
                    </div>
                    <div class="date-field">
                        <label for="export-to-date">To</label>
                        <input id="export-to-date" type="date" v-model="toDate" :disabled="exporting" />
                    </div>
                </div>
                <div v-else-if="exportMode === 'day'" class="date-range">
                    <div class="date-field">
                        <label for="export-single-date">Day</label>
                        <input id="export-single-date" type="date" v-model="singleDate" :disabled="exporting" />
                    </div>
                </div>

                <div class="field-group">
                    <span class="field-label">Layout</span>
                    <div class="layout-choices">
                        <button type="button" class="layout-card" :class="{ active: layout === 'individual' }" :disabled="exporting" @click="layout = 'individual'">
                            <strong>Individual</strong>
                            <span>One row per response</span>
                        </button>
                        <button type="button" class="layout-card" :class="{ active: layout === 'daily' }" :disabled="exporting" @click="layout = 'daily'">
                            <strong>Daily summary</strong>
                            <span>One row per day with counts</span>
                        </button>
                        <button type="button" class="layout-card" :class="{ active: layout === 'both' }" :disabled="exporting" @click="layout = 'both'">
                            <strong>Both</strong>
                            <span>2 sheets / 2 files in a zip</span>
                        </button>
                    </div>
                </div>

                <!-- Questions selector -->
                <div class="field-group">
                    <div class="field-label-row">
                        <span class="field-label">Questions</span>
                        <button type="button" class="btn-link" @click="toggleAllQuestions" :disabled="exporting">
                            {{ allQuestionsSelected ? "Deselect all" : "Select all" }}
                        </button>
                    </div>
                    <div class="questions-list">
                        <label
                            v-for="(q, i) in questions"
                            :key="q.id"
                            class="checkbox-option"
                            :class="{ 'checkbox-option-disabled': exporting }"
                        >
                            <input
                                type="checkbox"
                                :value="q.id"
                                v-model="selectedQuestionIds"
                                :disabled="exporting"
                            />
                            <span class="checkbox-q-num">Q{{ i + 1 }}</span>
                            <span class="checkbox-q-text">{{ q.question_text }}</span>
                        </label>
                    </div>
                    <p v-if="selectedQuestionIds.length === 0" class="warn-msg">Select at least one question.</p>
                </div>

                <!-- Progress -->
                <div v-if="exporting || progressLabel" class="progress-section">
                    <div class="progress-label">{{ progressLabel }}</div>
                    <div class="progress-track">
                        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
                    </div>
                </div>

                <div v-if="previewFilename" class="preview-block">
                    <div class="field-label">Preview · {{ previewFilename }}</div>
                    <div v-if="previewLoading" class="preview-note">Building preview…</div>
                    <div v-else class="preview-scroll">
                        <table v-if="previewHeaders.length">
                            <thead>
                                <tr>
                                    <th v-for="header in previewHeaders" :key="header">{{ header }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(row, index) in previewRows" :key="index">
                                    <td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td>
                                </tr>
                            </tbody>
                        </table>
                        <p v-else class="preview-note">No rows in this range.</p>
                    </div>
                </div>

                <div class="field-group">
                    <span class="field-label">Format</span>
                    <div class="radio-group">
                        <label class="radio-option">
                            <input type="radio" v-model="fileFormat" value="csv" :disabled="exporting" />
                            <span>CSV</span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" v-model="fileFormat" value="xlsx" :disabled="exporting" />
                            <span>Excel (.xlsx)</span>
                        </label>
                    </div>
                </div>

                <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn-cancel" @click="close" :disabled="exporting">Cancel</button>
                <button type="button" class="btn-export" @click="runExport" :disabled="exporting || !canExport">
                    {{ exporting ? "Exporting…" : exportButtonLabel }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { SurveyQuestion } from "../types";
import { surveysApi } from "../services/api";
import {
    buildIndividualTable,
    downloadBlob,
    exportSurveyResponsesCsv,
    individualExportFilename,
    loadIndividualExport,
} from "../utils/exportSurveyResponsesCsv";
import {
    browserTimeZone,
    buildDailySummaryTable,
    dailyExportBasename,
    filesToZipBlob,
    rowsToXlsxBlob,
    statsToSummaryQuestion,
    toCsv,
    type SummaryQuestion,
} from "../utils/dailySummary";

const props = defineProps<{
    visible: boolean;
    surveyId: string;
    surveyName: string;
    questions: SurveyQuestion[];
    initialLayout?: "individual" | "daily" | "both";
    initialRange?: "all" | "range" | "day";
    initialFrom?: string;
    initialTo?: string;
    initialQuestionId?: string | null;
}>();

const emit = defineEmits<{
    close: [];
}>();

const exportMode = ref<"all" | "range" | "day">("all");
const layout = ref<"individual" | "daily" | "both">("individual");
const fileFormat = ref<"csv" | "xlsx">("csv");
const fromDate = ref("");
const toDate = ref("");
const singleDate = ref("");
const exporting = ref(false);
const progress = ref(0);
const progressLabel = ref("");
const errorMsg = ref("");
const selectedQuestionIds = ref<string[]>([]);
const previewHeaders = ref<string[]>([]);
const previewRows = ref<string[][]>([]);
const previewFilename = ref("");
const previewLoading = ref(false);
let previewToken = 0;

const timezone = browserTimeZone();

const allQuestionsSelected = computed(() => selectedQuestionIds.value.length === props.questions.length);

const activeFrom = computed(() => {
    if (exportMode.value === "day") return singleDate.value;
    if (exportMode.value === "range") return fromDate.value;
    return "";
});
const activeTo = computed(() => {
    if (exportMode.value === "day") return singleDate.value;
    if (exportMode.value === "range") return toDate.value;
    return "";
});

const canExport = computed(() => {
    if (selectedQuestionIds.value.length === 0) return false;
    if (exportMode.value === "range") return !!fromDate.value && !!toDate.value && fromDate.value <= toDate.value;
    if (exportMode.value === "day") return !!singleDate.value;
    return true;
});

const exportButtonLabel = computed(() => {
    if (layout.value === "both" && fileFormat.value === "csv") return "Export ZIP";
    if (layout.value === "both") return "Export Excel";
    if (layout.value === "daily" && fileFormat.value === "csv") return "Export daily CSV";
    if (layout.value === "daily") return "Export daily Excel";
    return fileFormat.value === "csv" ? "Export CSV" : "Export Excel";
});

function toggleAllQuestions() {
    if (allQuestionsSelected.value) {
        selectedQuestionIds.value = [];
    } else {
        selectedQuestionIds.value = props.questions.map((q) => q.id);
    }
}

watch(
    () => props.visible,
    (v) => {
        if (v) {
            exportMode.value = props.initialRange ?? "all";
            layout.value = props.initialLayout ?? "individual";
            fileFormat.value = "csv";
            fromDate.value = props.initialRange === "range" ? props.initialFrom ?? "" : "";
            toDate.value = props.initialRange === "range" ? props.initialTo ?? "" : "";
            singleDate.value = props.initialRange === "day" ? props.initialFrom ?? "" : "";
            exporting.value = false;
            progress.value = 0;
            progressLabel.value = "";
            errorMsg.value = "";
            selectedQuestionIds.value = props.initialQuestionId
                ? [props.initialQuestionId]
                : props.questions.map((q) => q.id);
            refreshPreview();
        }
    }
);

watch([exportMode, layout, fileFormat, fromDate, toDate, singleDate, selectedQuestionIds], () => {
    if (props.visible && !exporting.value) refreshPreview();
}, { deep: true });

function close() {
    if (!exporting.value) {
        emit("close");
    }
}

async function loadDailyQuestions(): Promise<{ questions: SummaryQuestion[]; from: string; to: string }> {
    const selected = props.questions.filter((question) => selectedQuestionIds.value.includes(question.id));
    const summaries = await Promise.all(
        selected.map(async (question, index) => {
            const stats = await surveysApi.getDailyStats(props.surveyId, {
                timezone,
                question_id: question.id,
                ...(exportMode.value === "all" ? {} : { from: activeFrom.value, to: activeTo.value }),
            });
            const number = props.questions.findIndex((item) => item.id === question.id) + 1;
            return { stats, number, index };
        })
    );
    const from = summaries[0]?.stats.from ?? activeFrom.value;
    const to = summaries[0]?.stats.to ?? activeTo.value;
    return {
        from,
        to,
        questions: summaries.map((item) => statsToSummaryQuestion(item.stats, item.number || item.index + 1)),
    };
}

async function refreshPreview() {
    const token = ++previewToken;
    previewLoading.value = true;
    try {
        if (!canExport.value || (layout.value !== "individual" && selectedQuestionIds.value.length === 0)) {
            previewHeaders.value = [];
            previewRows.value = [];
            previewFilename.value = "";
            return;
        }
        if (layout.value === "individual") {
            const page = await surveysApi.getResponses(props.surveyId, {
                page: 1,
                limit: 50,
                ...(exportMode.value === "all"
                    ? {}
                    : { from_date: activeFrom.value, to_date: activeTo.value, timezone }),
            });
            const selected = props.questions.filter((question) => selectedQuestionIds.value.includes(question.id));
            const table = buildIndividualTable(page.responses, props.questions, selected);
            if (token !== previewToken) return;
            const filename = individualExportFilename(props.surveyName, fileFormat.value === "xlsx" ? "xlsx" : "csv");
            previewHeaders.value = table.headers;
            previewRows.value = table.rows.slice(0, 5);
            previewFilename.value = filename;
            return;
        }
        const daily = await loadDailyQuestions();
        if (token !== previewToken) return;
        const table = buildDailySummaryTable(daily.questions);
        previewHeaders.value = table.headers;
        previewRows.value = table.rows.slice(0, 6);
        const base = dailyExportBasename(props.surveyName, daily.from, daily.to);
        previewFilename.value = layout.value === "both" && fileFormat.value === "csv" ? `${base}.zip` : `${base}.${fileFormat.value === "xlsx" ? "xlsx" : "csv"}`;
    } catch (e) {
        console.error("Preview failed:", e);
        if (token === previewToken) {
            previewHeaders.value = [];
            previewRows.value = [];
            previewFilename.value = "";
        }
    } finally {
        if (token === previewToken) previewLoading.value = false;
    }
}

async function runExport() {
    if (!canExport.value) return;

    errorMsg.value = "";
    exporting.value = true;
    progress.value = 0;
    progressLabel.value = "Preparing export…";

    try {
        const wantsIndividual = layout.value === "individual" || layout.value === "both";
        const wantsDaily = layout.value === "daily" || layout.value === "both";
        const dateArgs = {
            fromDate: exportMode.value === "all" ? undefined : activeFrom.value,
            toDate: exportMode.value === "all" ? undefined : activeTo.value,
            timezone: exportMode.value === "all" ? undefined : timezone,
        };

        if (layout.value === "individual" && fileFormat.value === "csv") {
            const submissionCount = await exportSurveyResponsesCsv({
                surveyId: props.surveyId,
                surveyName: props.surveyName,
                questions: props.questions,
                questionIds: selectedQuestionIds.value,
                ...dateArgs,
                onProgress: (label, percent) => {
                    progressLabel.value = label;
                    progress.value = percent;
                },
            });
            progressLabel.value = `Done! Exported ${submissionCount} responses.`;
            setTimeout(() => emit("close"), 1200);
            return;
        }

        let individual: Awaited<ReturnType<typeof loadIndividualExport>> | null = null;
        if (wantsIndividual) {
            progressLabel.value = "Fetching responses…";
            individual = await loadIndividualExport({
                surveyId: props.surveyId,
                surveyName: props.surveyName,
                questions: props.questions,
                questionIds: selectedQuestionIds.value,
                ...dateArgs,
                onProgress: (label, percent) => {
                    progressLabel.value = label;
                    progress.value = Math.round(percent * 0.6);
                },
            });
        }

        let dailyTable: { headers: string[]; rows: string[][] } | null = null;
        let dailyName = "daily.csv";
        if (wantsDaily) {
            progressLabel.value = "Building daily summary…";
            const daily = await loadDailyQuestions();
            dailyTable = buildDailySummaryTable(daily.questions);
            dailyName = `${dailyExportBasename(props.surveyName, daily.from, daily.to)}.csv`;
        }

        progressLabel.value = "Preparing download…";
        if (layout.value === "both" && fileFormat.value === "csv" && individual && dailyTable) {
            const blob = await filesToZipBlob([
                { name: individual.filename, content: individual.csvContent },
                { name: dailyName, content: toCsv(dailyTable.headers, dailyTable.rows) },
            ]);
            downloadBlob(dailyName.replace(/\.csv$/, ".zip"), blob);
        } else if (fileFormat.value === "xlsx") {
            const sheets = [];
            if (individual) sheets.push({ name: "Individual", headers: individual.headers, rows: individual.rows });
            if (dailyTable) sheets.push({ name: "Daily summary", headers: dailyTable.headers, rows: dailyTable.rows });
            const blob = await rowsToXlsxBlob(sheets);
            const filename = (dailyTable ? dailyName : individual?.filename ?? "export.csv").replace(/\.csv$/, ".xlsx");
            downloadBlob(filename, blob);
        } else if (dailyTable) {
            downloadBlob(dailyName, new Blob([toCsv(dailyTable.headers, dailyTable.rows)], { type: "text/csv;charset=utf-8;" }));
        }

        progress.value = 100;
        progressLabel.value = "Done!";
        setTimeout(() => emit("close"), 1200);
    } catch (e) {
        console.error("Export failed:", e);
        errorMsg.value = "Export failed. Please try again.";
        progressLabel.value = "";
        progress.value = 0;
    } finally {
        exporting.value = false;
    }
}
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    border-radius: 12px;
    width: 720px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 64px);
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    overflow: hidden;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px 16px;
    border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1a202c;
}

.modal-close-btn {
    background: none;
    border: none;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
    color: #a0aec0;
    padding: 0 2px;
}

.modal-close-btn:hover:not(:disabled) {
    color: #4a5568;
}

.modal-close-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.modal-body {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-y: auto;
    flex: 1;
}

.field-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.field-label {
    font-size: 12px;
    font-weight: 600;
    color: #4a5568;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.radio-group {
    display: flex;
    gap: 24px;
}

.radio-option {
    display: flex;
    align-items: center;
    gap: 7px;
    cursor: pointer;
    font-size: 14px;
    color: #2d3748;
    user-select: none;
}

.radio-option input[type="radio"] {
    cursor: pointer;
    accent-color: #667eea;
    width: 16px;
    height: 16px;
}

.radio-option input[type="radio"]:disabled {
    cursor: not-allowed;
}

.date-range {
    display: flex;
    gap: 16px;
}

.date-field {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.date-field label {
    font-size: 13px;
    font-weight: 500;
    color: #4a5568;
}

.date-field input[type="date"] {
    padding: 8px 10px;
    border: 1px solid #cbd5e0;
    border-radius: 6px;
    font-size: 14px;
    color: #2d3748;
    background: white;
    cursor: pointer;
    width: 100%;
    box-sizing: border-box;
}

.date-field input[type="date"]:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}

.date-field input[type="date"]:disabled {
    background: #f7fafc;
    cursor: not-allowed;
    opacity: 0.7;
}

.progress-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.progress-label {
    font-size: 13px;
    color: #4a5568;
    min-height: 18px;
}

.progress-track {
    height: 6px;
    background: #e2e8f0;
    border-radius: 999px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #667eea, #764ba2);
    border-radius: 999px;
    transition: width 0.3s ease;
}

.error-msg {
    margin: 0;
    font-size: 13px;
    color: #e53e3e;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 24px 20px;
    border-top: 1px solid #e2e8f0;
}

.btn-cancel {
    padding: 8px 18px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    color: #4a5568;
    font-weight: 500;
}

.btn-cancel:hover:not(:disabled) {
    background: #f7fafc;
    border-color: #cbd5e0;
}

.btn-cancel:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-export {
    padding: 8px 20px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
}

.btn-export:hover:not(:disabled) {
    background: #5a6fd6;
}

.btn-export:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.field-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.btn-link {
    background: none;
    border: none;
    padding: 0;
    font-size: 13px;
    color: #667eea;
    cursor: pointer;
    font-weight: 500;
}
.btn-link:hover:not(:disabled) {
    text-decoration: underline;
}
.btn-link:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.questions-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
}

.checkbox-option {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 14px;
    cursor: pointer;
    font-size: 14px;
    color: #2d3748;
    background: white;
    transition: background 0.1s;
    user-select: none;
}
.checkbox-option:not(:last-child) {
    border-bottom: 1px solid #f0f4f8;
}
.checkbox-option:hover:not(.checkbox-option-disabled) {
    background: #f7fafc;
}
.checkbox-option-disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.checkbox-option input[type="checkbox"] {
    margin-top: 2px;
    flex-shrink: 0;
    width: 15px;
    height: 15px;
    cursor: pointer;
    accent-color: #667eea;
}
.checkbox-option input[type="checkbox"]:disabled {
    cursor: not-allowed;
}

.checkbox-q-num {
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 700;
    color: #667eea;
    background: #ebf0ff;
    padding: 1px 6px;
    border-radius: 4px;
    margin-top: 1px;
}

.checkbox-q-text {
    line-height: 1.4;
}

.warn-msg {
    margin: 4px 0 0;
    font-size: 12px;
    color: #dd6b20;
}

.layout-choices {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
}
.layout-card {
    text-align: left;
    border: 1px solid #e2e8f0;
    background: white;
    border-radius: 10px;
    padding: 10px 12px;
    cursor: pointer;
}
.layout-card strong {
    display: block;
    font-size: 14px;
    color: #1a202c;
}
.layout-card span {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: #718096;
}
.layout-card.active {
    border-color: #4f46e5;
    background: #eef2ff;
}
.preview-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.preview-scroll {
    overflow: auto;
    max-height: 180px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
}
.preview-scroll table {
    border-collapse: collapse;
    font-size: 12px;
    min-width: 100%;
}
.preview-scroll th,
.preview-scroll td {
    padding: 6px 8px;
    border-bottom: 1px solid #edf2f7;
    white-space: nowrap;
    text-align: left;
}
.preview-note {
    margin: 0;
    font-size: 13px;
    color: #718096;
}
</style>
