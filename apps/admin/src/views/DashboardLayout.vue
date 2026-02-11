<template>
    <div class="dashboard">
        <header class="header">
            <div class="header-left">
                <div class="logo-container">
                    <div class="logo-row">
                        <img src="../assets/pfm-surveys.svg" alt="PFM Surveys" class="logo" />
                        <div class="title-column">
                            <h1>PFM Surveys</h1>
                            <span class="version-badge">v1.1.0</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="header-center" v-if="sitesStore.hasSites">
                <label for="site-selector" class="visually-hidden">Select Site</label>
                <select id="site-selector" v-model="selectedSiteId" @change="handleSiteChange" class="site-selector">
                    <option v-for="site in sitesStore.sites" :key="site.id" :value="site.id">
                        {{ site.name }}
                    </option>
                </select>
            </div>

            <div class="header-right">
                <nav class="nav-links">
                    <RouterLink to="/" class="nav-link" exact>Surveys</RouterLink>
                    <RouterLink to="/websites" class="nav-link">Websites</RouterLink>
                    <RouterLink to="/team" class="nav-link">Team</RouterLink>
                </nav>

                <!-- Operations Icon (Dev only) -->
                <RouterLink to="/operations" class="operations-icon" title="Operations (Dev)">
                    <img src="../assets/icons/system/gear.svg" alt="Operations" width="20" height="20" />
                </RouterLink>

                <!-- Profile Dropdown -->
                <div class="profile-dropdown" @click="toggleProfileMenu" ref="profileDropdownRef">
                    <div class="profile-trigger">
                        <div class="profile-avatar">
                            {{ getUserInitials() }}
                        </div>
                        <div class="profile-info">
                            <div class="profile-name">{{ getUserName() }}</div>
                            <div class="profile-email">{{ authStore.user?.email }}</div>
                        </div>
                        <svg class="dropdown-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path
                                d="M4.427 6.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 6H4.604a.25.25 0 00-.177.427z"
                            />
                        </svg>
                    </div>

                    <div v-if="showProfileMenu" class="profile-menu">
                        <RouterLink to="/profile" class="menu-item" @click="showProfileMenu = false">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path
                                    d="M8 8a3 3 0 100-6 3 3 0 000 6zm2 2c0-1.105-.895-2-2-2s-2 .895-2 2v1c0 .553.447 1 1 1h2c.553 0 1-.447 1-1v-1z"
                                />
                                <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM3 13c0-2.761 2.239-5 5-5s5 2.239 5 5v1H3v-1z" />
                            </svg>
                            Profile Settings
                        </RouterLink>
                        <button @click="handleLogout" class="menu-item">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path
                                    d="M3 3a1 1 0 011-1h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm2 0v10h6V3H5z"
                                />
                                <path d="M8 6a1 1 0 011 1v2a1 1 0 11-2 0V7a1 1 0 011-1z" />
                            </svg>
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <div v-if="sitesStore.error" class="api-error-banner">
            <span class="api-error-text">{{ sitesStore.error }}</span>
            <span class="api-error-hint">API: {{ apiBaseUrl }}</span>
            <button type="button" class="api-error-retry" @click="retrySites">Retry</button>
        </div>

        <!-- Block app content until API is reachable -->
        <main v-if="sitesStore.error" class="main-content api-blocked">
            <div class="api-unavailable">
                <h2>API is not available</h2>
                <p v-if="isUnreachableHint">
                    The API cannot reach the database or Redis. Start them, then start the API and click Retry.
                </p>
                <p v-else>The app cannot work without the API. Start the API server, then click Retry.</p>
                <p class="api-unavailable-url">
                    API URL: <code>{{ apiBaseUrl }}</code>
                </p>
                <p v-if="isUnreachableHint" class="api-unavailable-hint">
                    In the project folder, run: <code>docker compose up -d postgres redis</code>, then in a terminal run <code>pnpm dev</code> (or <code>pnpm run dev:api</code>). Use your own terminal so the API can reach Docker on your machine.
                </p>
                <button type="button" class="btn-retry" @click="retrySites" :disabled="sitesStore.loading">
                    {{ sitesStore.loading ? "Checking…" : "Retry" }}
                </button>
            </div>
        </main>
        <main v-else class="main-content">
            <RouterView />
        </main>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, computed } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useSitesStore } from "../stores/sites";

