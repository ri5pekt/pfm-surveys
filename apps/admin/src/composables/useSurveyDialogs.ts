import { ref } from "vue";
import { useRouter } from "vue-router";

/**
 * Composable for managing survey editor dialogs
 */
export function useSurveyDialogs() {
    const router = useRouter();

    const showSuccessDialog = ref(false);
    const showErrorDialog = ref(false);
    const showValidationDialog = ref(false);
    const showCloseConfirmDialog = ref(false);

    const errorMessage = ref("");
    const validationMessage = ref("");
    const validationTargetSection = ref("");

    function handleClose() {
        showCloseConfirmDialog.value = true;
    }

    function confirmClose() {
        showCloseConfirmDialog.value = false;
        router.push({ name: "surveys" });
    }

    function closeValidationDialog(activeSection: any) {
        showValidationDialog.value = false;
        if (validationTargetSection.value) {
            activeSection.value = validationTargetSection.value;
        }
    }

    function closeSuccessAndNavigate() {
        showSuccessDialog.value = false;
        router.push({ name: "surveys" });
    }

    function showError(message: string) {
        errorMessage.value = message;
        showErrorDialog.value = true;
    }

    function showValidation(message: string, targetSection: string) {
        validationMessage.value = message;
        validationTargetSection.value = targetSection;
        showValidationDialog.value = true;
    }

    function showSuccess() {
        showSuccessDialog.value = true;
    }

    return {
        // State
        showSuccessDialog,
        showErrorDialog,
        showValidationDialog,
        showCloseConfirmDialog,
        errorMessage,
        validationMessage,
        validationTargetSection,

        // Methods
        handleClose,
        confirmClose,
        closeValidationDialog,
        closeSuccessAndNavigate,
        showError,
        showValidation,
        showSuccess,
    };
}
