import { ref } from "vue";
import type { ResponseRow } from "../types";

/**
 * Composable for managing the view response dialog
 * Handles dialog visibility and current response being viewed
 */
export function useResponseDialog() {
    const viewResponseVisible = ref(false);
    const viewingResponse = ref<ResponseRow | null>(null);
    const openMenuId = ref<number | null>(null);

    // Open response detail dialog
    function openViewResponse(row: ResponseRow) {
        viewingResponse.value = row;
        viewResponseVisible.value = true;
    }

    // Close dialog
    function closeViewResponse() {
        viewResponseVisible.value = false;
        viewingResponse.value = null;
    }

    // Toggle action menu for a response row
    function toggleRowMenu(id: number) {
        openMenuId.value = openMenuId.value === id ? null : id;
    }

    // Close action menu
    function closeMenu() {
        openMenuId.value = null;
    }

    return {
        viewResponseVisible,
        viewingResponse,
        openMenuId,
        openViewResponse,
        closeViewResponse,
        toggleRowMenu,
        closeMenu,
    };
}
