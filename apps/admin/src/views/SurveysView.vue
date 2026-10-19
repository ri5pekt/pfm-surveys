<template>
    <div class="surveys-view">
        <div class="header-section">
            <h2>Surveys</h2>
            <div class="header-controls">
                <template v-if="exportSelectMode">
                    <button
                        type="button"
                        class="btn-export-selected"
                        :disabled="selectedSurveyIds.length === 0 || exportingSelected"
                        @click="exportSelectedSurveys"
                    >
                        {{ exportingSelected ? exportProgressLabel : `Export selected (${selectedSurveyIds.length})` }}
                    </button>
                    <button type="button" class="btn-secondary" :disabled="exportingSelected" @click="cancelExportSelect">
                        Cancel
                    </button>
                </template>
                <template v-else>
                    <div class="filter-toggle">
                        <button :class="['filter-btn', { active: showMyOnly }]" @click="showMyOnly = true">
                            My Surveys
                        </button>
                        <button :class="['filter-btn', { active: !showMyOnly }]" @click="showMyOnly = false">
                            All Surveys
                        </button>
                    </div>
                    <button type="button" class="btn-secondary" @click="enterExportSelectMode">Export</button>
                    <button @click="createSurvey" class="btn-primary">Create Survey</button>
                </template>
            </div>
        </div>

        <div v-if="loading" class="loading">Loading surveys...</div>

        <template v-else>
            <div class="stat-grid">
                <article class="stat-card">
                    <p class="stat-label">Live now</p>
                    <p class="stat-value">{{ formatCount(home?.summary.live ?? 0) }}</p>
                    <p class="stat-note">
                        {{ formatCount(home?.summary.liveCollecting ?? 0) }} collecting answers ·
                        {{ formatCount(home?.summary.liveSilent ?? 0) }} silent
                    </p>
                </article>
                <article class="stat-card">
                    <p class="stat-label">Launched in {{ home?.summary.thisMonthLabel ?? "this month" }}</p>
                    <p class="stat-value">{{ formatCount(home?.summary.launchedThisMonth ?? 0) }}</p>
                    <p class="stat-note">
                        {{ formatCount(home?.summary.launchedLastMonth ?? 0) }} in {{ home?.summary.lastMonthLabel ?? "last month" }}
                    </p>
                </article>
                <article class="stat-card">
                    <p class="stat-label">Response rate · last 30 days</p>
                    <p class="stat-value" :class="{ 'stat-low': home?.summary.rate30dLow }">{{ rate30Label }}</p>
                    <p class="stat-note">Your usual is {{ usualRateLabel }}</p>
                </article>
                <article class="stat-card">
                    <p class="stat-label">Answers collected</p>
                    <p class="stat-value">{{ formatCount(home?.summary.answersTotal ?? 0) }}</p>
                    <p class="stat-note">{{ answersNote }}</p>
                </article>
            </div>

            <section v-if="home && home.attention.length" class="attention" aria-label="Needs attention">
                <div class="attention-head">
                    <h3>{{ attentionHeading }}</h3>
                    <p>Checked across all your surveys when you open this page</p>
                </div>
                <div class="attention-grid">
                    <article
                        v-for="card in home.attention"
                        :key="`${card.rule}-${card.surveyId ?? 'all'}`"
                        class="attention-card"
                        :class="card.type"
                    >
                        <p class="attention-kicker">{{ card.kicker }}</p>
                        <h4 :title="surveyTitle(card.surveyId)">{{ card.title }}</h4>
                        <p class="attention-body">{{ card.body }}</p>
                        <div class="attention-actions">
                            <button type="button" class="attention-btn" @click="onCardAction(card)">
                                {{ card.cta }}
                            </button>
                            <button
                                v-if="card.canTurnOff && card.surveyId"
                                type="button"
                                class="attention-btn"
                                @click="turnOffFromCard(card.surveyId, card.title)"
                            >
                                Turn off
                            </button>
                        </div>
                    </article>
                </div>
                <button
                    v-if="home.attentionTotal > home.attention.length"
                    type="button"
                    class="see-all"
                    @click="selectTab('attention')"
                >
                    See all {{ home.attentionTotal }}
                </button>
            </section>

            <div class="tabs-row">
                <div class="tabs">
                    <button :class="['tab', { active: activeTab === 'all' }]" @click="selectTab('all')">
                        All ({{ filteredSurveys.length }})
                    </button>
                    <button :class="['tab', { active: activeTab === 'live' }]" @click="selectTab('live')">
                        Live ({{ liveSurveys.length }})
                    </button>
                    <button :class="['tab', { active: activeTab === 'ended' }]" @click="selectTab('ended')">
                        Ended ({{ endedSurveys.length }})
                    </button>
                    <button :class="['tab', { active: activeTab === 'drafts' }]" @click="selectTab('drafts')">
                        Drafts ({{ draftSurveys.length }})
                    </button>
                    <button :class="['tab', { active: activeTab === 'attention' }]" @click="selectTab('attention')">
                        Needs attention ({{ attentionSurveys.length }})
                    </button>
                </div>
                <label class="test-toggle">
                    <input v-model="showTests" type="checkbox" />
                    Show test surveys ({{ testSurveys.length }})
                </label>
            </div>

            <div v-if="currentSurveys.length === 0" class="empty-state">
                <p>{{ emptyLabel }}</p>
                <button v-if="activeTab === 'all' || activeTab === 'drafts' || activeTab === 'live'" @click="createSurvey" class="btn-primary">
                    Create Your First Survey
                </button>
            </div>

            <template v-else>
        <p v-if="exportError" class="export-error">{{ exportError }}</p>

        <div class="table-wrap">
        <table class="surveys-table">
            <thead>
                <tr>
                    <th v-if="exportSelectMode" class="checkbox-col">
                        <input
                            type="checkbox"
                            :checked="allVisibleSelected"
                            :indeterminate.prop="someVisibleSelected && !allVisibleSelected"
                            :disabled="exportingSelected"
                            title="Select all visible"
                            @change="toggleSelectAllVisible"
                        />
                    </th>
                    <th>Name</th>
                    <th>Impressions</th>
                    <th>Responses</th>
                    <th>Resp. rate</th>
                    <th>Created By</th>
                    <th>Created</th>
                    <th v-if="!exportSelectMode">Actions</th>
                    <th v-if="!exportSelectMode">Status</th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="survey in currentSurveys"
                    :key="survey.id"
                    :class="{
                        'row-selected': exportSelectMode && selectedSurveyIds.includes(survey.id),
                        'row-selectable': exportSelectMode && !exportingSelected,
                    }"
                    @click="exportSelectMode && !exportingSelected ? toggleSurveySelected(survey.id) : undefined"
                >
                    <td v-if="exportSelectMode" class="checkbox-col" @click.stop>
                        <input
                            type="checkbox"
                            :checked="selectedSurveyIds.includes(survey.id)"
                            :disabled="exportingSelected"
                            @change="toggleSurveySelected(survey.id)"
                        />
                    </td>
                    <td
                        class="survey-name"
                        :class="{ clickable: !exportSelectMode }"
                        @click="!exportSelectMode && viewResults(survey.id)"
                    >
                        <span v-if="isFlagged(survey.id)" class="flag" title="Needs attention" aria-label="Needs attention">▲</span>
                        {{ survey.name }}
                        <span v-if="survey.isTest" class="test-tag">Test</span>
                    </td>
                    <td>
                        <span class="metric-value" :title="`Survey was shown ${survey.impressions || 0} time(s)`">
                            {{ formatCount(survey.impressions || 0) }}
                        </span>
                    </td>
                    <td>{{ formatCount(survey.responses || 0) }}</td>
                    <td>
                        <span v-if="shownRate(survey) == null" class="rate-empty">—</span>
                        <span v-else class="rate" :class="rateBand(survey)">
                            <i v-if="rateBand(survey) !== 'plain'" class="rate-dot" aria-hidden="true"></i>
                            {{ formatPercent(shownRate(survey)!) }}
                        </span>
                    </td>
                    <td>{{ getCreatorName(survey) }}</td>
                    <td>{{ formatDate(survey.created_at) }}</td>
                    <td v-if="!exportSelectMode">
                        <div class="actions-panel">
                            <button class="action-btn" @click="viewResults(survey.id)" title="View Results">
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path d="M3 3v18h18"></path>
                                    <path d="M18 17V9l-5 5-3-3-4 4"></path>
                                </svg>
                            </button>
                            <button class="action-btn" @click="editSurvey(survey.id)" title="Edit">
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            <button class="action-btn" @click="showCopyConfirm(survey)" title="Copy">
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                            </button>
                            <button
                                class="action-btn action-btn-danger"
                                @click="showDeleteConfirm(survey)"
                                title="Delete"
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </td>
                    <td v-if="!exportSelectMode">
                        <div class="status-cell">
                            <label class="toggle-label">
                                <div class="toggle-switch" :class="{ active: survey.active }">
                                    <input
                                        type="checkbox"
                                        :checked="survey.active"
                                        @change="showToggleConfirm(survey)"
                                        class="toggle-input"
                                    />
                                    <span class="toggle-slider"></span>
                                </div>
                            </label>
                            <span class="status-text" :class="listStatus(survey)">{{ survey.statusText || statusLabel(survey) }}</span>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
        </div>
        <p v-if="home" class="rate-legend">
            <span class="legend-item low">Bottom 10% of your surveys (under {{ formatPercent(home.benchmark.p10) }})</span>
            <span class="legend-item high">Top 10% (over {{ formatPercent(home.benchmark.p90) }})</span>
            <span class="legend-item usual">In the usual range, or under 200 impressions</span>
        </p>
            </template>
        </template>

        <!-- Toggle Confirmation Dialog -->
        <Dialog v-model:visible="showConfirmDialog" modal :closable="true" :style="{ width: '26rem' }">
            <template #header>
                <div class="dialog-header-content">
                    <div class="dialog-icon confirm-icon-circle">
                        <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                        >
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                    <h3>{{ confirmAction === "activate" ? "Activate Survey" : "Deactivate Survey" }}</h3>
                </div>
            </template>
            <div class="dialog-body">
                <p>
                    <template v-if="cardTurnOff">
                        Turn off <strong>{{ cardTurnOffName }}</strong>? It will stop showing on your site.
                    </template>
                    <template v-else>
                        Are you sure you want to {{ confirmAction === "activate" ? "activate" : "deactivate" }}
                        <strong>"{{ pendingSurvey?.name }}"</strong>?
                    </template>
                </p>
                <p v-if="confirmAction === 'activate'" class="dialog-hint">
                    The survey will be visible to users on your website.
                </p>
                <p v-else class="dialog-hint">The survey will no longer be shown to users.</p>
            </div>
            <template #footer>
                <div class="dialog-footer">
                    <button class="btn-dialog-secondary" @click="cancelToggle">Cancel</button>
                    <button class="btn-dialog-primary" @click="confirmToggle">
                        {{ cardTurnOff ? "Turn off" : confirmAction === "activate" ? "Activate" : "Deactivate" }}
                    </button>
                </div>
            </template>
        </Dialog>

        <!-- Copy Confirmation Dialog -->
        <Dialog v-model:visible="showCopyDialog" modal :closable="true" :style="{ width: '28rem' }">
            <template #header>
                <div class="dialog-header-content">
                    <div class="dialog-icon confirm-icon-circle">
                        <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                        >
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </div>
                    <h3>Copy Survey</h3>
                </div>
            </template>
            <div class="dialog-body">
                <p>
                    Create a copy of <strong>"{{ surveyToCopy?.name }}"</strong>?
                </p>
                <p class="dialog-hint">
                    The copy will include all questions, settings, and appearance. It will start as inactive so you can
                    review and edit before publishing.
                </p>
            </div>
            <template #footer>
                <div class="dialog-footer">
                    <button class="btn-dialog-secondary" @click="cancelCopy">Cancel</button>
                    <button class="btn-dialog-primary" @click="confirmCopy" :disabled="copying">
                        {{ copying ? "Copying..." : "Create Copy" }}
                    </button>
                </div>
            </template>
        </Dialog>

        <!-- Delete Confirmation Dialog -->
        <Dialog v-model:visible="showDeleteDialog" modal :closable="true" :style="{ width: '28rem' }">
            <template #header>
                <div class="dialog-header-content">
                    <div class="dialog-icon delete-icon-circle">
                        <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                        >
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </div>
                    <h3>Delete Survey</h3>
                </div>
            </template>
            <div class="dialog-body">
                <p>
                    Are you sure you want to delete <strong>"{{ surveyToDelete?.name }}"</strong>?
                </p>
                <p class="dialog-hint warning-text">
                    ⚠️ This action cannot be undone. All survey data, questions, and responses will be permanently
                    deleted.
                </p>
            </div>
            <template #footer>
                <div class="dialog-footer">
                    <button class="btn-dialog-secondary" @click="cancelDelete">Cancel</button>
                    <button class="btn-dialog-danger" @click="confirmDelete" :disabled="deleting">
                        {{ deleting ? "Deleting..." : "Delete Survey" }}
                    </button>
                </div>
            </template>
        </Dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import Dialog from "primevue/dialog";
