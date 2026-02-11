<template>
    <div class="geo-autocomplete" ref="containerRef">
        <input
            ref="inputRef"
            v-model="inputValue"
            @input="onInput"
            @focus="onFocus"
            @blur="onBlur"
            @keydown.down.prevent="navigateDown"
            @keydown.up.prevent="navigateUp"
            @keydown.enter.prevent="selectHighlighted"
            @keydown.escape="closeSuggestions"
            type="text"
            :name="`geo-filter-${type}-${Math.random().toString(36).slice(2)}`"
            :placeholder="placeholder"
            :title="title"
            :class="inputClass"
            autocomplete="new-password"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            data-lpignore="true"
            data-form-type="other"
        />
        <div
            v-if="showSuggestions && suggestions.length > 0"
            class="suggestions-dropdown"
            :style="dropdownStyle"
        >
            <div
                v-for="(suggestion, index) in suggestions"
                :key="suggestion.value"
                :class="['suggestion-item', { highlighted: index === highlightedIndex }]"
                @mousedown.prevent="selectSuggestion(suggestion)"
                @mouseenter="highlightedIndex = index"
            >
                <span class="suggestion-label">{{ suggestion.label }}</span>
                <span class="suggestion-count">{{ suggestion.count }}</span>
            </div>
        </div>
        <div
            v-else-if="showSuggestions && loading"
            class="suggestions-dropdown"
            :style="dropdownStyle"
        >
            <div class="suggestion-item loading">Loading...</div>
        </div>
        <div
            v-else-if="showSuggestions && !loading && inputValue.length >= 1"
            class="suggestions-dropdown"
            :style="dropdownStyle"
        >
            <div class="suggestion-item no-results">No suggestions found</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { useAuthStore } from "../stores/auth";

interface Suggestion {
    value: string;
    label: string;
    count: number;
}

const props = defineProps<{
    modelValue: string;
    type: "country" | "state" | "city";
    placeholder?: string;
    title?: string;
    inputClass?: string;
    country?: string;
    state?: string;
}>();

const emit = defineEmits<{
    "update:modelValue": [value: string];
}>();

const authStore = useAuthStore();
// Use relative URLs - works in both dev and production
const API_BASE = "";

const inputValue = ref(props.modelValue || "");
const suggestions = ref<Suggestion[]>([]);
const showSuggestions = ref(false);
const loading = ref(false);
const highlightedIndex = ref(-1);
const inputRef = ref<HTMLInputElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({});
let debounceTimer: number | null = null;

// Watch for external changes to modelValue
watch(
    () => props.modelValue,
    (newValue) => {
        if (newValue !== inputValue.value) {
            inputValue.value = newValue || "";
        }
    }
);

// Watch for country/state changes to clear and refetch
watch([() => props.country, () => props.state], () => {
    if (showSuggestions.value) {
        fetchSuggestions();
    }
});

async function fetchSuggestions() {
    const query = inputValue.value.trim();

    // Build endpoint URL based on type
    const pluralType = props.type === "country" ? "countries" : props.type === "state" ? "states" : "cities";
    let endpoint = `${API_BASE}/api/autocomplete/${pluralType}`;
    const params = new URLSearchParams();

    if (query.length >= 1) {
        params.append("q", query);
    }

    if (props.type === "state" && props.country) {
        params.append("country", props.country);
    } else if (props.type === "city") {
        if (props.country) params.append("country", props.country);
        if (props.state) params.append("state", props.state);
    }

    const url = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;

    loading.value = true;

    try {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${authStore.token}`,
            },
        });

        if (!response.ok) {
            console.error("Failed to fetch suggestions:", response.statusText);
            suggestions.value = [];
            return;
        }

        const data = await response.json();
        suggestions.value = data.suggestions || [];
        highlightedIndex.value = -1;
    } catch (error) {
        console.error("Error fetching suggestions:", error);
        suggestions.value = [];
    } finally {
        loading.value = false;
    }
}

function onInput() {
    emit("update:modelValue", inputValue.value);

    // Debounce the API call
    if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
    }

    debounceTimer = window.setTimeout(() => {
        if (showSuggestions.value) {
            fetchSuggestions();
        }
    }, 200);
}

function onFocus() {
    showSuggestions.value = true;
    updateDropdownPosition();
    fetchSuggestions();
}

function updateDropdownPosition() {
    if (inputRef.value) {
        const rect = inputRef.value.getBoundingClientRect();
        dropdownStyle.value = {
            top: `${rect.bottom + 4}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
        };
    }
}

function onBlur() {
    // Delay to allow click on suggestion
    setTimeout(() => {
        showSuggestions.value = false;
    }, 200);
}

function closeSuggestions() {
    showSuggestions.value = false;
    inputRef.value?.blur();
}

function navigateDown() {
    if (suggestions.value.length === 0) return;
    highlightedIndex.value = Math.min(highlightedIndex.value + 1, suggestions.value.length - 1);
}

function navigateUp() {
    if (suggestions.value.length === 0) return;
    highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1);
}

function selectHighlighted() {
    if (highlightedIndex.value >= 0 && highlightedIndex.value < suggestions.value.length) {
        selectSuggestion(suggestions.value[highlightedIndex.value]);
    }
}

function selectSuggestion(suggestion: Suggestion) {
    inputValue.value = suggestion.value;
    emit("update:modelValue", suggestion.value);
    showSuggestions.value = false;
    inputRef.value?.blur();
}

// Cleanup debounce timer
onUnmounted(() => {
    if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
    }
});
</script>

<style scoped>
.geo-autocomplete {
    position: relative;
    flex: 1;
    min-width: 120px;
}

.geo-autocomplete input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    box-sizing: border-box;
}

.geo-autocomplete input:focus {
    outline: none;
    border-color: #667eea;
}

.suggestions-dropdown {
    position: fixed;
    margin-top: 4px;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    max-height: 300px;
    overflow-y: auto;
    z-index: 9999;
    min-width: 200px;
}

.suggestion-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.15s;
}

.suggestion-item:hover,
.suggestion-item.highlighted {
    background: #f3f4f6;
}

.suggestion-item.loading,
.suggestion-item.no-results {
    color: #6b7280;
    cursor: default;
    justify-content: center;
}

.suggestion-item.loading:hover,
.suggestion-item.no-results:hover {
    background: white;
}

.suggestion-label {
    flex: 1;
    color: #374151;
}

.suggestion-count {
    margin-left: 12px;
    padding: 2px 8px;
    background: #e5e7eb;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
}
</style>
