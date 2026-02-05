<template>
    <Dialog
        :visible="visible"
        modal
        :closable="true"
        :style="{ width: '26rem' }"
        header="Response"
        class="response-dialog"
        @update:visible="emit('update:visible', $event)"
    >
        <div v-if="response" class="view-response-body">
            <section class="response-section">
                <h3 class="response-section-title">User details</h3>
                <ul class="response-detail-list">
                    <li class="response-detail-row">
                        <img src="../assets/icons/system/clock.svg" alt="" class="detail-icon" />
                        <span class="detail-label">Timestamp</span>
                        <span class="detail-value">{{ formatDate(response.timestamp) }}</span>
                    </li>
                    <li class="response-detail-row">
                        <img :src="deviceIconPath(response.device)" alt="" class="detail-icon" />
                        <span class="detail-label">Device</span>
                        <span class="detail-value">{{ response.device || "—" }}</span>
                    </li>
                    <li class="response-detail-row">
                        <img
                            v-if="response.country && flagPath(response.country)"
                            :src="flagPath(response.country)!"
                            alt=""
                            class="detail-icon detail-icon-flag"
                        />
                        <span v-else class="detail-icon detail-icon-placeholder">🌐</span>
                        <span class="detail-label">Location</span>
                        <span
                            class="detail-value"
                            :class="{ 'detail-muted': !locationLabel(response) && !response.country }"
                        >
                            {{ locationLabel(response) || countryName(response.country) || "—" }}
                        </span>
                    </li>
                    <li v-if="response.browser" class="response-detail-row">
                        <img :src="browserIconPath(response.browser)" alt="" class="detail-icon" />
                        <span class="detail-label">Browser</span>
                        <span class="detail-value">{{ response.browser }}</span>
                    </li>
                    <li v-if="response.os" class="response-detail-row">
                        <img :src="osIconPath(response.os)" alt="" class="detail-icon" />
                        <span class="detail-label">OS</span>
                        <span class="detail-value">{{ response.os }}</span>
                    </li>
                    <li class="response-detail-row">
                        <img src="../assets/icons/system/url.svg" alt="" class="detail-icon" />
                        <span class="detail-label">URL</span>
                        <span class="detail-value detail-value-url">
                            <span class="detail-url-text">{{ truncatePageUrl(response.page_url) }}</span>
                            <button
                                v-if="response.page_url"
                                type="button"
                                class="detail-copy-btn"
                                @click="copyToClipboard(response.page_url!)"
                                title="Copy URL"
                                aria-label="Copy URL"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                            </button>
                        </span>
                    </li>
                </ul>
            </section>
            <section class="response-section response-section-answers">
                <h3 class="response-section-title">Survey answers</h3>
                <div v-for="(question, qIndex) in questions" :key="question.id" class="survey-answer-block">
                    <div class="survey-question-meta">Q.{{ qIndex + 1 }} {{ question.question_type }}</div>
                    <div class="survey-question-text">{{ question.question_text }}</div>
                    <div class="survey-answer-value">
                        {{ getAnswerForQuestion(response, question.id) }}
                    </div>
                </div>
            </section>
        </div>
    </Dialog>
</template>

<script setup lang="ts">
import Dialog from "primevue/dialog";
import type { ResponseRow, SurveyQuestion } from "../types";
import { useResponseFormatters } from "../composables/useResponseFormatters";

const props = defineProps<{
    visible: boolean;
    response: ResponseRow | null;
    questions: SurveyQuestion[];
}>();

const emit = defineEmits<{
    "update:visible": [value: boolean];
}>();

const {
    formatDate,
    deviceIconPath,
    flagPath,
    locationLabel,
    countryName,
    browserIconPath,
    osIconPath,
    truncatePageUrl,
    copyToClipboard,
} = useResponseFormatters();

function getAnswerForQuestion(viewingResp: ResponseRow | null, questionId: string): string {
    if (!viewingResp?.allAnswers) return "—";
    const answer = viewingResp.allAnswers.find((a: any) => a.question_id === questionId);
    return answer?.display_label || "—";
}
</script>

<style scoped>
.view-response-body {
    padding: 0;
}

.response-section {
    margin-bottom: 1.25rem;
}
.response-section:last-child {
    margin-bottom: 0;
}

.response-section-title {
    margin: 0 0 10px 0;
    font-size: 13px;
    font-weight: 600;
    color: #333;
    text-transform: uppercase;
    letter-spacing: 0.02em;
}

.response-detail-list {
    list-style: none;
    margin: 0;
    padding: 0;
}

.response-detail-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    font-size: 14px;
    border-bottom: 1px solid #f0f0f0;
}
.response-detail-row:last-child {
    border-bottom: none;
}

.detail-icon {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    object-fit: contain;
}

.detail-icon-flag {
    width: 20px;
    height: 14px;
    object-fit: cover;
    border-radius: 1px;
}

.detail-icon-placeholder {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    font-size: 14px;
}

.detail-label {
    flex: 0 0 120px;
    color: #666;
    font-size: 12px;
}

.detail-value {
    flex: 1;
    min-width: 0;
    word-break: break-word;
    color: #1a1a1a;
}

.detail-value.detail-muted {
    color: #999;
}

.detail-value-url {
    display: flex;
    align-items: center;
    gap: 8px;
}

.detail-url-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.detail-copy-btn {
    flex-shrink: 0;
    background: transparent;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: #999;
    transition: color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
}
.detail-copy-btn:hover {
    color: #667eea;
    background: #f0f0f0;
}

.response-section-answers {
    padding-top: 0.75rem;
    border-top: 1px solid #e8e8e8;
}

.survey-answer-block {
    font-size: 13px;
    margin-bottom: 16px;
}
.survey-answer-block:last-child {
    margin-bottom: 0;
}

.survey-question-meta {
    color: #666;
    font-size: 12px;
    margin-bottom: 4px;
}

.survey-question-text {
    color: #1a1a1a;
    margin-bottom: 8px;
    line-height: 1.4;
}

.survey-answer-value {
    color: #1a1a1a;
    font-weight: 500;
    padding: 8px 12px;
    background: #f8f9fa;
    border-radius: 6px;
    border-left: 3px solid #667eea;
}
</style>
