<template>
    <div class="survey-editor">
        <!-- Header -->
        <div class="editor-header">
            <div class="header-left">
                <button @click="handleClose" class="btn-icon" title="Close">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path
                            d="M10 8.586L3.707 2.293 2.293 3.707 8.586 10l-6.293 6.293 1.414 1.414L10 11.414l6.293 6.293 1.414-1.414L11.414 10l6.293-6.293-1.414-1.414L10 8.586z"
                        />
                    </svg>
                </button>
                <h1>{{ isEditMode ? surveyData.name || "Edit Survey" : "New Survey" }}</h1>
            </div>
            <div class="header-right">
                <div class="toggle-container">
                    <label class="toggle-label">
                        <span class="toggle-text">Active</span>
                        <div class="toggle-switch" :class="{ active: surveyData.active }">
                            <input type="checkbox" v-model="surveyData.active" class="toggle-input" />
                            <span class="toggle-slider"></span>
                        </div>
                    </label>
                </div>
                <button @click="handleSave" class="btn-primary" :disabled="saving">
                    {{ saving ? "Saving..." : "Save" }}
                </button>
            </div>
        </div>

        <!-- Main Content -->
        <div class="editor-content">
            <!-- Accordion Sections -->
            <div class="accordion">
                <!-- Details Section -->
                <AccordionSection
                    title="Details"
                    :subtitle="surveyData.name || 'Name your survey'"
                    :isOpen="activeSection === 'details'"
                    :isComplete="isSectionComplete('details')"
                    @toggle="toggleSection('details')"
                >
                    <SurveyDetailsSection :surveyData="surveyData" />
                </AccordionSection>

                <!-- Questions Section -->
                <AccordionSection
                    title="Questions"
                    :subtitle="`${surveyData.questions.length} question(s)`"
                    :isOpen="activeSection === 'questions'"
                    :isComplete="isSectionComplete('questions')"
                    @toggle="toggleSection('questions')"
                >
                    <QuestionsSection
                        :questions="surveyData.questions"
                        :thankYouMessage="surveyData.thankYouMessage"
                        @add-question="addQuestion"
                        @remove-question="removeQuestion"
                        @type-change="handleQuestionTypeChange"
                        @add-option="addOption"
                        @remove-option="removeOption"
                        @update:thankYouMessage="surveyData.thankYouMessage = $event"
                    />
                </AccordionSection>

                <!-- Appearance Section -->
                <AccordionSection
                    title="Appearance"
                    subtitle="Customize design"
                    :isOpen="activeSection === 'appearance'"
                    :isComplete="isSectionComplete('appearance')"
                    @toggle="toggleSection('appearance')"
                >
                    <AppearanceSection :appearance="surveyData.appearance" />
                </AccordionSection>

                <!-- Targeting Section -->
                <AccordionSection
                    title="Targeting"
                    :subtitle="surveyData.targeting.pageType === 'all' ? 'All pages' : 'Specific pages'"
                    :isOpen="activeSection === 'targeting'"
                    :isComplete="isSectionComplete('targeting')"
                    @toggle="toggleSection('targeting')"
                >
                    <TargetingSection
                        :targeting="surveyData.targeting"
                        @add-rule="addPageRule"
                        @remove-rule="removePageRule"
                    />
                </AccordionSection>

                <!-- Behavior Section -->
                <AccordionSection
                    title="Behavior"
                    subtitle="Timing & frequency"
                    :isOpen="activeSection === 'behavior'"
                    :isComplete="isSectionComplete('behavior')"
                    @toggle="toggleSection('behavior')"
                >
                    <BehaviorSection :behavior="surveyData.behavior" />
                </AccordionSection>

                <!-- Summary Section -->
                <AccordionSection
                    title="Summary"
                    subtitle="Review your survey"
                    :isOpen="activeSection === 'summary'"
                    :isComplete="false"
                    @toggle="toggleSection('summary')"
                >
                    <SummarySection
                        :surveyName="surveyData.name"
                        :questionCount="surveyData.questions.length"
                        :targeting="surveyData.targeting"
                        :behavior="surveyData.behavior"
                    />
                </AccordionSection>
            </div>
        </div>

        <!-- Dialogs -->
        <SurveyDialogs
            :showSuccess="showSuccessDialog"
            :showError="showErrorDialog"
            :showValidation="showValidationDialog"
            :showCloseConfirm="showCloseConfirmDialog"
            :errorMessage="errorMessage"
            :validationMessage="validationMessage"
            @update:showSuccess="showSuccessDialog = $event"
            @update:showError="showErrorDialog = $event"
            @update:showValidation="showValidationDialog = $event"
            @update:showCloseConfirm="showCloseConfirmDialog = $event"
            @close-success="closeSuccessAndNavigate"
            @close-validation="closeValidation"
            @confirm-close="confirmClose"
        />
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { createDefaultSurveyData } from "../types/survey-editor";
import { useAccordion } from "../composables/useAccordion";
import { useQuestionManager } from "../composables/useQuestionManager";
import { useSurveyValidation } from "../composables/useSurveyValidation";
import { useSurveyDialogs } from "../composables/useSurveyDialogs";
import { useSurveyEditor } from "../composables/useSurveyEditor";
import AccordionSection from "../components/survey-editor/AccordionSection.vue";
import SurveyDetailsSection from "../components/survey-editor/SurveyDetailsSection.vue";
import QuestionsSection from "../components/survey-editor/QuestionsSection.vue";
import AppearanceSection from "../components/survey-editor/AppearanceSection.vue";
import TargetingSection from "../components/survey-editor/TargetingSection.vue";
import BehaviorSection from "../components/survey-editor/BehaviorSection.vue";
import SummarySection from "../components/survey-editor/SummarySection.vue";
import SurveyDialogs from "../components/survey-editor/SurveyDialogs.vue";

