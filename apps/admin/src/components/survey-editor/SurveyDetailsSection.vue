<template>
    <div>
        <div class="form-group">
            <label for="survey-name">Survey Name *</label>
            <input
                id="survey-name"
                v-model="surveyData.name"
                type="text"
                placeholder="e.g., Customer Satisfaction Survey"
                required
            />
        </div>

        <div class="form-group">
            <label class="checkbox-label">
                <input v-model="surveyData.isTest" type="checkbox" />
                <span>Test survey (excluded from stats and alerts)</span>
            </label>
        </div>

        <div class="form-group">
            <label for="survey-product">Product</label>
            <select id="survey-product" :value="productSelect" @change="onProductChange">
                <option value="">None</option>
                <option v-for="name in productOptions" :key="name" :value="name">{{ name }}</option>
                <option value="__other">Other…</option>
            </select>
            <input
                v-if="productSelect === '__other'"
                v-model="surveyData.product"
                type="text"
                class="other-product"
                placeholder="Product name"
            />
        </div>

        <div class="form-group">
            <label for="survey-previous">Compare with earlier version</label>
            <select id="survey-previous" v-model="surveyData.previousVersionId">
                <option value="">None</option>
                <option v-for="survey in earlierVersions" :key="survey.id" :value="survey.id">{{ survey.name }}</option>
            </select>
            <p v-if="linkedNotice" class="linked-note">Linked to the original for comparison.</p>
        </div>

        <div class="form-group">
            <label for="survey-description">Description</label>
            <textarea
                id="survey-description"
                v-model="surveyData.description"
                rows="3"
                placeholder="Optional description for internal use"
            ></textarea>
        </div>

        <div class="form-group">
            <label>Type</label>
            <div class="radio-group">
                <label class="radio-label">
                    <input type="radio" v-model="surveyData.type" value="popover" />
                    <span>Popover</span>
                </label>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import type { SurveyData } from "../../types/survey-editor";

const props = defineProps<{
    surveyData: SurveyData;
}>();

const route = useRoute();
const linkedNotice = computed(() => route.query.linked === "1");
const PRESETS = [
    "Face Cream",
    "Anti-Gray Serum",
    "Instant Eye Firming Cream",
    "Shampoo",
    "Eyebag Killer Set",
    "Hand Cream",
    "Shaving Gel",
    "Face Shield",
    "Infinite Male",
    "NeoRoot",
    "Deodorant",
    "Ab Cream",
    "Groin Wash",
];

const productOptions = computed(() => {
    const values = new Set([...PRESETS, ...props.surveyData.productChoices]);
    return [...values];
});

const choosingOther = ref(false);

const productSelect = computed(() => {
    if (choosingOther.value) return "__other";
    if (!props.surveyData.product) return "";
    return productOptions.value.includes(props.surveyData.product) ? props.surveyData.product : "__other";
});

function onProductChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    choosingOther.value = value === "__other";
    if (value === "__other") {
        if (productOptions.value.includes(props.surveyData.product)) props.surveyData.product = "";
    } else {
        props.surveyData.product = value;
    }
    const stillThere = earlierVersions.value.some((survey) => survey.id === props.surveyData.previousVersionId);
    if (!stillThere) props.surveyData.previousVersionId = "";
}

const earlierVersions = computed(() =>
    props.surveyData.versionSurveys.filter((survey) => survey.product && survey.product === props.surveyData.product)
);
</script>

<style scoped>
.form-group {
    margin-bottom: 24px;
}

.form-group label:not(.checkbox-inline):not(.checkbox-label):not(.radio-label) {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #333;
}

.form-group input[type="text"],
.form-group textarea,
.form-group select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s;
    background: #fff;
}

.form-group input[type="text"]:focus,
.form-group textarea:focus,
.form-group select:focus {
    outline: none;
    border-color: #667eea;
}

.other-product {
    margin-top: 8px;
}

.linked-note {
    margin: 8px 0 0;
    color: #5b6170;
    font-size: 13px;
}

.radio-group {
    display: flex;
    gap: 16px;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #333;
}

.radio-label {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
}

.radio-label input[type="radio"] {
    cursor: pointer;
}

.radio-label span {
    font-size: 14px;
    color: #333;
}
</style>
