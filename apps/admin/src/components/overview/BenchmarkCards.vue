<template>
    <section class="bench" aria-label="How it performed">
        <div class="grid">
            <article v-for="card in cards" :key="card.label" class="card">
                <span class="label">{{ card.label }}</span>
                <div class="value-row">
                    <span class="value">{{ card.value.toFixed(1) }}%</span>
                    <span class="count">{{ card.count }}</span>
                </div>
                <div class="scale" role="img" :aria-label="card.aria">
                    <div class="track"></div>
                    <div
                        class="band"
                        :style="{ left: pos(card.band.p25, card.band.scaleMax), width: bandWidth(card.band) }"
                    ></div>
                    <div class="tick" :style="{ left: pos(card.band.median, card.band.scaleMax) }"></div>
                    <div
                        class="dot"
                        :class="{ alarm: card.alarm }"
                        :style="{ left: pos(card.value, card.band.scaleMax) }"
                    ></div>
                </div>
                <div class="axis">
                    <span>0%</span>
                    <span>{{ card.band.scaleMax }}%</span>
                </div>
                <p class="note">{{ card.note }}</p>
            </article>
        </div>
        <div class="legend">
            <span><i class="swatch dot-swatch"></i>This survey</span>
            <span><i class="swatch band-swatch"></i>Typical range of your surveys (middle 50%)</span>
            <span><i class="swatch tick-swatch"></i>Median</span>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { OverviewBenchmark, SurveyOverview } from "../../types";
import { formatCount, outsideBand } from "../../utils/overviewFormat";

const props = defineProps<{ overview: SurveyOverview }>();

function pos(value: number, scaleMax: number): string {
    if (scaleMax <= 0) return "0%";
    const clamped = Math.min(Math.max(value, 0), scaleMax);
    return `${(clamped / scaleMax) * 100}%`;
}

function bandWidth(band: OverviewBenchmark): string {
    if (band.scaleMax <= 0) return "0%";
    const width = Math.max(0, band.p75 - band.p25);
    return `${(width / band.scaleMax) * 100}%`;
}

function note(band: OverviewBenchmark): string {
    return `Your surveys: median ${band.median.toFixed(1)}%, typical ${band.p25.toFixed(1)}–${band.p75.toFixed(1)}%`;
}

const cards = computed(() => {
    const { totals, benchmarks } = props.overview;
    return [
        {
            label: "Response rate",
            value: totals.responseRate,
            count: `${formatCount(totals.responses)} of ${formatCount(totals.impressions)}`,
            band: benchmarks.responseRate,
            alarm: outsideBand(totals.responseRate, benchmarks.responseRate.p25, benchmarks.responseRate.p75),
            note: note(benchmarks.responseRate),
            aria: `Response rate ${totals.responseRate.toFixed(1)} percent`,
        },
        {
            label: "Close rate",
            value: totals.closeRate,
            count: `${formatCount(totals.closes)} closed`,
            band: benchmarks.closeRate,
            alarm: outsideBand(totals.closeRate, benchmarks.closeRate.p25, benchmarks.closeRate.p75),
            note: note(benchmarks.closeRate),
            aria: `Close rate ${totals.closeRate.toFixed(1)} percent`,
        },
        {
            label: "No action",
            value: totals.noActionRate,
            count: `${formatCount(totals.noAction)} impressions`,
            band: benchmarks.noAction,
            alarm: outsideBand(totals.noActionRate, benchmarks.noAction.p25, benchmarks.noAction.p75),
            note: note(benchmarks.noAction),
            aria: `No action ${totals.noActionRate.toFixed(1)} percent`,
        },
    ];
});
</script>

<style scoped>
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 16px;
}
.card {
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.label {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--ink-2);
}
.value-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
}
.value {
    font-size: 32px;
    font-weight: 800;
    line-height: 1;
}
.count {
    color: var(--muted);
    font-size: 14px;
}
.scale {
    position: relative;
    height: 34px;
    margin-top: 4px;
}
.track,
.band {
    position: absolute;
    top: 12px;
    height: 8px;
    border-radius: 4px;
}
.track {
    left: 0;
    right: 0;
    background: #eef0f5;
}
.band {
    background: var(--brand-mid);
}
.tick {
    position: absolute;
    top: 8px;
    width: 2px;
    height: 16px;
    background: var(--muted);
}
.dot {
    position: absolute;
    top: 4px;
    width: 20px;
    height: 20px;
    margin-left: -10px;
    border-radius: 12px;
    background: var(--brand);
    border: 3px solid #fff;
    box-shadow: 0 0 0 1px var(--brand);
}
.dot.alarm {
    background: var(--red);
    box-shadow: 0 0 0 1px var(--red);
}
.axis,
.legend,
.note {
    font-size: 13px;
}
.axis {
    display: flex;
    justify-content: space-between;
    color: var(--muted);
    font-size: 12px;
}
.note {
    margin: 0;
    color: var(--ink-2);
}
.legend {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    margin-top: 12px;
    color: var(--muted);
    font-size: 12px;
}
.legend span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}
.swatch {
    display: inline-block;
}
.dot-swatch {
    width: 14px;
    height: 14px;
    border-radius: 7px;
    background: var(--brand);
}
.band-swatch {
    width: 22px;
    height: 8px;
    border-radius: 4px;
    background: var(--brand-mid);
}
.tick-swatch {
    width: 2px;
    height: 14px;
    background: var(--muted);
}
</style>
