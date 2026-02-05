import { ref, computed, onMounted, type Ref } from "vue";
import { useRoute } from "vue-router";
import { useSitesStore } from "../stores/sites";
import { surveysApi } from "../services/api";
import type { SurveyData } from "../types/survey-editor";
import { createDefaultSurveyData } from "../types/survey-editor";

/**
 * Composable for survey editor data management (load/save)
 */
export function useSurveyEditor(
    surveyData: Ref<SurveyData>,
    onSuccess: () => void,
    onError: (message: string) => void
) {
    const route = useRoute();
    const sitesStore = useSitesStore();

    const saving = ref(false);
    const isEditMode = computed(() => !!route.params.id);

    async function loadSurvey() {
        if (!isEditMode.value) return;

        try {
            const response = await surveysApi.get(route.params.id as string);
            const survey = response.survey as any;

            console.log("Loaded survey data:", survey);

            surveyData.value.name = survey.name;
            surveyData.value.type = survey.type;
            surveyData.value.description = survey.description || "";
            surveyData.value.active = survey.active || false;
            surveyData.value.thankYouMessage = survey.thank_you_message || "";

            // Load questions
            if (survey.questions && Array.isArray(survey.questions)) {
                console.log("Loading questions:", survey.questions);
                surveyData.value.questions = survey.questions.map((q: any) => ({
                    text: q.question_text || "",
                    type: q.question_type === "radio" ? "radio" : "text",
                    options: q.options
                        ? q.options.map((opt: any) => ({
                              text: opt.option_text || "",
                              requiresComment: opt.requires_comment ?? false,
                              pinToBottom: opt.pin_to_bottom ?? false,
                          }))
                        : [],
                    required: q.required || false,
                    randomizeOptions: q.randomize_options ?? false,
                }));
                console.log("Mapped questions:", surveyData.value.questions);
            } else {
                console.log("No questions found in survey data");
            }

            // Load appearance settings
            if (survey.appearance) {
                surveyData.value.appearance.backgroundColor = survey.appearance.backgroundColor || "#667eea";
            }
            if (survey.displaySettings) {
                surveyData.value.appearance.showCloseButton = survey.displaySettings.show_close_button !== false;
                surveyData.value.appearance.showMinimizeButton = survey.displaySettings.show_minimize_button === true;
                surveyData.value.appearance.widgetBackgroundColor =
                    survey.displaySettings.widget_background_color || "#141a2c";
                surveyData.value.appearance.widgetBackgroundOpacity =
                    survey.displaySettings.widget_background_opacity ?? 1.0;
                surveyData.value.appearance.widgetBorderRadius = survey.displaySettings.widget_border_radius || "8px";
                surveyData.value.appearance.textColor = survey.displaySettings.text_color || "#ffffff";
                surveyData.value.appearance.questionTextSize = survey.displaySettings.question_text_size || "1em";
                surveyData.value.appearance.answerFontSize = survey.displaySettings.answer_font_size || "0.875em";
                surveyData.value.appearance.buttonBackgroundColor =
                    survey.displaySettings.button_background_color || "#2a44b7";
            }

            // Load targeting rules
            if (survey.targetingRules && Array.isArray(survey.targetingRules) && survey.targetingRules.length > 0) {
                surveyData.value.targeting = {
                    pageType: "specific",
                    pageRules: survey.targetingRules.map((rule: any) => {
                        const config =
                            typeof rule.rule_config === "string" ? JSON.parse(rule.rule_config) : rule.rule_config;
                        return {
                            type: rule.rule_type,
                            value: config.value || "",
                        };
                    }),
                    users: "all",
                };
            } else {
                surveyData.value.targeting = {
                    pageType: "all",
                    pageRules: [{ type: "exact", value: "" }],
                    users: "all",
                };
            }

            // Load behavior settings
            if (survey.displaySettings) {
                const ds = survey.displaySettings;
                const timingMode = (ds as any).timing_mode || (ds.show_delay_ms > 0 ? "delay" : "immediate");
                surveyData.value.behavior = {
                    timing: timingMode,
                    delaySeconds: Math.floor((ds.show_delay_ms || 0) / 1000),
                    scrollPercentage: (ds as any).scroll_percentage ?? 50,
                    frequency: ds.display_frequency || "until_submit",
                };
            }
        } catch (error) {
            console.error("Failed to load survey:", error);
            onError("Failed to load survey data");
        }
    }

    async function saveSurvey() {
        // Check if site is selected
        if (!sitesStore.currentSite) {
            onError("Please select a site first");
            return;
        }

        saving.value = true;

        try {
            // Prepare survey data payload
            const surveyPayload = {
                name: surveyData.value.name,
                type: surveyData.value.type,
                description: surveyData.value.description,
                active: surveyData.value.active,
                thank_you_message: surveyData.value.thankYouMessage || null,
                questions: surveyData.value.questions.map((q) => ({
                    text: q.text,
                    type: q.type,
                    options:
                        q.type === "radio"
                            ? q.options
                                  .filter((opt) => opt.text?.trim())
                                  .map((opt) => ({
                                      text: opt.text,
                                      requires_comment: opt.requiresComment ?? false,
                                      pin_to_bottom: opt.pinToBottom ?? false,
                                  }))
                            : [],
                    required: q.required,
                    randomize_options: q.randomizeOptions ?? false,
                })),
                targeting: {
                    pageType: surveyData.value.targeting.pageType,
                    pageRules:
                        surveyData.value.targeting.pageType === "specific"
                            ? surveyData.value.targeting.pageRules.filter((r) => r.value.trim())
                            : [],
                },
                behavior: {
                    timing: surveyData.value.behavior.timing,
                    delaySeconds: surveyData.value.behavior.delaySeconds,
                    scrollPercentage: surveyData.value.behavior.scrollPercentage,
                    frequency: surveyData.value.behavior.frequency,
                },
                appearance: {
                    backgroundColor: surveyData.value.appearance.backgroundColor,
                },
                displaySettings: {
                    show_close_button: surveyData.value.appearance.showCloseButton,
                    show_minimize_button: surveyData.value.appearance.showMinimizeButton,
                    widget_background_color: surveyData.value.appearance.widgetBackgroundColor,
                    widget_background_opacity: surveyData.value.appearance.widgetBackgroundOpacity,
                    widget_border_radius: surveyData.value.appearance.widgetBorderRadius,
                    text_color: surveyData.value.appearance.textColor,
                    question_text_size: surveyData.value.appearance.questionTextSize,
                    answer_font_size: surveyData.value.appearance.answerFontSize,
                    button_background_color: surveyData.value.appearance.buttonBackgroundColor,
                },
            };

            console.log("Saving survey with complete data:", surveyPayload);

            if (isEditMode.value) {
                await surveysApi.update(route.params.id as string, surveyPayload);
                console.log("Survey updated with all data");
            } else {
                const response = await surveysApi.create({
                    site_id: sitesStore.currentSite.id,
                    ...surveyPayload,
                });
                console.log("Survey created with all data:", response);
            }

            onSuccess();
        } catch (error: any) {
            console.error("Failed to save survey:", error);
            const data = error.response?.data;
            const msg = data?.message || data?.error || "Failed to save survey. Please try again.";
            onError(typeof msg === "string" ? msg : JSON.stringify(data || msg));
        } finally {
            saving.value = false;
        }
    }

    onMounted(async () => {
        // Load sites if not already loaded
        if (!sitesStore.hasSites) {
            await sitesStore.fetchSites();
        }

        // Load survey data if editing
        await loadSurvey();
    });

    return {
        saving,
        isEditMode,
        saveSurvey,
        loadSurvey,
    };
}
