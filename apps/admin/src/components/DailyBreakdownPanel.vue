<template>
    <div class="daily-panel">
        <div class="daily-toolbar">
            <div class="range-controls">
                <button type="button" class="date-chip" @click="pickerOpen = !pickerOpen">
                    <span aria-hidden="true">📅</span>
                    {{ formatDayChip(rangeFrom, rangeTo) }}
                </button>
                <div v-if="pickerOpen" class="date-popover">
                    <label>
                        From
                        <input type="date" :value="customFrom" @change="onCustomFrom" />
                    </label>
                    <label>
                        To
                        <input type="date" :value="customTo" @change="onCustomTo" />
                    </label>
                </div>
                <button type="button" class="preset" :class="{ active: preset === '7' }" @click="applyPreset('7')">Last 7 days</button>
                <button type="button" class="preset" :class="{ active: preset === '14' }" @click="applyPreset('14')">Last 14 days</button>
                <button type="button" class="preset" :class="{ active: preset === 'all' }" @click="applyPreset('all')">All time</button>
            </div>
            <button type="button" class="export-daily-btn" @click="emitExport">
                <span aria-hidden="true">↓</span> Export daily CSV
            </button>
        </div>

        <div v-if="questions.length > 1" class="question-switch">
            <label for="daily-question">Question</label>
            <select id="daily-question" :value="questionId" @change="onQuestion">
                <option v-for="(question, index) in questions" :key="question.id" :value="question.id">
                    Q{{ index + 1 }}. {{ question.question_text }}
                </option>
            </select>
        </div>

        <div v-if="loading" class="daily-status">Loading daily breakdown…</div>
        <div v-else-if="error" class="daily-status daily-error">{{ error }}</div>
        <template v-else-if="stats">
            <p v-if="stats.truncated" class="daily-note">Showing the most recent 1,500 days.</p>
            <section class="chart-card">
                <div class="chart-head">
                    <div>
                        <h3>Responses per day, by answer</h3>
                        <p v-if="stats.question" class="chart-question">
                            Q{{ questionNumber }} {{ stats.question.question_text }}
                        </p>
                    </div>
                    <div class="mode-switch" role="tablist">
                        <button type="button" :class="{ active: mode === 'responses' }" @click="mode = 'responses'">Responses</button>
                        <button type="button" :class="{ active: mode === 'percent' }" @click="mode = 'percent'" :disabled="isText">
                            Answer %
                        </button>
                        <button type="button" :class="{ active: mode === 'rate' }" @click="mode = 'rate'">Response rate</button>
                    </div>
                </div>
                <div v-if="mode !== 'rate' && !isText" class="legend">
                    <span v-for="(option, index) in stats.question?.options ?? []" :key="option.id">
                        <i :style="{ background: ANSWER_COLORS[index % ANSWER_COLORS.length] }"></i>
                        {{ option.option_text }}
                    </span>
                </div>
                <DailyBreakdownChart
                    :days="stats.days"
                    :options="stats.question?.options ?? []"
                    :mode="mode"
                    :is-text="isText"
                />
            </section>

            <section class="table-card">
                <div class="table-head">
                    <h3>Daily table</h3>
                    <span>Click a row to open that day’s responses</span>
                </div>
                <div class="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Impressions</th>
                                <th>Responses</th>
                                <th>Resp. rate</th>
                                <th>Dismissals</th>
                                <th
                                    v-for="(option, index) in stats.question?.options ?? []"
                                    :key="option.id"
                                    :title="option.option_text"
                                    :style="{ color: ANSWER_COLORS[index % ANSWER_COLORS.length] }"
                                >
                                    {{ shortOptionLabel(option.option_text) }}
                                </th>
                                <th>CSV</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="day in newestFirst"
                                :key="day.date"
                                class="day-row"
                                @click="emit('openDay', day.date)"
                            >
                                <td>{{ formatDayLabel(day.date) }}</td>
                                <td>{{ formatCount(day.impressions) }}</td>
                                <td class="strong">{{ formatCount(day.responses) }}</td>
                                <td>{{ formatRate(day.response_rate) }}</td>
                                <td>{{ formatCount(day.dismissals) }}</td>
                                <td v-for="option in stats.question?.options ?? []" :key="option.id">
                                    {{ day.options[option.id] ?? 0 }}
                                </td>
                                <td>
                                    <button type="button" class="row-download" title="Download this day" @click.stop="downloadDay(day.date)">
                                        ↓
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr>
                                <td>Total</td>
                                <td>{{ formatCount(totals.impressions) }}</td>
                                <td>{{ formatCount(totals.responses) }}</td>
                                <td>{{ formatRate(totals.rate) }}</td>
                                <td>{{ formatCount(totals.dismissals) }}</td>
                                <td v-for="option in stats.question?.options ?? []" :key="option.id">
                                    {{ formatCount(totals.options[option.id] ?? 0) }}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </section>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import DailyBreakdownChart from "./DailyBreakdownChart.vue";
