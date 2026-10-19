import { describe, expect, it } from "vitest";
import { collectAlerts, computeAlerts, evaluateAlerts, leaderSinceFromSequence, shortSurveyName, type AlertBenchmarks, type AlertInput, type AlertQuestion } from "./alerts";

const benchmarks: AlertBenchmarks = {
    surveyCount: 91,
    responseP10: 5.9,
    responseP25: 9.9,
    responseMedian: 13.4,
    responseP75: 17.9,
    responseP90: 22.9,
    closeMedian: 50.4,
    noActionMedian: 33.2,
    responseRates: [3, 4, 5, 6, 10, 13, 18, 23, 40],
};

function input(overrides: Partial<AlertInput> = {}): AlertInput {
    return {
        impressions: 1000,
        responses: 130,
        closes: 500,
        active: false,
        today: "2026-10-19",
        lastResponseDay: "2026-10-17",
        firstImpressionDay: "2026-10-01",
        questionCount: 1,
        questions: [],
        segmentsReady: false,
        segments: [],
        recentWindow: null,
        ...overrides,
    };
}

function question(overrides: Partial<AlertQuestion> = {}): AlertQuestion {
    return {
        number: 1,
        type: "radio",
        answers: 110,
        answeredShare: 100,
        options: [
            { label: "A", count: 46 },
            { label: "B", count: 25 },
        ],
        shifts: [{ label: "A", delta: 22 }, { label: "B", delta: -12 }],
        mobileAnswers: 0,
        desktopAnswers: 0,
        deviceGaps: [],
        ...overrides,
    };
}

describe("computeAlerts", () => {
    it("hides rate alerts under 200 impressions and on drafts", () => {
        expect(computeAlerts(input({ impressions: 199, responses: 1, active: false }), benchmarks)).toEqual([]);
        expect(computeAlerts(input({ impressions: 0, responses: 0, active: false }), benchmarks)).toEqual([]);
    });

    it("fires a low response rate under P10 and not on the line", () => {
        const below = computeAlerts(input({ impressions: 200, responses: 11, closes: 20 }), benchmarks);
        expect(below.map((alert) => alert.id)).toContain("low_response_rate");
        const onLine = computeAlerts(input({ impressions: 1000, responses: 59, closes: 100 }), benchmarks);
        expect(onLine.map((alert) => alert.id)).not.toContain("low_response_rate");
    });

    it("lets stalled replace the low response card in the same group", () => {
        const alerts = computeAlerts(input({ impressions: 555, responses: 1, closes: 10 }), benchmarks);
        expect(alerts.map((alert) => alert.id)).toContain("stalled");
        expect(alerts.map((alert) => alert.id)).not.toContain("low_response_rate");
        expect(computeAlerts(input({ impressions: 300, responses: 30, closes: 10 }), benchmarks).map((a) => a.id)).not.toContain(
            "stalled"
        );
    });

    it("requires 500 impressions and a share over 70 for ignored", () => {
        expect(computeAlerts(input({ impressions: 500, responses: 50, closes: 99 }), benchmarks).some((a) => a.id === "ignored")).toBe(
            true
        );
        expect(computeAlerts(input({ impressions: 499, responses: 10, closes: 10 }), benchmarks).some((a) => a.id === "ignored")).toBe(
            false
        );
    });

    it("puts a silent live survey first even with few impressions", () => {
        const alerts = computeAlerts(
            input({
                impressions: 9,
                responses: 0,
                closes: 0,
                active: true,
                lastResponseDay: null,
                firstImpressionDay: "2026-02-11",
            }),
            benchmarks
        );
        expect(alerts).toHaveLength(1);
        expect(alerts[0].id).toBe("silent_live");
        expect(alerts[0].score).toBe(6);
        expect(alerts[0].values.since).toBe("2026-02-11");
    });

    it("fires a dropping rate only past 5 points on a live survey", () => {
        const dropped = computeAlerts(
            input({ active: true, responses: 200, recentWindow: { impressions: 100, responses: 8 } }),
            benchmarks
        );
        expect(dropped.some((alert) => alert.id === "rate_dropped")).toBe(true);
        const flat = computeAlerts(
            input({ active: true, responses: 130, recentWindow: { impressions: 100, responses: 10 } }),
            benchmarks
        );
        expect(flat.some((alert) => alert.id === "rate_dropped")).toBe(false);
    });

    it("ranks a NeoRoot-style survey as ignored, low response, then the shift", () => {
        const alerts = collectAlerts(
            input({
                impressions: 2713,
                responses: 110,
                closes: 296,
                questions: [question()],
            }),
            benchmarks
        );
        expect(alerts.slice(0, 3).map((alert) => alert.id)).toEqual([
            "ignored",
            "low_response_rate",
            "answers_shifted",
        ]);
        expect(alerts.map((alert) => alert.id)).not.toContain("headline_result");
    });

    it("keeps at most three alerts", () => {
        const alerts = computeAlerts(
            input({
                impressions: 2713,
                responses: 110,
                closes: 296,
                active: true,
                lastResponseDay: "2026-08-31",
                questions: [question()],
            }),
            benchmarks
        );
        expect(alerts).toHaveLength(3);
    });
});

