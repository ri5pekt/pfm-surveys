<template>
    <div class="responses-view">
        <div class="header-section">
            <div class="header-left">
                <RouterLink to="/" class="back-link">← Back to surveys</RouterLink>
                <h2 class="response-count">{{ totalResponses }} responses</h2>
            </div>
        </div>

        <div v-if="loading" class="loading">Loading...</div>

        <template v-else>
            <!-- Interaction Metrics -->
            <div class="metrics-cards" v-if="overallMetrics">
                <div class="metric-card metric-card-highlight">
                    <div class="metric-label">Response Rate</div>
                    <div class="metric-value-large">{{ calculateResponseRate(overallMetrics) }}%</div>
                    <div class="metric-subtitle">
                        {{ overallMetrics.responses }} / {{ overallMetrics.impressions }} conversions
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Impressions</div>
                    <div class="metric-value-large">{{ overallMetrics.impressions }}</div>
                    <div class="metric-subtitle">Survey shown</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Responses</div>
                    <div class="metric-value-large">{{ overallMetrics.responses }}</div>
                    <div class="metric-subtitle">Completed surveys</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Dismissals</div>
                    <div class="metric-value-large">{{ overallMetrics.dismissals }}</div>
                    <div class="metric-subtitle">
                        {{ overallMetrics.closeCount }} closed, {{ overallMetrics.minimizeCount }} minimized
                        <span v-if="overallMetrics.autoCloseCount > 0"
                            >, {{ overallMetrics.autoCloseCount }} auto-closed</span
                        >
                    </div>
                </div>
            </div>

            <!-- Questions - Loop through all questions -->
            <div v-for="(question, qIndex) in questions" :key="question.id" class="question-block">
                <!-- Question summary card -->
                <div class="summary-card">
                    <div class="card-header">
                        <span class="question-label">Q.{{ qIndex + 1 }} {{ question.question_text }}</span>
                        <span class="answer-count">{{ questionData[question.id]?.totalAnswers ?? 0 }} answers</span>
                    </div>
                    <div class="card-body">
                        <div class="top-answer" v-if="questionData[question.id]?.topAnswer">
                            <div class="top-answer-label">Top answer</div>
                            <div class="top-answer-value">{{ questionData[question.id].topAnswer.percentage }}%</div>
                            <div class="top-answer-text">{{ questionData[question.id].topAnswer.label }}</div>
                        </div>
                        <div class="bars-section">
                            <div
                                v-for="(bar, idx) in getVisibleBars(question.id)"
                                :key="bar.label"
                                class="bar-row"
                                :class="{ 'bar-row-striped': idx % 2 === 1 }"
                            >
                                <div class="bar-label">{{ bar.label }}</div>
                                <div class="bar-percentage" :class="'bar-color-' + (idx % 5)">
                                    {{ bar.percentage }}%
                                </div>
                                <div class="bar-track">
                                    <div
                                        class="bar-fill"
                                        :style="{ width: bar.percentage + '%' }"
                                        :class="'bar-color-' + (idx % 5)"
                                    ></div>
                                </div>
                                <div class="bar-count">{{ bar.count }} answers</div>
                            </div>
                            <button
                                v-if="
                                    questionData[question.id]?.bars &&
                                    questionData[question.id].bars.length > showBarsLimit
                                "
                                type="button"
                                class="see-more-btn"
                                @click="toggleShowAllBars(question.id)"
                            >
                                {{ expandedBars[question.id] ? "See fewer" : "See more answers" }} ▼
                            </button>
                        </div>
                        <div class="pie-chart-container">
                            <PieChart
                                v-if="questionData[question.id]?.bars && questionData[question.id].bars.length > 0"
                                :data="getPieChartData(question.id, qIndex)"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Individual responses table - ONE table for all responses -->
            <div class="table-section all-responses-table">
                <div class="table-header-row">
                    <span class="table-title">Individual responses</span>
                    <button
                        v-if="selectedIds.length > 0"
                        type="button"
                        class="btn-trash"
                        @click="confirmBulkDelete"
                        title="Delete selected"
                    >
                        🗑 Delete selected ({{ selectedIds.length }})
                    </button>
                </div>
                <table class="responses-table">
                    <thead>
                        <tr>
                            <th class="col-check">
                                <input
                                    type="checkbox"
                                    :checked="isAllSelected"
                                    :indeterminate="isSomeSelected"
                                    @change="toggleSelectAll"
                                    aria-label="Select all"
                                />
                            </th>
                            <th class="col-num">#</th>
                            <th class="col-page">Page</th>
                            <th class="col-browser">Browser / OS</th>
                            <th class="col-device">Device</th>
                            <th class="col-location">Location</th>
                            <th class="col-date">Date</th>
                            <th class="col-actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loadingResponses">
                            <td colspan="8" style="text-align: center; padding: 40px; color: #999">
                                Loading responses...
                            </td>
                        </tr>
                        <tr v-else v-for="(row, index) in allResponses" :key="row.id">
                            <td class="col-check">
                                <input
                                    type="checkbox"
                                    :checked="selectedIds.includes(row.id)"
                                    @change="toggleSelect(row.id)"
                                    :aria-label="'Select response ' + row.id"
                                />
                            </td>
                            <td class="col-num">{{ index + 1 }}</td>
                            <td class="col-page">
                                <a
                                    v-if="row.page_url"
                                    :href="row.page_url"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="page-link"
                                >
                                    {{ truncateUrl(row.page_url) }}
                                    <span class="external-icon" aria-hidden="true">↗</span>
                                </a>
                                <span v-else class="no-page">—</span>
                            </td>
                            <td class="col-browser">
                                <div class="browser-os-icons" :title="browserOsLabel(row)">
                                    <img
                                        v-if="row.browser"
                                        :src="browserIconPath(row.browser)"
                                        :alt="row.browser"
                                        class="browser-icon"
                                    />
                                    <img v-if="row.os" :src="osIconPath(row.os)" :alt="row.os" class="os-icon" />
                                    <span v-if="!row.browser && !row.os" class="no-data">—</span>
                                </div>
                            </td>
                            <td class="col-device">
                                <img
                                    v-if="row.device"
                                    :src="deviceIconPath(row.device)"
                                    :alt="row.device"
                                    :title="row.device"
                                    class="device-icon"
                                />
                                <span v-else class="no-data">—</span>
                            </td>
                            <td class="col-location">
                                <span v-if="row.country" class="location-cell">
                                    <img
                                        :src="getFlagUrl(row.country)"
                                        :alt="row.country"
                                        class="country-flag"
                                        @error="handleFlagError"
                                    />
                                    <span>{{ formatLocation(row) }}</span>
                                </span>
                                <span v-else class="no-location">—</span>
                            </td>
                            <td class="col-date">{{ formatDate(row.timestamp) }}</td>
                            <td class="col-actions">
                                <button type="button" class="btn-text" @click="openViewResponse(row)">
                                    View response
                                </button>
                                <div class="menu-wrapper">
                                    <button
                                        type="button"
                                        class="btn-icon"
                                        @click="toggleRowMenu(row.id)"
                                        aria-haspopup="true"
                                        :aria-expanded="openMenuId === row.id"
                                        aria-label="More options"
                                    >
                                        ⋮
                                    </button>
                                    <div v-if="openMenuId === row.id" class="dropdown-menu">
                                        <button
                                            type="button"
                                            @click="
                                                copyAnswer(row);
                                                openMenuId = null;
                                            "
                                        >
                                            Copy answer
                                        </button>
                                        <button
                                            type="button"
                                            @click="
                                                openDeleteOneDialog(row);
                                                openMenuId = null;
                                            "
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div v-if="allResponses.length === 0 && !loadingResponses" class="empty-table">No responses yet.</div>
                <div class="pagination" v-if="totalResponsesCount > 0">
                    <div class="pagination-controls">
                        <button
                            type="button"
                            class="btn-page"
                            :disabled="currentPage <= 1"
                            @click="currentPage = Math.max(1, currentPage - 1)"
                        >
                            Previous
                        </button>
                        <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
                        <button
                            type="button"
                            class="btn-page"
                            :disabled="currentPage >= totalPages"
                            @click="currentPage = Math.min(totalPages, currentPage + 1)"
                        >
                            Next
                        </button>
                    </div>
                    <div class="per-page-selector">
                        <label for="per-page-select" class="per-page-label">Per page:</label>
                        <select
                            id="per-page-select"
                            v-model.number="pageSize"
                            @change="currentPage = 1"
                            class="per-page-select"
                        >
                            <option :value="10">10</option>
                            <option :value="25">25</option>
                            <option :value="50">50</option>
                            <option :value="100">100</option>
                        </select>
                    </div>
                </div>
            </div>
        </template>

        <!-- View response modal (Hotjar-style: User details + Survey answers) -->
        <Dialog
            v-model:visible="viewResponseVisible"
            modal
            :closable="true"
            :style="{ width: '26rem' }"
            header="Response"
            class="response-dialog"
        >
            <div v-if="viewingResponse" class="view-response-body">
                <section class="response-section">
                    <h3 class="response-section-title">User details</h3>
                    <ul class="response-detail-list">
                        <li class="response-detail-row">
                            <img src="../assets/icons/system/clock.svg" alt="" class="detail-icon" />
                            <span class="detail-label">Timestamp</span>
                            <span class="detail-value">{{ formatDate(viewingResponse.timestamp) }}</span>
                        </li>
                        <li class="response-detail-row">
                            <img :src="deviceIconPath(viewingResponse.device)" alt="" class="detail-icon" />
                            <span class="detail-label">Device</span>
                            <span class="detail-value">{{ viewingResponse.device || "—" }}</span>
                        </li>
                        <li class="response-detail-row">
                            <img
                                v-if="viewingResponse.country && flagPath(viewingResponse.country)"
                                :src="flagPath(viewingResponse.country)!"
                                alt=""
                                class="detail-icon detail-icon-flag"
                            />
                            <span v-else class="detail-icon detail-icon-placeholder">🌐</span>
                            <span class="detail-label">Location</span>
                            <span
                                class="detail-value"
                                :class="{ 'detail-muted': !locationLabel(viewingResponse) && !viewingResponse.country }"
                                >{{
                                    locationLabel(viewingResponse) || countryName(viewingResponse.country) || "—"
                                }}</span
                            >
                        </li>
                        <li v-if="viewingResponse.browser" class="response-detail-row">
                            <img :src="browserIconPath(viewingResponse.browser)" alt="" class="detail-icon" />
                            <span class="detail-label">Browser</span>
                            <span class="detail-value">{{ viewingResponse.browser }}</span>
                        </li>
                        <li v-if="viewingResponse.os" class="response-detail-row">
                            <img :src="osIconPath(viewingResponse.os)" alt="" class="detail-icon" />
                            <span class="detail-label">OS</span>
                            <span class="detail-value">{{ viewingResponse.os }}</span>
                        </li>
                        <li class="response-detail-row">
                            <img src="../assets/icons/system/url.svg" alt="" class="detail-icon" />
                            <span class="detail-label">URL</span>
                            <span class="detail-value detail-value-url">
                                <span class="detail-url-text">{{ truncatePageUrl(viewingResponse.page_url) }}</span>
                                <button
                                    v-if="viewingResponse.page_url"
                                    type="button"
                                    class="detail-copy-btn"
                                    @click="copyToClipboard(viewingResponse.page_url!)"
                                    title="Copy URL"
                                    aria-label="Copy URL"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                    >
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                </button>
                            </span>
                        </li>
                    </ul>
                </section>
                <section class="response-section response-section-answers">
                    <h3 class="response-section-title">Survey answers</h3>
                    <div v-for="(question, qIndex) in questions" :key="question.id" class="survey-answer-block">
                        <div class="survey-question-meta">Q.{{ qIndex + 1 }} {{ question.question_type }}</div>
                        <div class="survey-question-text">{{ question.question_text }}</div>
                        <div class="survey-answer-value">
                            {{ getAnswerForQuestion(viewingResponse, question.id) }}
                        </div>
                    </div>
                </section>
            </div>
        </Dialog>

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
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter, RouterLink } from "vue-router";
import Dialog from "primevue/dialog";
import { surveysApi } from "../services/api";
import type { ResponseSummary, ResponseRow, SurveyQuestion } from "../types";
import PieChart from "../components/PieChart.vue";

