/**
 * PFM Surveys – embed widget entry point.
 * Config is read from the script tag (querystring ?site_id=... or data-site-id / data-api-url).
 * No global config; stable embed.js, cacheable.
 */

import { getConfigFromScript } from "./config";
import { getOrCreateUserId, getOrCreateSessionId } from "./utils";
import { shouldShowSurvey, matchesTargetingRules } from "./targeting";
import { createEventQueue } from "./events";
import { fetchSurveys } from "./fetch";
import { createDisplaySurvey } from "./display";
import type { Survey } from "./types";

function init(): void {
    const config = getConfigFromScript();
    if (!config?.apiUrl || !config?.siteId) {
        console.error(
            '[PFM Surveys] Configuration missing. Use: <script src=".../embed/script.js?site_id=YOUR_SITE_ID"></script> or data-site-id and data-api-url.'
        );
        return;
    }

    const { queueEvent } = createEventQueue(config);

    console.log("%c[PFM Surveys] 🚀 Initializing...", "color: #667eea; font-weight: bold");
    console.log("[PFM Surveys] API URL:", config.apiUrl);
    console.log("[PFM Surveys] Site ID:", config.siteId);
    console.log("[PFM Surveys] Current URL:", window.location.href);
    console.log("[PFM Surveys] Current Path:", window.location.pathname);

    const userId = getOrCreateUserId(config.siteId);
    const sessionId = getOrCreateSessionId(config.siteId);
    console.log("[PFM Surveys] User ID:", userId.substring(0, 8) + "...");
    console.log("[PFM Surveys] Session ID:", sessionId.substring(0, 8) + "...");

    let allSurveys: Survey[] = [];
    const shownInThisCycle = new Set<string>(); // Track surveys shown in current page load

    // Callback to show next survey after current one is closed
    function showNextSurvey(): void {
        const nextSurvey = findNextSurvey();
        if (nextSurvey) {
            const delay = nextSurvey.displaySettings?.show_delay_ms ?? 0;
            console.log(
                `%c[PFM Surveys] 🎉 Showing next survey "${nextSurvey.name}" after ${delay}ms delay`,
                "color: #667eea; font-weight: bold"
            );
            setTimeout(() => {
                const displaySurvey = createDisplaySurvey({
                    queueEvent,
                    siteId: config.siteId,
                    onClose: showNextSurvey,
                });
                displaySurvey(nextSurvey);
                // Mark as shown in this cycle immediately after display
                shownInThisCycle.add(nextSurvey.id);
            }, delay);
        } else {
            console.log("%c[PFM Surveys] ✓ No more surveys to show", "color: #999");
        }
    }

    function findNextSurvey(): Survey | null {
        for (const survey of allSurveys) {
            const { displaySettings, targeting } = survey;

            console.log(`\n[PFM Surveys] 🔍 Evaluating survey: "${survey.name}"`);

            // Skip if already shown in this display cycle
            if (shownInThisCycle.has(survey.id)) {
                console.log(`%c[PFM Surveys] ❌ Survey "${survey.name}" already shown in this cycle`, "color: #e74c3c");
                continue;
            }

            console.log("[PFM Surveys]   - Targeting:", targeting?.pageType ?? "all", targeting?.pageRules ?? []);
            console.log(
                "[PFM Surveys]   - Display frequency:",
                displaySettings?.display_frequency ?? "once_per_session"
            );
            console.log("[PFM Surveys]   - Sample rate:", displaySettings?.sample_rate ?? 100, "%");

            if (!matchesTargetingRules(targeting)) {
                console.log(
                    `%c[PFM Surveys] ❌ Survey "${survey.name}" not shown (page targeting rules not met)`,
                    "color: #e74c3c"
                );
                continue;
            }
            console.log(`%c[PFM Surveys] ✓ Targeting rules matched`, "color: #27ae60");

            const canShow = shouldShowSurvey(
                survey.id,
                config.siteId,
                displaySettings?.display_frequency ?? "once_per_session"
            );
            console.log(
                `[PFM Surveys]   - shouldShowSurvey() returned: ${canShow} for survey ID: ${survey.id.substring(
                    0,
                    8
                )}...`
            );

            if (!canShow) {
                const sessionKey = `pfm_sess_shown:${config.siteId}:${survey.id}`;
                const isInSession = sessionStorage.getItem(sessionKey);
                console.log(`[PFM Surveys]   - Session storage "${sessionKey}": ${isInSession}`);
                console.log(
                    `%c[PFM Surveys] ❌ Survey "${survey.name}" already shown (frequency control)`,
                    "color: #e74c3c"
                );
                continue;
            }
            console.log(`%c[PFM Surveys] ✓ Frequency check passed`, "color: #27ae60");

            if (displaySettings?.sample_rate && Math.random() * 100 > displaySettings.sample_rate) {
                console.log(
                    `%c[PFM Surveys] ❌ Survey "${survey.name}" not shown (sample rate: ${displaySettings.sample_rate}%)`,
                    "color: #e74c3c"
                );
                continue;
            }
            console.log(`%c[PFM Surveys] ✓ Sample rate check passed`, "color: #27ae60");

            return survey;
        }

        return null;
    }

    (async () => {
        console.log("[PFM Surveys] 🔄 Fetching active surveys...");
        const surveys = await fetchSurveys(config);

        if (surveys.length === 0) {
            console.log("%c[PFM Surveys] ℹ️ No active surveys available for this site", "color: #999");
            return;
        }

        console.log(`%c[PFM Surveys] ✓ Found ${surveys.length} survey(s)`, "color: #27ae60; font-weight: bold");

        allSurveys = surveys;
        showNextSurvey();
    })();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
