<template>
    <div>
        <div class="summary-section">
            <h3>Survey Details</h3>
            <div class="summary-item"><strong>Name:</strong> {{ surveyName || "Not set" }}</div>
            <div class="summary-item"><strong>Type:</strong> Popover</div>
            <div class="summary-item"><strong>Questions:</strong> {{ questionCount }}</div>
        </div>

        <div class="summary-section">
            <h3>Targeting</h3>
            <div class="summary-item">
                <strong>Pages:</strong>
                {{ targeting.pageType === "all" ? "All pages" : `${targeting.pageRules.length} rule(s)` }}
            </div>
            <div class="summary-item">
                <strong>Users:</strong>
                {{ targeting.userType === "all" ? "All users" : `${targeting.userRules.length} user rule(s)` }}
            </div>
        </div>

        <div class="summary-section">
            <h3>Behavior</h3>
            <div class="summary-item">
                <strong>Timing:</strong>
                {{
                    behavior.timing === "immediate"
                        ? "Immediately"
                        : behavior.timing === "scroll"
                        ? `After ${behavior.scrollPercentage}% scroll`
                        : `After ${behavior.delaySeconds} seconds`
                }}
            </div>
            <div class="summary-item">
                <strong>Frequency:</strong>
                {{
                    behavior.frequency === "until_submit"
                        ? "Until they submit"
                        : behavior.frequency === "once"
                        ? "Only once"
                        : "Always"
                }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { SurveyData } from "../../types/survey-editor";

defineProps<{
    surveyName: string;
    questionCount: number;
    targeting: SurveyData["targeting"];
    behavior: SurveyData["behavior"];
}>();
</script>

<style scoped>
.summary-section {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 16px;
}

.summary-section h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: #111827;
}

.summary-item {
    margin-bottom: 12px;
    font-size: 14px;
    color: #374151;
    line-height: 1.6;
}

.summary-item:last-child {
    margin-bottom: 0;
}

.summary-item strong {
    color: #111827;
    font-weight: 600;
}
</style>
