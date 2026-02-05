<template>
    <div class="question-block">
        <div class="summary-card">
            <div class="card-header">
                <div class="card-header-main">
                    <span class="question-label">Q.{{ index + 1 }} {{ question.question_text }}</span>
                    <span class="answer-count">{{ data?.totalAnswers ?? 0 }} answers</span>
                </div>
                <button
                    type="button"
                    class="show-responses-btn"
                    :class="{ 'show-responses-btn-active': selectedForResponsesTable }"
                    @click="emit('showIndividualResponses', question.id)"
                >
                    {{ selectedForResponsesTable ? "Showing Individual responses" : "Show Individual responses" }}
                </button>
            </div>
            <div class="card-body" :class="{ 'card-body-phrases': isTextQuestion }">
                <!-- Open-text: Most used 2-word phrases (replaces charts) -->
                <template v-if="isTextQuestion">
                    <div class="phrases-section">
                        <h4 class="phrases-title">Most used 2-word phrases</h4>
                        <p v-if="!phrases.length" class="phrases-empty">
                            No repeated phrases yet (need 2+ answers containing the same phrase).
                        </p>
                        <ul v-else class="phrases-list">
                            <li
                                v-for="(item, idx) in phrases"
                                :key="item.phrase"
                                class="phrases-item"
                                :class="{ 'phrases-item-striped': idx % 2 === 1 }"
                            >
                                <span class="phrases-phrase">{{ item.phrase }}</span>
                                <span class="phrases-count">{{ item.answerCount }} answers</span>
                            </li>
                        </ul>
                    </div>
                </template>
                <!-- Radio/choice: top answer + bars + pie chart -->
                <template v-else>
                    <div class="top-answer" v-if="data?.topAnswer">
                        <div class="top-answer-label">Top answer</div>
                        <div class="top-answer-value">{{ data.topAnswer.percentage }}%</div>
                        <div class="top-answer-text">{{ data.topAnswer.label }}</div>
                    </div>
                    <div class="bars-section">
                        <div
                            v-for="(bar, idx) in visibleBars"
                            :key="bar.label"
                            class="bar-row"
                            :class="{ 'bar-row-striped': idx % 2 === 1 }"
                        >
                            <div class="bar-label">{{ bar.label }}</div>
                            <div class="bar-percentage" :class="'bar-color-' + (idx % 5)">{{ bar.percentage }}%</div>
                            <div class="bar-track">
                                <div
                                    class="bar-fill"
                                    :style="{ width: bar.percentage + '%' }"
                                    :class="'bar-color-' + (idx % 5)"
                                ></div>
                            </div>
                            <div class="bar-count">{{ bar.count }} answers</div>
                        </div>
                        <button
                            v-if="data?.bars && data.bars.length > showBarsLimit"
                            type="button"
                            class="see-more-btn"
                            @click="toggleExpanded"
                        >
                            {{ isExpanded ? "See fewer" : "See more answers" }} ▼
                        </button>
                    </div>
                    <div class="pie-chart-container">
                        <PieChart v-if="pieChartData && pieChartData.length > 0" :data="pieChartData" />
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import PieChart from "./PieChart.vue";
import type { SurveyQuestion, ResponseSummary } from "../types";

const props = defineProps<{
    question: SurveyQuestion;
    index: number;
    data: ResponseSummary | undefined;
    pieChartData: any[];
    /** When set, this question's responses are shown in the Individual responses table */
    selectedForResponsesTable?: boolean;
}>();

const emit = defineEmits<{
    toggleExpanded: [questionId: string];
    showIndividualResponses: [questionId: string];
}>();

const isExpanded = ref(false);
const showBarsLimit = 5;

const isTextQuestion = computed(() => props.question.question_type === "text");
const phrases = computed(() => props.data?.twoWordPhrases ?? []);

const visibleBars = computed(() => {
    const bars = props.data?.bars ?? [];
    if (isExpanded.value || bars.length <= showBarsLimit) {
        return bars;
    }
    return bars.slice(0, showBarsLimit);
});

function toggleExpanded() {
    isExpanded.value = !isExpanded.value;
    emit("toggleExpanded", props.question.id);
}
</script>

<style scoped>
.question-block {
    margin-bottom: 48px;
}
.question-block:last-child {
    margin-bottom: 0;
}