const route = useRoute();
const router = useRouter();
const surveyId = computed(() => route.params.id as string);

const loading = ref(true);
const loadingResponses = ref(false);
const surveyDetail = ref<{ survey: { questions: SurveyQuestion[] } } | null>(null);
const overallMetrics = ref<any>(null);
const questionData = ref<Record<string, ResponseSummary>>({});
const allResponsesData = ref<ResponseRow[]>([]);
const totalResponsesCount = ref(0);
const totalResponses = ref(0);
const selectedIds = ref<number[]>([]);
const openMenuId = ref<number | null>(null);
const viewResponseVisible = ref(false);
const viewingResponse = ref<any>(null);
const showDeleteDialog = ref(false);
const deleteTarget = ref<"one" | "bulk">("one");
const responseToDelete = ref<ResponseRow | null>(null);
const deleting = ref(false);
const expandedBars = ref<Record<string, boolean>>({});
const showBarsLimit = 5;
const currentPage = ref(1);
const pageSize = ref(parseInt(localStorage.getItem("pfm_pageSize") || "10", 10));

const questions = computed(() => surveyDetail.value?.survey?.questions ?? []);

// Group responses by session_id to show one row per user response
// Responses are already paginated from the server
const allResponses = computed(() => allResponsesData.value);

const totalPages = computed(() => Math.max(1, Math.ceil(totalResponsesCount.value / pageSize.value)));

