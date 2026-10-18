<template>
    <div class="daily-chart">
        <canvas ref="canvas"></canvas>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import {
    BarController,
    BarElement,
    CategoryScale,
    Chart,
    Legend,
    LinearScale,
    Tooltip,
    type ChartConfiguration,
} from "chart.js";
import type { DailyStatDay, DailyStatOption } from "../types";
import { ANSWER_COLORS, formatRate } from "../utils/dailySummary";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const props = defineProps<{
    days: DailyStatDay[];
    options: DailyStatOption[];
    mode: "responses" | "percent" | "rate";
    isText: boolean;
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;

function dayLabel(isoDate: string): string {
    const [year, month, day] = isoDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(date);
    const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
    return [weekday, monthDay];
}

function totalsForMode(): number[] {
    if (props.mode === "rate") return props.days.map((day) => day.response_rate);
    return props.days.map((day) => day.responses);
}

const stackTotalsPlugin = {
    id: "dailyStackTotals",
    afterDatasetsDraw(current: Chart) {
        const totals = totalsForMode();
        const { ctx } = current;
        ctx.save();
        ctx.font = "600 12px Inter, system-ui, sans-serif";
        ctx.fillStyle = "#1a202c";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        totals.forEach((total, index) => {
            if (props.mode !== "rate" && total <= 0) return;
            let top = Number.POSITIVE_INFINITY;
            current.data.datasets.forEach((_, datasetIndex) => {
                const element = current.getDatasetMeta(datasetIndex).data[index] as { y?: number } | undefined;
                if (element && typeof element.y === "number") top = Math.min(top, element.y);
            });
            if (!Number.isFinite(top)) return;
            const label = props.mode === "rate" ? formatRate(total) : String(total);
            const x = (current.getDatasetMeta(0).data[index] as { x?: number } | undefined)?.x;
            if (typeof x !== "number") return;
            ctx.fillText(label, x, top - 4);
        });
        ctx.restore();
    },
};

function buildConfig(): ChartConfiguration<"bar"> {
    const labels = props.days.map((day) => dayLabel(day.date));
    let datasets: ChartConfiguration<"bar">["data"]["datasets"];

    if (props.mode === "rate" || props.isText || props.options.length === 0) {
        datasets = [
            {
                label: props.mode === "rate" ? "Response rate" : "Responses",
                data: props.mode === "rate" ? props.days.map((day) => day.response_rate) : props.days.map((day) => day.responses),
                backgroundColor: ANSWER_COLORS[0],
                borderRadius: 3,
                maxBarThickness: 28,
            },
        ];
    } else if (props.mode === "percent") {
        datasets = props.options.map((option, index) => ({
            label: option.option_text,
            data: props.days.map((day) => {
                const answerTotal = props.options.reduce((sum, item) => sum + (day.options[item.id] ?? 0), 0);
                if (answerTotal <= 0) return 0;
                return ((day.options[option.id] ?? 0) / answerTotal) * 100;
            }),
            backgroundColor: ANSWER_COLORS[index % ANSWER_COLORS.length],
            stack: "answers",
            maxBarThickness: 28,
        }));
    } else {
        datasets = props.options.map((option, index) => ({
            label: option.option_text,
            data: props.days.map((day) => day.options[option.id] ?? 0),
            backgroundColor: ANSWER_COLORS[index % ANSWER_COLORS.length],
            stack: "answers",
            maxBarThickness: 28,
        }));
    }

    return {
        type: "bar",
        data: { labels, datasets },
        plugins: [stackTotalsPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            layout: { padding: { top: 18 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (items) => props.days[items[0]?.dataIndex ?? 0]?.date ?? "",
                        label: (item) => {
                            const value = Number(item.parsed.y ?? 0);
                            if (props.mode === "rate") return `Response rate: ${formatRate(value)}`;
                            if (props.mode === "percent") return `${item.dataset.label}: ${value.toFixed(1)}%`;
                            return `${item.dataset.label}: ${value}`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    stacked: props.mode !== "rate",
                    grid: { display: false },
                    ticks: {
                        color: "#718096",
                        font: { size: 11 },
                        maxRotation: 0,
                        autoSkip: false,
                    },
                },
                y: {
                    stacked: props.mode !== "rate",
                    beginAtZero: true,
                    suggestedMax: props.mode === "percent" ? 100 : undefined,
                    ticks: { color: "#a0aec0", precision: 0 },
                    grid: { color: "#edf2f7" },
                },
            },
        },
    };
}

function render() {
    if (!canvas.value) return;
    chart?.destroy();
    chart = new Chart(canvas.value, buildConfig());
}

onMounted(render);
onUnmounted(() => {
    chart?.destroy();
    chart = null;
});

watch(() => [props.days, props.options, props.mode, props.isText], render, { deep: true });
</script>

<style scoped>
.daily-chart {
    height: 280px;
}
</style>
