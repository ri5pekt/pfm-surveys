<template>
    <div class="accordion-item" :class="{ open: isOpen }">
        <button class="accordion-header" @click="$emit('toggle')" :class="{ complete: isComplete }">
            <div class="header-content">
                <svg class="checkmark" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    />
                </svg>
                <span class="title">{{ title }}</span>
                <span class="subtitle">{{ subtitle }}</span>
            </div>
            <svg class="chevron" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                />
            </svg>
        </button>
        <div class="accordion-body" v-show="isOpen">
            <slot></slot>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    title: string;
    subtitle: string;
    isOpen: boolean;
    isComplete: boolean;
}>();

defineEmits<{
    toggle: [];
}>();
</script>

<style scoped>
.accordion-item {
    background: white;
    border-radius: 8px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

.accordion-item.open {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.accordion-header {
    width: 100%;
    padding: 20px 24px;
    background: white;
    border: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    transition: background 0.2s;
}

.accordion-header:hover {
    background: #f9fafb;
}

.accordion-header.complete .checkmark {
    opacity: 1;
    color: #10b981;
}

.header-content {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
}

.checkmark {
    opacity: 0.2;
    transition: opacity 0.2s, color 0.2s;
}

.title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
}

.subtitle {
    font-size: 14px;
    color: #666;
    margin-left: auto;
    margin-right: 16px;
}

.chevron {
    color: #999;
    transition: transform 0.2s;
}

.accordion-item.open .chevron {
    transform: rotate(180deg);
}

.accordion-body {
    padding: 24px;
    border-top: 1px solid #e1e4e8;
}
</style>
