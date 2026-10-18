<template>
    <section class="card" v-if="question">
        <div v-if="questions.length > 1" class="qtabs" role="tablist" aria-label="Questions">
            <button
                v-for="item in questions"
                :key="item.id"
                type="button"
                role="tab"
                :aria-selected="item.id === question.id"
                :class="{ on: item.id === question.id }"
                @click="emit('select', item.id)"
            >
                <span class="tab-title"><span class="qchip">Q{{ item.number }}</span>{{ item.short }}</span>
                <span class="tab-meta">{{ item.typeLabel }} · {{ item.answers }} answers</span>
            </button>
        </div>

        <div class="head">
            <div>
                <h2>Q{{ question.number }} {{ question.text }}</h2>
                <div class="meta">
                    <span>{{ countLine }}</span>
                    <span class="pill" :class="reliability.kind">{{ reliability.label }}</span>
                </div>
            </div>
            <div class="seg" role="group" aria-label="Show answers for device">
                <button
                    v-for="item in devices"
                    :key="item.id"
                    type="button"
                    :class="{ on: device === item.id }"
                    :aria-pressed="device === item.id"
                    @click="emit('device', item.id)"
                >
                    {{ item.label }}
                </button>
            </div>
        </div>

        <div v-if="question.answers === 0" class="empty">No answers yet</div>

        <div v-else-if="question.type === 'text'" class="text-body">
            <div class="latest-head">
                <span>Latest answers</span>
                <label>Search<input v-model="search" type="search" placeholder="e.g. price" /></label>
            </div>
            <p v-if="filteredLatest.length === 0" class="empty">No answers match.</p>
            <article v-for="item in filteredLatest" :key="item.at + item.text" class="quote">
                <p>“{{ item.text }}”</p>
                <span>{{ quoteMeta(item) }}</span>
            </article>
            <button type="button" class="link" @click="emit('open-responses', question.id)">
                Read all {{ question.answers }} answers →
            </button>
        </div>

        <div v-else class="options">
            <div class="answer-grid head-row">
                <span>Answer</span>
                <span class="bar"></span>
                <span class="num">Share</span>
                <span class="num">Count</span>
                <span v-if="showShift" class="num shift">1st half → 2nd half</span>
            </div>
            <div v-for="option in question.options" :key="option.id" class="option-block">
                <div class="answer-grid">
                    <span class="option-label">
                        <button
                            v-if="option.comments?.length"
                            type="button"
                            class="chevron"
                            :class="{ open: isOpen(option.id) }"
                            :aria-expanded="isOpen(option.id)"
                            :aria-controls="`comments-${option.id}`"
                            @click="toggle(option.id)"
                        >
                            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                                <path d="M3 5.2 7 9l4-3.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                            <span class="sr">{{ isOpen(option.id) ? "Hide" : "Show" }} {{ option.comments.length }} comments</span>
                        </button>
                        <span v-else-if="hasComments" class="chevron-gap" aria-hidden="true"></span>
                        {{ option.label }}
                    </span>
                    <div class="track bar">
                        <div class="fill" :class="{ faded }" :style="{ width: barWidth(option.count) }"></div>
                    </div>
                    <span class="num share">{{ option.share }}%</span>
                    <span class="num count">{{ option.count }}</span>
                    <span v-if="showShift" class="num shift" :class="{ moved: option.shift }">
                        {{ option.shift ? shiftLabel(option.shift.from, option.shift.to, option.shift.delta) : "—" }}
                    </span>
                </div>
                <div v-if="isOpen(option.id)" :id="`comments-${option.id}`" class="comments">
                    <p v-for="(comment, index) in option.comments" :key="`${option.id}-${index}`" class="comment">
                        <span>“{{ comment.text }}”</span>
                        <time>{{ formatNyDateTime(comment.at) }}</time>
                    </p>
                </div>
            </div>
        </div>

        <p class="foot">{{ footer }}</p>
    </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { OverviewQuestion } from "../../types";
import { formatDevice, formatNyDateTime, shiftLabel } from "../../utils/overviewFormat";

