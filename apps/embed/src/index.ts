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
import {
    adoptStubQueue,
    eventMatches,
    installPublicTrigger,
    isWaitingForEvent,
    type QueuedTrigger,
} from "./custom-events";

type DisarmFn = () => void;

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
    const armedSurveyIds = new Set<string>(); // Currently waiting (delay/scroll/exit) — don't re-arm
    const firedEvents = new Set<string>();
    const pendingTriggers: QueuedTrigger[] = [];
    let surveysReady = false;
    let displayInProgress = false;
    const activeDisarms: DisarmFn[] = [];

    function clearArms(): void {
        while (activeDisarms.length > 0) {
            const disarm = activeDisarms.pop();
            try {
                disarm?.();
            } catch {
                /* ignore */
            }
        }
        armedSurveyIds.clear();
    }

    function applyFiredEvent(name: string): void {
        const trimmed = (name || "").trim();
        if (trimmed) {
            firedEvents.add(trimmed);
        }
        const listeners = allSurveys.filter(
            (s) => (s.displaySettings?.custom_event_name || "").trim() === trimmed
        );
        if (listeners.length === 0) {
            logger.log(`[PFM Surveys] no survey listens for event "${trimmed}"`);
            return;
        }
        for (const survey of listeners) {
            logger.log(`[PFM Surveys] survey "${survey.name}" matched custom event "${trimmed}"`);
        }
    }

    function handleTrigger(name: string, payload?: Record<string, unknown>): void {
        const trimmed = (name || "").trim();
        logger.log(
            `[PFM Surveys] trigger("${trimmed}") received`,
            surveysReady ? "(surveys loaded)" : "(surveys not loaded yet)"
        );

        if (!surveysReady) {
            pendingTriggers.push({ name: trimmed, payload: payload || {} });
            return;
        }

        applyFiredEvent(trimmed);
        if (!displayInProgress) {
            void showNextSurvey();
        }
    }

    const stubQueued = adoptStubQueue();
    if (stubQueued.length > 0) {
        logger.log(`[PFM Surveys] adopted ${stubQueued.length} queued trigger(s) from window.PFMSurveys._q`);
        pendingTriggers.push(...stubQueued);
    }
    installPublicTrigger(handleTrigger);

    function presentSurvey(survey: Survey): void {
        if (displayInProgress || shownInThisCycle.has(survey.id)) return;

        displayInProgress = true;
        clearArms();
        shownInThisCycle.add(survey.id);

        logger.log(
            `%c[PFM Surveys] 🎉 Showing survey "${survey.name}"`,
            "color: #667eea; font-weight: bold"
        );

        const displaySurvey = createDisplaySurvey({
            queueEvent,
            siteId: config.siteId,
            onClose: () => {
                displayInProgress = false;
                void showNextSurvey();
            },
        });
        displaySurvey(survey);
    }

    function armSurvey(survey: Survey): void {
        if (armedSurveyIds.has(survey.id) || shownInThisCycle.has(survey.id) || displayInProgress) {
            return;
        }

        const timingMode = survey.displaySettings?.timing_mode || "immediate";
        const delay = survey.displaySettings?.show_delay_ms ?? 0;
        const scrollPercentage = survey.displaySettings?.scroll_percentage ?? 50;

        armedSurveyIds.add(survey.id);

        if (timingMode === "scroll") {
            logger.log(
                `%c[PFM Surveys] 📜 Waiting for user to scroll ${scrollPercentage}% for survey "${survey.name}"`,
                "color: #667eea; font-weight: bold"
            );

            let scrollTriggered = false;
            const handleScroll = () => {
                if (scrollTriggered || displayInProgress) return;

                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                const scrolledPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

                if (scrolledPercent >= scrollPercentage) {
                    scrollTriggered = true;
                    window.removeEventListener("scroll", handleScroll);
                    logger.log(
                        `%c[PFM Surveys] 🎉 Scroll threshold reached (${scrolledPercent.toFixed(1)}%) for "${survey.name}"`,
                        "color: #667eea; font-weight: bold"
                    );
                    presentSurvey(survey);
                }
            };

            window.addEventListener("scroll", handleScroll, { passive: true });
            activeDisarms.push(() => {
                scrollTriggered = true;
                window.removeEventListener("scroll", handleScroll);
            });
            handleScroll();
            return;
        }

        if (timingMode === "exit_intent") {
            logger.log(
                `%c[PFM Surveys] 🚪 Waiting for exit intent for survey "${survey.name}"`,
                "color: #667eea; font-weight: bold"
            );

            let exitTriggered = false;
            const handleExitIntent = (e: MouseEvent) => {
                if (exitTriggered || displayInProgress) return;
                if (e.relatedTarget != null) return;
                if (e.clientY > 0) return;

                exitTriggered = true;
                document.removeEventListener("mouseout", handleExitIntent);
                logger.log(
                    `%c[PFM Surveys] 🎉 Exit intent detected for "${survey.name}"`,
                    "color: #667eea; font-weight: bold"
                );
                presentSurvey(survey);
            };

            const EXIT_INTENT_ARM_DELAY_MS = 1500;
            const armTimer = window.setTimeout(() => {
                if (exitTriggered || displayInProgress) return;
                document.addEventListener("mouseout", handleExitIntent);
                logger.log(`%c[PFM Surveys] 🚪 Exit intent armed for "${survey.name}"`, "color: #667eea");
            }, EXIT_INTENT_ARM_DELAY_MS);

            activeDisarms.push(() => {
                exitTriggered = true;
                window.clearTimeout(armTimer);
                document.removeEventListener("mouseout", handleExitIntent);
            });
            return;
        }

        // immediate / delay
        logger.log(
            `%c[PFM Surveys] ⏱ Arming "${survey.name}" after ${delay}ms delay`,
            "color: #667eea; font-weight: bold"
        );
        const timer = window.setTimeout(() => {
            if (displayInProgress) return;
            presentSurvey(survey);
        }, delay);
        activeDisarms.push(() => {
            window.clearTimeout(timer);
        });
    }

    /**
     * Find every eligible survey and arm wait-triggers in parallel.
     * First one to fire wins; others are disarmed. Immediate (0ms) surveys win first in list order.
     */
    async function showNextSurvey(): Promise<void> {
        if (displayInProgress) return;

        const eligible = await findEligibleSurveys();
        if (eligible.length === 0) {
            logger.log("%c[PFM Surveys] ✓ No more surveys to show", "color: #999");
            return;
        }

        // Show first ready-now survey (immediate / delay 0 / custom event already fired)
        const readyNow = eligible.find((s) => {
            const mode = s.displaySettings?.timing_mode || "immediate";
            const delay = s.displaySettings?.show_delay_ms ?? 0;
            if (mode === "scroll" || mode === "exit_intent") return false;
            if (mode === "custom_event") return true; // already passed event gate in findEligible
            return delay <= 0;
        });

        if (readyNow) {
            presentSurvey(readyNow);
            return;
        }

        // Arm all deferred surveys; first trigger wins
        for (const survey of eligible) {
            armSurvey(survey);
        }
    }

    async function findEligibleSurveys(): Promise<Survey[]> {
        const eligible: Survey[] = [];

        for (const survey of allSurveys) {
            const { displaySettings, targeting } = survey;

            logger.log(`\n[PFM Surveys] 🔍 Evaluating survey: "${survey.name}"`, {
                userType: targeting?.userType,
                userRulesCount: targeting?.userRules?.length ?? 0,
                userRules: targeting?.userRules,
                userGeo,
            });

            if (shownInThisCycle.has(survey.id)) {
                logger.log(`%c[PFM Surveys] ❌ Survey "${survey.name}" already shown in this cycle`, "color: #e74c3c");
                continue;
            }

            if (armedSurveyIds.has(survey.id)) {
                logger.log(`[PFM Surveys] survey "${survey.name}" already armed — skipping re-arm`);
                continue;
            }

            if (isWaitingForEvent(survey)) {
                const expected = (survey.displaySettings?.custom_event_name || "").trim();
                if (!expected) {
                    logger.warn(`[PFM Surveys] survey "${survey.name}" skipped (custom event name empty)`);
                    continue;
                }
                if (!eventMatches(survey, firedEvents)) {
                    logger.log(`[PFM Surveys] survey "${survey.name}" skipped (custom event not fired yet)`);
                    continue;
                }
                logger.log(`[PFM Surveys] survey "${survey.name}" matched custom event "${expected}"`);
            }

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

            eligible.push(survey);
        }

        return eligible;
    }

    (async () => {
        logger.log("[PFM Surveys] 🔄 Fetching active surveys...");
        const { surveys: fetchedSurveys } = await fetchSurveys(config);

        if (fetchedSurveys.length === 0) {
            logger.log("%c[PFM Surveys] ℹ️ No active surveys available for this site", "color: #999");
            allSurveys = [];
            surveysReady = true;
            const queuedEmpty = pendingTriggers.splice(0);
            for (const item of queuedEmpty) {
                const trimmed = (item.name || "").trim();
                logger.log(`[PFM Surveys] trigger("${trimmed}") received (surveys loaded)`);
                applyFiredEvent(trimmed);
            }
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
                logger.warn(
                    "[PFM Surveys] ⚠️ userGeo is null (API /api/public/geo failed or returned null). Surveys with geo rules will be skipped."
                );
            }
        } else {
            logger.log("[PFM Surveys] No surveys with user rules; skipping geo fetch.");
        }

        allSurveys = fetchedSurveys;
        surveysReady = true;

        const queued = pendingTriggers.splice(0);
        for (const item of queued) {
            const trimmed = (item.name || "").trim();
            logger.log(`[PFM Surveys] trigger("${trimmed}") received (surveys loaded)`);
            applyFiredEvent(trimmed);
        }

        void showNextSurvey();
    })();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