// Initialize survey data
const surveyData = ref(createDefaultSurveyData());

// Use composables
const { activeSection, toggleSection } = useAccordion("details");
const { addQuestion, removeQuestion, handleQuestionTypeChange, addOption, removeOption, addPageRule, removePageRule } =
    useQuestionManager(surveyData);
const { isSectionComplete, validateSurvey } = useSurveyValidation(surveyData);
const {
    showSuccessDialog,
    showErrorDialog,
    showValidationDialog,
    showCloseConfirmDialog,
    errorMessage,
    validationMessage,
    handleClose,
    confirmClose,
    closeValidationDialog,
    closeSuccessAndNavigate,
    showError,
    showValidation,
    showSuccess,
} = useSurveyDialogs();

// Survey editor (load/save)
const { saving, isEditMode, saveSurvey } = useSurveyEditor(surveyData, showSuccess, showError);

// Handle save with validation
async function handleSave() {
    const validation = validateSurvey();
    if (!validation.valid) {
        showValidation(validation.message!, validation.targetSection!);
        return;
    }

    await saveSurvey();
}

// Wrapper for closeValidationDialog to pass activeSection
function closeValidation() {
    closeValidationDialog(activeSection);
}
</script>

<style scoped>
.survey-editor {
    min-height: 100vh;
    background: #f5f7fa;
    display: flex;
    flex-direction: column;
}

.editor-header {
    background: white;
    border-bottom: 1px solid #e1e4e8;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 16px;
}

.header-left h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #333;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 20px;
}

.toggle-container {
    display: flex;
    align-items: center;
}

.toggle-label {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    user-select: none;
}

.toggle-text {
    font-size: 14px;
    font-weight: 500;
    color: #333;
}

.toggle-switch {
    position: relative;
    width: 48px;
    height: 26px;
    background: #ddd;
    border-radius: 13px;
    transition: background 0.3s;
}

.toggle-switch.active {
    background: #667eea;
}

.toggle-input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    transition: transform 0.3s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-switch.active .toggle-slider {
    transform: translateX(22px);
}

.btn-icon {
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
}

.btn-icon:hover {
    background: #f5f5f5;
}

.btn-primary {
    padding: 10px 24px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
    background: #5568d3;
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.editor-content {
    flex: 1;
    max-width: 900px;
    width: 100%;
    margin: 0 auto;
    padding: 24px;
}

.accordion {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

/* Accordion styles now in AccordionSection.vue component */

.form-group {
    margin-bottom: 20px;
}

.form-group label:not(.checkbox-inline):not(.checkbox-label):not(.radio-label) {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #333;
}

/* Compact grid layout for appearance settings */
.form-row {
    display: grid;
    grid-template-columns: 1fr 140px 140px;
    gap: 16px;
    margin-bottom: 20px;
}

.form-group-flex {
    flex: 1;
    margin-bottom: 0;
}

.form-group-small {
    margin-bottom: 0;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group textarea,
.form-group select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
    outline: none;
    border-color: #667eea;
}

.form-group textarea {
    resize: vertical;
}

.help-text {
    margin: 4px 0 12px;
    font-size: 13px;
    color: #666;
}

/* Section-specific styles now in component files */

/* Custom Dialog Styles (global PrimeVue overrides) */
:deep(.p-dialog.custom-dialog) {
    background: #ffffff !important;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

:deep(.custom-dialog .p-dialog-header) {
    background: #ffffff !important;
    padding: 24px 32px 16px;
    border: none;
}

:deep(.custom-dialog .p-dialog-content) {
    background: #ffffff !important;
    padding: 0 32px 24px;
}

:deep(.custom-dialog .p-dialog-footer) {
    background: #ffffff !important;
    padding: 20px 32px 28px;
    border: none;
}

/* Dialog overlay animations (global) */
:deep(.p-dialog-mask) {
    backdrop-filter: blur(6px);
    background-color: rgba(0, 0, 0, 0.55);
}

:deep(.custom-dialog) {
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}
</style>
