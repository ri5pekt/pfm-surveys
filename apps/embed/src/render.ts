/**
 * Render survey and question HTML (one question at a time, Hotjar-style).
 */

import { escapeHtml } from "./utils";
import type { Question, Survey, AnswerOption } from "./types";
import type { AnswerValue } from "./types";

/** Fisher-Yates shuffle */
function shuffleArray<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

const POSITION_STYLES: Record<string, string> = {
    "bottom-right": "bottom: 20px; right: 20px;",
    "bottom-left": "bottom: 20px; left: 20px;",
    "top-right": "top: 20px; right: 20px;",
    "top-left": "top: 20px; left: 20px;",
    center: "top: 50%; left: 50%; transform: translate(-50%, -50%);",
};

export function renderQuestionHTML(
    question: Question,
    textColor: string = "#ffffff",
    questionTextSize: string = "1em",
    answerFontSize: string = "0.875em"
): string {
    let html = `
    <div class="pfm-question" data-question-id="${question.id}" style="margin-bottom: 16px;">
      <label class="pfm-question-label" style="display: block; margin-bottom: 16px; padding-right: 50px; font-size: ${questionTextSize}; font-weight: 600; color: ${textColor}; line-height: 1.5;">
        ${escapeHtml(question.question_text)}
      </label>
  `;

    if (question.question_type === "radio" && question.options) {
        let orderedOptions = [...question.options];

        // Randomize if enabled (keep pinned at bottom)
        if (question.randomize_options) {
            const pinned = orderedOptions.filter((o) => o.pin_to_bottom);
            const nonPinned = orderedOptions.filter((o) => !o.pin_to_bottom);
            orderedOptions = [...shuffleArray(nonPinned), ...pinned];
        }

        for (const option of orderedOptions) {
            const hasComment = option.requires_comment ?? false;
            html += `
        <div style="margin-bottom: 10px;">
          <label style="display: flex; align-items: center; cursor: pointer; padding: 14px 16px; border: 2px solid ${textColor}4D; border-radius: 30px; transition: all 0.2s; background: transparent;" class="pfm-radio-label">
            <input type="radio" name="question_${question.id}" value="${
                option.id
            }" data-requires-comment="${hasComment}" ${
                question.required ? "required" : ""
            } style="margin-right: 12px; width: 18px; height: 18px; cursor: pointer;" class="pfm-radio-input">
            <span style="font-size: ${answerFontSize}; color: ${textColor}; flex: 1;">${escapeHtml(
                option.option_text
            )}</span>
          </label>
          ${
              hasComment
                  ? `<div class="pfm-comment-field" data-option-id="${option.id}" style="display: none; margin-top: 10px; margin-left: 0;">
            <textarea name="comment_${question.id}_${option.id}" placeholder="Please enter a comment..." rows="2" style="
              width: 100%;
              padding: 12px;
              border: 2px solid ${textColor}4D;
              border-radius: 8px;
              font-size: ${answerFontSize};
              font-family: inherit;
              resize: vertical;
              box-sizing: border-box;
              background: rgba(0, 0, 0, 0.2);
              color: ${textColor};
            "></textarea>
          </div>`
                  : ""
          }
        </div>
      `;
        }
    } else if (question.question_type === "checkbox" && question.options) {
        for (const option of question.options) {
            html += `
        <div style="margin-bottom: 10px;">
          <label style="display: flex; align-items: center; cursor: pointer; padding: 14px 16px; border: 2px solid ${textColor}4D; border-radius: 30px; transition: all 0.2s; background: transparent;" class="pfm-checkbox-label">
            <input type="checkbox" name="question_${question.id}" value="${
                option.id
            }" style="margin-right: 12px; width: 18px; height: 18px; cursor: pointer;">
            <span style="font-size: ${answerFontSize}; color: ${textColor}; flex: 1;">${escapeHtml(
                option.option_text
            )}</span>
          </label>
        </div>
      `;
        }
    } else if (question.question_type === "text") {
        html += `
      <textarea name="question_${question.id}" rows="3" ${
            question.required ? "required" : ""
        } placeholder="Your answer..." style="
        width: 100%;
        padding: 12px;
        border: 2px solid ${textColor}4D;
        border-radius: 8px;
        font-size: ${answerFontSize};
        font-family: inherit;
        resize: vertical;
        box-sizing: border-box;
        background: rgba(0, 0, 0, 0.2);
        color: ${textColor};
      "></textarea>
    `;
    } else if (question.question_type === "rating") {
        html += `
      <div class="pfm-rating" style="display: flex; gap: 8px; justify-content: center; margin-top: 8px;">
    `;
        for (let i = 1; i <= 5; i++) {
            html += `
        <button type="button" class="pfm-rating-btn" data-question="${question.id}" data-value="${i}" style="
          width: 40px;
          height: 40px;
          border: 2px solid ${textColor}4D;
          background: transparent;
          color: ${textColor};
          border-radius: 50%;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        ">${i}</button>
      `;
        }
        html += `
      </div>
      <input type="hidden" name="question_${question.id}" class="pfm-rating-value" ${
            question.required ? "required" : ""
        }>
    `;
    }

    html += `</div>`;
    return html;
}