import { useSitesStore } from "../stores/sites";
import { useAuthStore } from "../stores/auth";
import { surveysApi } from "../services/api";
import type { HomeCard, Survey, SurveyHome, SurveyQuestion } from "../types";
import { delay, exportSurveyResponsesCsv } from "../utils/exportSurveyResponsesCsv";

const router = useRouter();

const sitesStore = useSitesStore();
const authStore = useAuthStore();

const surveys = ref<Survey[]>([]);
const home = ref<SurveyHome | null>(null);
const loading = ref(false);
const activeTab = ref<"all" | "live" | "ended" | "drafts" | "attention">("all");
const showTests = ref(localStorage.getItem("pfm_showTestSurveys") === "true");
const newestFirst = ref(false);
const cardTurnOff = ref(false);
const cardTurnOffName = ref("");
const showMyOnly = ref(localStorage.getItem("pfm_showMySurveys") === "true");
const showConfirmDialog = ref(false);
const pendingSurvey = ref<Survey | null>(null);
const confirmAction = ref<"activate" | "deactivate">("activate");
const showCopyDialog = ref(false);
const surveyToCopy = ref<Survey | null>(null);
const copying = ref(false);
const showDeleteDialog = ref(false);
const surveyToDelete = ref<Survey | null>(null);
const deleting = ref(false);