import { surveysApi } from "../services/api";
import type { DailyStats, SurveyQuestion } from "../types";
import { downloadBlob } from "../utils/exportSurveyResponsesCsv";
import {
    ANSWER_COLORS,
    addCalendarDays,
    browserTimeZone,
    buildDailySummaryTable,
    dailyExportBasename,
    formatCount,
    formatDayChip,
    formatDayLabel,
    formatRate,
    responseRatePercent,
    shortOptionLabel,
    statsToSummaryQuestion,
    todayIso,
    toCsv,
} from "../utils/dailySummary";

const props = defineProps<{
    surveyId: string;
    surveyName: string;
    questions: SurveyQuestion[];
    questionId: string | null;
}>();

const emit = defineEmits<{
    openDay: [date: string];
    export: [range: { from: string; to: string; preset: "7" | "14" | "all" | "custom"; timezone: string }];
    "update:questionId": [id: string];
}>();

const preset = ref<"7" | "14" | "all" | "custom">("all");
const customFrom = ref("");
const customTo = ref("");
const pickerOpen = ref(false);
const mode = ref<"responses" | "percent" | "rate">("responses");
const loading = ref(false);
const error = ref("");
const stats = ref<DailyStats | null>(null);

const timezone = browserTimeZone();
const isText = computed(() => stats.value?.question?.question_type === "text");
const questionNumber = computed(() => {
    const index = props.questions.findIndex((question) => question.id === props.questionId);
    return index >= 0 ? index + 1 : 1;
});

const rangeFrom = computed(() => (preset.value === "all" ? stats.value?.from ?? todayIso(timezone) : customFrom.value));
const rangeTo = computed(() => (preset.value === "all" ? stats.value?.to ?? todayIso(timezone) : customTo.value));

const newestFirst = computed(() => [...(stats.value?.days ?? [])].reverse());

const totals = computed(() => {
    const days = stats.value?.days ?? [];
    const options: Record<string, number> = {};
    let impressions = 0;
    let responses = 0;
    let dismissals = 0;
    for (const day of days) {
        impressions += day.impressions;
        responses += day.responses;
        dismissals += day.dismissals;
        for (const [id, count] of Object.entries(day.options)) {
            options[id] = (options[id] ?? 0) + count;
        }
    }
    return { impressions, responses, dismissals, options, rate: responseRatePercent(responses, impressions) };
});

function applyPreset(next: "7" | "14" | "all") {
    preset.value = next;
    pickerOpen.value = false;
    if (next === "7" || next === "14") {
        const today = todayIso(timezone);
        customTo.value = today;
        customFrom.value = addCalendarDays(today, next === "7" ? -6 : -13);
    }
    load();
}

function onCustomFrom(event: Event) {
    customFrom.value = (event.target as HTMLInputElement).value;
    preset.value = "custom";
    if (customFrom.value && customTo.value && customFrom.value <= customTo.value) load();
}

function onCustomTo(event: Event) {
    customTo.value = (event.target as HTMLInputElement).value;
    preset.value = "custom";
    if (customFrom.value && customTo.value && customFrom.value <= customTo.value) load();
}

function onQuestion(event: Event) {
    emit("update:questionId", (event.target as HTMLSelectElement).value);
}

