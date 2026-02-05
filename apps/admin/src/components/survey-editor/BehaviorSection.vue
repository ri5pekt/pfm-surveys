<template>
    <div>
        <div class="form-group">
            <label>Timing</label>
            <p class="help-text">Select when to show this survey to users</p>
            <div class="radio-group">
                <label class="radio-label">
                    <input type="radio" v-model="behavior.timing" value="immediate" />
                    <span>Immediately after the page loads</span>
                </label>
                <label class="radio-label">
                    <input type="radio" v-model="behavior.timing" value="delay" />
                    <span>After a delay on the page</span>
                </label>
                <label class="radio-label">
                    <input type="radio" v-model="behavior.timing" value="scroll" />
                    <span>When user scrolls down the page</span>
                </label>
            </div>

            <div v-if="behavior.timing === 'delay'" class="delay-input">
                <label>Display after</label>
                <div class="input-with-unit">
                    <input type="number" v-model.number="behavior.delaySeconds" min="0" class="number-input" />
                    <span class="unit">seconds</span>
                </div>
            </div>

            <div v-if="behavior.timing === 'scroll'" class="delay-input">
                <label>Trigger when scrolled</label>
                <div class="input-with-unit">
                    <input
                        type="number"
                        v-model.number="behavior.scrollPercentage"
                        min="0"
                        max="100"
                        class="number-input"
                    />
                    <span class="unit">% down the page</span>
                </div>
            </div>
        </div>

        <div class="form-group">
            <label>Frequency</label>
            <p class="help-text">Select how often users should see this survey</p>
            <div class="radio-group">
                <label class="radio-label">
                    <input type="radio" v-model="behavior.frequency" value="until_submit" />
                    <span>Until they submit a response</span>
                </label>
                <label class="radio-label">
                    <input type="radio" v-model="behavior.frequency" value="once" />
                    <span>Only once, even if they do not respond</span>
                </label>
                <label class="radio-label">
                    <input type="radio" v-model="behavior.frequency" value="always" />
                    <span>Always, even after they submit a response</span>
                </label>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { SurveyData } from "../../types/survey-editor";

defineProps<{
    behavior: SurveyData["behavior"];
}>();
</script>

<style scoped>
.form-group {
    margin-bottom: 28px;
}

.form-group label:not(.checkbox-inline):not(.checkbox-label):not(.radio-label) {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
}

.help-text {
    font-size: 13px;
    color: #6b7280;
    margin: 4px 0 12px 0;
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

.delay-input {
    margin-top: 16px;
    padding-left: 24px;
}

.delay-input label {
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 6px;
}

.input-with-unit {
    display: flex;
    align-items: center;
    gap: 8px;
}

.number-input {
    width: 100px;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
}

.unit {
    font-size: 14px;
    color: #6b7280;
}
</style>