const exportSelectMode = ref(false);
const selectedSurveyIds = ref<string[]>([]);
const exportingSelected = ref(false);
const exportProgressLabel = ref("");
const exportError = ref("");

// Watch and persist showMyOnly preference
watch(showMyOnly, (value) => {
    localStorage.setItem("pfm_showMySurveys", value.toString());
    fetchHome();
});
watch(showTests, (value) => {
    localStorage.setItem("pfm_showTestSurveys", value.toString());
});

const ownedSurveys = computed(() => {
    if (!showMyOnly.value) return surveys.value;
    return surveys.value.filter((survey) => survey.created_by === authStore.user?.id);
});
const testSurveys = computed(() => ownedSurveys.value.filter((survey) => survey.isTest));
const filteredSurveys = computed(() => {
    if (showTests.value) return ownedSurveys.value;
    return ownedSurveys.value.filter((survey) => !survey.isTest);
});
const flaggedIds = computed(() => new Set(home.value?.flaggedIds ?? []));
const attentionSurveys = computed(() => filteredSurveys.value.filter((survey) => flaggedIds.value.has(survey.id)));

const liveSurveys = computed(() => filteredSurveys.value.filter((s) => listStatus(s) === "live"));
const endedSurveys = computed(() => filteredSurveys.value.filter((s) => listStatus(s) === "ended"));
const draftSurveys = computed(() => filteredSurveys.value.filter((s) => listStatus(s) === "draft"));
const currentSurveys = computed(() => {
    if (activeTab.value === "live") return liveSurveys.value;
    if (activeTab.value === "ended") return endedSurveys.value;
    if (activeTab.value === "drafts") return draftSurveys.value;
    if (activeTab.value === "attention") return attentionSurveys.value;
    const rows = newestFirst.value
        ? filteredSurveys.value
        : [...liveSurveys.value, ...filteredSurveys.value.filter((survey) => listStatus(survey) !== "live")];
    return rows;
});