const isAllSelected = computed(
    () => allResponses.value.length > 0 && selectedIds.value.length === allResponses.value.length
);
const isSomeSelected = computed(
    () => selectedIds.value.length > 0 && selectedIds.value.length < allResponses.value.length
);

function truncate(s: string, len: number) {
    if (!s) return "";
    return s.length <= len ? s : s.slice(0, len) + "…";
}
function truncateUrl(url: string) {
    if (!url) return "";
    try {
        const u = new URL(url, "https://x");
        const path = u.pathname || url;
        return path.length > 40 ? path.slice(0, 40) + "…" : path;
    } catch {
        return url.length > 40 ? url.slice(0, 40) + "…" : url;
    }
}
function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function browserOsLabel(row: ResponseRow): string {
    const parts = [row.browser, row.os].filter(Boolean);
    return parts.length > 0 ? parts.join(" / ") : "";
}

function locationLabel(row: ResponseRow): string {
    const parts: string[] = [];
    if (row.city) parts.push(row.city);
    if (row.state_name || row.state) parts.push(row.state_name || row.state || "");
    if (row.country) parts.push(row.country);
    return parts.filter(Boolean).join(", ");
}

function formatLocation(row: ResponseRow): string {
    // Display format: "Country, State" or "Country, City" depending on what's available
    const parts: string[] = [];
    if (row.country) parts.push(row.country);
    if (row.state_name) {
        parts.push(row.state_name);
    } else if (row.city) {
        parts.push(row.city);
    }
    return parts.join(", ");
}

