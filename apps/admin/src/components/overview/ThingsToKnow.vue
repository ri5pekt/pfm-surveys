<template>
    <section v-if="alerts.items.length" class="things" aria-label="Things to know">
        <div class="head">
            <h2>{{ alerts.items.length }} {{ alerts.items.length === 1 ? "thing" : "things" }} to know</h2>
            <span v-if="alerts.comparedTo">Checked against {{ alerts.comparedTo }} surveys with 200 or more impressions</span>
        </div>
        <div class="grid">
            <article v-for="item in alerts.items" :key="item.id" class="alert" :class="item.tone">
                <span class="kicker">{{ item.kicker }}</span>
                <span class="title">{{ item.title }}</span>
                <span class="body">{{ item.body }}</span>
            </article>
        </div>
    </section>
</template>

<script setup lang="ts">
import type { SurveyOverview } from "../../types";

defineProps<{ alerts: SurveyOverview["alerts"] }>();
</script>

<style scoped>
.things {
    display: flex;
    flex-direction: column;
    gap: 10px;
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
.head span {
    color: var(--muted);
    font-size: 12px;
}
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 12px;
}
.alert {
    border-radius: 10px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: 1px solid;
}
.kicker {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.06em;
}
.title {
    font-size: 15px;
    font-weight: 800;
}
.body {
    font-size: 13px;
    color: var(--ink-2);
    line-height: 1.45;
}
.problem {
    background: #fdf3f2;
    border-color: #f1c9c5;
}
.problem .kicker {
    color: #a1342d;
}
.caution {
    background: #fdf7ee;
    border-color: #f0d9b5;
}
.caution .kicker {
    color: #8a5a12;
}
</style>
