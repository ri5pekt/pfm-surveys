<template>
    <div class="add-site-view">
        <div class="card">
            <h2>Add Your First Website</h2>
            <p class="description">Create a site to start collecting survey responses from your website visitors.</p>

            <form @submit.prevent="handleSubmit" class="form">
                <div class="form-group">
                    <label for="site-name">Website Name *</label>
                    <input
                        id="site-name"
                        v-model="formData.name"
                        type="text"
                        placeholder="My Awesome Website"
                        required
                        :disabled="loading"
                    />
                    <span class="help-text">A friendly name to identify your website</span>
                </div>

                <div class="form-group">
                    <label for="domains">Allowed Domains (Security) *</label>
                    <input
                        v-model="domainInput"
                        type="text"
                        placeholder="example.com or *.example.com"
                        @keydown.enter.prevent="addDomain"
                        :disabled="loading || formData.allowAnyDomain"
                    />
                    <span class="help-text">
                        Only these domains can send survey events. Use *.example.com for subdomains. Press Enter to add.
                    </span>

                    <div v-if="formData.domains.length > 0" class="tags">
                        <span v-for="(domain, index) in formData.domains" :key="index" class="tag">
                            {{ domain }}
                            <button type="button" @click="removeDomain(index)" class="tag-remove">×</button>
                        </span>
                    </div>

                    <label class="checkbox-label">
                        <input type="checkbox" v-model="formData.allowAnyDomain" :disabled="loading" />
                        <span>🔓 Allow any domain (dev/testing only - INSECURE)</span>
                    </label>

                    <div v-if="formData.allowAnyDomain" class="warning-message">
                        ⚠️ Domain validation disabled. Anyone can send fake responses from any website.
                    </div>
                    <div v-else-if="formData.domains.length === 0" class="info-message">
                        ℹ️ Add at least one domain to protect against unauthorized event submissions.
                    </div>
                </div>

                <div v-if="error" class="error-message">
                    {{ error }}
                </div>

                <div class="form-actions">
                    <button type="submit" class="btn-primary" :disabled="loading">
                        {{ loading ? "Creating..." : "Create Website" }}
                    </button>
                </div>
            </form>
        </div>

        <!-- Success modal -->
        <div v-if="showSuccess && createdSite" class="modal-overlay">
            <div class="modal-content">
                <h3>✓ Website Created Successfully!</h3>

                <div class="site-details">
                    <div class="detail-item">
                        <label>Website Name:</label>
                        <span>{{ createdSite.name }}</span>
                    </div>

                    <div class="detail-item">
                        <label>Site ID:</label>
                        <code>{{ createdSite.site_id }}</code>
                        <button @click="copyToClipboard(createdSite.site_id)" class="btn-copy">Copy</button>
                    </div>

                    <div class="detail-item">
                        <label>Site Secret:</label>
                        <code>{{ createdSite.site_secret }}</code>
                        <button @click="copyToClipboard(createdSite.site_secret)" class="btn-copy">Copy</button>
                    </div>
                </div>

                <div class="warning-box">
                    <strong>⚠️ Important:</strong> Save your Site Secret securely. You won't be able to see it again!
                </div>

                <div class="embed-code">
                    <label>Embed Code:</label>
                    <pre><code v-text="embedCode"></code></pre>
                    <button @click="copyToClipboard(embedCode)" class="btn-copy">Copy Embed Code</button>
                </div>

                <button @click="closeSuccess" class="btn-primary">Continue to Dashboard</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useSitesStore } from "../stores/sites";
import type { Site } from "../types";

const router = useRouter();
const sitesStore = useSitesStore();

const formData = ref({
    name: "",
    domains: [] as string[],
    allowAnyDomain: false,
});

const domainInput = ref("");
const loading = ref(false);
const error = ref<string | null>(null);
const showSuccess = ref(false);
const createdSite = ref<Site | null>(null);

const embedCode = ref("");

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

async function handleSubmit() {
    loading.value = true;
    error.value = null;

    const site = await sitesStore.createSite({
        name: formData.value.name,
        domains: formData.value.domains.length > 0 ? formData.value.domains : undefined,
        allow_any_domain: formData.value.allowAnyDomain,
    });

    loading.value = false;

    if (site) {
        createdSite.value = site;
        embedCode.value = generateEmbedCode(site.site_id);
        showSuccess.value = true;
    } else {
        error.value = sitesStore.error || "Failed to create website";
    }
}

function generateEmbedCode(siteId: string): string {
    return `<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://your-domain.com/embed/script.js?site_id=${siteId}';
    script.async = true;
    document.head.appendChild(script);
  })();
<\/script>`;
}

async function copyToClipboard(text: string) {
    try {
        await navigator.clipboard.writeText(text);
        alert("Copied to clipboard!");
    } catch (err) {
        console.error("Failed to copy:", err);
    }
}

function closeSuccess() {
    showSuccess.value = false;
    router.push({ name: "surveys" });
}
</script>

<style scoped>
.add-site-view {
    max-width: 600px;
    margin: 0 auto;
}

.card {
    background: white;
    border-radius: 8px;
    padding: 32px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

h2 {
    margin: 0 0 8px 0;
    font-size: 24px;
    color: #333;
}

.description {
    margin: 0 0 32px 0;
    color: #666;
    line-height: 1.5;
}

.form {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

label {
    font-size: 14px;
    font-weight: 500;
    color: #333;
}

input {
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
}

input:focus {
    outline: none;
    border-color: #667eea;
}

input:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
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

.form-actions {
    display: flex;
    justify-content: flex-end;
    padding-top: 8px;
}

.btn-primary {
    padding: 12px 24px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 16px;
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

.modal-content h3 {
    margin: 0 0 24px 0;
    font-size: 24px;
    color: #22c55e;
}

.site-details {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
}

.detail-item {
    display: flex;
    align-items: center;
    gap: 12px;
}

.detail-item label {
    font-weight: 600;
    min-width: 120px;
}

.detail-item code {
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

.warning-box {
    padding: 16px;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 6px;
    color: #856404;
    margin-bottom: 24px;
}

.embed-code {
    margin-bottom: 24px;
}

.embed-code pre {
    margin: 8px 0;
    padding: 16px;
    background: #f5f5f5;
    border-radius: 6px;
    overflow-x: auto;
}

.embed-code code {
    font-family: monospace;
    font-size: 13px;
    line-height: 1.5;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 6px;
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
</style>