function getFlagUrl(countryCode: string): string {
    const key = `../assets/icons/flags/${countryCode.toUpperCase()}.png`;
    return (flagModules[key] as { default: string } | undefined)?.default ?? "";
}

function handleFlagError(event: Event) {
    // Hide flag if it fails to load
    const img = event.target as HTMLImageElement;
    img.style.display = "none";
}

const flagModules = import.meta.glob<{ default: string }>("../assets/icons/flags/*.png", { eager: true });
function flagPath(code: string | null | undefined): string | null {
    if (!code) return null;
    const key = `../assets/icons/flags/${String(code).toUpperCase()}.png`;
    return (flagModules[key] as { default: string } | undefined)?.default ?? null;
}
const COUNTRY_NAMES: Record<string, string> = {
    US: "United States",
    GB: "United Kingdom",
    DE: "Germany",
    FR: "France",
    CA: "Canada",
    AU: "Australia",
    NL: "Netherlands",
    IT: "Italy",
    ES: "Spain",
    BR: "Brazil",
    IN: "India",
    JP: "Japan",
    CN: "China",
    MX: "Mexico",
    RU: "Russia",
    KR: "South Korea",
    PL: "Poland",
    SE: "Sweden",
    BE: "Belgium",
    AT: "Austria",
    CH: "Switzerland",
    IE: "Ireland",
    NO: "Norway",
    DK: "Denmark",
    FI: "Finland",
    NZ: "New Zealand",
    PT: "Portugal",
    GR: "Greece",
    CZ: "Czech Republic",
    RO: "Romania",
    HU: "Hungary",
    IL: "Israel",
    AE: "United Arab Emirates",
    SA: "Saudi Arabia",
    ZA: "South Africa",
    AR: "Argentina",
    CL: "Chile",
    CO: "Colombia",
    PE: "Peru",
    TR: "Turkey",
    UA: "Ukraine",
    TH: "Thailand",
    ID: "Indonesia",
    MY: "Malaysia",
    PH: "Philippines",
    SG: "Singapore",
    HK: "Hong Kong",
    VN: "Vietnam",
    BG: "Bulgaria",
    PR: "Puerto Rico",
    IM: "Isle of Man",
    JE: "Jersey",
    MM: "Myanmar",
};
function countryName(code: string | null | undefined): string {
    if (!code) return "";
    return COUNTRY_NAMES[String(code).toUpperCase()] ?? code;
}
function shortId(eventId: number): string {
    return String(eventId).slice(-8);
}
function browserIconPath(name: string | null | undefined): string {
    const n = (name ?? "").toLowerCase();
    if (n.includes("chrome")) return new URL("../assets/icons/browser/chrome.svg", import.meta.url).href;
    if (n.includes("firefox")) return new URL("../assets/icons/browser/firefox.svg", import.meta.url).href;
    if (n.includes("safari")) return new URL("../assets/icons/browser/safari.svg", import.meta.url).href;
    if (n.includes("edge")) return new URL("../assets/icons/browser/edge.svg", import.meta.url).href;
    // Unknown browser - use system/unknown.svg
    return new URL("../assets/icons/system/unknown.svg", import.meta.url).href;
}
function osIconPath(name: string | null | undefined): string {
    const n = (name ?? "").toLowerCase();
    if (n.includes("android")) return new URL("../assets/icons/os/android.svg", import.meta.url).href;
    if (n.includes("windows") || n.includes("win"))
        return new URL("../assets/icons/os/windows.svg", import.meta.url).href;
    if (n.includes("mac") || n.includes("ios") || n.includes("ipad") || n.includes("iphone"))
        return new URL("../assets/icons/os/apple.svg", import.meta.url).href;
    if (n.includes("linux")) return new URL("../assets/icons/os/linux.svg", import.meta.url).href;
    // Unknown OS - use system/unknown.svg
    return new URL("../assets/icons/system/unknown.svg", import.meta.url).href;
}
function deviceIconPath(device: string | null | undefined): string {
    const d = (device ?? "").toLowerCase();
    if (d === "mobile") return new URL("../assets/icons/device/mobile.svg", import.meta.url).href;
    if (d === "tablet") return new URL("../assets/icons/device/tablet.svg", import.meta.url).href;
    return new URL("../assets/icons/device/desktop.svg", import.meta.url).href;
}
function truncatePageUrl(url: string | null | undefined): string {
    if (!url) return "—";
    try {
        const u = new URL(url, "https://x");
        const path = u.pathname || "/";
        return path.length > 45 ? path.slice(0, 45) + "…" : path;
    } catch {
        return url.length > 45 ? url.slice(0, 45) + "…" : url;
    }
}
function copyToClipboard(text: string) {
    try {
        navigator.clipboard.writeText(text);
    } catch (_) {}
}