export function createSurveyHTML(survey: Survey): string {
    const { displaySettings } = survey;
    const position = displaySettings?.position ?? "bottom-right";
    const showClose = displaySettings?.show_close_button !== false;
    const showMinimize = displaySettings?.show_minimize_button === true;

    // Appearance settings with defaults
    const widgetBgColor = displaySettings?.widget_background_color ?? "#141a2c";
    const widgetBgOpacity = displaySettings?.widget_background_opacity ?? 1.0;
    const widgetBorderRadius = displaySettings?.widget_border_radius ?? "8px";
    const textColor = displaySettings?.text_color ?? "#ffffff";
    const questionTextSize = displaySettings?.question_text_size ?? "1em";
    const answerFontSize = displaySettings?.answer_font_size ?? "0.875em";
    const buttonBgColor = displaySettings?.button_background_color ?? "#2a44b7";

    // Convert hex + opacity to rgba
    const hexToRgba = (hex: string, opacity: number): string => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    const widgetBg = hexToRgba(widgetBgColor, widgetBgOpacity);

    const absoluteButtons: string[] = [];
    if (showMinimize) {
        absoluteButtons.push(
            `<button type="button" class="pfm-minimize-btn" title="Minimize" style="position: absolute; top: 8px; right: ${
                showClose ? "38px" : "8px"
            }; background: none; border: none; font-size: 20px; color: ${textColor}99; cursor: pointer; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; z-index: 10;">−</button>`
        );
    }
    if (showClose) {
        absoluteButtons.push(
            `<button type="button" class="pfm-close-btn" title="Close" style="position: absolute; top: 8px; right: 8px; background: none; border: none; font-size: 22px; color: ${textColor}99; cursor: pointer; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; z-index: 10;">&times;</button>`
        );
    }

    const positionStyle = POSITION_STYLES[position] ?? POSITION_STYLES["bottom-right"];

    return `
    <div id="pfm-survey-${survey.id}" class="pfm-survey-container pfm-survey-expanded" data-survey-id="${
        survey.id
    }" style="
      position: fixed;
      ${positionStyle}
      z-index: 999999;
      min-width: 300px;
      max-width: 420px;
      background: ${widgetBg};
      border-radius: ${widgetBorderRadius};
      box-shadow: 0 8px 40px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: pfm-slide-in 0.3s ease-out;
    ">
      ${absoluteButtons.join("")}
      <div class="pfm-survey-main" style="padding: 14px 20px 20px 20px;">
        <div class="pfm-survey-body"></div>
        <div class="pfm-survey-footer" style="margin-top: 20px;">
          <button type="button" class="pfm-next-btn" style="
            width: 100%;
            padding: 14px;
            background: ${buttonBgColor};
            color: ${textColor};
            border: none;
            border-radius: 6px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
          ">Next</button>
        </div>
      </div>
      <div class="pfm-survey-minimized" style="display: none; width: 100%; border-radius: ${widgetBorderRadius}; background: transparent; align-items: center; padding: 14px 20px; flex-direction: row; box-sizing: border-box;">
        <button type="button" class="pfm-expand-btn" style="flex: 1; min-width: 0; text-align: left; background: none; border: none; cursor: pointer; font-size: ${questionTextSize}; color: ${textColor}; padding: 0; padding-right: 50px; font-family: inherit; font-weight: 600; line-height: 1.5;">
          <span class="pfm-minimized-question-text" style="display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></span>
        </button>
      </div>
      ${
          survey.thank_you_message
              ? `<div class="pfm-thank-you" style="display: none; padding: 24px;">
        <p style="margin: 0 0 20px 0; font-size: ${questionTextSize}; color: ${textColor}; line-height: 1.5; text-align: center; white-space: pre-wrap;">${escapeHtml(
                    survey.thank_you_message
                )}</p>
        <button type="button" class="pfm-close-thank-you-btn" style="
          width: 100%;
          padding: 14px;
          background: ${buttonBgColor};
          color: ${textColor};
          border: none;
          border-radius: 6px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        ">Close</button>
      </div>`
              : ""
      }
    </div>
    <style>
      @keyframes pfm-slide-in {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes pfm-slide-out {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(20px); }
      }
      .pfm-close-btn:hover, .pfm-minimize-btn:hover { background: rgba(255, 255, 255, 0.1) !important; }
      .pfm-next-btn:hover, .pfm-submit-btn:hover, .pfm-close-thank-you-btn:hover { opacity: 0.9; }
      .pfm-radio-label:hover, .pfm-checkbox-label:hover { border-color: ${textColor}80 !important; background: rgba(255, 255, 255, 0.05) !important; }
      .pfm-radio-input:checked + span, .pfm-checkbox-label input:checked + span { font-weight: 500; }
      textarea:focus, textarea::placeholder { color: ${textColor}80; }
      textarea:focus { outline: none; border-color: ${textColor}80; }
      .pfm-rating-btn:hover { border-color: ${buttonBgColor} !important; color: ${buttonBgColor} !important; }
      .pfm-rating-btn.selected { background: ${buttonBgColor} !important; color: ${textColor} !important; border-color: ${buttonBgColor} !important; }

      /* Mobile styles: full width, flush with edges, no shadow */
      @media (max-width: 767px) {
        #pfm-survey-${survey.id}.pfm-survey-expanded,
        #pfm-survey-${survey.id}.pfm-survey-minimized-bar {
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          top: auto !important;
          max-width: none !important;
          min-width: 0 !important;
          transform: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          margin: 0 !important;
        }
      }
    </style>
  `;
}