const router = useRouter();
const authStore = useAuthStore();
const sitesStore = useSitesStore();

const apiBaseUrl = computed(() => import.meta.env.VITE_API_BASE_URL || "http://localhost:3000");

const isUnreachableHint = computed(() => {
    const e = sitesStore.error?.toLowerCase() ?? "";
    return (
        e.includes("temporarily unavailable") ||
        e.includes("unreachable") ||
        e.includes("internal server error")
    );
});

const selectedSiteId = ref<string>("");
const showProfileMenu = ref(false);
const profileDropdownRef = ref<HTMLElement | null>(null);

onMounted(async () => {
    // Fetch current user if not loaded
    if (!authStore.user) {
        const success = await authStore.fetchCurrentUser();
        if (!success) {
            router.push({ name: "login" });
            return;
        }
    }

    // Fetch sites
    const sitesOk = await sitesStore.fetchSites();

    // Set selected site
    if (sitesStore.currentSite) {
        selectedSiteId.value = sitesStore.currentSite.id;
    }

    // Only redirect to add-site when API succeeded and returned no sites
    if (sitesOk && !sitesStore.hasSites) {
        router.push({ name: "add-site" });
    }

    // Close dropdown when clicking outside
    document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener("click", handleClickOutside);
});

watch(
    () => sitesStore.currentSite,
    (newSite) => {
        if (newSite) {
            selectedSiteId.value = newSite.id;
        }
    }
);

function handleSiteChange() {
    const site = sitesStore.sites.find((s) => s.id === selectedSiteId.value);
    if (site) {
        sitesStore.selectSite(site);
    }
}

async function retrySites() {
    sitesStore.error = null;
    const ok = await sitesStore.fetchSites();
    if (ok) {
        if (sitesStore.currentSite) {
            selectedSiteId.value = sitesStore.currentSite.id;
        } else if (!sitesStore.hasSites) {
            router.push({ name: "add-site" });
        }
    }
}

function getUserName(): string {
    if (authStore.user?.first_name || authStore.user?.last_name) {
        return `${authStore.user.first_name || ""} ${authStore.user.last_name || ""}`.trim();
    }
    return authStore.user?.email.split("@")[0] || "User";
}

function getUserInitials(): string {
    if (authStore.user?.first_name || authStore.user?.last_name) {
        const first = authStore.user.first_name?.[0] || "";
        const last = authStore.user.last_name?.[0] || "";
        return (first + last).toUpperCase();
    }
    return (authStore.user?.email[0] || "U").toUpperCase();
}

function toggleProfileMenu() {
    showProfileMenu.value = !showProfileMenu.value;
}

function handleClickOutside(event: MouseEvent) {
    if (profileDropdownRef.value && !profileDropdownRef.value.contains(event.target as Node)) {
        showProfileMenu.value = false;
    }
}

function handleLogout() {
    showProfileMenu.value = false;
    authStore.logout();
    sitesStore.reset();
    router.push({ name: "login" });
}
</script>

<style scoped>
.dashboard {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: #f5f7fa;
}

.header {
    background: white;
    border-bottom: 1px solid #e1e4e8;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.logo-container {
    display: flex;
}

.logo-row {
    display: flex;
    align-items: center;
    gap: 12px;
}

