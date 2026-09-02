<template>
    <div class="api-keys-view">
        <div class="header-section">
            <div>
                <h2>API Keys</h2>
                <p class="subtitle">
                    Use API keys to access survey data from external services via
                    <code>/api/v1/</code>
                </p>
            </div>
            <button @click="showCreateModal = true" class="btn-primary">Create API Key</button>
        </div>

        <div v-if="loading" class="loading">Loading API keys...</div>

        <div v-else-if="keys.length === 0" class="empty-state">
            <div class="empty-icon">🔑</div>
            <p>No API keys yet</p>
            <p class="empty-hint">Create a key to integrate your surveys with external tools.</p>
            <button @click="showCreateModal = true" class="btn-primary">Create Your First Key</button>
        </div>

        <table v-else class="keys-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Key</th>
                    <th>Scopes</th>
                    <th>Last Used</th>
                    <th>Expires</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="key in keys" :key="key.id" :class="{ revoked: !!key.revoked_at }">
                    <td class="key-name">{{ key.name }}</td>
                    <td>
                        <code class="key-prefix">{{ key.key_prefix }}...</code>
                    </td>
                    <td>
                        <div class="scopes">
                            <span v-for="scope in key.scopes" :key="scope" class="scope-badge">{{ scope }}</span>
                        </div>
                    </td>
                    <td class="text-muted">{{ key.last_used_at ? formatDate(key.last_used_at) : 'Never' }}</td>
                    <td class="text-muted">{{ key.expires_at ? formatDate(key.expires_at) : 'Never' }}</td>
                    <td>
                        <span :class="['status-badge', key.revoked_at ? 'revoked' : 'active']">
                            {{ key.revoked_at ? 'Revoked' : 'Active' }}
                        </span>
                    </td>
                    <td class="text-muted">{{ formatDate(key.created_at) }}</td>
                    <td>
                        <button
                            v-if="!key.revoked_at"
                            @click="confirmRevoke(key)"
                            class="btn-text text-danger"
                            :disabled="revoking === key.id"
                        >
                            {{ revoking === key.id ? 'Revoking…' : 'Revoke' }}
                        </button>
                        <span v-else class="text-muted">—</span>
                    </td>
                </tr>
            </tbody>
        </table>

        <!-- Docs callout -->
        <div class="docs-callout">
            <strong>How to use:</strong>
            Add the header <code>Authorization: Bearer &lt;your-key&gt;</code> to requests to
            <code>{{ apiBaseUrl }}/api/v1/</code>
        </div>

        <!-- ── Create Key Modal ──────────────────────────────────────────── -->
        <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
            <div class="modal-content">
                <h3>Create API Key</h3>

                <form @submit.prevent="handleCreate" class="form">
                    <div class="form-group">
                        <label for="key-name">Key Name *</label>
                        <input
                            id="key-name"
                            v-model="createForm.name"
                            type="text"
                            placeholder="e.g. Zapier integration"
                            required
                            autofocus
                        />
                        <span class="help-text">A label to identify this key in the list.</span>
                    </div>

                    <div class="form-group">
                        <label>Scopes *</label>
                        <div class="scopes-checkboxes">
                            <label
                                v-for="scope in availableScopes"
                                :key="scope.value"
                                class="checkbox-label"
                            >
                                <input type="checkbox" v-model="createForm.scopes" :value="scope.value" />
                                <div>
                                    <strong>{{ scope.value }}</strong>
                                    <span class="help-text">{{ scope.description }}</span>
                                </div>
                            </label>
                        </div>
                        <span v-if="createForm.scopes.length === 0" class="error-hint">
                            Select at least one scope.
                        </span>
                    </div>

                    <div class="form-group">
                        <label for="expires">Expires In (optional)</label>
                        <select id="expires" v-model="createForm.expires_in_days">
                            <option :value="undefined">No expiry</option>
                            <option :value="30">30 days</option>
                            <option :value="90">90 days</option>
                            <option :value="365">1 year</option>
                        </select>
                    </div>

                    <div v-if="createError" class="error-message">{{ createError }}</div>

                    <div class="modal-actions">
                        <button type="button" @click="closeCreateModal" class="btn-secondary">Cancel</button>
                        <button
                            type="submit"
                            class="btn-primary"
                            :disabled="creating || createForm.scopes.length === 0"
                        >
                            {{ creating ? 'Creating…' : 'Create Key' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- ── New Key Display Modal (shown once after creation) ─────────── -->
        <div v-if="newKey" class="modal-overlay" @click.self="newKey = null">
            <div class="modal-content">
                <h3>✅ API Key Created</h3>

                <div class="success-content">
                    <div class="warning-box">
                        ⚠️ <strong>Copy this key now.</strong> It will not be shown again.
                    </div>

                    <div class="key-display-group">
                        <label>Your API Key</label>
                        <div class="key-display">
                            <code>{{ newKey.key }}</code>
                            <button @click="copyKey(newKey.key!)" class="btn-copy">
                                {{ copied ? '✓ Copied' : 'Copy' }}
                            </button>
                        </div>
                    </div>

                    <div class="info-box">
                        <strong>Usage:</strong><br />
                        <code>Authorization: Bearer {{ newKey.key }}</code>
                    </div>

                    <div class="scopes">
                        <strong>Scopes:</strong>
                        <span v-for="scope in newKey.scopes" :key="scope" class="scope-badge">{{ scope }}</span>
                    </div>
                </div>

                <button @click="newKey = null" class="btn-primary" style="margin-top: 24px; width: 100%">
                    I've saved the key — Close
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { apiKeysApi, type ApiKey } from '../services/api';

const apiBaseUrl = computed(() => import.meta.env.VITE_API_BASE_URL || window.location.origin);

const keys = ref<ApiKey[]>([]);
const loading = ref(false);
const revoking = ref<string | null>(null);
const showCreateModal = ref(false);
const creating = ref(false);
const createError = ref<string | null>(null);
const newKey = ref<ApiKey | null>(null);
const copied = ref(false);

const availableScopes = [
    { value: 'sites:read', description: 'List your sites' },
    { value: 'surveys:read', description: 'Read surveys and their questions' },
    { value: 'responses:read', description: 'Read survey responses and summaries' },
];

const createForm = ref({
    name: '',
    scopes: [] as string[],
    expires_in_days: undefined as number | undefined,
});

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function closeCreateModal() {
    showCreateModal.value = false;
    createError.value = null;
    createForm.value = { name: '', scopes: [], expires_in_days: undefined };
}

async function copyKey(key: string) {
    try {
        await navigator.clipboard.writeText(key);
        copied.value = true;
        setTimeout(() => (copied.value = false), 2500);
    } catch {
        alert('Could not copy. Please select and copy the key manually.');
    }
}

async function handleCreate() {
    if (createForm.value.scopes.length === 0) return;
    creating.value = true;
    createError.value = null;

    try {
        const { api_key } = await apiKeysApi.create({
            name: createForm.value.name,
            scopes: createForm.value.scopes,
            expires_in_days: createForm.value.expires_in_days,
        });

        newKey.value = api_key;
        closeCreateModal();
        await fetchKeys();
    } catch (err: any) {
        createError.value = err.response?.data?.error || 'Failed to create API key';
    } finally {
        creating.value = false;
    }
}

async function confirmRevoke(key: ApiKey) {
    if (!confirm(`Revoke key "${key.name}"?\n\nAny service using this key will immediately lose access.`)) {
        return;
    }

    revoking.value = key.id;
    try {
        await apiKeysApi.revoke(key.id);
        await fetchKeys();
    } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to revoke key');
    } finally {
        revoking.value = null;
    }
}

async function fetchKeys() {
    loading.value = true;
    try {
        const { api_keys } = await apiKeysApi.list();
        keys.value = api_keys;
    } catch (err) {
        console.error('Failed to load API keys:', err);
    } finally {
        loading.value = false;
    }
}

onMounted(fetchKeys);
</script>

<style scoped>
.api-keys-view {
    background: white;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
}

.header-section h2 {
    margin: 0 0 4px 0;
    font-size: 24px;
    color: #333;
}

.subtitle {
    margin: 0;
    font-size: 14px;
    color: #666;
}

.subtitle code {
    background: #f0f0f0;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 13px;
}

.loading,
.empty-state {
    text-align: center;
    padding: 48px;
    color: #666;
}

.empty-icon {
    font-size: 40px;
    margin-bottom: 12px;
}

.empty-hint {
    font-size: 13px;
    color: #999;
    margin-bottom: 20px;
}

/* ── Table ─────────────────────────────────────────────────────────────────── */
.keys-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
}