const emptyLabel = computed(() => {
    if (activeTab.value === "live") return "No live surveys yet";
    if (activeTab.value === "ended") return "No ended surveys yet";
    if (activeTab.value === "drafts") return "No drafts yet";
    if (activeTab.value === "attention") return "Nothing needs attention";
    return "No surveys yet";
});

const attentionHeading = computed(() => {
    const count = home.value?.attentionTotal ?? 0;
    return count === 1 ? "1 thing needs attention" : `${count} things need attention`;
});

const rate30Label = computed(() => (home.value?.summary.rate30d == null ? "—" : formatPercent(home.value.summary.rate30d)));
const usualRateLabel = computed(() => (home.value ? formatPercent(home.value.summary.usualRate) : "—"));
const answersNote = computed(() => {
    if (!home.value) return "";
    const count = home.value.summary.surveysWithAnswers;
    const since = home.value.summary.since;
    const noun = count === 1 ? "survey" : "surveys";
    return since ? `across ${formatCount(count)} ${noun} since ${since}` : `across ${formatCount(count)} ${noun}`;
});

function listStatus(survey: Survey): "live" | "ended" | "draft" {
    if (survey.status) return survey.status;
    if (survey.active) return "live";
    if ((survey.impressions || 0) > 0 || (survey.responses || 0) > 0) return "ended";
    return "draft";
}

function selectTab(tab: "all" | "live" | "ended" | "drafts" | "attention") {
    newestFirst.value = false;
    activeTab.value = tab;
}

function shownRate(survey: Survey): number | null {
    if (survey.responseRate != null) return survey.responseRate;
    const impressions = survey.impressions || 0;
    if (impressions <= 0) return null;
    return ((survey.responses || 0) / impressions) * 100;
}

function isFlagged(surveyId: string): boolean {
    return flaggedIds.value.has(surveyId);
}

