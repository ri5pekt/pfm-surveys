<template>
    <section class="card">
        <div class="head">
            <h2>Latest responses</h2>
            <button type="button" class="link" @click="emit('open')">See all {{ total }} →</button>
        </div>
        <p v-if="rows.length === 0" class="empty">No responses yet.</p>
        <div v-else class="scroll">
            <table>
                <thead>
                    <tr>
                        <th>Answer</th>
                        <th>Device</th>
                        <th>Location</th>
                        <th class="time">New York time</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(row, index) in rows" :key="index">
                        <td class="answer">{{ row.answer }}</td>
                        <td>{{ deviceLine(row) }}</td>
                        <td>{{ row.location || "—" }}</td>
                        <td class="time">{{ formatNyDateTime(row.at) }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </section>
</template>

<script setup lang="ts">
import type { SurveyOverview } from "../../types";
import { formatDevice, formatNyDateTime } from "../../utils/overviewFormat";

defineProps<{
    rows: SurveyOverview["latest"];
    total: number;
}>();
const emit = defineEmits<{ open: [] }>();

function deviceLine(row: SurveyOverview["latest"][number]): string {
    return [formatDevice(row.device), row.browser].filter(Boolean).join(" · ") || "—";
}
</script>

<style scoped>
.card {
    border: 1px solid var(--line);
    border-radius: 10px;
    overflow: hidden;
}
.head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    padding: 16px 22px;
    border-bottom: 1px solid var(--line);
}
h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
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
table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    min-width: 640px;
}
th {
    text-align: left;
    font-size: 11px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--muted);
    padding: 10px 22px;
    background: var(--panel);
}
td {
    padding: 12px 22px;
    border-top: 1px solid #eceef4;
    color: var(--ink-2);
}
.answer {
    font-weight: 700;
    color: var(--ink);
}
.time {
    text-align: right;
    color: var(--muted);
}
.empty {
    margin: 0;
    padding: 16px 22px;
    color: var(--muted);
}
</style>
