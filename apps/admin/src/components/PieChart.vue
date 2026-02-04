<template>
    <canvas ref="chartCanvas"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { Chart, ArcElement, Tooltip, Legend, PieController, type ChartConfiguration } from "chart.js";

Chart.register(ArcElement, Tooltip, Legend, PieController);

interface Props {
    data: Array<{ label: string; value: number; color: string }>;
}

const props = defineProps<Props>();
const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const createChart = () => {
    if (!chartCanvas.value) return;

    // Destroy existing chart
    if (chartInstance) {
        chartInstance.destroy();
    }

    const config: ChartConfiguration<"pie"> = {
        type: "pie",
        data: {
            labels: props.data.map((d) => d.label),
            datasets: [
                {
                    data: props.data.map((d) => d.value),
                    backgroundColor: props.data.map((d) => d.color),
                    borderWidth: 2,
                    borderColor: "#ffffff",
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || "";
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0) as number;
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${percentage}% (${value})`;
                        },
                    },
                },
            },
        },
    };

    chartInstance = new Chart(chartCanvas.value, config);
};

onMounted(() => {
    createChart();
});

watch(
    () => props.data,
    () => {
        createChart();
    },
    { deep: true }
);
</script>

<style scoped>
canvas {
    max-width: 180px !important;
    max-height: 180px !important;
    width: 100% !important;
    height: 100% !important;
}
</style>