function surveyTitle(surveyId?: string): string | undefined {
    if (!surveyId) return undefined;
    return surveys.value.find((survey) => survey.id === surveyId)?.name;
}

function onCardAction(card: HomeCard) {
    if (card.cta === "See surveys") {
        newestFirst.value = true;
        activeTab.value = "all";
        return;
    }
    if (card.surveyId) viewResults(card.surveyId);
}

function turnOffFromCard(surveyId: string, name: string) {
    const survey = surveys.value.find((item) => item.id === surveyId);
    if (!survey) return;
    pendingSurvey.value = survey;
    confirmAction.value = "deactivate";
    cardTurnOff.value = true;
    cardTurnOffName.value = name;
    showConfirmDialog.value = true;
}

function statusLabel(survey: Survey): string {
    const status = listStatus(survey);
    if (status === "live") return "Live";
    if (status === "ended") return "Ended";
    return "Draft";
}

function rateBand(survey: Survey): "low" | "high" | "usual" | "plain" {
    if (survey.isTest) return "plain";
    const rate = shownRate(survey);
    const benchmark = home.value?.benchmark;
    if (rate == null || !benchmark) return "usual";
    if ((survey.impressions || 0) < benchmark.minImpressions) return "usual";
    if (rate < benchmark.p10) return "low";
    if (rate > benchmark.p90) return "high";
    return "usual";
}

function formatCount(value: number): string {
    return value.toLocaleString("en-US");
}

function formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
}

const allVisibleSelected = computed(
    () =>
        currentSurveys.value.length > 0 &&
        currentSurveys.value.every((s) => selectedSurveyIds.value.includes(s.id))
);

const someVisibleSelected = computed(() =>
    currentSurveys.value.some((s) => selectedSurveyIds.value.includes(s.id))
);

function enterExportSelectMode() {
    exportSelectMode.value = true;
    selectedSurveyIds.value = [];
    exportError.value = "";
}

function cancelExportSelect() {
    if (exportingSelected.value) return;
    exportSelectMode.value = false;
    selectedSurveyIds.value = [];
    exportError.value = "";
    exportProgressLabel.value = "";
}

function toggleSurveySelected(surveyId: string) {
    if (exportingSelected.value) return;
    const idx = selectedSurveyIds.value.indexOf(surveyId);
    if (idx >= 0) {
        selectedSurveyIds.value = selectedSurveyIds.value.filter((id) => id !== surveyId);
    } else {
        selectedSurveyIds.value = [...selectedSurveyIds.value, surveyId];
    }
}

function toggleSelectAllVisible(event: Event) {
    if (exportingSelected.value) return;
    const checked = (event.target as HTMLInputElement).checked;
    const visibleIds = currentSurveys.value.map((s) => s.id);
    if (checked) {
        selectedSurveyIds.value = [...new Set([...selectedSurveyIds.value, ...visibleIds])];
    } else {
        const visibleSet = new Set(visibleIds);
        selectedSurveyIds.value = selectedSurveyIds.value.filter((id) => !visibleSet.has(id));
    }
}

async function exportSelectedSurveys() {
    if (selectedSurveyIds.value.length === 0 || exportingSelected.value) return;

    exportingSelected.value = true;
    exportError.value = "";

    const ids = [...selectedSurveyIds.value];
    const failures: string[] = [];

    try {
        for (let i = 0; i < ids.length; i++) {
            const surveyId = ids[i];
            const listSurvey = surveys.value.find((s) => s.id === surveyId);
            const surveyName = listSurvey?.name ?? surveyId;

            exportProgressLabel.value = `Exporting ${i + 1}/${ids.length}…`;

            try {
                const { survey } = await surveysApi.get(surveyId);
                const questions = ((survey as Survey & { questions?: SurveyQuestion[] }).questions ??
                    []) as SurveyQuestion[];

                await exportSurveyResponsesCsv({
                    surveyId,
                    surveyName: survey.name || surveyName,
                    questions,
                    onProgress: (label) => {
                        exportProgressLabel.value = `${i + 1}/${ids.length}: ${label}`;
                    },
                });

                if (i < ids.length - 1) {
                    await delay(400);
                }
            } catch (err) {
                console.error(`Failed to export survey ${surveyId}:`, err);
                failures.push(surveyName);
            }
        }

        if (failures.length > 0) {
            exportError.value = `Failed to export: ${failures.join(", ")}`;
        } else {
            exportSelectMode.value = false;
            selectedSurveyIds.value = [];
        }
    } finally {
        exportingSelected.value = false;
        exportProgressLabel.value = "";
    }
}

