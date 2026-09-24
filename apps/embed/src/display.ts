/**
 * Display survey widget and handle one-question-at-a-time flow.
 */

import { getDevice, markSurveyShown, SESSION_SHOWN_KEY } from "./utils";
import { createSurveyHTML, renderQuestionHTML, formatQuestionLabel, getCurrentAnswer, setCurrentAnswer, POSITION_STYLES } from "./render";
import type { Survey } from "./types";
import type { QueueEventFn } from "./events";
import { logger } from "./logger";

interface DisplayDeps {
    queueEvent: QueueEventFn;
    siteId: string;
    onClose?: () => void;
}

export function createDisplaySurvey(deps: DisplayDeps) {
    const { queueEvent, siteId, onClose } = deps;

    return function displaySurvey(survey: Survey): void {
        const container = document.createElement("div");
        container.innerHTML = createSurveyHTML(survey);
        const widget = container.querySelector(".pfm-survey-container");
        const widgetStyle = container.querySelector("style");
        if (widget) document.body.appendChild(widget);
        if (widgetStyle) {
            widgetStyle.id = `pfm-survey-style-${survey.id}`;
            document.head.appendChild(widgetStyle);
        }

        const surveyEl = document.getElementById(`pfm-survey-${survey.id}`)!;
        const removeSurveyNode = (): void => {
            surveyEl.remove();
            document.getElementById(`pfm-survey-style-${survey.id}`)?.remove();
        };
        const { questions, displaySettings } = survey;

        const position = displaySettings?.position ?? "bottom-right";
        let currentIndex = 0;
        const answers: Record<string, string | string[]> = {};

        // Appearance settings with defaults (match render.ts for minimized bar)
        const textColor = displaySettings?.text_color ?? "#ffffff";
        const questionTextSize = displaySettings?.question_text_size ?? "1em";
        const answerFontSize = displaySettings?.answer_font_size ?? "0.875em";
        const buttonBgColor = displaySettings?.button_background_color ?? "#292d56";
        const widgetBgColor = displaySettings?.widget_background_color ?? "#141a2c";
        const widgetBgOpacity = displaySettings?.widget_background_opacity ?? 1.0;
        const widgetBorderRadius = displaySettings?.widget_border_radius ?? "8px";
        const hexToRgba = (hex: string, opacity: number): string => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        };
        const widgetBg = hexToRgba(widgetBgColor, widgetBgOpacity);

        // Phone-sized viewport, or a phone user agent (covers device-mode toggles).
        const isMobile = (): boolean =>
            window.matchMedia("(max-width: 767px)").matches ||
            window.innerWidth < 768 ||
            document.documentElement.clientWidth < 768 ||
            getDevice() === "Mobile";

        let userExpanded = false;

        // Apply mobile styles immediately if on mobile
        if (isMobile()) {
            surveyEl.setAttribute(
                "style",
                `position: fixed; bottom: 0; left: 0; right: 0; z-index: 999999; max-width: none; background: ${widgetBg}; border-radius: 0; box-shadow: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; animation: pfm-slide-in 0.3s ease-out;`
            );
        }

        function showQuestion(index: number): void {
            const body = surveyEl.querySelector(".pfm-survey-body")!;
            const footer = surveyEl.querySelector(".pfm-survey-footer")!;
            const question = questions[index];
            if (!question) return;

            body.innerHTML = renderQuestionHTML(question, textColor, questionTextSize, answerFontSize);
            if (answers[question.id] !== undefined) {
                setCurrentAnswer(surveyEl, question, answers[question.id]);
            }

            const isLast = index === questions.length - 1;
            footer.innerHTML = "";
            footer.classList.remove("is-invalid");
            const validation = document.createElement("p");
            validation.className = "pfm-validation-msg";
            validation.setAttribute("role", "alert");
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = isLast ? "pfm-submit-btn" : "pfm-next-btn";
            const submitLabel = (displaySettings?.submit_button_text || "").trim() || "Submit";
            btn.textContent = isLast ? submitLabel : "Next";
            btn.style.cssText = `width: 100%; padding: 12px; background: ${buttonBgColor}; color: ${textColor}; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s;`;
            footer.appendChild(validation);
            footer.appendChild(btn);

            const showValidation = (message: string): void => {
                footer.classList.add("is-invalid");
                validation.textContent = message;
                surveyEl.querySelector(".pfm-question")?.classList.add("pfm-invalid");
                validation.style.animation = "none";
                void validation.offsetWidth;
                validation.style.animation = "";
            };
            const clearValidation = (): void => {
                footer.classList.remove("is-invalid");
                validation.textContent = "";
                surveyEl.querySelector(".pfm-question")?.classList.remove("pfm-invalid");
                surveyEl.querySelectorAll(".pfm-comment-field.is-invalid").forEach((el) => {
                    el.classList.remove("is-invalid");
                });
            };

            const minimizedText = surveyEl.querySelector(".pfm-minimized-question-text");
            if (minimizedText) minimizedText.textContent = formatQuestionLabel(question.question_text);

            // Radio: show/hide comment fields based on selection
            if (question.question_type === "radio") {
                const radioInputs = surveyEl.querySelectorAll<HTMLInputElement>(
                    `input[name="question_${question.id}"].pfm-radio-input`
                );
                radioInputs.forEach((radio) => {
                    radio.addEventListener("change", () => {
                        clearValidation();
                        // Hide all comment fields for this question
                        surveyEl.querySelectorAll(`.pfm-comment-field`).forEach((cf) => {
                            const cfEl = cf as HTMLElement;
                            if (cfEl.closest(`[data-question-id="${question.id}"]`)) {
                                cfEl.style.display = "none";
                                const textarea = cfEl.querySelector("textarea");
                                if (textarea && !radio.dataset.requiresComment) textarea.value = "";
                            }
                        });
                        // Show comment field for the selected option if it requires comment
                        if (radio.checked && radio.dataset.requiresComment === "true") {
                            const commentDiv = surveyEl.querySelector(
                                `.pfm-comment-field[data-option-id="${radio.value}"]`
                            ) as HTMLElement | null;
                            if (commentDiv) commentDiv.style.display = "block";
                        }
                    });
                });
                surveyEl.querySelectorAll<HTMLTextAreaElement>(".pfm-comment-field textarea").forEach((field) => {
                    field.addEventListener("input", () => clearValidation());
                });
            }

            if (question.question_type === "checkbox") {
                surveyEl
                    .querySelectorAll<HTMLInputElement>(`input[name="question_${question.id}"]`)
                    .forEach((input) => {
                        input.addEventListener("change", () => clearValidation());
                    });
            }

            if (question.question_type === "text") {
                surveyEl
                    .querySelector<HTMLTextAreaElement>(`textarea[name="question_${question.id}"]`)
                    ?.addEventListener("input", () => clearValidation());
            }

            if (question.question_type === "rating") {
                surveyEl.querySelectorAll(".pfm-rating-btn").forEach((btnEl) => {
                    btnEl.addEventListener("click", () => {
                        clearValidation();
                        const qId = (btnEl as HTMLElement).dataset.question!;
                        const val = (btnEl as HTMLElement).dataset.value!;
                        const hidden = surveyEl.querySelector<HTMLInputElement>(
                            `input[name="question_${qId}"].pfm-rating-value`
                        );
                        if (hidden) hidden.value = val;
                        surveyEl
                            .querySelectorAll(`.pfm-rating-btn[data-question="${qId}"]`)
                            .forEach((b) => b.classList.remove("selected"));
                        btnEl.classList.add("selected");
                    });
                });
            }

            btn.addEventListener("click", () => {
                const currentQuestion = questions[currentIndex]!;
                const value = getCurrentAnswer(surveyEl, currentQuestion);
                const required = currentQuestion.required;
                const empty = value === null || value === "" || (Array.isArray(value) && value.length === 0);

                if (required && empty) {
                    const message =
                        currentQuestion.question_type === "text"
                            ? "Please enter an answer"
                            : currentQuestion.question_type === "rating"
                              ? "Please select a rating"
                              : "Please select an answer";
                    showValidation(message);
                    return;
                }

                // Radio: validate comment requirement
                if (currentQuestion.question_type === "radio" && value) {
                    const selectedOptionId = value as string;
                    const selectedOption = currentQuestion.options?.find((o) => o.id === selectedOptionId);
                    if (selectedOption?.requires_comment) {
                        const commentField = surveyEl.querySelector<HTMLTextAreaElement>(
                            `textarea[name="comment_${currentQuestion.id}_${selectedOptionId}"]`
                        );
                        const commentText = commentField?.value?.trim() || "";
                        if (!commentText) {
                            showValidation("Please enter a comment");
                            commentField?.closest(".pfm-comment-field")?.classList.add("is-invalid");
                            return;
                        }
                    }
                }

                if (value !== null && value !== "" && (!Array.isArray(value) || value.length > 0)) {
                    answers[currentQuestion.id] = value as string | string[];
                }

                if (isLast) {
                    submitAnswers();
                } else {
                    currentIndex++;
                    showQuestion(currentIndex);
                }
            });
        }

        function submitAnswers(): void {
            const answerList: Array<{ question_id: string; answer_option_id?: string; answer_text?: string }> = [];
            for (const question of survey.questions) {
                const v = answers[question.id];
                if (question.question_type === "checkbox" && Array.isArray(v)) {
                    for (const optionId of v) {
                        answerList.push({ question_id: question.id, answer_option_id: optionId });
                    }
                } else if (question.question_type === "radio" && v) {
                    const selectedOptionId = v as string;
                    const selectedOption = question.options?.find((o) => o.id === selectedOptionId);
                    let answerText: string | undefined = undefined;
                    if (selectedOption?.requires_comment) {
                        const commentField = surveyEl.querySelector<HTMLTextAreaElement>(
                            `textarea[name="comment_${question.id}_${selectedOptionId}"]`
                        );
                        answerText = commentField?.value?.trim() || undefined;
                    }
                    answerList.push({
                        question_id: question.id,
                        answer_option_id: selectedOptionId,
                        answer_text: answerText,
                    });
                } else if (question.question_type === "text" && v) {
                    answerList.push({ question_id: question.id, answer_text: v as string });
                } else if (question.question_type === "rating" && v) {
                    answerList.push({ question_id: question.id, answer_text: v as string });
                }
            }

            logger.log(`[PFM Surveys] ✓ Survey "${survey.name}" submitted with ${answerList.length} answer(s)`);
            logger.log(
                "[PFM Surveys] 📤 Answers being sent:",
                answerList.map((a) => {
                    const q = survey.questions.find((qu) => qu.id === a.question_id);
                    const label = q?.question_text?.slice(0, 40) ?? a.question_id;
                    if (a.answer_option_id) {
                        const opt = q?.options?.find((o) => o.id === a.answer_option_id);
                        return {
                            question: label,
                            answer_option_id: a.answer_option_id,
                            option_text: opt?.option_text ?? "(unknown)",
                        };
                    }
                    return { question: label, answer_text: a.answer_text };
                })
            );
            queueEvent("answer", { survey_id: survey.id, event_data: { answers: answerList } });

            // Show thank you message if set, otherwise close immediately
            const thankYou = surveyEl.querySelector(".pfm-thank-you") as HTMLElement | null;

            if (thankYou) {
                // Has thank you message - show it
                const main = surveyEl.querySelector(".pfm-survey-main") as HTMLElement;
                main.style.display = "none";
                thankYou.style.display = "block";

                // Hide close and minimize buttons on thank you screen
                const closeBtn = surveyEl.querySelector(".pfm-close-btn") as HTMLElement | null;
                const minimizeBtn = surveyEl.querySelector(".pfm-minimize-btn") as HTMLElement | null;
                if (closeBtn) closeBtn.style.display = "none";
                if (minimizeBtn) minimizeBtn.style.display = "none";

                // Add Close button listener
                const closeThankYouBtn = surveyEl.querySelector(".pfm-close-thank-you-btn");
                if (closeThankYouBtn) {
                    closeThankYouBtn.addEventListener("click", () => {
                        surveyEl.style.animation = "pfm-slide-out 0.2s ease-in";
                        setTimeout(() => {
                            removeSurveyNode();
                            if (onClose) onClose();
                        }, 200);
                    });
                }
            } else {
                // No thank you message - close immediately
                surveyEl.style.animation = "pfm-slide-out 0.2s ease-in";
                setTimeout(() => {
                    removeSurveyNode();
                    if (onClose) onClose();
                }, 200);
            }
        }

        function removeWidget(reason: string): void {
            queueEvent("dismiss", {
                survey_id: survey.id,
                event_data: { reason: reason || "close" },
            });
            surveyEl.style.animation = "pfm-slide-out 0.2s ease-in";
            setTimeout(() => {
                removeSurveyNode();
                if (onClose) onClose();
            }, 200);
        }

        function setMinimized(minimized: boolean): void {
            const main = surveyEl.querySelector(".pfm-survey-main") as HTMLElement;
            const minDiv = surveyEl.querySelector(".pfm-survey-minimized") as HTMLElement;
            const mobile = isMobile();

            if (minimized) {
                surveyEl.classList.remove("pfm-survey-expanded");
                surveyEl.classList.add("pfm-survey-minimized-bar");

                if (mobile) {
                    // Mobile: full width at bottom, flush with edges, no shadow
                    surveyEl.setAttribute(
                        "style",
                        `position: fixed; bottom: 0; left: 0; right: 0; z-index: 999999; max-width: none; background: ${widgetBg}; border-radius: 0; box-shadow: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0;`
                    );
                } else {
                    // Desktop: positioned widget
                    surveyEl.setAttribute(
                        "style",
                        `position: fixed; ${
                            POSITION_STYLES[position] ?? POSITION_STYLES["bottom-right"]
                        } z-index: 999999; min-width: 300px; max-width: 420px; background: ${widgetBg}; border-radius: ${widgetBorderRadius}; box-shadow: 0 8px 40px rgba(0,0,0,0.3); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`
                    );
                }
                main.style.display = "none";
                minDiv.style.display = "flex";
                syncCollapsedChrome(true);
            } else {
                surveyEl.classList.add("pfm-survey-expanded");
                surveyEl.classList.remove("pfm-survey-minimized-bar");

                if (mobile) {
                    // Mobile: full width at bottom, flush with edges, no shadow
                    surveyEl.setAttribute(
                        "style",
                        `position: fixed; bottom: 0; left: 0; right: 0; z-index: 999999; max-width: none; background: ${widgetBg}; border-radius: 0; box-shadow: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0;`
                    );
                } else {
                    // Desktop: positioned widget
                    surveyEl.setAttribute(
                        "style",
                        `position: fixed; ${
                            POSITION_STYLES[position] ?? POSITION_STYLES["bottom-right"]
                        } z-index: 999999; min-width: 300px; max-width: 420px; background: ${widgetBg}; border-radius: ${widgetBorderRadius}; box-shadow: 0 8px 40px rgba(0,0,0,0.3); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`
                    );
                }
                main.style.display = "block";
                minDiv.style.display = "none";
                syncCollapsedChrome(false);
            }
        }

        function syncCollapsedChrome(minimized: boolean): void {
            const toggleBtn = surveyEl.querySelector(".pfm-minimize-btn") as HTMLElement | null;
            const closeBtn = surveyEl.querySelector(".pfm-close-btn") as HTMLElement | null;
            const questionText = surveyEl.querySelector(".pfm-minimized-question-text") as HTMLElement | null;
            const chevron = toggleBtn?.querySelector("path");

            for (const btn of [toggleBtn, closeBtn]) {
                if (!btn) continue;
                btn.style.top = minimized ? "10px" : "8px";
                btn.style.transform = "";
            }

            if (toggleBtn) {
                toggleBtn.classList.toggle("is-collapsed", minimized);
                toggleBtn.title = minimized ? "Expand" : "Minimize";
            }
            if (chevron) {
                chevron.setAttribute("d", minimized ? "M4 9.75 L8 5.75 L12 9.75" : "M4 6.25 L8 10.25 L12 6.25");
            }

            if (questionText) {
                questionText.style.display = "block";
                questionText.style.removeProperty("-webkit-box-orient");
                questionText.style.removeProperty("-webkit-line-clamp");
                questionText.style.overflow = "visible";
                questionText.style.whiteSpace = "normal";
                questionText.style.textOverflow = "clip";
            }
        }

        showQuestion(0);

        // Mobile opens as the question bar. Visitors expand it to answer.
        // Also re-check after layout and when DevTools switches into a phone size,
        // unless the visitor has already opened the survey themselves.
        const collapseIfMobile = (): void => {
            if (userExpanded || !isMobile()) return;
            if (surveyEl.classList.contains("pfm-survey-minimized-bar")) return;
            setMinimized(true);
        };
        collapseIfMobile();
        requestAnimationFrame(collapseIfMobile);
        window.addEventListener("resize", collapseIfMobile);
        window.matchMedia("(max-width: 767px)").addEventListener("change", collapseIfMobile);

        logger.log(`[PFM Surveys] ✓ Survey "${survey.name}" displayed (impression tracked)`);
        queueEvent("impression", { survey_id: survey.id });
        markSurveyShown(survey.id, siteId);
        sessionStorage.setItem(SESSION_SHOWN_KEY(siteId, survey.id), "true");

        const closeBtn = surveyEl.querySelector(".pfm-close-btn");
        if (closeBtn) {
            closeBtn.addEventListener("click", () => {
                logger.log(`[PFM Surveys] Survey "${survey.name}" closed by user`);
                removeWidget("close");
            });
        }

        const minimizeBtn = surveyEl.querySelector(".pfm-minimize-btn");
        if (minimizeBtn) {
            minimizeBtn.addEventListener("click", () => {
                const isMinimized = surveyEl.classList.contains("pfm-survey-minimized-bar");
                if (isMinimized) {
                    logger.log(`[PFM Surveys] Survey "${survey.name}" expanded by user`);
                    userExpanded = true;
                    setMinimized(false);
                } else {
                    logger.log(`[PFM Surveys] Survey "${survey.name}" minimized by user`);
                    queueEvent("dismiss", { survey_id: survey.id, event_data: { reason: "minimize" } });
                    setMinimized(true);
                }
            });
        }

        const expandBtn = surveyEl.querySelector(".pfm-expand-btn");
        if (expandBtn) {
            expandBtn.addEventListener("click", () => {
                userExpanded = true;
                setMinimized(false);
            });
        }

        if (survey.displaySettings?.auto_close_ms) {
            setTimeout(() => {
                if (surveyEl && document.body.contains(surveyEl)) {
                    const minDiv = surveyEl.querySelector(".pfm-survey-minimized") as HTMLElement | null;
                    if (!minDiv || minDiv.style.display !== "flex") {
                        removeWidget("auto_close");
                    }
                }
            }, survey.displaySettings.auto_close_ms);
        }
    };
}
