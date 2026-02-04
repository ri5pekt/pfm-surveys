/**
 * Utilities for the embed widget.
 * Storage keys are namespaced by siteId to avoid cross-site collisions.
 */

export function generateId(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

const USER_KEY = (siteId: string) => `pfm_user_id:${siteId}`;
const SESSION_KEY = (siteId: string) => `pfm_session_id:${siteId}`;
const SHOWN_KEY = (siteId: string) => `pfm_shown_surveys:${siteId}`;
export const SESSION_SHOWN_KEY = (siteId: string, surveyId: string) => `pfm_sess_shown:${siteId}:${surveyId}`;

export function getOrCreateUserId(siteId: string): string {
    const key = USER_KEY(siteId);
    let userId = localStorage.getItem(key);
    if (!userId) {
        userId = generateId();
        localStorage.setItem(key, userId);
    }
    return userId;
}

export function getOrCreateSessionId(siteId: string): string {
    const key = SESSION_KEY(siteId);
    let sessionId = sessionStorage.getItem(key);
    if (!sessionId) {
        sessionId = generateId();
        sessionStorage.setItem(key, sessionId);
    }
    return sessionId;
}

export function getShownSurveys(siteId: string): Record<string, number> {
    try {
        const shown = localStorage.getItem(SHOWN_KEY(siteId));
        return shown ? JSON.parse(shown) : {};
    } catch {
        return {};
    }
}

export function markSurveyShown(surveyId: string, siteId: string): void {
    const shown = getShownSurveys(siteId);
    shown[surveyId] = Date.now();
    localStorage.setItem(SHOWN_KEY(siteId), JSON.stringify(shown));
}

export function escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

/** Parse navigator.userAgent for display (browser name). */
export function getBrowser(): string {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    if (/Edg\//i.test(ua)) return "Edge";
    if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return "Chrome";
    if (/Firefox\//i.test(ua)) return "Firefox";
    if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
    if (/OPR\//i.test(ua) || /Opera\//i.test(ua)) return "Opera";
    if (/MSIE|Trident\//i.test(ua)) return "IE";
    return "Other";
}

/** Parse navigator.userAgent and navigator.platform for OS. */
export function getOS(): string {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const plat = typeof navigator !== "undefined" ? (navigator as any).platform : "";
    // Check Android and iOS first (they contain "Linux" and "Mac" in UA)
    if (/Android/i.test(ua)) return "Android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
    if (/Win/i.test(ua) || /Win/i.test(plat)) return "Windows";
    if (/Mac/i.test(ua) || /Mac/i.test(plat)) return "macOS";
    if (/Linux/i.test(ua) || /Linux/i.test(plat)) return "Linux";
    return "Other";
}

/** Detect device type from user agent and screen size. */
export function getDevice(): string {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

    // Check for tablets first (more specific)
    if (/iPad/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
        return "Tablet";
    }

    // Check for mobile
    if (/Mobile|iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
        return "Mobile";
    }

    // Default to Desktop
    return "Desktop";
}


