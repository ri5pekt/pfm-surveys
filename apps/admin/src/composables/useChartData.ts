import { ref, type Ref } from "vue";
import type { ResponseSummary } from "../types";

/**
 * Composable for chart data management
 * Handles bar chart visibility, pie chart data transformation, and metrics calculation
 */
export function useChartData() {
    const expandedBars = ref<Record<string, boolean>>({});
    const showBarsLimit = 5;

    // Calculate response rate percentage
    function calculateResponseRate(metrics: { impressions: number; responses: number }): string {
        if (metrics.impressions === 0) return "0.0";
        const rate = (metrics.responses / metrics.impressions) * 100;
        return rate.toFixed(1);
    }

    // Get visible bars (with show more/less logic)
    function getVisibleBars(questionId: string, questionDataValue: Record<string, ResponseSummary>) {
        const bars = questionDataValue[questionId]?.bars ?? [];
        if (expandedBars.value[questionId] || bars.length <= showBarsLimit) {
            return bars;
        }
        return bars.slice(0, showBarsLimit);
    }

    // Toggle bar expansion for a question
    function toggleShowAllBars(questionId: string) {
        expandedBars.value[questionId] = !expandedBars.value[questionId];
    }

    // Transform bar chart data to pie chart format.
    // For text-answer questions, maxSlices limits to top N (e.g. 5) and groups the rest as "Other".
    function getPieChartData(
        questionId: string,
        questionDataValue: Record<string, ResponseSummary>,
        maxSlices?: number
    ) {
        let bars = questionDataValue[questionId]?.bars ?? [];
        const colors = ["#667eea", "#e53e3e", "#38a169", "#805ad5", "#2b6cb0"];

        if (maxSlices != null && bars.length > maxSlices) {
            const top = bars.slice(0, maxSlices);
            const rest = bars.slice(maxSlices);
            const otherCount = rest.reduce((sum, b) => sum + b.count, 0);
            bars = [...top];
            if (otherCount > 0) {
                bars.push({ label: "Other", count: otherCount, percentage: 0 });
            }
        }

        return bars.map((bar, idx) => ({
            label: bar.label,
            value: bar.count,
            color: colors[idx % colors.length],
        }));
    }

    return {
        expandedBars,
        showBarsLimit,
        calculateResponseRate,
        getVisibleBars,
        toggleShowAllBars,
        getPieChartData,
    };
}