async function fetchHome() {
    if (!sitesStore.currentSite) return;
    try {
        home.value = await surveysApi.home(sitesStore.currentSite.id, showMyOnly.value ? "mine" : "all");
    } catch (error) {
        console.error("Failed to fetch survey home:", error);
    }
}

async function fetchSurveys() {
    if (!sitesStore.currentSite) return;

    loading.value = true;
    try {
        const response = await surveysApi.getAll({ site_id: sitesStore.currentSite.id });
        surveys.value = response.surveys;
        await fetchHome();
    } catch (error) {
        console.error("Failed to fetch surveys:", error);
    } finally {
        loading.value = false;
    }
}

function createSurvey() {
    router.push({ name: "survey-new" });
}

function editSurvey(surveyId: string) {
    router.push({ name: "survey-edit", params: { id: surveyId } });
}

function viewResults(surveyId: string) {
    router.push({ name: "survey-responses", params: { id: surveyId } });
}

function showToggleConfirm(survey: Survey) {
    pendingSurvey.value = survey;
    confirmAction.value = survey.active ? "deactivate" : "activate";
    cardTurnOff.value = false;
    cardTurnOffName.value = "";
    showConfirmDialog.value = true;
}

function cancelToggle() {
    showConfirmDialog.value = false;
    pendingSurvey.value = null;
    cardTurnOff.value = false;
    cardTurnOffName.value = "";
}

async function confirmToggle() {
    if (!pendingSurvey.value) return;

    const survey = pendingSurvey.value;
    const newStatus = !survey.active;

    try {
        // Update on server
        await surveysApi.update(survey.id, { active: newStatus });

        // Update UI on success
        survey.active = newStatus;
        if (!newStatus) {
            survey.status = (survey.impressions || 0) > 0 || (survey.responses || 0) > 0 ? "ended" : "draft";
            survey.statusText = survey.status === "draft" ? "Draft" : "Ended";
        } else {
            survey.status = "live";
            survey.statusText = "Live";
        }

        showConfirmDialog.value = false;
        pendingSurvey.value = null;
        cardTurnOff.value = false;
        cardTurnOffName.value = "";
        await fetchHome();
    } catch (error) {
        console.error("Failed to update survey status:", error);
        // TODO: Show error dialog
    }
}

function showDeleteConfirm(survey: Survey) {
    surveyToDelete.value = survey;
    showDeleteDialog.value = true;
}

function cancelDelete() {
    showDeleteDialog.value = false;
    surveyToDelete.value = null;
}

async function confirmDelete() {
    if (!surveyToDelete.value) return;

    const surveyId = surveyToDelete.value.id;
    deleting.value = true;

    try {
        // Delete on server
        await surveysApi.delete(surveyId);

        // Remove from local list
        surveys.value = surveys.value.filter((s) => s.id !== surveyId);

        showDeleteDialog.value = false;
        surveyToDelete.value = null;
    } catch (error) {
        console.error("Failed to delete survey:", error);
        // TODO: Show error dialog
    } finally {
        deleting.value = false;
    }
}

function showCopyConfirm(survey: Survey) {
    surveyToCopy.value = survey;
    showCopyDialog.value = true;
}

function cancelCopy() {
    showCopyDialog.value = false;
    surveyToCopy.value = null;
}

async function confirmCopy() {
    if (!surveyToCopy.value) return;

    const surveyId = surveyToCopy.value.id;
    copying.value = true;

    try {
        const response = await surveysApi.copy(surveyId);
        // Navigate to edit the new copy
        router.push({ name: "survey-edit", params: { id: response.survey.id }, query: { linked: "1" } });
    } catch (error) {
        console.error("Failed to copy survey:", error);
        // TODO: Show error dialog
    } finally {
        copying.value = false;
        showCopyDialog.value = false;
        surveyToCopy.value = null;
    }
}

function getCreatorName(survey: Survey): string {
    if (survey.creator_first_name || survey.creator_last_name) {
        return `${survey.creator_first_name || ""} ${survey.creator_last_name || ""}`.trim();
    }
    if (survey.creator_email) {
        return survey.creator_email.split("@")[0];
    }
    return "Unknown";
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
}

onMounted(fetchSurveys);
watch(
    () => sitesStore.currentSite,
    () => {
        cancelExportSelect();
        fetchSurveys();
    }
);
</script>

<style scoped>
.surveys-view {
    background: transparent;
    padding: 0;
}

.stat-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
}

.attention-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
}

.stat-card {
    background: white;
    border: 1px solid #e6e8ee;
    border-radius: 12px;
    padding: 16px 18px 14px;
}

