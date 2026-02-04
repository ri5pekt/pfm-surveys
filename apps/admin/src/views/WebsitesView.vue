<template>
    <div class="websites-view">
        <div class="header-section">
            <h2>Websites</h2>
            <button @click="showAddModal = true" class="btn-primary">Add Website</button>
        </div>

        <div v-if="loading" class="loading">Loading websites...</div>

        <div v-else-if="sitesStore.sites.length === 0" class="empty-state">
            <p>No websites yet</p>
            <button @click="showAddModal = true" class="btn-primary">Add Your First Website</button>
        </div>

        <table v-else class="websites-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Site ID</th>
                    <th>Domains</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="site in sitesStore.sites" :key="site.id">
                    <td class="site-name">{{ site.name }}</td>
                    <td>
                        <code class="site-id">{{ site.site_id }}</code>
                    </td>
                    <td>
                        <span v-if="site.allow_any_domain" class="text-warning">🔓 Any domain (insecure)</span>
                        <span v-else-if="!site.domains || site.domains.length === 0" class="text-danger"
                            >⚠️ No domains (blocked)</span
                        >
                        <div v-else class="domains-list">
                            <span v-for="domain in site.domains" :key="domain" class="domain-tag">{{ domain }}</span>
                        </div>
                    </td>
                    <td>
                        <span :class="['status-badge', site.active ? 'active' : 'inactive']">
                            {{ site.active ? "Active" : "Inactive" }}
                        </span>
                    </td>
                    <td>{{ formatDate(site.created_at) }}</td>
                    <td>
                        <button @click="viewSite(site)" class="btn-text">View Details</button>
                        <button @click="confirmDelete(site)" class="btn-text text-danger">Delete</button>
                    </td>
                </tr>
            </tbody>
        </table>

        <!-- Add/Edit Website Modal -->
        <div v-if="showAddModal" class="modal-overlay" @click="showAddModal = false">
            <div class="modal-content" @click.stop>
                <h3>{{ editingSite ? "Edit Website" : "Add New Website" }}</h3>

                <form @submit.prevent="handleSave" class="form">
                    <div class="form-group">
                        <label for="site-name">Website Name *</label>
                        <input
                            id="site-name"
                            v-model="formData.name"
                            type="text"
                            placeholder="My Awesome Website"
                            required
                        />
                    </div>

                    <div class="form-group">
                        <label>Allowed Domains (Security) *</label>
                        <input
                            v-model="domainInput"
                            type="text"
                            placeholder="example.com or *.example.com"
                            @keydown.enter.prevent="addDomain"
                            :disabled="formData.allowAnyDomain"
                        />
                        <span class="help-text">
                            Only these domains can send survey events. Use *.example.com for subdomains. Press Enter to
                            add.
                        </span>

                        <div v-if="formData.domains.length > 0" class="tags">
                            <span v-for="(domain, index) in formData.domains" :key="index" class="tag">
                                {{ domain }}
                                <button type="button" @click="removeDomain(index)" class="tag-remove">×</button>
                            </span>
                        </div>

                        <label class="checkbox-label">
                            <input type="checkbox" v-model="formData.allowAnyDomain" />
                            <span>🔓 Allow any domain (dev/testing only - INSECURE)</span>
                        </label>

                        <div v-if="formData.allowAnyDomain" class="warning-message">
                            ⚠️ Domain validation disabled. Anyone can send fake responses from any website.
                        </div>
                        <div v-else-if="formData.domains.length === 0" class="info-message">
                            ℹ️ Add at least one domain to protect against unauthorized event submissions.
                        </div>
                    </div>

                    <div v-if="error" class="error-message">{{ error }}</div>

                    <div class="modal-actions">
                        <button type="button" @click="showAddModal = false" class="btn-secondary">Cancel</button>
                        <button type="submit" class="btn-primary">
                            {{ editingSite ? "Update" : "Create" }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- View Site Details Modal -->
        <div v-if="viewingSite" class="modal-overlay" @click="viewingSite = null">
            <div class="modal-content large" @click.stop>
                <h3>{{ viewingSite.name }}</h3>

                <div class="site-details">
                    <!-- Embed Script Section -->
                    <div class="detail-item embed-section">
                        <label>
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                                style="vertical-align: middle; margin-right: 4px"
                            >
                                <path
                                    d="M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8l3.147-3.146zm4.292 0a.5.5 0 0 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8l-3.147-3.146z"
                                />
                            </svg>
                            Embed Script - Add this to your website
                        </label>
                        <div class="embed-instructions">
                            <p>
                                Copy and paste this code before the closing <code>&lt;/body&gt;</code> tag on your
                                website:
                            </p>
                        </div>
                        <div class="embed-code-container">
                            <pre class="embed-code">{{ getEmbedScript(viewingSite.site_id) }}</pre>
                            <button
                                @click="copyToClipboard(getEmbedScript(viewingSite.site_id))"
                                class="btn-copy-embed"
                            >
                                Copy Script
                            </button>
                        </div>
                        <div class="embed-note">
                            <strong>📍 Current API URL:</strong> {{ apiUrl }}<br />
                            <span v-if="apiUrl.includes('ngrok')"
                                >⚠️ This ngrok URL will change when you restart. For production, deploy to a permanent
                                server.</span
                            >
                        </div>
                    </div>

                    <div class="divider"></div>

                    <!-- Site Details -->
                    <div class="detail-item">
                        <label>Site ID:</label>
                        <div class="detail-value">
                            <code>{{ viewingSite.site_id }}</code>
                            <button @click="copyToClipboard(viewingSite.site_id)" class="btn-copy">Copy</button>
                        </div>
                    </div>

                    <div class="detail-item">
                        <label>Site Secret:</label>
                        <div class="detail-value">
                            <code>{{ viewingSite.site_secret }}</code>
                            <button @click="copyToClipboard(viewingSite.site_secret)" class="btn-copy">Copy</button>
                        </div>
                    </div>

                    <div class="detail-item">
                        <label>Allowed Domains:</label>
                        <div class="detail-value">
                            <span v-if="viewingSite.allow_any_domain" class="text-warning"
                                >🔓 Any domain (insecure - dev/testing only)</span
                            >
                            <span
                                v-else-if="!viewingSite.domains || viewingSite.domains.length === 0"
                                class="text-danger"
                                >⚠️ No domains configured (all requests blocked)</span
                            >
                            <span v-else>{{ viewingSite.domains.join(", ") }}</span>
                        </div>
                    </div>

                    <div class="detail-item">
                        <label>Status:</label>
                        <div class="detail-value">
                            <span :class="['status-badge', viewingSite.active ? 'active' : 'inactive']">
                                {{ viewingSite.active ? "Active" : "Inactive" }}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="modal-actions">
                    <button @click="editSiteFromView(viewingSite)" class="btn-secondary">Edit Domains</button>
                    <button @click="viewingSite = null" class="btn-primary">Close</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useSitesStore } from "../stores/sites";