.summary-card {
    border: 1px solid #e1e4e8;
    border-radius: 12px;
    background: white;
    overflow: hidden;
    transition: box-shadow 0.2s;
}
.summary-card:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.card-header {
    padding: 20px 24px;
    background: linear-gradient(to right, #f8f9fa, #ffffff);
    border-bottom: 1px solid #e1e4e8;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
}

.card-header-main {
    display: flex;
    align-items: center;
    gap: 12px;
}

.show-responses-btn {
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 500;
    color: #667eea;
    background: transparent;
    border: 1px solid #667eea;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
}
.show-responses-btn:hover {
    background: #667eea;
    color: white;
}
.show-responses-btn-active {
    background: #667eea;
    color: white;
}

.question-label {
    font-weight: 600;
    font-size: 16px;
    color: #1a202c;
}

.answer-count {
    font-size: 14px;
    color: #718096;
    font-weight: 500;
}

.card-body {
    padding: 20px;
    display: grid;
    grid-template-columns: 180px 1fr 240px;
    gap: 24px;
    align-items: stretch;
}
.card-body-phrases {
    grid-template-columns: 1fr;
}

.phrases-section {
    grid-column: 1 / -1;
}
.phrases-title {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #4a5568;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
.phrases-empty {
    margin: 0;
    color: #718096;
    font-size: 14px;
}
.phrases-list {
    margin: 0;
    padding: 0;
    list-style: none;
    border: 1px solid #e1e4e8;
    border-radius: 8px;
    overflow: hidden;
}
.phrases-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    font-size: 14px;
    transition: background-color 0.2s;
}
.phrases-item-striped {
    background-color: #f6f8fa;
}
.phrases-item:hover {
    background-color: #eef1f5;
}
.phrases-phrase {
    font-weight: 500;
    color: #1a202c;
}
.phrases-count {
    font-weight: 600;
    color: #667eea;
    flex-shrink: 0;
    margin-left: 12px;
}

@media (max-width: 1200px) {
    .card-body {
        grid-template-columns: 180px 1fr;
    }
    .pie-chart-container {
        display: none;
    }
}

@media (max-width: 768px) {
    .card-body {
        grid-template-columns: 1fr;
    }
}

.pie-chart-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    border-left: 1px solid #e1e4e8;
    height: 100%;
}

.top-answer {
    background: #f6f8fa;
    border: 1px solid #e1e4e8;
    border-radius: 12px;
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    transition: all 0.2s;
    text-align: center;
}
.top-answer:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.top-answer-label {
    font-size: 12px;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
    margin-bottom: 12px;
    letter-spacing: 0.5px;
}

.top-answer-value {
    font-size: 36px;
    font-weight: 700;
    color: #667eea;
    line-height: 1;
    margin-bottom: 8px;
}

.top-answer-text {
    font-size: 14px;
    font-weight: 500;
    color: #333;
    word-break: break-word;
    line-height: 1.4;
}

.bars-section {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.bar-row {
    display: grid;
    grid-template-columns: 1fr 70px 140px 90px;
    gap: 12px;
    align-items: center;
    padding: 12px 16px;
    border-radius: 8px;
    transition: background-color 0.2s;
}
.bar-row:hover {
    background-color: #f8f9fa;
}

.bar-row-striped {
    background-color: #f6f8fa;
}
.bar-row-striped:hover {
    background-color: #eef1f5;
}

.bar-label {
    color: #333;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 15px;
}

.bar-percentage {
    font-weight: 700;
    font-size: 14px;
    text-align: right;
}
.bar-percentage.bar-color-0 {
    color: #667eea;
}
.bar-percentage.bar-color-1 {
    color: #e53e3e;
}
.bar-percentage.bar-color-2 {
    color: #38a169;
}
.bar-percentage.bar-color-3 {
    color: #805ad5;
}
.bar-percentage.bar-color-4 {
    color: #2b6cb0;
}

.bar-track {
    height: 28px;
    background: #f0f0f0;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.08);
}

.bar-fill {
    height: 100%;
    border-radius: 6px;
    transition: width 0.3s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
.bar-fill.bar-color-0 {
    background: #667eea;
}
.bar-fill.bar-color-1 {
    background: #e53e3e;
}
.bar-fill.bar-color-2 {
    background: #38a169;
}
.bar-fill.bar-color-3 {
    background: #805ad5;
}
.bar-fill.bar-color-4 {
    background: #2b6cb0;
}

.bar-count {
    color: #666;
    text-align: right;
    font-size: 13px;
    font-weight: 600;
}

.see-more-btn {
    background: none;
    border: none;
    color: #667eea;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    padding: 12px 16px;
    margin-top: 8px;
    transition: color 0.2s;
}
.see-more-btn:hover {
    color: #764ba2;
    text-decoration: underline;
}
</style>
