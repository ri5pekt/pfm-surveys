<template>
    <div class="surveys-view">
        <div class="header-section">
            <h2>Surveys</h2>
            <div class="header-controls">
                <div class="filter-toggle">
                    <button :class="['filter-btn', { active: showMyOnly }]" @click="showMyOnly = true">
                        My Surveys
                    </button>
                    <button :class="['filter-btn', { active: !showMyOnly }]" @click="showMyOnly = false">
                        All Surveys
                    </button>
                </div>
                <button @click="createSurvey" class="btn-primary">Create Survey</button>
            </div>
        </div>

        <div class="tabs">
            <button :class="['tab', { active: activeTab === 'all' }]" @click="activeTab = 'all'">
                All ({{ filteredSurveys.length }})
            </button>
            <button :class="['tab', { active: activeTab === 'active' }]" @click="activeTab = 'active'">
                Active ({{ activeSurveys.length }})
            </button>
            <button :class="['tab', { active: activeTab === 'inactive' }]" @click="activeTab = 'inactive'">
                Inactive ({{ inactiveSurveys.length }})
            </button>
        </div>

        <div v-if="loading" class="loading">Loading surveys...</div>

        <div v-else-if="currentSurveys.length === 0" class="empty-state">
            <p>No {{ activeTab }} surveys yet</p>
            <button @click="createSurvey" class="btn-primary">Create Your First Survey</button>
        </div>

        <table v-else class="surveys-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Impressions</th>
                    <th>Responses</th>
                    <th>Created By</th>
                    <th>Date Created</th>
                    <th>Type</th>
                    <th>Actions</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="survey in currentSurveys" :key="survey.id">
                    <td class="survey-name" @click="viewResults(survey.id)">{{ survey.name }}</td>
                    <td>
                        <span class="metric-value" :title="`Survey was shown ${survey.impressions || 0} time(s)`">
                            {{ survey.impressions || 0 }}
                        </span>
                    </td>
                    <td>{{ survey.responses || 0 }}</td>
                    <td>{{ getCreatorName(survey) }}</td>
                    <td>{{ formatDate(survey.created_at) }}</td>
                    <td>
                        <span class="badge">{{ survey.type }}</span>
                    </td>
                    <td>
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
                    <td>
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
                    </td>
                </tr>
            </tbody>
        </table>

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
                    Are you sure you want to {{ confirmAction === "activate" ? "activate" : "deactivate" }}
                    <strong>"{{ pendingSurvey?.name }}"</strong>?
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
                        {{ confirmAction === "activate" ? "Activate" : "Deactivate" }}
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
import type { Survey } from "../types";

const router = useRouter();

const sitesStore = useSitesStore();
const authStore = useAuthStore();

const surveys = ref<Survey[]>([]);
const loading = ref(false);
const activeTab = ref<"all" | "active" | "inactive">("all");
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

// Watch and persist showMyOnly preference
watch(showMyOnly, (value) => {
    localStorage.setItem("pfm_showMySurveys", value.toString());
});

const filteredSurveys = computed(() => {
    if (!showMyOnly.value) return surveys.value;
    return surveys.value.filter((s) => s.created_by === authStore.user?.id);
});

const activeSurveys = computed(() => filteredSurveys.value.filter((s) => s.active));
const inactiveSurveys = computed(() => filteredSurveys.value.filter((s) => !s.active));
const currentSurveys = computed(() => {
    if (activeTab.value === "all") return filteredSurveys.value;
    if (activeTab.value === "active") return activeSurveys.value;
    return inactiveSurveys.value;
});

async function fetchSurveys() {
    if (!sitesStore.currentSite) return;

    loading.value = true;
    try {
        const response = await surveysApi.getAll({ site_id: sitesStore.currentSite.id });
        surveys.value = response.surveys;
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
    showConfirmDialog.value = true;
}

function cancelToggle() {
    showConfirmDialog.value = false;
    pendingSurvey.value = null;
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

        showConfirmDialog.value = false;
        pendingSurvey.value = null;
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
        router.push({ name: "survey-edit", params: { id: response.survey.id } });
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
watch(() => sitesStore.currentSite, fetchSurveys);
</script>

<style scoped>
.surveys-view {
    background: white;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

.tabs {
    display: flex;
    gap: 8px;
    border-bottom: 1px solid #e1e4e8;
    margin-bottom: 24px;
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
    cursor: pointer;
}

.survey-name:hover {
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
