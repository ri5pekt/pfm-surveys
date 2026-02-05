<template>
    <!-- Success Dialog -->
    <Dialog
        v-model:visible="localShowSuccess"
        modal
        :closable="false"
        :style="{ width: '28rem' }"
        :pt="{
            root: { class: 'custom-dialog' },
            header: { class: 'custom-dialog-header success-header' },
        }"
    >
        <template #header>
            <div class="dialog-header-content">
                <div class="dialog-icon success-icon-circle">
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                    >
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <h3>Success!</h3>
            </div>
        </template>
        <div class="dialog-body">
            <p>Your survey has been saved successfully and is ready to use.</p>
        </div>
        <template #footer>
            <div class="dialog-footer">
                <button class="btn-dialog-primary" @click="$emit('close-success')">Got it</button>
            </div>
        </template>
    </Dialog>

    <!-- Error Dialog -->
    <Dialog
        v-model:visible="localShowError"
        modal
        :closable="true"
        :style="{ width: '28rem' }"
        :pt="{
            root: { class: 'custom-dialog' },
            header: { class: 'custom-dialog-header error-header' },
        }"
    >
        <template #header>
            <div class="dialog-header-content">
                <div class="dialog-icon error-icon-circle">
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                    >
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                </div>
                <h3>Error</h3>
            </div>
        </template>
        <div class="dialog-body">
            <p>{{ errorMessage }}</p>
        </div>
        <template #footer>
            <div class="dialog-footer">
                <button class="btn-dialog-primary" @click="localShowError = false">OK</button>
            </div>
        </template>
    </Dialog>

    <!-- Validation Dialog -->
    <Dialog
        v-model:visible="localShowValidation"
        modal
        :closable="true"
        :style="{ width: '28rem' }"
        :pt="{
            root: { class: 'custom-dialog' },
            header: { class: 'custom-dialog-header warning-header' },
        }"
    >
        <template #header>
            <div class="dialog-header-content">
                <div class="dialog-icon warning-icon-circle">
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                    >
                        <path
                            d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                        ></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                </div>
                <h3>Please check your input</h3>
            </div>
        </template>
        <div class="dialog-body">
            <p>{{ validationMessage }}</p>
        </div>
        <template #footer>
            <div class="dialog-footer">
                <button class="btn-dialog-primary" @click="$emit('close-validation')">Fix it</button>
            </div>
        </template>
    </Dialog>

    <!-- Confirm Close Dialog -->
    <Dialog
        v-model:visible="localShowCloseConfirm"
        modal
        :closable="true"
        :style="{ width: '28rem' }"
        :pt="{
            root: { class: 'custom-dialog' },
            header: { class: 'custom-dialog-header confirm-header' },
        }"
    >
        <template #header>
            <div class="dialog-header-content">
                <div class="dialog-icon confirm-icon-circle">
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                    >
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                    </svg>
                </div>
                <h3>Discard changes?</h3>
            </div>
        </template>
        <div class="dialog-body">
            <p>You have unsaved changes. Are you sure you want to close? All changes will be lost.</p>
        </div>
        <template #footer>
            <div class="dialog-footer">
                <button class="btn-dialog-secondary" @click="localShowCloseConfirm = false">Keep editing</button>
                <button class="btn-dialog-danger" @click="$emit('confirm-close')">Discard changes</button>
            </div>
        </template>
    </Dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Dialog from "primevue/dialog";

const props = defineProps<{
    showSuccess: boolean;
    showError: boolean;
    showValidation: boolean;
    showCloseConfirm: boolean;
    errorMessage: string;
    validationMessage: string;
}>();

const emit = defineEmits<{
    "update:showSuccess": [value: boolean];
    "update:showError": [value: boolean];
    "update:showValidation": [value: boolean];
    "update:showCloseConfirm": [value: boolean];
    "close-success": [];
    "close-validation": [];
    "confirm-close": [];
}>();

const localShowSuccess = computed({
    get: () => props.showSuccess,
    set: (value) => emit("update:showSuccess", value),
});

const localShowError = computed({
    get: () => props.showError,
    set: (value) => emit("update:showError", value),
});

const localShowValidation = computed({
    get: () => props.showValidation,
    set: (value) => emit("update:showValidation", value),
});

const localShowCloseConfirm = computed({
    get: () => props.showCloseConfirm,
    set: (value) => emit("update:showCloseConfirm", value),
});
</script>

<style scoped>
.dialog-header-content {
    display: flex;
    align-items: center;
    gap: 16px;
}

.dialog-header-content h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
}

.dialog-icon {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.success-icon-circle {
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    color: #059669;
}

.error-icon-circle {
    background: linear-gradient(135deg, #fee 0%, #fdd 100%);
    color: #c53030;
}

.warning-icon-circle {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    color: #d97706;
}

.confirm-icon-circle {
    background: linear-gradient(135deg, #e3e8ef 0%, #d6dce5 100%);
    color: #495057;
}

.dialog-body {
    padding: 8px 0;
}

.dialog-body p {
    margin: 0;
    font-size: 15px;
    color: #4a5568;
    line-height: 1.6;
}

.dialog-footer {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
}

.btn-dialog-primary {
    padding: 10px 24px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.25);
}

.btn-dialog-primary:hover {
    background: #5568d3;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.35);
}

.btn-dialog-secondary {
    padding: 10px 20px;
    background: white;
    color: #4a5568;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-dialog-secondary:hover {
    background: #f7fafc;
    border-color: #cbd5e0;
    color: #2d3748;
}

.btn-dialog-danger {
    padding: 10px 24px;
    background: #e53e3e;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(229, 62, 62, 0.25);
}

.btn-dialog-danger:hover {
    background: #c53030;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(229, 62, 62, 0.35);
}
</style>