.stat-label,
.attention-kicker {
    margin: 0;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #8b919c;
}

.stat-value {
    margin: 8px 0 4px;
    font-size: 30px;
    line-height: 1.1;
    font-weight: 650;
    color: #1a1d23;
    font-variant-numeric: tabular-nums;
}

.stat-value.stat-low {
    color: #b23a33;
}

.stat-note,
.attention-body {
    margin: 0;
    font-size: 13px;
    line-height: 1.45;
    color: #6b7280;
}

.attention {
    margin-top: 22px;
}

.attention-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
    margin-bottom: 12px;
}

.attention-head h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 650;
    color: #1a1d23;
}

.attention-head p {
    margin: 0;
    font-size: 13px;
    color: #8b919c;
}

.attention-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 168px;
    padding: 16px 16px 14px;
    border-radius: 12px;
    border: 1px solid transparent;
}

.attention-card.caution {
    background: #fdf7ee;
    border-color: #f0d9b5;
}

.attention-card.problem {
    background: #fdf3f2;
    border-color: #f1c9c5;
}

.attention-card h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 650;
    color: #1a1d23;
}

.attention-card .attention-kicker {
    color: #8a5a12;
}

.attention-card.problem .attention-kicker {
    color: #a1342d;
}

.attention-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: auto;
    padding-top: 8px;
}

.attention-btn {
    height: 40px;
    padding: 0 14px;
    background: white;
    border: 1px solid #e2d8c8;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    color: #3d4450;
    cursor: pointer;
}

.attention-btn:hover {
    background: #fff;
    border-color: #c8bfb0;
}

.see-all {
    margin-top: 10px;
    padding: 0;
    background: none;
    border: none;
    color: #667eea;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
}

.attention-card.problem .attention-btn {
    border-color: #f0d0d0;
}

.attention-btn:disabled {
    opacity: 1;
}

.header-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
}

.header-section h2 {
    margin: 0;
    font-size: 24px;
    color: #333;
}

.header-controls {
    display: flex;
    gap: 16px;
    align-items: center;
}

.filter-toggle {
    display: flex;
    gap: 0;
    background: #f0f0f0;
    border-radius: 8px;
    padding: 4px;
}

.filter-btn {
    padding: 8px 16px;
    background: transparent;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    color: #666;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
}

.filter-btn:hover {
    color: #333;
}

.filter-btn.active {
    background: white;
    color: #667eea;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.btn-primary {
    padding: 10px 20px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
}

.btn-primary:hover {
    background: #5568d3;
}

.btn-secondary {
    padding: 10px 20px;
    background: white;
    color: #4a5568;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-secondary:hover:not(:disabled) {
    background: #f7fafc;
    border-color: #cbd5e0;
    color: #2d3748;
}

.btn-secondary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.btn-export-selected {
    padding: 10px 20px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
    min-width: 160px;
}

.btn-export-selected:hover:not(:disabled) {
    background: #5568d3;
}

.btn-export-selected:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.export-error {
    margin: 0 0 16px 0;
    padding: 10px 14px;
    background: #fff5f5;
    border: 1px solid #feb2b2;
    border-radius: 6px;
    color: #c53030;
    font-size: 14px;
}

.checkbox-col {
    width: 40px;
    text-align: center;
}

.checkbox-col input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: #667eea;
}

.row-selectable {
    cursor: pointer;
}

.row-selected td {
    background: #f7faff;
}

.tabs-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid #e1e4e8;
    margin: 22px 0 8px;
}

.tabs {
    display: flex;
    gap: 8px;
    margin: 0;
    border-bottom: none;
    min-width: 0;
    overflow-x: auto;
}

.test-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 10px;
    font-size: 13px;
    color: #6b7280;
    white-space: nowrap;
}

.test-tag {
    display: inline-block;
    margin-left: 8px;
    padding: 2px 6px;
    border-radius: 4px;
    background: #eef0f3;
    color: #6b7280;
    font-size: 11px;
    font-weight: 600;
    vertical-align: middle;
}

.flag {
    margin-right: 6px;
    color: #c45050;
    font-size: 12px;
}

.table-wrap {
    overflow-x: auto;
}

.status-cell {
    display: flex;
    align-items: center;
    gap: 10px;
}

.status-text {
    font-size: 13px;
    font-weight: 500;
    color: #8b919c;
    white-space: nowrap;
}

.status-text.live {
    color: #1f8a4c;
}

.rate {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-variant-numeric: tabular-nums;
    color: #1a1d23;
}

.rate.low {
    color: #b23a33;
}

.rate.high {
    color: #2a6b3f;
}

.rate-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #b7bdc7;
}

