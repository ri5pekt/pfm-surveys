<template>
    <div v-if="overview" class="stats-overview">
        <p v-if="overview.totals.impressions === 0" class="empty">No impressions yet.</p>
        <template v-else>
            <ThingsToKnow :alerts="overview.alerts" />
            <BenchmarkCards :overview="overview" />
            <OutcomeBar :totals="overview.totals" />
            <OverviewQuestionCard
                :questions="overview.questions"
                :question-id="questionId"
                :device="device"
                @select="emit('select-question', $event)"
                @device="emit('device', $event)"
                @open-responses="emit('open-responses', $event)"
            />
            <div class="split">
                <RateListCard title="Response rate by device" :ready="overview.segments.devices.ready" :rows="overview.segments.devices.rows" />
                <RateListCard title="Response rate by page" :ready="overview.segments.pages.ready" :rows="overview.segments.pages.rows" />
            </div>
            <AnswersPerDayChart :days="overview.daily" @open="emit('open-daily')" />
            <LatestResponsesStrip :rows="overview.latest" :total="overview.totals.responses" @open="emit('open-all')" />
        </template>
    </div>
    <p v-else-if="loading" class="empty">Loading overview…</p>
    <p v-else class="empty">Overview couldn’t be loaded.</p>
</template>

<script setup lang="ts">
import type { SurveyOverview } from "../../types";
import ThingsToKnow from "./ThingsToKnow.vue";
import BenchmarkCards from "./BenchmarkCards.vue";
import OutcomeBar from "./OutcomeBar.vue";
import OverviewQuestionCard from "./OverviewQuestionCard.vue";
import RateListCard from "./RateListCard.vue";
import AnswersPerDayChart from "./AnswersPerDayChart.vue";
import LatestResponsesStrip from "./LatestResponsesStrip.vue";

defineProps<{
    overview: SurveyOverview | null;
    loading: boolean;
    questionId: string | null;
    device: "all" | "mobile" | "desktop" | "tablet";
}>();

const emit = defineEmits<{
    device: [device: "all" | "mobile" | "desktop" | "tablet"];
    "select-question": [id: string];
    "open-responses": [questionId: string];
    "open-daily": [];
    "open-all": [];
}>();
</script>

<style scoped>
.stats-overview {
    --ink: #1f2333;
    --ink-2: #3c4150;
    --muted: #5b6170;
    --faint: #9aa0ae;
    --line: #e3e5ee;
    --panel: #f8f9fc;
    --brand: #5b67e0;
    --brand-ink: #4f5bd5;
    --brand-soft: #eef0fd;
    --brand-mid: #c7ccf6;
    --red: #b23a33;
    --green-ink: #2a6b3f;
    --green-bg: #e7f4ec;
    --orange: #e0844a;
    --grey-bar: #e6e8f0;
    display: flex;
    flex-direction: column;
    gap: 24px;
    color: var(--ink);
    font-family: "Nunito Sans", system-ui, sans-serif;
}
.split {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
}
.empty {
    margin: 0;
    color: #5b6170;
}
</style>