async function loadSurvey() {
    if (!surveyId.value) return;
    loading.value = true;
    try {
        const res = await surveysApi.get(surveyId.value);
        surveyDetail.value = res as any;
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
}

async function fetchAllData() {
    if (!surveyId.value) return;
    try {
        // Fetch overall metrics (no question_id)
        const overallRes = await surveysApi.getResponsesSummary(surveyId.value, undefined);
        overallMetrics.value = overallRes.metrics;
        totalResponses.value = overallRes.totalResponses;

        // Fetch data for each question (summary only)
        for (const question of questions.value) {
            try {
                const summaryRes = await surveysApi.getResponsesSummary(surveyId.value, question.id);
                questionData.value[question.id] = summaryRes;
            } catch (e) {
                console.error(`Error fetching summary for question ${question.id}:`, e);
            }
        }

        // Fetch paginated responses
        await fetchResponses();
    } catch (e) {
        console.error(e);
    }
}

async function fetchResponses() {
    if (!surveyId.value) return;
    loadingResponses.value = true;
    try {
        const responsesRes = await surveysApi.getResponses(surveyId.value, {
            page: currentPage.value,
            limit: pageSize.value,
        });
        allResponsesData.value = responsesRes.responses;
        totalResponsesCount.value = responsesRes.total;
    } catch (e) {
        console.error(`Error fetching responses:`, e);
        allResponsesData.value = [];
        totalResponsesCount.value = 0;
    } finally {
        loadingResponses.value = false;
    }
}
function toggleRowMenu(id: number) {
    openMenuId.value = openMenuId.value === id ? null : id;
}

function openViewResponse(row: ResponseRow) {
    // Get all responses for this session
    const sessionId = row.session_id || row.id.toString();
    const sessionResponses = allResponsesData.value.filter((r) => (r.session_id || r.id.toString()) === sessionId);

    viewingResponse.value = {
        ...row,
        allAnswers: sessionResponses,
    };
    viewResponseVisible.value = true;
}

function getAnswerForQuestion(viewingResp: any, questionId: string): string {
    if (!viewingResp?.allAnswers) return "—";
    const answer = viewingResp.allAnswers.find((a: ResponseRow) => a.question_id === questionId);
    return answer?.display_label || "—";
}

function copyAnswer(row: ResponseRow) {
    try {
        navigator.clipboard.writeText(row.display_label);
    } catch (_) {}
}

function confirmDeleteOne(row: ResponseRow) {
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
            console.error(e);
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
            console.error(e);
        } finally {
            deleting.value = false;
        }
    }
}