.keys-table th {
    text-align: left;
    padding: 12px;
    border-bottom: 2px solid #e1e4e8;
    font-size: 12px;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
}

.keys-table td {
    padding: 14px 12px;
    border-bottom: 1px solid #e1e4e8;
    font-size: 14px;
    color: #333;
    vertical-align: middle;
}

.keys-table tr.revoked td {
    opacity: 0.55;
}

.key-name {
    font-weight: 500;
}

.key-prefix {
    font-family: monospace;
    font-size: 12px;
    background: #f5f5f5;
    padding: 3px 8px;
    border-radius: 4px;
    color: #555;
}

.scopes {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
}

.scope-badge {
    display: inline-block;
    padding: 3px 10px;
    background: #eef2ff;
    color: #4338ca;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
}

.status-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
}

.status-badge.active {
    background: #d4edda;
    color: #155724;
}

.status-badge.revoked {
    background: #f8d7da;
    color: #721c24;
}

.text-muted {
    color: #999;
    font-size: 13px;
}

/* ── Docs callout ───────────────────────────────────────────────────────────── */
.docs-callout {
    padding: 14px 16px;
    background: #f0f7ff;
    border: 1px solid #bdd7f8;
    border-radius: 8px;
    font-size: 13px;
    color: #1a4a7a;
    line-height: 1.6;
    margin-top: 8px;
}

