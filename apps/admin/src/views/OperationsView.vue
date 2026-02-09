<template>
  <div class="operations-view">
    <div class="header-section">
      <h2>Operations</h2>
      <p class="subtitle">Worker activity and responses (read-only)</p>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        :class="['tab', { active: activeTab === 'activity' }]"
        @click="activeTab = 'activity'"
      >
        Worker activity
      </button>
      <button
        :class="['tab', { active: activeTab === 'responses' }]"
        @click="switchToTab('responses')"
      >
        Responses
      </button>
    </div>

    <!-- Tab 1: Worker activity -->
    <div v-show="activeTab === 'activity'" class="tab-panel">
      <div class="health-cards">
        <div class="health-card">
          <span class="health-label">Last ingestion success</span>
          <span class="health-value">{{ health.last_ingestion_success ? formatIso(health.last_ingestion_success) : '—' }}</span>
        </div>
      </div>
      <div class="filters">
        <div class="filter-group">
          <label>Service</label>
          <select v-model="filters.service" @change="loadActivity">
            <option value="">All</option>
            <option value="worker-ingestion">worker-ingestion</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Status</label>
          <select v-model="filters.status" @change="loadActivity">
            <option value="">All</option>
            <option value="started">started</option>
            <option value="success">success</option>
            <option value="failed">failed</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Site</label>
          <select v-model="filters.site_id" @change="loadActivity">
            <option value="">All</option>
            <option v-for="site in sitesStore.sites" :key="site.id" :value="site.id">{{ site.name }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>From date</label>
          <input type="date" v-model="filters.from_date" @change="loadActivity" />
        </div>
        <div class="filter-group">
          <label>To date</label>
          <input type="date" v-model="filters.to_date" @change="loadActivity" />
        </div>
        <button class="btn-secondary" @click="loadActivity" :disabled="loadingActivity">Refresh</button>
      </div>
      <div v-if="loadingActivity" class="loading">Loading activity...</div>
      <div v-else class="table-wrap">
        <table class="operations-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Service</th>
              <th>Job</th>
              <th>Site</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Counts</th>
              <th>Watermark</th>
              <th>Error</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id">
              <td>{{ formatIso(log.created_at) }}</td>
              <td><span class="badge service">{{ log.service }}</span></td>
              <td>{{ log.job_name }}</td>
              <td>{{ getSiteName(log.site_id) }}</td>
              <td><span :class="['badge', 'status', log.status]">{{ log.status }}</span></td>
              <td>{{ log.duration_ms != null ? `${log.duration_ms} ms` : '—' }}</td>
              <td>{{ log.items_in != null && log.items_out != null ? `${log.items_in} → ${log.items_out}` : '—' }}</td>
              <td>—</td>
              <td class="error-cell">{{ log.error_message ? truncate(log.error_message, 40) : '—' }}</td>
              <td>
                <button class="btn-text" @click="openDetail(log)">Details</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="logs.length === 0" class="empty">No activity logs match the filters.</p>
      </div>
    </div>

    <!-- Tab 2: Responses -->
    <div v-show="activeTab === 'responses'" class="tab-panel">
      <div class="filters">
        <div class="filter-group">
          <label>Site</label>
          <select v-model="responsesFilters.site_id" @change="loadResponses">
            <option value="">All</option>
            <option v-for="site in sitesStore.sites" :key="site.id" :value="site.id">{{ site.name }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Survey</label>
          <select v-model="responsesFilters.survey_id" @change="loadResponses">
            <option value="">All</option>
            <option v-for="s in surveysForResponses" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <button class="btn-secondary" @click="loadResponses" :disabled="loadingResponses">Refresh</button>
      </div>
      <div v-if="loadingResponses" class="loading">Loading responses...</div>
      <div v-else class="table-wrap">
        <table class="operations-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Time</th>
              <th>Site</th>
              <th>Survey</th>
              <th>Browser</th>
              <th>OS</th>
              <th>IP</th>
              <th>Country</th>
              <th>Page URL</th>
              <th>Option / Text</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in responses" :key="r.id">
              <td>{{ r.id }}</td>
              <td>{{ formatIso(r.timestamp) }}</td>
              <td>{{ getSiteName(r.site_id) }}</td>
              <td>{{ r.survey_id.slice(0, 8) }}…</td>
              <td>{{ r.browser || '—' }}</td>
              <td>{{ r.os || '—' }}</td>
              <td class="mono">{{ r.ip || '—' }}</td>
              <td>{{ r.country || '—' }}</td>
              <td class="page-url-cell" :title="r.page_url || ''">{{ r.page_url ? truncate(r.page_url, 50) : '—' }}</td>
              <td>{{ r.answer_option_id ? r.answer_option_id.slice(0, 8) + '…' : (r.answer_text || '—') }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="responses.length === 0" class="empty">No responses match the filters.</p>
      </div>
    </div>

    <!-- Activity log detail modal -->
    <Dialog
      v-model:visible="detailVisible"
      modal
      :closable="true"
      :style="{ width: '32rem' }"
      header="Activity log details"
    >
      <div v-if="selectedLog" class="detail-body">
        <p><strong>Status:</strong> {{ selectedLog.status }}</p>
        <p><strong>Service:</strong> {{ selectedLog.service }} · {{ selectedLog.job_name }}</p>
        <p><strong>Duration:</strong> {{ selectedLog.duration_ms != null ? `${selectedLog.duration_ms} ms` : '—' }}</p>
        <p><strong>Counts:</strong> {{ selectedLog.items_in }} in → {{ selectedLog.items_out }} out</p>
        <p v-if="selectedLog.error_message"><strong>Error:</strong> {{ selectedLog.error_message }}</p>
        <div v-if="selectedLog.meta && Object.keys(selectedLog.meta).length" class="meta-block">
          <strong>Meta</strong>
          <pre>{{ JSON.stringify(selectedLog.meta, null, 2) }}</pre>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { operationsApi, surveysApi, type WorkerActivityLog, type OperationsResponse } from '../services/api';
import { useSitesStore } from '../stores/sites';
import type { Survey } from '../types';

const sitesStore = useSitesStore();
const activeTab = ref<'activity' | 'responses'>('activity');

// Worker activity
const loadingActivity = ref(false);
const logs = ref<WorkerActivityLog[]>([]);
const health = reactive<{ last_ingestion_success: string | null }>({
  last_ingestion_success: null,
});
const filters = reactive({
  service: '',
  status: '',
  site_id: '',
  from_date: '',
  to_date: '',
});
const detailVisible = ref(false);
const selectedLog = ref<WorkerActivityLog | null>(null);

// Responses
const loadingResponses = ref(false);
const responses = ref<OperationsResponse[]>([]);
const responsesFilters = reactive({ site_id: '', survey_id: '' });
const surveysList = ref<Survey[]>([]);

const surveysForResponses = computed(() => surveysList.value);

function formatIso(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString();
}

function truncate(s: string, len: number): string {
  if (s.length <= len) return s;
  return s.slice(0, len) + '…';
}

function getSiteName(siteId: string | null): string {
  if (!siteId) return '—';
  const site = sitesStore.sites.find((s) => s.id === siteId);
  return site?.name ?? siteId.slice(0, 8) + '…';
}

function openDetail(log: WorkerActivityLog): void {
  selectedLog.value = log;
  detailVisible.value = true;
}

function switchToTab(tab: 'responses'): void {
  activeTab.value = tab;
  if (tab === 'responses' && responses.value.length === 0) loadResponses();
}

async function loadActivity(): Promise<void> {
  loadingActivity.value = true;
  try {
    const params: Record<string, string | number | undefined> = {};
    if (filters.service) params.service = filters.service;
    if (filters.status) params.status = filters.status;
    if (filters.site_id) params.site_id = filters.site_id;
    if (filters.from_date) params.from_date = filters.from_date;
    if (filters.to_date) params.to_date = filters.to_date;
    params.limit = 100;
    const res = await operationsApi.getActivity(params);
    logs.value = res.logs;
  } catch (e) {
    console.error('Failed to load activity', e);
    logs.value = [];
  } finally {
    loadingActivity.value = false;
  }
}

async function loadHealth(): Promise<void> {
  try {
    const res = await operationsApi.getHealth();
    health.last_ingestion_success = res.last_ingestion_success;
  } catch (e) {
    console.error('Failed to load health', e);
  }
}

async function loadResponses(): Promise<void> {
  loadingResponses.value = true;
  try {
    const params: Record<string, string | number | undefined> = { limit: 100 };
    if (responsesFilters.site_id) params.site_id = responsesFilters.site_id;
    if (responsesFilters.survey_id) params.survey_id = responsesFilters.survey_id;
    const res = await operationsApi.getResponses(params);
    responses.value = res.responses;
  } catch (e) {
    console.error('Failed to load responses', e);
    responses.value = [];
  } finally {
    loadingResponses.value = false;
  }
}

onMounted(async () => {
  await sitesStore.fetchSites();
  const { surveys } = await surveysApi.getAll().catch(() => ({ surveys: [] }));
  surveysList.value = surveys;
  await loadHealth();
  await loadActivity();
});
</script>

<style scoped>
.operations-view {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}
.header-section {
  margin-bottom: 1rem;
}
.header-section h2 {
  margin: 0 0 0.25rem 0;
  font-size: 1.5rem;
}
.subtitle {
  margin: 0;
  color: var(--p-text-muted-color);
  font-size: 0.9rem;
}
.tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid var(--p-surface-border);
}
.tab {
  padding: 0.6rem 1rem;
  border: none;
  background: none;
  font-size: 0.95rem;
  cursor: pointer;
  color: var(--p-text-muted-color);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.tab:hover {
  color: var(--p-text-color);
}
.tab.active {
  color: var(--p-primary-color);
  font-weight: 600;
  border-bottom-color: var(--p-primary-color);
}
.tab-panel {
  min-height: 200px;
}
.health-cards {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.health-card {
  background: var(--p-surface-100);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.health-label {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}
.health-value {
  font-size: 0.95rem;
  font-weight: 500;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1rem;
}
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.filter-group label {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}
.filter-group select,
.filter-group input {
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--p-input-border-color);
  min-width: 140px;
}
.btn-secondary {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--p-primary-color);
  background: transparent;
  color: var(--p-primary-color);
  cursor: pointer;
}
.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.loading {
  padding: 2rem;
  text-align: center;
  color: var(--p-text-muted-color);
}
.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--p-surface-border);
  border-radius: 8px;
}
.operations-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.operations-table th,
.operations-table td {
  padding: 0.6rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--p-surface-border);
}
.operations-table th {
  background: var(--p-surface-100);
  font-weight: 600;
}
.operations-table tr:hover {
  background: var(--p-surface-50);
}
.error-cell {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mono {
  font-family: ui-monospace, monospace;
  font-size: 0.85rem;
}
.page-url-cell {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.badge {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}
.badge.service {
  background: var(--p-surface-200);
}
.badge.event-type {
  background: var(--p-surface-200);
}
.badge.status.started {
  background: #e3f2fd;
  color: #1565c0;
}
.badge.status.success {
  background: #e8f5e9;
  color: #2e7d32;
}
.badge.status.failed {
  background: #ffebee;
  color: #c62828;
}
.btn-text {
  background: none;
  border: none;
  color: var(--p-primary-color);
  cursor: pointer;
  font-size: 0.85rem;
}
.empty {
  padding: 1.5rem;
  text-align: center;
  color: var(--p-text-muted-color);
}
.detail-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.detail-body p {
  margin: 0;
}
.meta-block {
  margin-top: 0.5rem;
}
.meta-block pre {
  margin: 0.25rem 0 0 0;
  padding: 0.75rem;
  background: var(--p-surface-100);
  border-radius: 6px;
  font-size: 0.8rem;
  overflow-x: auto;
}
</style>
