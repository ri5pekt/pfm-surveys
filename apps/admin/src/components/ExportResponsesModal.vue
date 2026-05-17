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

                <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn-cancel" @click="close" :disabled="exporting">Cancel</button>
                <button type="button" class="btn-export" @click="runExport" :disabled="exporting">
                    {{ exporting ? "Exporting…" : "Export CSV" }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { surveysApi } from "../services/api";
import type { SurveyQuestion } from "../types";

const props = defineProps<{
    visible: boolean;
    surveyId: string;
    surveyName: string;
    questions: SurveyQuestion[];
}>();

const emit = defineEmits<{
    close: [];
}>();

const exportMode = ref<"all" | "range">("all");
const fromDate = ref("");
const toDate = ref("");
const exporting = ref(false);
const progress = ref(0);
const progressLabel = ref("");
const errorMsg = ref("");
const selectedQuestionIds = ref<string[]>([]);

const allQuestionsSelected = computed(
    () => selectedQuestionIds.value.length === props.questions.length
);

function toggleAllQuestions() {
    if (allQuestionsSelected.value) {
        selectedQuestionIds.value = [];
    } else {
        selectedQuestionIds.value = props.questions.map((q) => q.id);
    }
}

// Reset state when modal opens
watch(
    () => props.visible,
    (v) => {
        if (v) {
            exportMode.value = "all";
            fromDate.value = "";
            toDate.value = "";
            exporting.value = false;
            progress.value = 0;
            progressLabel.value = "";
            errorMsg.value = "";
            selectedQuestionIds.value = props.questions.map((q) => q.id);
        }
    }
);

function close() {
    if (!exporting.value) {
        emit("close");
    }
}

function escapeCell(v: string | null | undefined): string {
    const s = v ?? "";
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

async function runExport() {
    if (selectedQuestionIds.value.length === 0) return;

    errorMsg.value = "";
    exporting.value = true;
    progress.value = 0;
    progressLabel.value = "Fetching responses…";

    try {
        const LIMIT = 500;
        const dateParams =
            exportMode.value === "range"
                ? { from_date: fromDate.value || undefined, to_date: toDate.value || undefined }
                : {};

        // First page — tells us the total
        const firstPage = await surveysApi.getResponses(props.surveyId, {
            page: 1,
            limit: LIMIT,
            ...dateParams,
        });

        const total = firstPage.total;
        const totalPages = Math.max(1, Math.ceil(total / LIMIT));
        let allRows = [...firstPage.responses];

        progress.value = Math.round((1 / totalPages) * 75);
        progressLabel.value = `Fetching responses… ${allRows.length} / ${total}`;

        // Fetch remaining pages sequentially so the progress bar is accurate
        for (let page = 2; page <= totalPages; page++) {
            const pageData = await surveysApi.getResponses(props.surveyId, {
                page,
                limit: LIMIT,
                ...dateParams,
            });
            allRows = allRows.concat(pageData.responses);
            progress.value = Math.round((page / totalPages) * 75);
            progressLabel.value = `Fetching responses… ${allRows.length} / ${total}`;
        }

        progress.value = 82;
        progressLabel.value = "Building CSV…";

        // Only include selected questions, in their original order
        const selectedQSet = new Set(selectedQuestionIds.value);
        const exportQuestions = props.questions.filter((q) => selectedQSet.has(q.id));

        // Group by session_id, preserving order of first appearance (API returns newest first)
        const sessionOrder: string[] = [];
        const sessionMap = new Map<string, { meta: (typeof allRows)[0]; answers: Map<string, string> }>();

        for (const row of allRows) {
            const sid = row.session_id ?? `__no_session_${row.id}`;
            if (!sessionMap.has(sid)) {
                sessionOrder.push(sid);
                sessionMap.set(sid, { meta: row, answers: new Map() });
            }
            sessionMap.get(sid)!.answers.set(row.question_id, row.display_label);
        }

        // Build header row using only selected questions (with original Q-numbers for clarity)
        const questionHeaders = exportQuestions.map((q) => {
            const originalIndex = props.questions.findIndex((oq) => oq.id === q.id);
            return `Q${originalIndex + 1}: ${q.question_text}`;
        });
        const headers = [
            "Session ID",
            "Date",
            "Page URL",
            "IP",
            "Country",
            "State",
            "City",
            "Browser",
            "OS",
            "Device",
            ...questionHeaders,
        ];

        const csvLines: string[] = [headers.map(escapeCell).join(",")];

        for (const sid of sessionOrder) {
            const { meta, answers } = sessionMap.get(sid)!;
            const questionAnswers = exportQuestions.map((q) => answers.get(q.id) ?? "");
            const cells = [
                sid.startsWith("__no_session_") ? "" : sid,
                meta.timestamp ? new Date(meta.timestamp).toLocaleString() : "",
                meta.page_url ?? "",
                meta.ip ?? "",
                meta.country ?? "",
                meta.state_name ?? meta.state ?? "",
                meta.city ?? "",
                meta.browser ?? "",
                meta.os ?? "",
                meta.device ?? "",
                ...questionAnswers,
            ];
            csvLines.push(cells.map(escapeCell).join(","));
        }

        progress.value = 95;
        progressLabel.value = "Preparing download…";

        const csvContent = "\uFEFF" + csvLines.join("\n"); // BOM for Excel compatibility
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const safeName = props.surveyName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        a.href = url;
        a.download = `${safeName}_responses_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        progress.value = 100;
        progressLabel.value = `Done! Exported ${sessionOrder.length} responses.`;

        setTimeout(() => {
            emit("close");
        }, 1200);
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
    width: 480px;
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
</style>