.title-column {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.version-badge {
    font-size: 11px;
    font-weight: 500;
    padding: 0;
    background: transparent;
    color: #999;
    font-family: monospace;
    line-height: 1;
}

.logo {
    height: 40px;
    width: auto;
}

.header-left h1 {
    margin: 0;
    font-size: 20px;
    color: #333;
    font-weight: 600;
}

.header-center {
    flex: 1;
    max-width: 400px;
    display: flex;
    align-items: center;
}

.site-selector {
    width: 100%;
    padding: 10px 16px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    background: white;
    cursor: pointer;
    transition: border-color 0.2s;
}

.site-selector:focus {
    outline: none;
    border-color: #667eea;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 24px;
}

.nav-links {
    display: flex;
    gap: 20px;
}

.nav-link {
    text-decoration: none;
    color: #666;
    font-size: 14px;
    font-weight: 500;
    transition: color 0.2s;
    padding: 4px 8px;
    border-radius: 4px;
}

.nav-link:hover {
    color: #667eea;
    background: #f5f7fa;
}

.nav-link.router-link-exact-active {
    color: #667eea;
}

.operations-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    color: #999;
    transition: all 0.2s;
    text-decoration: none;
}

.operations-icon:hover {
    background: #f5f7fa;
    color: #667eea;
}

.operations-icon.router-link-active {
    color: #667eea;
    background: #f0f3ff;
}

.profile-dropdown {
    position: relative;
}

.profile-trigger {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
}

.profile-trigger:hover {
    background: #f5f7fa;
}

.profile-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    flex-shrink: 0;
}

.profile-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
}

.profile-name {
    font-size: 14px;
    font-weight: 500;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
}

.profile-email {
    font-size: 12px;
    color: #666;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
}

.dropdown-icon {
    color: #666;
    flex-shrink: 0;
}

.profile-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: white;
    border: 1px solid #e1e4e8;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 200px;
    overflow: hidden;
    z-index: 1000;
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    width: 100%;
    text-align: left;
    text-decoration: none;
    color: #333;
    font-size: 14px;
    border: none;
    background: none;
    cursor: pointer;
    transition: background 0.2s;
}

.menu-item:hover {
    background: #f5f7fa;
}

.menu-item svg {
    color: #666;
    flex-shrink: 0;
}

.menu-item + .menu-item {
    border-top: 1px solid #e1e4e8;
}

.api-error-banner {
    background: #fef2f2;
    border-bottom: 1px solid #fecaca;
    padding: 12px 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
}

.api-error-text {
    color: #b91c1c;
    font-size: 14px;
    font-weight: 500;
}

.api-error-hint {
    color: #991b1b;
    font-size: 12px;
    font-family: monospace;
}

.api-error-retry {
    margin-left: auto;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 500;
    color: #b91c1c;
    background: white;
    border: 1px solid #fecaca;
    border-radius: 6px;
    cursor: pointer;
}

.api-error-retry:hover {
    background: #fee2e2;
}

.main-content {
    flex: 1;
    padding: 24px;
}

.main-content.api-blocked {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px;
}

.api-unavailable {
    text-align: center;
    max-width: 420px;
    padding: 32px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.api-unavailable h2 {
    margin: 0 0 12px 0;
    font-size: 20px;
    color: #333;
}

.api-unavailable p {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #555;
    line-height: 1.5;
}

.api-unavailable p:last-of-type {
    margin-bottom: 20px;
}

.api-unavailable-hint {
    font-size: 13px;
    color: #555;
    margin-top: 8px;
}

.api-unavailable-url {
    font-size: 13px;
    color: #666;
}

.api-unavailable-url code,
.api-unavailable-hint code {
    background: #f0f0f0;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
}

.btn-retry {
    padding: 10px 24px;
    font-size: 14px;
    font-weight: 500;
    color: white;
    background: #667eea;
    border: none;
    border-radius: 8px;
    cursor: pointer;
}

.btn-retry:hover:not(:disabled) {
    background: #5568d3;
}

.btn-retry:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
}
</style>