function handleClickOutside(event: MouseEvent) {
    if (!(event.target as HTMLElement).closest(".menu-wrapper")) openMenuId.value = null;
}

function calculateResponseRate(metrics: { impressions: number; responses: number }): string {
    if (metrics.impressions === 0) return "0.0";
    const rate = (metrics.responses / metrics.impressions) * 100;
    return rate.toFixed(1);
}

function getVisibleBars(questionId: string) {
    const bars = questionData.value[questionId]?.bars ?? [];
    if (expandedBars.value[questionId] || bars.length <= showBarsLimit) return bars;
    return bars.slice(0, showBarsLimit);
}

function toggleShowAllBars(questionId: string) {
    expandedBars.value[questionId] = !expandedBars.value[questionId];
}

function getPieChartData(questionId: string, questionIndex: number) {
    const bars = questionData.value[questionId]?.bars ?? [];
    const colors = ["#667eea", "#e53e3e", "#38a169", "#805ad5", "#2b6cb0"];

    return bars.map((bar, idx) => ({
        label: bar.label,
        value: bar.count,
        color: colors[idx % colors.length],
    }));
}

function toggleSelect(rowId: number) {
    const idx = selectedIds.value.indexOf(rowId);
    if (idx >= 0) {
        selectedIds.value = selectedIds.value.filter((x) => x !== rowId);
    } else {
        selectedIds.value = [...selectedIds.value, rowId];
    }
}

function toggleSelectAll() {
    if (isAllSelected.value) {
        selectedIds.value = [];
    } else {
        selectedIds.value = allResponses.value.map((r) => r.id);
    }
}

onMounted(async () => {
    await loadSurvey();
    await fetchAllData();
    document.addEventListener("click", handleClickOutside);
});
onUnmounted(() => {
    document.removeEventListener("click", handleClickOutside);
});
watch([surveyId], async () => {
    await loadSurvey();
    await fetchAllData();
});

watch([currentPage, pageSize], async () => {
    if (surveyId.value) {
        await fetchResponses();
    }
});

// Save pageSize preference to localStorage
watch(pageSize, (newSize) => {
    localStorage.setItem("pfm_pageSize", newSize.toString());
});
</script>

<style scoped>
.responses-view {
    background: white;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
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
.response-count {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #333;
}
.question-block {
    margin-bottom: 48px;
}
.question-block:last-child {
    margin-bottom: 0;
}
.question-selector {
    flex: 1;
    min-width: 200px;
}
.question-dropdown {
    width: 100%;
    max-width: 400px;
    padding: 8px 12px;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    font-size: 14px;
    background: white;
}
.visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
}
.loading {
    padding: 48px;
    text-align: center;
    color: #666;
}

.metrics-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}

.metric-card {
    background: white;
    border: 1px solid #e1e4e8;
    border-radius: 8px;
    padding: 20px;
    transition: box-shadow 0.2s;
}

.metric-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.metric-label {
    font-size: 13px;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
    margin-bottom: 8px;
    letter-spacing: 0.5px;
}

.metric-value-large {
    font-size: 36px;
    font-weight: 700;
    color: #333;
    line-height: 1;
    margin-bottom: 4px;
}

.metric-subtitle {
    font-size: 13px;
    color: #888;
    margin-top: 4px;
}

.metric-card-highlight {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
}

.metric-card-highlight .metric-label {
    color: rgba(255, 255, 255, 0.9);
}

.metric-card-highlight .metric-value-large {
    color: white;
}

.metric-card-highlight .metric-subtitle {
    color: rgba(255, 255, 255, 0.8);
}

