/**
 * PFM Surveys – embed widget entry point.
 * Config is read from the script tag (querystring ?site_id=... or data-site-id / data-api-url).
 * No global config; stable embed.js, cacheable.
 */

import { getConfigFromScript } from "./config";
import { getOrCreateUserId, getOrCreateSessionId } from "./utils";
import { shouldShowSurvey, matchesTargetingRules } from "./targeting";
import { createEventQueue } from "./events";
import { fetchSurveys, fetchUserGeo } from "./fetch";
import { createDisplaySurvey } from "./display";
import type { Survey, UserGeo } from "./types";
import { logger } from "./logger";

function init(): void {
    const config = getConfigFromScript();
    if (!config?.apiUrl || !config?.siteId) {
        logger.error(
            '[PFM Surveys] Configuration missing. Use: <script src=".../embed/script.js?site_id=YOUR_SITE_ID"></script> or data-site-id and data-api-url.'
        );
        return;
    }

    const { queueEvent } = createEventQueue(config);

    logger.log("%c[PFM Surveys] 🚀 Initializing...", "color: #667eea; font-weight: bold");
    logger.log("[PFM Surveys] API URL:", config.apiUrl);
    logger.log("[PFM Surveys] Site ID:", config.siteId);
    logger.log("[PFM Surveys] Current URL:", window.location.href);
    logger.log("[PFM Surveys] Current Path:", window.location.pathname);

    const userId = getOrCreateUserId(config.siteId);
    const sessionId = getOrCreateSessionId(config.siteId);
    logger.log("[PFM Surveys] User ID:", userId.substring(0, 8) + "...");
    logger.log("[PFM Surveys] Session ID:", sessionId.substring(0, 8) + "...");

    let allSurveys: Survey[] = [];
    let userGeo: UserGeo | null = null;
    const shownInThisCycle = new Set<string>(); // Track surveys shown in current page load

    // Callback to show next survey after current one is closed
    async function showNextSurvey(): Promise<void> {
        const nextSurvey = await findNextSurvey();
        if (nextSurvey) {
            const timingMode = (nextSurvey.displaySettings as any)?.timing_mode || "immediate";
            const delay = nextSurvey.displaySettings?.show_delay_ms ?? 0;
            const scrollPercentage = (nextSurvey.displaySettings as any)?.scroll_percentage ?? 50;

            const displaySurvey = createDisplaySurvey({
                queueEvent,
                siteId: config.siteId,
                onClose: showNextSurvey,
            });

            if (timingMode === "scroll") {
                logger.log(
                    `%c[PFM Surveys] 📜 Waiting for user to scroll ${scrollPercentage}% down the page for survey "${nextSurvey.name}"`,
                    "color: #667eea; font-weight: bold"
                );

                let scrollTriggered = false;
                const handleScroll = () => {
                    if (scrollTriggered) return;

                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                    const scrolledPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

                    if (scrolledPercent >= scrollPercentage) {
                        scrollTriggered = true;
                        window.removeEventListener("scroll", handleScroll);
                        logger.log(
                            `%c[PFM Surveys] 🎉 Scroll threshold reached (${scrolledPercent.toFixed(
                                1
                            )}%), showing survey "${nextSurvey.name}"`,
                            "color: #667eea; font-weight: bold"
                        );
                        displaySurvey(nextSurvey);
                        shownInThisCycle.add(nextSurvey.id);
                    }
                };

                window.addEventListener("scroll", handleScroll, { passive: true });
                // Also check immediately in case already scrolled
                handleScroll();
            } else {
                logger.log(
                    `%c[PFM Surveys] 🎉 Showing next survey "${nextSurvey.name}" after ${delay}ms delay`,
                    "color: #667eea; font-weight: bold"
                );
                setTimeout(() => {
                    displaySurvey(nextSurvey);
                    shownInThisCycle.add(nextSurvey.id);
                }, delay);
            }
        } else {
            logger.log("%c[PFM Surveys] ✓ No more surveys to show", "color: #999");
        }
    }

    async function findNextSurvey(): Promise<Survey | null> {
        for (const survey of allSurveys) {
            const { displaySettings, targeting } = survey;

            logger.log(`\n[PFM Surveys] 🔍 Evaluating survey: "${survey.name}"`, {
                userType: targeting?.userType,
                userRulesCount: targeting?.userRules?.length ?? 0,
                userRules: targeting?.userRules,
                userGeo,
            });

            // Skip if already shown in this display cycle
            if (shownInThisCycle.has(survey.id)) {
                logger.log(`%c[PFM Surveys] ❌ Survey "${survey.name}" already shown in this cycle`, "color: #e74c3c");
                continue;
            }

            // Fetch geo only when this survey has user rules and we don't have geo yet (avoid calls for all users)
            const hasUserRules = targeting?.userType === "specific" && (targeting?.userRules?.length ?? 0) > 0;
            if (hasUserRules && userGeo === null) {
                logger.log("[PFM Surveys]   - Survey has user (geo) rules; fetching userGeo (lazy)...");
                const resolved = await fetchUserGeo(config);
                userGeo = resolved;
            }

            logger.log("[PFM Surveys]   - Targeting:", targeting?.pageType ?? "all", targeting?.pageRules ?? []);
            logger.log(
                "[PFM Surveys]   - Display frequency:",
                displaySettings?.display_frequency ?? "once_per_session"
            );
            logger.log("[PFM Surveys]   - Sample rate:", displaySettings?.sample_rate ?? 100, "%");

            if (!matchesTargetingRules(targeting, userGeo)) {
                logger.log(
                    `%c[PFM Surveys] ❌ Survey "${survey.name}" not shown (page or user targeting rules not met)`,
                    "color: #e74c3c"
                );
                continue;
            }
            logger.log(`%c[PFM Surveys] ✓ Targeting rules matched`, "color: #27ae60");

            const canShow = shouldShowSurvey(
                survey.id,
                config.siteId,
                displaySettings?.display_frequency ?? "once_per_session"
            );
            logger.log(
                `[PFM Surveys]   - shouldShowSurvey() returned: ${canShow} for survey ID: ${survey.id.substring(
                    0,
                    8
                )}...`
            );

            if (!canShow) {
                const sessionKey = `pfm_sess_shown:${config.siteId}:${survey.id}`;
                const isInSession = sessionStorage.getItem(sessionKey);
                logger.log(`[PFM Surveys]   - Session storage "${sessionKey}": ${isInSession}`);
                logger.log(
                    `%c[PFM Surveys] ❌ Survey "${survey.name}" already shown (frequency control)`,
                    "color: #e74c3c"
                );
                continue;
            }
            logger.log(`%c[PFM Surveys] ✓ Frequency check passed`, "color: #27ae60");

            if (displaySettings?.sample_rate && Math.random() * 100 > displaySettings.sample_rate) {
                logger.log(
                    `%c[PFM Surveys] ❌ Survey "${survey.name}" not shown (sample rate: ${displaySettings.sample_rate}%)`,
                    "color: #e74c3c"
                );
                continue;
            }
            logger.log(`%c[PFM Surveys] ✓ Sample rate check passed`, "color: #27ae60");

            return survey;
        }

        return null;
    }

    (async () => {
        logger.log("[PFM Surveys] 🔄 Fetching active surveys...");
        const { surveys: fetchedSurveys } = await fetchSurveys(config);

        if (fetchedSurveys.length === 0) {
            logger.log("%c[PFM Surveys] ℹ️ No active surveys available for this site", "color: #999");
            return;
        }

        logger.log(`%c[PFM Surveys] ✓ Found ${fetchedSurveys.length} survey(s)`, "color: #27ae60; font-weight: bold");

        const anyHasUserRules = fetchedSurveys.some(
            (s) => s.targeting?.userType === "specific" && (s.targeting?.userRules?.length ?? 0) > 0
        );
            if (anyHasUserRules) {
                logger.log("[PFM Surveys] At least one survey has user (geo) rules; fetching userGeo now...");
                userGeo = await fetchUserGeo(config);
                logger.log("[PFM Surveys] userGeo for targeting:", userGeo);
                if (!userGeo) {
                    logger.warn("[PFM Surveys] ⚠️ userGeo is null (API /api/public/geo failed or returned null). Surveys with geo rules will be skipped.");
                }
            } else {
                logger.log("[PFM Surveys] No surveys with user rules; skipping geo fetch.");
            }

        allSurveys = fetchedSurveys;
        void showNextSurvey();
    })();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