.docs-callout code {
    background: #daeeff;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 12px;
}

/* ── Buttons ────────────────────────────────────────────────────────────────── */
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

.btn-primary:hover:not(:disabled) {
    background: #5568d3;
}

.btn-primary:disabled {
    background: #ccc;
    cursor: not-allowed;
}

.btn-secondary {
    padding: 10px 20px;
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
}

.btn-secondary:hover {
    background: #e5e5e5;
}

.btn-text {
    background: none;
    border: none;
    font-size: 14px;
    cursor: pointer;
    padding: 4px 8px;
}

.btn-text.text-danger {
    color: #d73a49;
}

.btn-text:hover {
    text-decoration: underline;
}

.btn-text:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    text-decoration: none;
}

/* ── Modals ─────────────────────────────────────────────────────────────────── */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    border-radius: 12px;
    padding: 32px;
    width: 100%;
    max-width: 520px;
    max-height: 90vh;
    overflow-y: auto;
}

.modal-content h3 {
    margin: 0 0 24px 0;
    font-size: 22px;
    color: #333;
}

/* ── Form ────────────────────────────────────────────────────────────────────── */
.form {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.form-group label:not(.checkbox-label) {
    font-size: 14px;
    font-weight: 500;
    color: #333;
}

.form-group input[type='text'],
.form-group select {
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
}

.form-group input:focus,
.form-group select:focus {
    outline: none;
    border-color: #667eea;
}

.help-text {
    font-size: 12px;
    color: #888;
}

.error-hint {
    font-size: 12px;
    color: #d73a49;
}

.scopes-checkboxes {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    cursor: pointer;
    font-size: 14px;
    color: #333;
}

.checkbox-label input[type='checkbox'] {
    margin-top: 3px;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    cursor: pointer;
}

.modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
}

.error-message {
    padding: 12px;
    background: #fee;
    border: 1px solid #fcc;
    border-radius: 6px;
    color: #c33;
    font-size: 14px;
}

/* ── New key display ─────────────────────────────────────────────────────────── */
.success-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.warning-box {
    padding: 12px 16px;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 6px;
    color: #856404;
    font-size: 14px;
    line-height: 1.5;
}

.key-display-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.key-display-group label {
    font-size: 13px;
    font-weight: 600;
    color: #555;
}

.key-display {
    display: flex;
    align-items: center;
    gap: 10px;
}

.key-display code {
    flex: 1;
    padding: 12px;
    background: #f5f5f5;
    border: 2px solid #667eea;
    border-radius: 6px;
    font-family: monospace;
    font-size: 13px;
    font-weight: 600;
    color: #333;
    word-break: break-all;
}

.btn-copy {
    padding: 8px 16px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    font-weight: 500;
    white-space: nowrap;
    flex-shrink: 0;
}

.btn-copy:hover {
    background: #5568d3;
}

.info-box {
    padding: 12px 16px;
    background: #e7f3ff;
    border: 1px solid #b3d9ff;
    border-radius: 6px;
    color: #004085;
    font-size: 13px;
    line-height: 1.7;
}

.info-box code {
    display: block;
    margin-top: 6px;
    font-size: 12px;
    word-break: break-all;
}
</style>