import type { Site } from "../types";

const sitesStore = useSitesStore();

const loading = ref(false);
const showAddModal = ref(false);
const editingSite = ref<Site | null>(null);
const viewingSite = ref<Site | null>(null);
const error = ref<string | null>(null);

const formData = ref({
    name: "",
    domains: [] as string[],
    allowAnyDomain: false,
});

const domainInput = ref("");

// Detect API URL (check for ngrok or use localhost)
const apiUrl = ref("http://localhost:3000");

// Check if ngrok is available
async function detectApiUrl() {
    // First, try ngrok URL if available
    const ngrokUrl = "https://nonappropriable-masked-tarah.ngrok-free.dev";
    try {
        const response = await fetch(`${ngrokUrl}/health`, { method: "HEAD" });
        if (response.ok) {
            apiUrl.value = ngrokUrl;
            return;
        }
    } catch (e) {
        // ngrok not available, use localhost
    }

    // Default to localhost
    apiUrl.value = "http://localhost:3000";
}

function getEmbedScript(siteId: string): string {
    return `<script
  src="${apiUrl.value}/embed/script.js?site_id=${siteId}"
  defer
><\/script>`;
}

function addDomain() {
    const domain = domainInput.value.trim();
    if (domain && !formData.value.domains.includes(domain)) {
        formData.value.domains.push(domain);
        domainInput.value = "";
    }
}

function removeDomain(index: number) {
    formData.value.domains.splice(index, 1);
}

async function handleSave() {
    error.value = null;

    if (editingSite.value) {
        // Update site
        const updated = await sitesStore.updateSite(editingSite.value.id, {
            name: formData.value.name,
            domains: formData.value.domains.length > 0 ? formData.value.domains : undefined,
            allow_any_domain: formData.value.allowAnyDomain,
        });

        if (updated) {
            showAddModal.value = false;
            editingSite.value = null;
            formData.value = { name: "", domains: [], allowAnyDomain: false };
        } else {
            error.value = sitesStore.error || "Failed to update website";
        }
    } else {
        const site = await sitesStore.createSite({
            name: formData.value.name,
            domains: formData.value.domains.length > 0 ? formData.value.domains : undefined,
            allow_any_domain: formData.value.allowAnyDomain,
        });

        if (site) {
            showAddModal.value = false;
            formData.value = { name: "", domains: [], allowAnyDomain: false };
        } else {
            error.value = sitesStore.error || "Failed to create website";
        }
    }
}

function viewSite(site: Site) {
    viewingSite.value = site;
}

