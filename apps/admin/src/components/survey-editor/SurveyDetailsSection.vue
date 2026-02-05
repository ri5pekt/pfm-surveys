<template>
    <div>
        <div class="form-group">
            <label for="survey-name">Survey Name *</label>
            <input
                id="survey-name"
                v-model="surveyData.name"
                type="text"
                placeholder="e.g., Customer Satisfaction Survey"
                required
            />
        </div>

        <div class="form-group">
            <label for="survey-description">Description</label>
            <textarea
                id="survey-description"
                v-model="surveyData.description"
                rows="3"
                placeholder="Optional description for internal use"
            ></textarea>
        </div>

        <div class="form-group">
            <label>Type</label>
            <div class="radio-group">
                <label class="radio-label">
                    <input type="radio" v-model="surveyData.type" value="popover" />
                    <span>Popover</span>
                </label>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { SurveyData } from "../../types/survey-editor";

defineProps<{
    surveyData: SurveyData;
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
    color: #333;
}

.form-group input[type="text"],
.form-group textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s;
}

.form-group input[type="text"]:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #667eea;
}

.radio-group {
    display: flex;
    gap: 16px;
}

.radio-label {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
}

.radio-label input[type="radio"] {
    cursor: pointer;
}

.radio-label span {
    font-size: 14px;
    color: #333;
}
</style>