export function getCurrentAnswer(surveyEl: HTMLElement, question: Question): AnswerValue {
    const name = `question_${question.id}`;
    if (question.question_type === "checkbox") {
        const checked = surveyEl.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`);
        return Array.from(checked).map((el) => el.value);
    }
    if (question.question_type === "radio") {
        const el = surveyEl.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`);
        return el ? el.value : null;
    }
    if (question.question_type === "rating") {
        const el = surveyEl.querySelector<HTMLInputElement>(`input[name="${name}"].pfm-rating-value`);
        return el && el.value ? el.value : null;
    }
    if (question.question_type === "text") {
        const el = surveyEl.querySelector<HTMLTextAreaElement>(`textarea[name="${name}"]`);
        return el ? (el.value ?? "").trim() : "";
    }
    return null;
}

export function setCurrentAnswer(surveyEl: HTMLElement, question: Question, value: AnswerValue): void {
    const name = `question_${question.id}`;
    if (question.question_type === "checkbox" && Array.isArray(value)) {
        surveyEl.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`).forEach((el) => {
            el.checked = value.includes(el.value);
        });
        return;
    }
    if (question.question_type === "radio" || question.question_type === "rating") {
        const input = surveyEl.querySelector<HTMLInputElement>(`input[name="${name}"]`);
        if (input) input.value = (value as string) ?? "";
        if (question.question_type === "rating") {
            surveyEl.querySelectorAll<HTMLElement>(`.pfm-rating-btn[data-question="${question.id}"]`).forEach((b) => {
                b.classList.toggle("selected", b.dataset.value === value);
            });
        }
        return;
    }
    if (question.question_type === "text") {
        const el = surveyEl.querySelector<HTMLTextAreaElement>(`textarea[name="${name}"]`);
        if (el) el.value = (value as string) ?? "";
    }
}

export { POSITION_STYLES };
