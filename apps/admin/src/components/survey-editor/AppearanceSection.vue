<template>
    <div>
        <!-- Widget Background -->
        <div class="form-row">
            <div class="form-group form-group-flex">
                <label>Widget Background</label>
                <div class="color-picker">
                    <input type="color" v-model="appearance.widgetBackgroundColor" class="color-input" />
                    <input
                        type="text"
                        v-model="appearance.widgetBackgroundColor"
                        class="color-text"
                        placeholder="#141a2c"
                    />
                </div>
            </div>
            <div class="form-group form-group-small">
                <label>Opacity</label>
                <input
                    type="number"
                    v-model.number="appearance.widgetBackgroundOpacity"
                    step="0.1"
                    min="0"
                    max="1"
                    placeholder="1.0"
                />
            </div>
            <div class="form-group form-group-small">
                <label>Border Radius</label>
                <input type="text" v-model="appearance.widgetBorderRadius" placeholder="8px" />
            </div>
        </div>

        <!-- Text Styling -->
        <div class="form-row">
            <div class="form-group form-group-flex">
                <label>Text Color</label>
                <div class="color-picker">
                    <input type="color" v-model="appearance.textColor" class="color-input" />
                    <input type="text" v-model="appearance.textColor" class="color-text" placeholder="#ffffff" />
                </div>
            </div>
            <div class="form-group form-group-small">
                <label>Question Size</label>
                <input type="text" v-model="appearance.questionTextSize" placeholder="1em" />
            </div>
            <div class="form-group form-group-small">
                <label>Answer Size</label>
                <input type="text" v-model="appearance.answerFontSize" placeholder="0.875em" />
            </div>
        </div>

        <!-- Button Styling -->
        <div class="form-row">
            <div class="form-group form-group-flex">
                <label>Button Background</label>
                <div class="color-picker">
                    <input type="color" v-model="appearance.buttonBackgroundColor" class="color-input" />
                    <input
                        type="text"
                        v-model="appearance.buttonBackgroundColor"
                        class="color-text"
                        placeholder="#2a44b7"
                    />
                </div>
            </div>
        </div>

        <!-- Widget Buttons -->
        <div class="form-group">
            <label>Widget buttons</label>
            <div class="checkbox-group">
                <label class="checkbox-label">
                    <input type="checkbox" v-model="appearance.showCloseButton" />
                    <span>Show close button</span>
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" v-model="appearance.showMinimizeButton" />
                    <span>Show minimize button</span>
                </label>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { SurveyData } from "../../types/survey-editor";

defineProps<{
    appearance: SurveyData["appearance"];
}>();
</script>

<style scoped>
.form-row {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
}

.form-group {
    flex: 1;
}

.form-group-flex {
    flex: 2;
}

.form-group-small {
    flex: 1;
    min-width: 120px;
}

.form-group label:not(.checkbox-inline):not(.checkbox-label):not(.radio-label) {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
}

.form-group input[type="text"],
.form-group input[type="number"] {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
}

.color-picker {
    display: flex;
    gap: 8px;
    align-items: center;
}

.color-input {
    width: 50px;
    height: 42px;
    padding: 2px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    cursor: pointer;
}

.color-text {
    flex: 1;
}

.checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
}

.checkbox-label span {
    font-size: 14px;
    color: #374151;
}
</style>