.metric-card-highlight:hover {
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.summary-card {
    border: 1px solid #e1e4e8;
    border-radius: 12px;
    margin-bottom: 24px;
    overflow: hidden;
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    transition: box-shadow 0.2s;
}
.summary-card:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
.card-header {
    padding: 20px 24px;
    background: linear-gradient(to right, #f8f9fa, #ffffff);
    border-bottom: 2px solid #e1e4e8;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
}
.question-label {
    font-weight: 700;
    color: #1a202c;
    font-size: 16px;
    line-height: 1.5;
}
.answer-count {
    color: #667eea;
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
    background: rgba(102, 126, 234, 0.1);
    padding: 4px 12px;
    border-radius: 20px;
}
.card-body {
    padding: 20px;
    display: grid;
    grid-template-columns: 180px 1fr 200px;
    gap: 32px;
    align-items: stretch;
}
@media (max-width: 1200px) {
    .card-body {
        grid-template-columns: 180px 1fr;
    }
    .pie-chart-container {
        display: none;
    }
}
@media (max-width: 768px) {
    .card-body {
        grid-template-columns: 1fr;
    }
}
.pie-chart-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    background: #fafbfc;
    border-radius: 8px;
    border: 1px solid #e1e4e8;
    width: 100%;
    height: 100%;
}
.top-answer {
    background: #f6f8fa;
    border: 1px solid #e1e4e8;
    border-radius: 8px;
    padding: 16px;
    transition: box-shadow 0.2s;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
}
.top-answer:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.top-answer-label {
    font-size: 12px;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
    margin-bottom: 12px;
    letter-spacing: 0.5px;
}
.top-answer-value {
    font-size: 36px;
    font-weight: 700;
    color: #333;
    line-height: 1;
    margin-bottom: 8px;
}
.top-answer-text {
    font-size: 14px;
    font-weight: 500;
    color: #555;
    margin-top: 4px;
    line-height: 1.4;
}
.bars-section {
    display: flex;
    flex-direction: column;
    gap: 0;
}
.bar-row {
    display: grid;
    grid-template-columns: 1fr 70px 140px 90px;
    gap: 16px;
    align-items: center;
    font-size: 14px;
    padding: 12px 16px;
    margin: 0 -16px;
    transition: background-color 0.2s;
}
.bar-row:hover {
    background-color: #f8f9fa;
}
.bar-row-striped {
    background-color: #f6f8fa;
}
.bar-row-striped:hover {
    background-color: #eef1f5;
}
.bar-label {
    color: #333;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 15px;
}
.bar-percentage {
    font-weight: 700;
    font-size: 14px;
    text-align: right;
}
.bar-percentage.bar-color-0 {
    color: #667eea;
}
.bar-percentage.bar-color-1 {
    color: #e53e3e;
}
.bar-percentage.bar-color-2 {
    color: #38a169;
}
.bar-percentage.bar-color-3 {
    color: #805ad5;
}
.bar-percentage.bar-color-4 {
    color: #2b6cb0;
}
.bar-track {
    height: 28px;
    background: #f0f0f0;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.08);
}
.bar-fill {
    height: 100%;
    border-radius: 6px;
    min-width: 2px;
    transition: width 0.3s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
.bar-fill.bar-color-0 {
    background: #667eea;
}
.bar-fill.bar-color-1 {
    background: #e53e3e;
}
.bar-fill.bar-color-2 {
    background: #38a169;
}
.bar-fill.bar-color-3 {
    background: #805ad5;
}
.bar-fill.bar-color-4 {
    background: #2b6cb0;
}
.bar-count {
    color: #666;
    text-align: right;
    font-size: 14px;
    font-weight: 600;
}
.see-more-btn {
    background: none;
    border: none;
    color: #667eea;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    padding: 12px 0;
    text-align: left;
    transition: color 0.2s;
}
.see-more-btn:hover {
    color: #764ba2;
    text-decoration: underline;
}

.table-section {
    margin-top: 24px;
    overflow-x: auto;
}
.table-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}
.table-title {
    font-weight: 600;
    font-size: 16px;
    color: #333;
}
.btn-trash {
    padding: 6px 12px;
    font-size: 14px;
    color: #c53030;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    cursor: pointer;
}
.btn-trash:hover {
    background: #fef2f2;
}
.responses-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    min-width: 1280px;
}
.responses-table th {
    text-align: left;
    padding: 12px;
    border-bottom: 2px solid #e1e4e8;
    font-size: 12px;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
}
.responses-table td {
    padding: 12px;
    border-bottom: 1px solid #e1e4e8;
    font-size: 14px;
    color: #333;
}
.col-check {
    width: 40px;
}
.col-num {
    width: 50px;
    white-space: nowrap;
}
.col-answer {
    min-width: 200px;
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
}
.col-page {
    width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.col-browser {
    width: 110px;
    white-space: nowrap;
}
.browser-os-icons {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: help;
}
.browser-icon,
.os-icon {
    width: 20px;
    height: 20px;
    object-fit: contain;
    opacity: 0.85;
    transition: opacity 0.2s;
}
.browser-icon:hover,
.os-icon:hover {
    opacity: 1;
}
.no-data {
    color: #999;
}
.col-device {
    width: 70px;
    white-space: nowrap;
    text-align: center;
}
.device-icon {
    width: 20px;
    height: 20px;
    object-fit: contain;
    opacity: 0.85;
    transition: opacity 0.2s;
    cursor: help;
}
.device-icon:hover {
    opacity: 1;
}
.col-location {
    width: 200px;
    white-space: nowrap;
}
.col-date {
    width: 180px;
    white-space: nowrap;
}
.col-actions {
    width: 180px;
    white-space: nowrap;
}
.location-cell {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}
.country-flag {
    width: 20px;
    height: 15px;
    object-fit: cover;
    border-radius: 2px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
.no-location {
    color: #999;
}
.page-link {
    color: #667eea;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
}
.page-link:hover {
    text-decoration: underline;
}
.external-icon {
    font-size: 12px;
}
.no-page {
    color: #999;
}
.btn-text {
    background: none;
    border: none;
    color: #667eea;
    font-size: 14px;
    cursor: pointer;
    padding: 4px 8px;
    margin-right: 8px;
}
.btn-text:hover {
    text-decoration: underline;
}
.menu-wrapper {
    position: relative;
    display: inline-block;
}
.btn-icon {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    font-size: 16px;
    color: #666;
    line-height: 1;
}
.btn-icon:hover {
    color: #333;
}
.dropdown-menu {
    position: absolute;
    right: 0;
    top: 100%;
    margin-top: 4px;
    background: white;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    min-width: 140px;
    z-index: 10;
    padding: 4px 0;
}
.dropdown-menu button {
    display: block;
    width: 100%;
    padding: 8px 12px;
    text-align: left;
    border: none;
    background: none;
    font-size: 14px;
    cursor: pointer;
    color: #333;
}
.dropdown-menu button:hover {
    background: #f6f8fa;
}
.dropdown-menu button.danger {
    color: #c53030;
}
.empty-table {
    padding: 32px;
    text-align: center;
    color: #666;
}
.pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e1e4e8;
}

.pagination-controls {
    display: flex;
    align-items: center;
    gap: 16px;
}

.per-page-selector {
    display: flex;
    align-items: center;
    gap: 8px;
}

.per-page-label {
    font-size: 14px;
    color: #666;
    font-weight: 500;
}

.per-page-select {
    padding: 6px 32px 6px 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    background: white;
    cursor: pointer;
    transition: border-color 0.2s;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2.5 4.5L6 8L9.5 4.5' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
}

.per-page-select:focus {
    outline: none;
    border-color: #667eea;
}
.btn-page {
    padding: 8px 16px;
    font-size: 14px;
    border: 1px solid #e1e4e8;
    background: white;
    border-radius: 6px;
    cursor: pointer;
}
.btn-page:hover:not(:disabled) {
    background: #f6f8fa;
}
.btn-page:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
.page-info {
    font-size: 14px;
    color: #666;
}
.view-response-body {
    padding: 0;
}
.response-section {
    margin-bottom: 1.25rem;
}
.response-section:last-child {
    margin-bottom: 0;
}
.response-section-title {
    margin: 0 0 10px 0;
    font-size: 13px;
    font-weight: 700;
    color: #1a1a1a;
    letter-spacing: 0.02em;
}
.response-detail-list {
    list-style: none;
    margin: 0;
    padding: 0;
}
.response-detail-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 0;
    font-size: 13px;
    color: #333;
    border-bottom: 1px solid #f0f0f0;
}
.response-detail-row:last-child {
    border-bottom: none;
}
.detail-icon {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    object-fit: contain;
}
.detail-icon-flag {
    width: 20px;
    height: 14px;
    object-fit: cover;
    border-radius: 1px;
}
.detail-icon-placeholder {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    font-size: 14px;
}
.detail-icon-svg {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    color: #666;
}
.detail-icon-svg svg {
    width: 16px;
    height: 16px;
}
.detail-label {
    flex: 0 0 120px;
    color: #666;
    font-size: 12px;
}
.detail-value {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    color: #1a1a1a;
}
.detail-value.detail-muted {
    color: #999;
}
.detail-value-url {
    display: flex;
    align-items: center;
    gap: 6px;
}
.detail-url-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.detail-copy-btn {
    flex-shrink: 0;
    padding: 4px;
    margin: -4px -4px -4px 0;
    background: none;
    border: none;
    border-radius: 4px;
    color: #666;
    cursor: pointer;
}
.detail-copy-btn:hover {
    color: #1a1a1a;
    background: #f0f0f0;
}
.response-section-answers {
    padding-top: 0.75rem;
    border-top: 1px solid #e8e8e8;
}
.survey-answer-block {
    font-size: 13px;
}
.survey-question-meta {
    color: #666;
    font-size: 12px;
    margin-bottom: 4px;
}
.survey-question-text {
    color: #1a1a1a;
    margin-bottom: 8px;
    line-height: 1.4;
}
.survey-answer-value {
    color: #1a1a1a;
    font-weight: 500;
}
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