async function load() {
    if (!props.surveyId) return;
    loading.value = true;
    error.value = "";
    try {
        stats.value = await surveysApi.getDailyStats(props.surveyId, {
            timezone,
            ...(props.questionId ? { question_id: props.questionId } : {}),
            ...(preset.value === "all" ? {} : { from: customFrom.value, to: customTo.value }),
        });
        if (isText.value && mode.value === "percent") mode.value = "responses";
    } catch (e) {
        console.error("Failed to load daily stats:", e);
        error.value = "Could not load the daily breakdown.";
        stats.value = null;
    } finally {
        loading.value = false;
    }
}

function emitExport() {
    emit("export", {
        from: rangeFrom.value,
        to: rangeTo.value,
        preset: preset.value,
        timezone,
    });
}

function downloadDay(date: string) {
    if (!stats.value?.question) return;
    const day = stats.value.days.find((item) => item.date === date);
    if (!day) return;
    const question = statsToSummaryQuestion({ ...stats.value, days: [day] }, questionNumber.value);
    const table = buildDailySummaryTable([question]);
    const name = `${dailyExportBasename(props.surveyName, date, date)}.csv`;
    downloadBlob(name, new Blob([toCsv(table.headers, table.rows)], { type: "text/csv;charset=utf-8;" }));
}

watch(
    () => [props.surveyId, props.questionId],
    () => {
        load();
    },
    { immediate: true }
);
</script>

<style scoped>
.daily-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
}
.daily-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    flex-wrap: wrap;
}
.range-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    position: relative;
}
.date-chip,
.preset,
.export-daily-btn {
    border-radius: 999px;
    border: 1px solid #e2e8f0;
    background: white;
    color: #2d3748;
    font-size: 14px;
    padding: 8px 14px;
    cursor: pointer;
}
.preset.active {
    background: #eef2ff;
    border-color: #c7d2fe;
    color: #3730a3;
}
.export-daily-btn {
    background: #4f46e5;
    border-color: #4f46e5;
    color: white;
    font-weight: 600;
}
.date-popover {
    position: absolute;
    top: 44px;
    left: 0;
    z-index: 5;
    display: flex;
    gap: 12px;
    padding: 12px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}
.date-popover label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: #4a5568;
}
.question-switch {
    display: flex;
    align-items: center;
    gap: 8px;
}
.question-switch select {
    flex: 1;
    max-width: 640px;
    padding: 8px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
}
.daily-status {
    padding: 32px;
    text-align: center;
    color: #718096;
}
.daily-error {
    color: #c53030;
}
.daily-note {
    margin: 0;
    color: #975a16;
    font-size: 13px;
}
.chart-card,
.table-card {
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px 18px 12px;
    background: white;
}
.chart-head,
.table-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
}
.chart-head h3,
.table-head h3 {
    margin: 0;
    font-size: 16px;
}
.chart-question,
.table-head span {
    margin: 4px 0 0;
    color: #718096;
    font-size: 13px;
}
.mode-switch {
    display: flex;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
}
.mode-switch button {
    border: 0;
    background: white;
    padding: 6px 10px;
    cursor: pointer;
    font-size: 13px;
    color: #4a5568;
}
.mode-switch button.active {
    background: #4f46e5;
    color: white;
}
.mode-switch button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}
.legend {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin: 8px 0 4px;
    font-size: 13px;
    color: #2d3748;
}
.legend i {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 99px;
    margin-right: 6px;
}
.table-scroll {
    overflow-x: auto;
}
table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}
th,
td {
    padding: 10px 8px;
    text-align: right;
    white-space: nowrap;
    border-top: 1px solid #edf2f7;
}
th:first-child,
td:first-child,
th:last-child,
td:last-child {
    text-align: left;
}
th {
    font-size: 11px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #718096;
}
.day-row {
    cursor: pointer;
}
.day-row:hover {
    background: #f8fafc;
}
.strong {
    font-weight: 700;
}
tfoot td {
    font-weight: 700;
    border-top: 2px solid #e2e8f0;
}
.row-download {
    border: 1px solid #e2e8f0;
    background: white;
    border-radius: 6px;
    width: 28px;
    height: 28px;
    cursor: pointer;
}
</style>
