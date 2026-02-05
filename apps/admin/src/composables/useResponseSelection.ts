import { ref, computed, type Ref } from "vue";
import type { ResponseRow } from "../types";

/**
 * Composable for managing response selection state
 * Handles individual and bulk selection logic
 */
export function useResponseSelection(allResponses: Ref<ResponseRow[]>) {
    const selectedIds = ref<number[]>([]);

    // Computed selection states
    const isAllSelected = computed(
        () => allResponses.value.length > 0 && selectedIds.value.length === allResponses.value.length
    );

    const isSomeSelected = computed(
        () => selectedIds.value.length > 0 && selectedIds.value.length < allResponses.value.length
    );

    // Toggle individual row selection
    function toggleSelect(rowId: number) {
        const idx = selectedIds.value.indexOf(rowId);
        if (idx >= 0) {
            selectedIds.value = selectedIds.value.filter((x) => x !== rowId);
        } else {
            selectedIds.value = [...selectedIds.value, rowId];
        }
    }

    // Toggle select all/none
    function toggleSelectAll() {
        if (isAllSelected.value) {
            selectedIds.value = [];
        } else {
            selectedIds.value = allResponses.value.map((r) => r.id);
        }
    }

    // Clear all selections
    function clearSelection() {
        selectedIds.value = [];
    }

    return {
        selectedIds,
        isAllSelected,
        isSomeSelected,
        toggleSelect,
        toggleSelectAll,
        clearSelection,
    };
}