const props = defineProps<{
    questions: OverviewQuestion[];
    questionId: string | null;
    device: "all" | "mobile" | "desktop" | "tablet";
}>();

const emit = defineEmits<{
    select: [id: string];
    device: [device: "all" | "mobile" | "desktop" | "tablet"];
    "open-responses": [questionId: string];
}>();

const devices = [
    { id: "all", label: "All" },
    { id: "mobile", label: "Mobile" },
    { id: "desktop", label: "Desktop" },
    { id: "tablet", label: "Tablet" },
] as const;

const search = ref("");
const openIds = ref<string[]>([]);
watch(
    () => [props.questionId, props.device] as const,
    () => {
        search.value = "";
        openIds.value = [];
    }
);

function isOpen(id: string): boolean {
    return openIds.value.includes(id);
}

function toggle(id: string) {
    openIds.value = isOpen(id) ? openIds.value.filter((item) => item !== id) : [...openIds.value, id];
}

const question = computed(() => props.questions.find((item) => item.id === props.questionId) ?? props.questions[0] ?? null);

const hasComments = computed(() => (question.value?.options ?? []).some((option) => (option.comments?.length ?? 0) > 0));

const faded = computed(() => (question.value?.answers ?? 0) < 30);

const showShift = computed(
    () => props.device === "all" && (question.value?.options ?? []).some((option) => option.shift)
);

const maxCount = computed(() => Math.max(1, ...(question.value?.options ?? []).map((option) => option.count)));

const reliability = computed(() => {
    const n = question.value?.answers ?? 0;
    if (n >= 100) return { kind: "good", label: "Reliable · 100+ answers" };
    if (n >= 30) return { kind: "early", label: `Early results · ${100 - n} more to be reliable` };
    return { kind: "few", label: "Too few answers to compare (under 30)" };
});

const countLine = computed(() => {
    const current = question.value;
    if (!current) return "";
    const where = props.device === "all" ? "" : ` on ${props.device}`;
    if (current.type === "text") {
        return `${current.answers} written answers${where} · ${current.answeredShare ?? 0}% of people answered`;
    }
    if (current.type === "checkbox") {
        return `${current.answers} answered${where} · ${(current.averagePicks ?? 0).toFixed(1)} options picked on average`;
    }
    return `${current.answers} answers${where}`;
});

const footer = computed(() => {
    if (question.value?.type === "checkbox") {
        return "% of people who answered. People can pick several, so shares add up to more than 100%.";
    }
    if (question.value?.type === "text") {
        return "Every answer is still readable in full.";
    }
    return "Results become reliable at 100 answers; below 30 they’re greyed out. Shift is shown when an option moved 10+ points between halves.";
});

const filteredLatest = computed(() => {
    const query = search.value.trim().toLowerCase();
    const rows = question.value?.latest ?? [];
    if (!query) return rows;
    return rows.filter((row) => row.text.toLowerCase().includes(query));
});

function barWidth(count: number): string {
    return `${(count / maxCount.value) * 100}%`;
}

function quoteMeta(item: { at: string; device: string | null; browser: string | null; location: string | null }): string {
    return [formatNyDateTime(item.at), [formatDevice(item.device), item.browser].filter(Boolean).join(" · "), item.location]
        .filter(Boolean)
        .join(" · ");
}
</script>

