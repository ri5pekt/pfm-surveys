<template>
    <div class="metrics-cards" v-if="metrics">
        <div class="metric-card metric-card-highlight">
            <div class="metric-label">Response Rate</div>
            <div class="metric-value-large">{{ calculateResponseRate(metrics) }}%</div>
            <div class="metric-subtitle">{{ metrics.responses }} / {{ metrics.impressions }} conversions</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Impressions</div>
            <div class="metric-value-large">{{ metrics.impressions }}</div>
            <div class="metric-subtitle">Survey shown</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Responses</div>
            <div class="metric-value-large">{{ metrics.responses }}</div>
            <div class="metric-subtitle">Completed surveys</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Dismissals</div>
            <div class="metric-value-large">{{ metrics.dismissals }}</div>
            <div class="metric-subtitle">
                {{ metrics.closeCount }} closed, {{ metrics.minimizeCount }} minimized
                <span v-if="metrics.autoCloseCount > 0">, {{ metrics.autoCloseCount }} auto-closed</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Metrics {
    impressions: number;
    responses: number;
    dismissals: number;
    closeCount: number;
    minimizeCount: number;
    autoCloseCount: number;
}

defineProps<{
    metrics: Metrics | null;
}>();

function calculateResponseRate(metrics: Metrics): string {
    if (metrics.impressions === 0) return "0.0";
    const rate = (metrics.responses / metrics.impressions) * 100;
    return rate.toFixed(1);
}
</script>

<style scoped>
.metrics-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 32px;
}

.metric-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    border: 1px solid #e2e8f0;
    transition: all 0.2s;
}

.metric-card:hover {
    border-color: #cbd5e0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.metric-card-highlight {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
}

.metric-label {
    font-size: 13px;
    font-weight: 500;
    opacity: 0.8;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.metric-value-large {
    font-size: 32px;
    font-weight: 700;
    margin-bottom: 4px;
}

.metric-subtitle {
    font-size: 13px;
    opacity: 0.7;
}
</style>
