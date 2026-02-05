import { ref, type Ref } from "vue";
import { surveysApi } from "../services/api";
import type { ResponseRow } from "../types";

/**
 * Composable for managing response deletion
 * Handles single and bulk delete operations with confirmation dialogs
 */
export function useResponseDelete(surveyId: Ref<string>, selectedIds: Ref<number[]>, onDeleted: () => Promise<void>) {
    const showDeleteDialog = ref(false);
    const deleteTarget = ref<"one" | "bulk">("one");
    const responseToDelete = ref<ResponseRow | null>(null);
    const deleting = ref(false);

    // Show confirmation for single response deletion
    function confirmDeleteOne(row: ResponseRow) {
        responseToDelete.value = row;
        deleteTarget.value = "one";
        showDeleteDialog.value = true;
    }

    // Show confirmation for bulk deletion
    function confirmBulkDelete() {
        deleteTarget.value = "bulk";
        showDeleteDialog.value = true;
    }

    // Execute the delete operation
    async function executeDelete() {
        if (deleteTarget.value === "one" && responseToDelete.value) {
            deleting.value = true;
            try {
                await surveysApi.deleteResponses(surveyId.value, [responseToDelete.value.id]);
                responseToDelete.value = null;
                showDeleteDialog.value = false;
                await onDeleted();
            } catch (e) {
                console.error("Failed to delete response:", e);
            } finally {
                deleting.value = false;
            }
            return;
        }

        if (deleteTarget.value === "bulk" && selectedIds.value.length > 0) {
            deleting.value = true;
            try {
                await surveysApi.deleteResponses(surveyId.value, selectedIds.value);
                selectedIds.value = [];
                showDeleteDialog.value = false;
                await onDeleted();
            } catch (e) {
                console.error("Failed to delete responses:", e);
            } finally {
                deleting.value = false;
            }
        }
    }

    return {
        showDeleteDialog,
        deleteTarget,
        responseToDelete,
        deleting,
        confirmDeleteOne,
        confirmBulkDelete,
        executeDelete,
    };
}