describe("shortSurveyName", () => {
    it("drops the type phrase and the date", () => {
        expect(shortSurveyName("AGS LP | Wife Pressure Single Choice Question | 09/09/2026")).toBe(
            "AGS LP | Wife Pressure"
        );
        expect(shortSurveyName("Age")).toBe("Age");
    });
});

describe("new cards", () => {
    it("reads when the final answer took the lead", () => {
        expect(leaderSinceFromSequence(["a", "a", "a"])).toBe(1);
        expect(leaderSinceFromSequence(["b", "a", "a"])).toBe(3);
    });

    it("fires a fast start at 24 hours and scores 12 hours higher", () => {
        const day = evaluateAlerts(input({ hoursTo100: 24, medianHoursTo100: 50 }), benchmarks);
        expect(day.find((alert) => alert.id === "fast_start")?.score).toBe(1.5);
        expect(evaluateAlerts(input({ hoursTo100: 12 }), benchmarks).find((alert) => alert.id === "fast_start")?.score).toBe(2);
        expect(evaluateAlerts(input({ hoursTo100: 24.1 }), benchmarks).some((alert) => alert.id === "fast_start")).toBe(false);
        expect(evaluateAlerts(input({ hoursTo100: null }), benchmarks).some((alert) => alert.id === "fast_start")).toBe(false);
    });

    it("keeps a settled result only when the lead started by answer 30 and the answers did not shift", () => {
        const stable = evaluateAlerts(input({ questions: [question({ shifts: [], leaderSince: 1, options: [{ label: "A", count: 80 }, { label: "B", count: 30 }] })] }), benchmarks);
        expect(stable.some((alert) => alert.id === "answer_settled")).toBe(true);
        expect(stable.find((alert) => alert.id === "answer_settled")?.title).toContain("since answer 1");
        const late = evaluateAlerts(input({ questions: [question({ shifts: [], leaderSince: 32 })] }), benchmarks);
        expect(late.some((alert) => alert.id === "answer_settled")).toBe(false);
        const shifted = evaluateAlerts(input({ questions: [question({ leaderSince: 1, shifts: [{ label: "A", delta: 12 }] })] }), benchmarks);
        expect(shifted.some((alert) => alert.id === "answer_settled")).toBe(false);
    });

    it("flags an option under 3 percent and uses the plural title", () => {
        const rare = evaluateAlerts(
            input({
                questions: [question({ answers: 1000, shifts: [], options: [{ label: "A", count: 971 }, { label: "B", count: 29 }] })],
            }),
            benchmarks
        );
        expect(rare.find((alert) => alert.id === "rare_option")?.title).toBe("Only 3% chose “B”.");
        const several = evaluateAlerts(
            input({
                questions: [question({ answers: 1000, shifts: [], options: [{ label: "A", count: 950 }, { label: "B", count: 29 }, { label: "C", count: 21 }] })],
            }),
            benchmarks
        );
        expect(several.find((alert) => alert.id === "rare_option")?.title).toContain("and 1 other option got under 3%");
        expect(evaluateAlerts(input({ questions: [question({ answers: 1000, options: [{ label: "A", count: 970 }, { label: "B", count: 30 }] })] }), benchmarks).some((alert) => alert.id === "rare_option")).toBe(false);
        expect(evaluateAlerts(input({ questions: [question({ answers: 99, options: [{ label: "A", count: 97 }, { label: "B", count: 2 }] })] }), benchmarks).some((alert) => alert.id === "rare_option")).toBe(false);
    });

    it("calls a 3 point gap too close and lets a shift win that group", () => {
        const close = evaluateAlerts(
            input({ questions: [question({ answers: 1000, shifts: [], options: [{ label: "A", count: 400 }, { label: "B", count: 370 }] })] }),
            benchmarks
        );
        expect(close.some((alert) => alert.id === "too_close")).toBe(true);
        const wider = evaluateAlerts(
            input({ questions: [question({ answers: 1000, shifts: [], options: [{ label: "A", count: 400 }, { label: "B", count: 369 }] })] }),
            benchmarks
        );
        expect(wider.some((alert) => alert.id === "too_close")).toBe(false);
        const ranked = collectAlerts(
            input({ questions: [question({ answers: 1000, shifts: [{ label: "A", delta: 12 }], options: [{ label: "A", count: 400 }, { label: "B", count: 370 }] })] }),
            benchmarks
        );
        expect(ranked.map((alert) => alert.id)).toContain("answers_shifted");
        expect(ranked.map((alert) => alert.id)).not.toContain("too_close");
    });

    it("ranks a product once there are 4 surveys and hides it behind a low response rate", () => {
        const peers = [
            { surveyId: "me", shortName: "This", rate: 20 },
            { surveyId: "b", shortName: "Other", rate: 10 },
            { surveyId: "c", shortName: "Third", rate: 8 },
            { surveyId: "d", shortName: "Fourth", rate: 6 },
        ];
        const best = evaluateAlerts(input({ impressions: 1000, responses: 200, product: "Shampoo", productPeers: peers }), benchmarks);
        expect(best.find((alert) => alert.id === "product_rank")?.title).toMatch(/^Best response rate/);
        expect(best.find((alert) => alert.id === "product_rank")?.type).toBe("positive");
        expect(evaluateAlerts(input({ product: "Shampoo", productPeers: peers.slice(0, 3) }), benchmarks).some((alert) => alert.id === "product_rank")).toBe(false);

        const ten = [
            { surveyId: "me", shortName: "This", rate: 12 },
            ...[20, 18, 11, 10, 9, 8, 7, 6, 5].map((rate, index) => ({ surveyId: String(index), shortName: `S${index}`, rate })),
        ];
        const third = evaluateAlerts(input({ impressions: 1000, responses: 120, product: "Shampoo", productPeers: ten }), benchmarks).find((alert) => alert.id === "product_rank");
        expect(third?.type).toBe("positive");
        const fourthPeers = ten.map((peer) => (peer.surveyId === "me" ? { ...peer, rate: 10.5 } : peer));
        const fourth = evaluateAlerts(input({ impressions: 1000, responses: 105, product: "Shampoo", productPeers: fourthPeers }), benchmarks).find((alert) => alert.id === "product_rank");
        expect(fourth?.type).toBe("neutral");

        const low = evaluateAlerts(input({ impressions: 1000, responses: 10, product: "Shampoo", productPeers: peers }), benchmarks);
        expect(low.some((alert) => alert.id === "product_rank")).toBe(false);
    });

    it("compares with the earlier version and keeps that ahead of the product rank", () => {
        expect(evaluateAlerts(input({ previousVersion: null }), benchmarks).some((alert) => alert.id === "vs_previous_version")).toBe(false);
        const small = evaluateAlerts(
            input({ previousVersion: { shortName: "Old", firstImpressionAt: "2026-08-09", impressions: 199, rate: 10 } }),
            benchmarks
        );
        expect(small.some((alert) => alert.id === "vs_previous_version")).toBe(false);
        const compared = evaluateAlerts(
            input({
                impressions: 1000,
                responses: 200,
                product: "Face Cream",
                productPeers: [
                    { surveyId: "me", shortName: "New", rate: 20 },
                    { surveyId: "b", shortName: "B", rate: 10 },
                    { surveyId: "c", shortName: "C", rate: 9 },
                    { surveyId: "d", shortName: "D", rate: 8 },
                ],
                previousVersion: {
                    shortName: "Old",
                    firstImpressionAt: "2026-08-24",
                    impressions: 479,
                    rate: 39.5,
                    options: [{ label: "65-74", previousShare: 20, share: 36 }],
                },
            }),
            benchmarks
        );
        const card = compared.find((alert) => alert.id === "vs_previous_version");
        expect(card?.body).toContain("went from 20% to 36%");
        expect(card?.body).toContain("Aug 24");
        const ranked = collectAlerts(
            input({
                impressions: 1000,
                responses: 200,
                product: "Face Cream",
                productPeers: [
                    { surveyId: "me", shortName: "New", rate: 20 },
                    { surveyId: "b", shortName: "B", rate: 10 },
                    { surveyId: "c", shortName: "C", rate: 9 },
                    { surveyId: "d", shortName: "D", rate: 8 },
                ],
                previousVersion: { shortName: "Old", firstImpressionAt: "2026-08-24", impressions: 400, rate: 30 },
            }),
            benchmarks
        );
        expect(ranked.map((alert) => alert.id)).toContain("vs_previous_version");
        expect(ranked.map((alert) => alert.id)).not.toContain("product_rank");
    });

    it("moves the answer-shift line to 12 points", () => {
        expect(evaluateAlerts(input({ questions: [question({ shifts: [{ label: "A", delta: 11.9 }] })] }), benchmarks).some((alert) => alert.id === "answers_shifted")).toBe(false);
        expect(evaluateAlerts(input({ questions: [question({ shifts: [{ label: "A", delta: 12 }] })] }), benchmarks).some((alert) => alert.id === "answers_shifted")).toBe(true);
    });
});
