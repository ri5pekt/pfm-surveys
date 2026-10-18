<template>
    <section class="card">
        <div class="head">
            <h2>What happened after the survey was shown</h2>
            <span class="muted">{{ formatCount(totals.impressions) }} impressions</span>
        </div>
        <div
            class="bar"
            role="img"
            :aria-label="`Answered ${answered.toFixed(1)}%, closed ${closed.toFixed(1)}%, no action ${ignored.toFixed(1)}%`"
        >
            <div class="seg answered" :style="{ width: answered + '%' }"></div>
            <div class="seg closed" :style="{ width: closed + '%' }"></div>
            <div class="seg ignored"></div>
        </div>
        <div class="legend">
            <span><i class="swatch answered"></i><b>{{ formatCount(totals.responses) }} answered</b> <em>{{ answered.toFixed(1) }}%</em></span>
            <span><i class="swatch closed"></i><b>{{ formatCount(totals.closes) }} closed</b> <em>{{ closed.toFixed(1) }}%</em></span>
            <span><i class="swatch ignored"></i><b>{{ formatCount(totals.noAction) }} no action</b> <em>{{ ignored.toFixed(1) }}%</em></span>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { SurveyOverview } from "../../types";
import { formatCount } from "../../utils/overviewFormat";

const props = defineProps<{ totals: SurveyOverview["totals"] }>();

const answered = computed(() => props.totals.responseRate);
const closed = computed(() => props.totals.closeRate);
const ignored = computed(() => props.totals.noActionRate);
</script>

<style scoped>
.card {
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
}
.head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    align-items: baseline;
}
h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
}
.muted,
em {
    color: var(--muted);
    font-style: normal;
    font-size: 14px;
}
.bar {
    display: flex;
    height: 36px;
    border-radius: 8px;
    overflow: hidden;
    background: var(--grey-bar);
}
.seg.answered,
.swatch.answered {
    background: var(--brand-ink);
}
.seg.closed,
.swatch.closed {
    background: var(--orange);
}
.seg.ignored {
    flex-grow: 1;
    background: var(--grey-bar);
}
.legend {
    display: flex;
    flex-wrap: wrap;
    gap: 28px;
    font-size: 14px;
}
.legend span {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}
.swatch {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    display: inline-block;
}
.swatch.ignored {
    background: var(--grey-bar);
    border: 1px solid #cfd3e3;
}
</style>
