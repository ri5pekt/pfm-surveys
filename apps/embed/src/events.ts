/**
 * Event queue and batching for sending events to the API.
 */

import { generateId, getOrCreateUserId, getOrCreateSessionId, getBrowser, getOS, getDevice } from "./utils";
import type { EmbedConfig } from "./types";

export type QueueEventFn = (eventType: string, data?: Record<string, unknown>) => void;

interface QueuedEvent {
    event_type: string;
    client_event_id: string;
    anonymous_user_id: string;
    session_id: string;
    page_url: string;
    timestamp: number;
    browser: string;
    os: string;
    device: string;
    [key: string]: unknown;
}

let eventTimer: ReturnType<typeof setTimeout> | null = null;
const eventQueue: QueuedEvent[] = [];

const MAX_SEND_RETRIES = 3;
const RETRY_DELAYS_MS = [2000, 6000, 15000];

export function createEventQueue(config: EmbedConfig) {
    function sendBatch(eventsToSend: QueuedEvent[], attempt: number): void {
        if (eventsToSend.length === 0) return;

        const eventTypes = eventsToSend.map((e) => e.event_type).join(", ");
        console.log(
            `%c[PFM Surveys] 📤 Sending ${eventsToSend.length} event(s) to server: ${eventTypes}${
                attempt > 0 ? ` (retry ${attempt}/${MAX_SEND_RETRIES})` : ""
            }`,
            "color: #3498db; font-weight: bold"
        );

        fetch(`${config.apiUrl}/api/public/events`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true",
            },
            body: JSON.stringify({
                nonce: generateId(),
                site_id: config.siteId,
                events: eventsToSend,
            }),
        })
            .then((response) => {
                if (!response.ok) {
                    const isRetryable = response.status >= 500 || response.status === 429;
                    if (isRetryable && attempt < MAX_SEND_RETRIES) {
                        const delay = RETRY_DELAYS_MS[attempt] ?? 15000;
                        setTimeout(() => sendBatch(eventsToSend, attempt + 1), delay);
                        return;
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then((data) => {
                if (data === undefined) return;
                console.log(
                    `%c[PFM Surveys] ✓ Events sent successfully: ${eventTypes}`,
                    "color: #27ae60; font-weight: bold",
                    data
                );
            })
            .catch((err) => {
                if (attempt < MAX_SEND_RETRIES) {
                    const delay = RETRY_DELAYS_MS[attempt] ?? 15000;
                    setTimeout(() => sendBatch(eventsToSend, attempt + 1), delay);
                    return;
                }
                console.error(
                    "%c[PFM Surveys] ❌ Failed to send events after retries:",
                    "color: #e74c3c; font-weight: bold",
                    err
                );
                console.error("[PFM Surveys] Events that failed:", eventsToSend);
                eventQueue.push(...eventsToSend);
            });
    }

    function flushEvents(): void {
        if (eventQueue.length === 0) return;

        const eventsToSend = [...eventQueue];
        eventQueue.length = 0;
        sendBatch(eventsToSend, 0);
    }

    function queueEvent(eventType: string, data: Record<string, unknown> = {}): void {
        const event: QueuedEvent = {
            event_type: eventType,
            client_event_id: generateId(),
            anonymous_user_id: getOrCreateUserId(config.siteId),
            session_id: getOrCreateSessionId(config.siteId),
            page_url: window.location.href,
            timestamp: Date.now(),
            browser: getBrowser(),
            os: getOS(),
            device: getDevice(),
            ...data,
        };

        eventQueue.push(event);

        clearTimeout(eventTimer!);
        eventTimer = setTimeout(flushEvents, 1000);
    }

    window.addEventListener("beforeunload", () => {
        if (eventQueue.length > 0) {
            try {
                const data = JSON.stringify({
                    nonce: generateId(),
                    site_id: config.siteId,
                    events: eventQueue,
                });

                const sent = navigator.sendBeacon(
                    `${config.apiUrl}/api/public/events`,
                    new Blob([data], { type: "application/json" })
                );

                if (!sent) {
                    fetch(`${config.apiUrl}/api/public/events`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "ngrok-skip-browser-warning": "true",
                        },
                        body: data,
                        keepalive: true,
                    } as RequestInit);
                }
            } catch (err) {
                console.error("[PFM Surveys] Failed to flush events on unload:", err);
            }
        }
    });

    return { queueEvent };
}
