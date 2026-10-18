<template>
    <section class="card">
        <div class="head"><h2>{{ title }}</h2></div>
        <p v-if="!ready" class="note">
            Device and page rates use impressions saved from 18 Oct 2026. This survey’s earlier impressions don’t have them.
        </p>
        <div v-else class="rows">
            <div v-for="row in rows" :key="row.url || row.name" class="row">
                <span class="name">{{ row.url || row.name }}</span>
                <div class="track"><div class="fill" :style="{ width: width(row.rate) }"></div></div>
                <b>{{ row.rate.toFixed(1) }}%</b>
                <span class="detail">{{ row.responses }} of {{ formatCount(row.impressions) }} · {{ row.shareOfResponses }}%</span>
            </div>
            <p v-if="rows.length === 0" class="note">No tagged impressions in this window yet.</p>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { OverviewSegmentRow } from "../../types";
import { formatCount } from "../../utils/overviewFormat";

const props = defineProps<{
    title: string;
    ready: boolean;
    rows: OverviewSegmentRow[];
}>();

const maxRate = computed(() => Math.max(0, ...props.rows.map((row) => row.rate)));

function width(rate: number): string {
    if (maxRate.value <= 0) return "0%";
    return `${(rate / maxRate.value) * 100}%`;
}
</script>

<style scoped>
.card {
    flex: 1 1 420px;
    min-width: 0;
    border: 1px solid var(--line);
    border-radius: 10px;
    overflow: hidden;
}
.head {
    padding: 16px 22px;
    border-bottom: 1px solid var(--line);
}
h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
}
.rows {
    padding: 8px 22px 16px;
}
.row {
    display: grid;
    grid-template-columns: minmax(90px, 1fr) 1.2fr 56px minmax(120px, 150px);
    gap: 14px;
    align-items: center;
    padding: 12px 0;
    border-top: 1px solid #f0f1f6;
    font-size: 14px;
}
.name {
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.track {
    background: #f0f1f6;
    border-radius: 5px;
    height: 10px;
}
.fill {
    height: 100%;
    border-radius: 5px;
    background: var(--brand);
}
.detail,
.note {
    color: var(--muted);
    font-size: 12px;
    text-align: right;
}
.note {
    margin: 0;
    padding: 16px 22px;
    text-align: left;
    line-height: 1.45;
}
</style>
