<template>
    <section class="card">
        <div class="head">
            <div>
                <h2>Answers per day</h2>
                <p>Days in New York time</p>
            </div>
            <button type="button" class="link" @click="emit('open')">Open daily breakdown →</button>
        </div>
        <div v-if="days.length === 0" class="empty">No impressions yet.</div>
        <div v-else class="scroll">
            <div class="bars">
                <div v-for="day in days" :key="day.date" class="col">
                    <span>{{ day.responses }}</span>
                    <div class="bar" :style="{ height: height(day.responses) }"></div>
                </div>
            </div>
            <div class="labels">
                <span v-for="day in days" :key="day.date">{{ label(day.date) }}</span>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatMonthDay } from "../../utils/overviewFormat";

const props = defineProps<{ days: Array<{ date: string; responses: number }> }>();
const emit = defineEmits<{ open: [] }>();

const max = computed(() => Math.max(1, ...props.days.map((day) => day.responses)));

function height(count: number): string {
    return `${Math.max(2, (count / max.value) * 90)}px`;
}

function label(iso: string): string {
    return formatMonthDay(iso).replace(" ", "\n");
}
</script>

<style scoped>
.card {
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 20px 22px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
}
h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
}
p,
.empty {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 13px;
}
.link {
    border: 0;
    background: transparent;
    color: var(--brand-ink);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
}
.scroll {
    overflow-x: auto;
}
.bars,
.labels {
    display: flex;
    gap: 8px;
    min-width: 560px;
}
.bars {
    align-items: flex-end;
    height: 110px;
    border-bottom: 1px solid #cfd3e3;
}
.col {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    height: 100%;
}
.col span,
.labels span {
    font-size: 11px;
    font-weight: 700;
    color: var(--ink-2);
}
.labels span {
    flex: 1 1 0;
    text-align: center;
    color: var(--muted);
    font-weight: 600;
    white-space: pre-line;
    padding-top: 6px;
}
.bar {
    width: 100%;
    max-width: 36px;
    background: #8f99ea;
    border-radius: 4px 4px 0 0;
}
</style>