function confirmDelete(site: Site) {
    if (confirm(`Are you sure you want to delete "${site.name}"?`)) {
        // Delete logic here
        console.log("Delete site:", site.id);
    }
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

async function copyToClipboard(text: string) {
    try {
        await navigator.clipboard.writeText(text);
        alert("Copied to clipboard!");
    } catch (err) {
        console.error("Failed to copy:", err);
    }
}

onMounted(async () => {
    loading.value = true;
    await detectApiUrl();
    await sitesStore.fetchSites();
    loading.value = false;
});
</script>

<style scoped>
.websites-view {
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

.loading,
.empty-state {
    text-align: center;
    padding: 48px;
    color: #666;
}

.websites-table {
    width: 100%;
    border-collapse: collapse;
}

.websites-table th {
    text-align: left;
    padding: 12px;
    border-bottom: 2px solid #e1e4e8;
    font-size: 12px;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
}

.websites-table td {
    padding: 16px 12px;
    border-bottom: 1px solid #e1e4e8;
    font-size: 14px;
    color: #333;
}

.site-name {
    font-weight: 500;
    color: #667eea;
}

.site-id {
    font-family: monospace;
    font-size: 12px;
    background: #f5f5f5;
    padding: 4px 8px;
    border-radius: 4px;
}

.text-muted {
    color: #999;
    font-style: italic;
}

.domains-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.domain-tag {
    display: inline-block;
    padding: 2px 8px;
    background: #f0f0f0;
    border-radius: 4px;
    font-size: 12px;
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

.status-badge.inactive {
    background: #f8d7da;
    color: #721c24;
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

.text-danger {
    color: #d73a49;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
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
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
}

.modal-content.large {
    max-width: 800px;
}

.modal-content h3 {
    margin: 0 0 24px 0;
    font-size: 24px;
    color: #333;
}

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

.form-group label {
    font-size: 14px;
    font-weight: 500;
    color: #333;
}

.form-group input {
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
}

.form-group input:focus {
    outline: none;
    border-color: #667eea;
}

.help-text {
    font-size: 12px;
    color: #666;
}

.tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
}

.tag {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: #f0f0f0;
    border-radius: 4px;
    font-size: 14px;
}

.tag-remove {
    background: none;
    border: none;
    color: #999;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
}

.tag-remove:hover {
    color: #d73a49;
}

.error-message {
    padding: 12px;
    background: #fee;
    border: 1px solid #fcc;
    border-radius: 6px;
    color: #c33;
    font-size: 14px;
}

.modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 8px;
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

.site-details {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
}

.detail-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.detail-item label {
    font-weight: 600;
    color: #666;
    font-size: 14px;
}

.detail-value {
    display: flex;
    align-items: center;
    gap: 12px;
}

.detail-value code {
    flex: 1;
    padding: 8px 12px;
    background: #f5f5f5;
    border-radius: 4px;
    font-family: monospace;
    font-size: 13px;
}

.btn-copy {
    padding: 6px 12px;
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
}

.btn-copy:hover {
    background: #e5e5e5;
}

.embed-section {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    border: 2px solid #667eea;
}

.embed-section label {
    display: flex;
    align-items: center;
    color: #667eea;
    font-size: 16px;
}

.embed-instructions {
    margin: 12px 0;
    padding: 12px;
    background: #e7f3ff;
    border-radius: 6px;
    font-size: 14px;
    color: #004085;
}

.embed-instructions code {
    background: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: monospace;
    font-size: 13px;
}

.embed-code-container {
    position: relative;
    margin: 12px 0;
}

.embed-code {
    background: #2d2d2d;
    color: #f8f8f2;
    padding: 16px;
    border-radius: 6px;
    font-family: "Courier New", monospace;
    font-size: 13px;
    line-height: 1.5;
    overflow-x: auto;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
}

.btn-copy-embed {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 8px 16px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
}

.btn-copy-embed:hover {
    background: #5568d3;
}

.embed-note {
    margin-top: 12px;
    padding: 12px;
    background: white;
    border-radius: 6px;
    font-size: 13px;
    color: #666;
    line-height: 1.6;
}

.embed-note strong {
    color: #333;
}

.divider {
    height: 1px;
    background: #e1e4e8;
    margin: 24px 0;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: normal;
    margin-top: 12px;
    cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
    width: auto;
    cursor: pointer;
}

.checkbox-label span {
    font-size: 14px;
}

.warning-message {
    padding: 12px;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 6px;
    color: #856404;
    font-size: 13px;
    margin-top: 12px;
}

.info-message {
    padding: 12px;
    background: #d1ecf1;
    border: 1px solid #bee5eb;
    border-radius: 6px;
    color: #0c5460;
    font-size: 13px;
    margin-top: 12px;
}

.text-warning {
    color: #856404;
    font-weight: 500;
}

.text-danger {
    color: #d73a49;
    font-weight: 500;
}

.modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 24px;
}

.btn-secondary {
    padding: 12px 24px;
    background: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-secondary:hover {
    background: #e5e5e5;
    border-color: #ccc;
}
</style>