<style scoped>
.card {
    border: 1px solid var(--line);
    border-radius: 10px;
    overflow: hidden;
}
.qtabs {
    display: flex;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--line);
    background: var(--panel);
}
.qtabs button {
    min-height: 64px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 4px;
    padding: 10px 22px;
    border: 0;
    background: transparent;
    text-align: left;
    border-bottom: 3px solid transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
}
.qtabs button.on {
    background: #fff;
    border-bottom-color: var(--brand);
}
.tab-title {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 14px;
    font-weight: 700;
}
.qchip {
    font-size: 12px;
    font-weight: 800;
    border-radius: 6px;
    padding: 2px 7px;
    background: var(--brand-soft);
    color: var(--brand-ink);
}
.qtabs button.on .qchip {
    background: var(--brand);
    color: #fff;
}
.tab-meta {
    font-size: 12px;
    color: var(--muted);
}
.head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 18px 22px;
    border-bottom: 1px solid var(--line);
}
h2 {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 800;
}
.meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    color: var(--muted);
    font-size: 14px;
}
.pill {
    border-radius: 12px;
    padding: 3px 10px;
    font-size: 13px;
    font-weight: 700;
}
.pill.good {
    background: var(--green-bg);
    color: var(--green-ink);
}
.pill.early {
    background: #fdf3e3;
    color: #8a5a12;
}
.pill.few {
    background: #eceef4;
    color: var(--ink-2);
}
.seg {
    display: flex;
    border: 1px solid #cfd3e3;
    border-radius: 8px;
    overflow: hidden;
    height: fit-content;
}
.seg button {
    min-height: 40px;
    padding: 0 14px;
    border: 0;
    background: #fff;
    color: var(--ink-2);
    font: inherit;
    font-size: 13px;
    cursor: pointer;
}
.seg button + button {
    border-left: 1px solid #cfd3e3;
}
.seg button.on {
    background: var(--brand);
    color: #fff;
    font-weight: 700;
}
.options {
    padding: 6px 22px 10px;
}
.answer-grid {
    display: grid;
    grid-template-columns: minmax(140px, 230px) 1fr 64px 70px minmax(140px, 180px);
    gap: 16px;
    align-items: center;
    padding: 11px 0;
    border-top: 1px solid #f0f1f6;
}
.head-row {
    border-top: 0;
    color: var(--muted);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding-bottom: 4px;
}
.option-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 15px;
    font-weight: 600;
}
.chevron,
.chevron-gap {
    width: 22px;
    height: 22px;
    flex: 0 0 22px;
}
.chevron {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
}
.chevron:hover {
    background: var(--brand-soft);
    color: var(--brand-ink);
}
.chevron svg {
    transition: transform 0.15s ease;
}
.chevron.open svg {
    transform: rotate(180deg);
}
.sr {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}
.comments {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0 0 8px 28px;
}
.comment {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin: 0;
    padding: 8px 12px;
    border: 1px solid #eceef4;
    border-radius: 8px;
    background: #fff;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.4;
}
.comment time {
    flex: 0 0 auto;
    color: var(--muted);
    font-size: 12px;
    font-weight: 600;
}
.num {
    text-align: right;
}
.share {
    font-size: 16px;
    font-weight: 800;
}
.count,
.shift {
    font-size: 13px;
    color: var(--faint);
    font-weight: 700;
}
.shift.moved {
    color: #8a5a12;
}
.track {
    background: #f0f1f6;
    border-radius: 5px;
    height: 22px;
}
.fill {
    height: 100%;
    border-radius: 5px;
    background: var(--brand);
}
.fill.faded {
    background: #c9cdda;
}
.empty {
    margin: 0;
    padding: 18px 22px;
    color: var(--muted);
}
.text-body {
    padding: 18px 22px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.latest-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    font-weight: 800;
}
.latest-head label {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--muted);
    font-size: 14px;
    font-weight: 400;
}
.latest-head input {
    min-height: 36px;
    padding: 0 10px;
    border: 1px solid #cfd3e3;
    border-radius: 8px;
    font: inherit;
    width: 150px;
}
.quote {
    border: 1px solid #eceef4;
    border-radius: 8px;
    padding: 12px 14px;
}
.quote p {
    margin: 0 0 4px;
    line-height: 1.45;
}
.quote span,
.foot {
    color: var(--muted);
    font-size: 12px;
}
.foot {
    margin: 0;
    padding: 12px 22px;
    background: var(--panel);
}
.link {
    border: 0;
    background: transparent;
    color: var(--brand-ink);
    font: inherit;
    font-weight: 700;
    text-align: left;
    cursor: pointer;
    padding: 0;
}
@media (max-width: 640px) {
    .answer-grid {
        grid-template-columns: 1fr 56px 56px;
    }
    .answer-grid .bar,
    .answer-grid .shift {
        display: none;
    }
    .comment {
        flex-wrap: wrap;
    }
}
</style>