.rate.low .rate-dot {
    background: #e05353;
}

.rate.high .rate-dot {
    background: #3aa76d;
}

.rate-empty {
    color: #a0a6b0;
}

.rate-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin: 14px 0 0;
    font-size: 12px;
    color: #6b7280;
}

.legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.legend-item::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #b7bdc7;
}

.legend-item.low::before {
    background: #e05353;
}

.legend-item.high::before {
    background: #3aa76d;
}

@media (max-width: 1100px) {
    .stat-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .tabs-row {
        flex-direction: column;
        align-items: stretch;
    }
}

@media (max-width: 680px) {
    .stat-grid,
    .attention-head {
        grid-template-columns: 1fr;
        display: grid;
    }

    .attention-head {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
    }
}

.tab {
    padding: 12px 16px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    font-size: 14px;
    font-weight: 500;
    color: #666;
    cursor: pointer;
    transition: all 0.2s;
}

.tab:hover {
    color: #333;
}

.tab.active {
    color: #667eea;
    border-bottom-color: #667eea;
}

.loading {
    text-align: center;
    padding: 48px;
    color: #666;
}

.empty-state {
    text-align: center;
    padding: 48px;
}

.empty-state p {
    margin: 0 0 16px 0;
    color: #666;
    font-size: 16px;
}

.surveys-table {
    width: 100%;
    border-collapse: collapse;
}

.surveys-table th {
    text-align: left;
    padding: 12px;
    border-bottom: 2px solid #e1e4e8;
    font-size: 12px;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
}

.surveys-table td {
    padding: 16px 12px;
    border-bottom: 1px solid #e1e4e8;
    font-size: 14px;
    color: #333;
}

.survey-name {
    font-weight: 500;
    color: #667eea;
}

.survey-name.clickable {
    cursor: pointer;
}

.survey-name.clickable:hover {
    text-decoration: underline;
}

.metric-value {
    font-weight: 600;
    color: #333;
    cursor: help;
}

.badge {
    display: inline-block;
    padding: 4px 8px;
    background: #f0f0f0;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    text-transform: capitalize;
}

.actions-panel {
    display: flex;
    gap: 6px;
    align-items: center;
}

.action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: #f7fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    color: #4a5568;
    cursor: pointer;
    transition: all 0.2s ease;
}

.action-btn:hover {
    background: #edf2f7;
    border-color: #cbd5e0;
    color: #667eea;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-btn:active {
    transform: translateY(0);
}

.action-btn-danger {
    color: #e53e3e;
}

.action-btn-danger:hover {
    background: #fff5f5;
    border-color: #feb2b2;
    color: #c53030;
}

.toggle-label {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    user-select: none;
}

.toggle-switch {
    position: relative;
    width: 44px;
    height: 24px;
    background: #ddd;
    border-radius: 12px;
    transition: background 0.3s;
}

.toggle-switch.active {
    background: #667eea;
}

.toggle-input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    pointer-events: none;
}

.toggle-slider {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    transition: transform 0.3s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-switch.active .toggle-slider {
    transform: translateX(20px);
}

/* Dialog styles */
.dialog-header-content {
    display: flex;
    align-items: center;
    gap: 16px;
}

.dialog-header-content h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
}

.dialog-icon {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.confirm-icon-circle {
    background: linear-gradient(135deg, #e3e8ef 0%, #d6dce5 100%);
    color: #495057;
}

.delete-icon-circle {
    background: linear-gradient(135deg, #fee 0%, #fdd 100%);
    color: #c53030;
}

.dialog-body {
    padding: 8px 0;
}

.dialog-body p {
    margin: 0 0 12px 0;
    font-size: 15px;
    color: #4a5568;
    line-height: 1.6;
}

.dialog-body p:last-child {
    margin-bottom: 0;
}

.dialog-hint {
    font-size: 14px;
    color: #718096;
}

.warning-text {
    color: #c53030 !important;
    font-weight: 500;
}

.dialog-footer {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
}

.btn-dialog-primary {
    padding: 10px 24px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.25);
}

.btn-dialog-primary:hover {
    background: #5568d3;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.35);
}

.btn-dialog-secondary {
    padding: 10px 20px;
    background: white;
    color: #4a5568;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-dialog-secondary:hover {
    background: #f7fafc;
    border-color: #cbd5e0;
    color: #2d3748;
}

.btn-dialog-danger {
    padding: 10px 24px;
    background: #e53e3e;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(229, 62, 62, 0.25);
}

.btn-dialog-danger:hover:not(:disabled) {
    background: #c53030;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(229, 62, 62, 0.35);
}

.btn-dialog-danger:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}
</style>
