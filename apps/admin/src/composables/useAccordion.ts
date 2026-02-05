import { ref } from "vue";

/**
 * Composable for managing accordion section state
 */
export function useAccordion(defaultSection: string = "details") {
    const activeSection = ref(defaultSection);

    function toggleSection(section: string) {
        activeSection.value = activeSection.value === section ? "" : section;
    }

    return {
        activeSection,
        toggleSection,
    };
}
