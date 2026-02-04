import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { sitesApi } from "../services/api";
import type { Site } from "../types";

export const useSitesStore = defineStore("sites", () => {
    const sites = ref<Site[]>([]);
    const currentSite = ref<Site | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    const hasSites = computed(() => sites.value.length > 0);

    async function fetchSites() {
        loading.value = true;
        error.value = null;

        try {
            const response = await sitesApi.getAll();
            sites.value = response.sites;

            // Auto-select first site if none selected
            if (!currentSite.value && sites.value.length > 0) {
                currentSite.value = sites.value[0];
                localStorage.setItem("current_site_id", sites.value[0].id);
            }

            return true;
        } catch (err: any) {
            if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
                error.value = "Cannot reach the API. Is it running? Check the URL and try again.";
            } else {
                error.value = err.response?.data?.error || err.message || "Failed to fetch sites";
            }
            sites.value = [];
            return false;
        } finally {
            loading.value = false;
        }
    }

    async function createSite(data: { name: string; domains?: string[] }) {
        loading.value = true;
        error.value = null;

        try {
            const response = await sitesApi.create(data);
            sites.value.push(response.site);

            // Auto-select new site
            currentSite.value = response.site;
            localStorage.setItem("current_site_id", response.site.id);

            return response.site;
        } catch (err: any) {
            error.value = err.response?.data?.error || "Failed to create site";
            return null;
        } finally {
            loading.value = false;
        }
    }

    function selectSite(site: Site) {
        currentSite.value = site;
        localStorage.setItem("current_site_id", site.id);
    }

    function reset() {
        sites.value = [];
        currentSite.value = null;
        loading.value = false;
        error.value = null;
        localStorage.removeItem("current_site_id");
    }

    return {
        sites,
        currentSite,
        loading,
        error,
        hasSites,
        fetchSites,
        createSite,
        updateSite,
        deleteSite,
        selectSite,
        reset,
    };
});
