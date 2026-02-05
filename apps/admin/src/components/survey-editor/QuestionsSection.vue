<template>
    <div>
        <div v-for="(question, index) in questions" :key="index" class="question-item">
            <div class="question-header">
                <span class="question-number">Q{{ index + 1 }}</span>
                <button @click="$emit('remove-question', index)" class="btn-icon-small" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path
                            d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"
                        />
                        <path
                            d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
                        />
                    </svg>
                </button>
            </div>

            <div class="form-group">
                <label>Question Text *</label>
                <input v-model="question.text" type="text" placeholder="Enter your question" required />
            </div>

            <div class="form-group">
                <label>Question Type</label>
                <select v-model="question.type" @change="$emit('type-change', index)">
                    <option value="radio">Radio Buttons (Single Choice)</option>
                    <option value="text">Text Answer</option>
                </select>
            </div>

            <!-- Options for Radio Buttons -->
            <div v-if="question.type === 'radio'" class="form-group">
                <label>Answer Options</label>
                <div v-for="(option, optIndex) in question.options" :key="optIndex" class="option-row-hotjar">
                    <div class="option-number">ANSWER {{ optIndex + 1 }}</div>
                    <input
                        v-model="option.text"
                        type="text"
                        :placeholder="`Option ${optIndex + 1}`"
                        class="option-input-hotjar"
                    />
                    <button
                        type="button"
                        @click="option.requiresComment = !option.requiresComment"
                        :class="['btn-icon-hotjar', { active: option.requiresComment }]"
                        title="Enter comment when selecting this answer"
                    >
                        <img src="@/assets/icons/system/comment.svg" alt="Comment" width="18" height="18" />
                    </button>
                    <button
                        v-if="question.options.length > 2"
                        type="button"
                        @click="$emit('remove-option', index, optIndex)"
                        class="btn-icon-hotjar"
                        title="Remove option"
                    >
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                            <path
                                d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"
                            />
                            <path
                                d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
                            />
                        </svg>
                    </button>
                </div>

                <!-- Add Answer Button -->
                <button type="button" @click="$emit('add-option', index)" class="btn-add-answer-secondary">
                    + Add answer
                </button>

                <!-- Bottom controls row -->
                <div class="question-controls-row">
                    <label class="checkbox-inline">
                        <input type="checkbox" v-model="question.required" />
                        <span>Required question</span>
                    </label>
                    <label class="checkbox-inline">
                        <input type="checkbox" v-model="question.randomizeOptions" />
                        <span>Randomize order</span>
                    </label>
                    <label class="checkbox-inline" v-if="question.options.length > 0">
                        <input type="checkbox" v-model="question.options[question.options.length - 1].pinToBottom" />
                        <span>Pin answer {{ question.options.length }} to bottom</span>
                    </label>
                </div>
            </div>

            <!-- For text questions, just show required checkbox -->
            <div v-else class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" v-model="question.required" />
                    <span>Required question</span>
                </label>
            </div>
        </div>

        <button @click="$emit('add-question')" class="btn-secondary">+ Add Question</button>

        <div class="form-group thank-you-section">
            <label for="thank-you-message">Thank you message</label>
            <p class="field-hint">Shown to users after they submit the survey (optional).</p>
            <textarea
                id="thank-you-message"
                :value="thankYouMessage"
                @input="$emit('update:thankYouMessage', ($event.target as HTMLTextAreaElement).value)"
                rows="3"
                placeholder="Thank you for answering this survey. Your feedback is highly appreciated!"
            ></textarea>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Question } from "../../types/survey-editor";

defineProps<{
    questions: Question[];
    thankYouMessage: string;
}>();

defineEmits<{
    "add-question": [];
    "remove-question": [index: number];
    "type-change": [index: number];
    "add-option": [questionIndex: number];
    "remove-option": [questionIndex: number, optionIndex: number];
    "update:thankYouMessage": [value: string];
}>();
</script>

<style scoped>
.question-item {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 16px;
}

.question-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.question-number {
    font-size: 14px;
    font-weight: 600;
    color: #667eea;
    background: #eef2ff;
    padding: 4px 12px;
    border-radius: 4px;
}

.btn-icon-small {
    background: none;
    border: none;
    color: #ef4444;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: background 0.2s;
}

.btn-icon-small:hover {
    background: #fee2e2;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label:not(.checkbox-inline):not(.checkbox-label):not(.radio-label) {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
}

.form-group input[type="text"],
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s;
}

.form-group input[type="text"]:focus,
.form-group select:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #667eea;
}

.option-row-hotjar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.option-number {
    font-size: 11px;
    font-weight: 600;
    color: #9ca3af;
    min-width: 80px;
}

.option-input-hotjar {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
}

.btn-icon-hotjar {
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    padding: 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn-icon-hotjar:hover {
    background: #e5e7eb;
}

.btn-icon-hotjar.active {
    background: #667eea;
    border-color: #667eea;
}

.btn-icon-hotjar.active img {
    filter: brightness(0) invert(1);
}

.btn-add-answer-secondary {
    width: 100%;
    padding: 10px;
    background: white;
    border: 2px dashed #d1d5db;
    border-radius: 8px;
    color: #667eea;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 12px;
    margin-bottom: 16px;
}

.btn-add-answer-secondary:hover {
    background: #f9fafb;
    border-color: #667eea;
}

.question-controls-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
}

.checkbox-inline {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
}

.checkbox-inline input[type="checkbox"] {
    cursor: pointer;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
}

.checkbox-inline span {
    font-size: 13px;
    color: #4b5563;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
    cursor: pointer;
}

.checkbox-label span {
    font-size: 14px;
    color: #374151;
}

.btn-secondary {
    width: 100%;
    padding: 12px;
    background: white;
    border: 2px dashed #d1d5db;
    border-radius: 8px;
    color: #667eea;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-secondary:hover {
    background: #f9fafb;
    border-color: #667eea;
}

.thank-you-section {
    margin-top: 32px;
    padding-top: 24px;
    border-top: 2px solid #e5e7eb;
}

.field-hint {
    font-size: 13px;
    color: #6b7280;
    margin: 4px 0 8px 0;
}
</style>
