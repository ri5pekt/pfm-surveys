<template>
    <div>
        <div class="form-group">
            <label>Pages</label>
            <div class="radio-group">
                <label class="radio-label">
                    <input type="radio" v-model="targeting.pageType" value="all" />
                    <span>All pages</span>
                </label>
                <label class="radio-label">
                    <input type="radio" v-model="targeting.pageType" value="specific" />
                    <span>Specific pages</span>
                </label>
            </div>
        </div>

        <div v-if="targeting.pageType === 'specific'" class="form-group">
            <label>Page Rules</label>
            <div v-for="(rule, index) in targeting.pageRules" :key="index" class="rule-row">
                <select v-model="rule.type" class="rule-type">
                    <option value="exact">Exact URL match</option>
                    <option value="contains">URL contains</option>
                </select>
                <PageUrlAutocomplete
                    v-model="rule.value"
                    placeholder="Enter URL or path"
                    title="Page URL from your site traffic"
                    input-class="rule-value"
                />
                <button
                    v-if="targeting.pageRules.length > 1"
                    @click="$emit('remove-rule', index)"
                    class="btn-icon-small rule-remove"
                    title="Remove rule"
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                        <path
                            d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"
                        />
                    </svg>
                </button>
            </div>
            <button @click="$emit('add-rule')" class="btn-text">+ Add Rule</button>
        </div>

        <div class="form-group">
            <label>Users</label>
            <div class="radio-group">
                <label class="radio-label">
                    <input type="radio" v-model="targeting.userType" value="all" />
                    <span>All users</span>
                </label>
                <label class="radio-label">
                    <input type="radio" v-model="targeting.userType" value="specific" />
                    <span>Specific users</span>
                </label>
            </div>
        </div>

        <div v-if="targeting.userType === 'specific'" class="form-group">
            <label>User Rules</label>
            <div v-for="(rule, index) in targeting.userRules" :key="index" class="user-rule-row">
                <select v-model="rule.type" class="rule-type user-rule-type">
                    <option value="geo">Geo location</option>
                </select>
                <template v-if="rule.type === 'geo'">
                    <GeoAutocomplete
                        v-model="rule.country"
                        type="country"
                        placeholder="Country (any if empty)"
                        title="Country code, e.g. US, IL"
                        input-class="rule-geo-input"
                    />
                    <GeoAutocomplete
                        v-model="rule.state"
                        type="state"
                        placeholder="District/region (e.g. TA)"
                        title="District or region code from IP (e.g. TA = Tel Aviv district). Leave empty for any."
                        input-class="rule-geo-input"
                        :country="rule.country"
                    />
                    <GeoAutocomplete
                        v-model="rule.city"
                        type="city"
                        placeholder="City (e.g. Tel Aviv, Giv'at Shmuel)"
                        title="City name from visitor's IP. This is the actual city (e.g. Giv'at Shmuel), not the district."
                        input-class="rule-geo-input"
                        :country="rule.country"
                        :state="rule.state"
                    />
                </template>
                <button
                    v-if="targeting.userRules.length > 1"
                    @click="$emit('remove-user-rule', index)"
                    class="btn-icon-small rule-remove"
                    title="Remove rule"
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                        <path
                            d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"
                        />
                    </svg>
                </button>
            </div>
            <button @click="$emit('add-user-rule')" class="btn-text">+ Add User Rule</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { SurveyData } from "../../types/survey-editor";
import GeoAutocomplete from "../GeoAutocomplete.vue";
import PageUrlAutocomplete from "../PageUrlAutocomplete.vue";

defineProps<{
    targeting: SurveyData["targeting"];
}>();

defineEmits<{
    "add-rule": [];
    "remove-rule": [index: number];
    "add-user-rule": [];
    "remove-user-rule": [index: number];
}>();
</script>

<style scoped>
.form-group {
    margin-bottom: 24px;
}

.form-group label:not(.checkbox-inline):not(.checkbox-label):not(.radio-label) {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
}

.radio-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.radio-label {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
}

.radio-label span {
    font-size: 14px;
    color: #374151;
}

.rule-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    align-items: center;
}

.rule-type {
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    min-width: 180px;
}

.rule-value {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
}

.btn-icon-small {
    background: none;
    border: none;
    color: #ef4444;
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    transition: background 0.2s;
}

.btn-icon-small:hover {
    background: #fee2e2;
}

.btn-text {
    background: none;
    border: none;
    color: #667eea;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    padding: 4px 8px;
}

.btn-text:hover {
    text-decoration: underline;
}

.user-rule-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    align-items: center;
    flex-wrap: wrap;
}

.user-rule-type {
    min-width: 140px;
}

.rule-geo-input {
    /* Styling is now handled by GeoAutocomplete component */
}

/* Make sure autocomplete components in the user rule row fit properly */
.user-rule-row :deep(.geo-autocomplete) {
    flex: 1;
    min-width: 120px;
}

/* Make sure page autocomplete fits properly in rule row */
.rule-row :deep(.page-autocomplete) {
    flex: 1;
}
</style>
