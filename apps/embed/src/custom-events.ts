import type { Survey } from "./types";

export type TriggerPayload = Record<string, unknown>;

export interface QueuedTrigger {
    name: string;
    payload?: TriggerPayload;
}

export interface PFMSurveysApi {
    trigger: (name: string, payload?: TriggerPayload) => void;
    _q: QueuedTrigger[];
}

declare global {
    interface Window {
        PFMSurveys?: PFMSurveysApi;
    }
}

export function isWaitingForEvent(survey: Survey): boolean {
    return (survey.displaySettings?.timing_mode || "immediate") === "custom_event";
}

export function eventMatches(survey: Survey, firedEvents: Set<string>): boolean {
    const expected = (survey.displaySettings?.custom_event_name || "").trim();
    return !!expected && firedEvents.has(expected);
}

export function adoptStubQueue(): QueuedTrigger[] {
    const existing = window.PFMSurveys;
    const queued = Array.isArray(existing?._q) ? existing._q.slice() : [];
    return queued.map((item) => ({
        name: typeof item?.name === "string" ? item.name : "",
        payload: item?.payload && typeof item.payload === "object" ? item.payload : {},
    }));
}

export function installPublicTrigger(trigger: PFMSurveysApi["trigger"]): void {
    window.PFMSurveys = { trigger, _q: [] };
}
