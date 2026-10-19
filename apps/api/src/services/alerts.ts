import { responseRatePercent } from "./dailyStats";

export type AlertType = "problem" | "caution" | "finding" | "positive" | "neutral";

export interface Alert {
    id: string;
    group: string;
    type: AlertType;
    kicker: string;
    title: string;
    body: string;
    score: number;
    values: Record<string, number | string>;
}

export interface AlertBenchmarks {
    surveyCount: number;
    responseP10: number;
    responseP25: number;
    responseMedian: number;
    responseP75: number;
    responseP90: number;
    closeMedian: number;
    noActionMedian: number;
    responseRates: number[];
}

export interface AlertShift {
    label: string;
    delta: number;
}

export interface AlertDeviceGap {
    label: string;
    mobileShare: number;
    desktopShare: number;
}

export interface AlertQuestion {
    number: number;
    type: "radio" | "checkbox" | "text";
    answers: number;
    answeredShare: number;
    options: Array<{ label: string; count: number }>;
    shifts: AlertShift[];
    mobileAnswers: number;
    desktopAnswers: number;
    deviceGaps: AlertDeviceGap[];
    /** 1-based answer number from which the final leader has led. Null when there is a tie. */
    leaderSince?: number | null;
    /** People who answered, for checkbox share. Defaults to answers. */
    respondents?: number;
}

export interface AlertSegment {
    kind: "device" | "page";
    name: string;
    impressions: number;
    rate: number;
}

export interface AlertWindow {
    impressions: number;
    responses: number;
}

export interface AlertInput {
    impressions: number;
    responses: number;
    closes: number;
    active: boolean;
    today: string;
    lastResponseDay: string | null;
    firstImpressionDay: string | null;
    questionCount: number;
    questions: AlertQuestion[];
    segmentsReady: boolean;
    segments: AlertSegment[];
    recentWindow: AlertWindow | null;
    product?: string | null;
    hoursTo100?: number | null;
    medianHoursTo100?: number | null;
    productPeers?: Array<{ surveyId: string; shortName: string; rate: number }>;
    previousVersion?: {
        shortName: string;
        firstImpressionAt: string | null;
        impressions: number;
        rate: number;
        options?: Array<{ label: string; previousShare: number; share: number }>;
    } | null;
}

const MIN_IMPRESSIONS = 200;
const TYPE_RANK: Record<AlertType, number> = { problem: 0, caution: 1, finding: 2, positive: 3, neutral: 4 };
const RULE_ORDER = [
    "low_response_rate",
    "high_response_rate",
    "stalled",
    "ignored",
    "closed_a_lot",
    "answers_shifted",
    "headline_result",
    "device_answers_differ",
    "segment_rate_gap",
    "silent_live",
    "rate_dropped",
    "question_skipped",
    "fast_start",
    "answer_settled",
    "rare_option",
    "too_close",
    "product_rank",
    "vs_previous_version",
];

export function alertBenchmarksFrom(
    rows: Array<{ impressions: number; responses: number; closes: number }>
): AlertBenchmarks {
    const responseRates = rows.map((row) => responseRatePercent(row.responses, row.impressions)).sort((a, b) => a - b);
    const closeRates = rows.map((row) => responseRatePercent(row.closes, row.impressions)).sort((a, b) => a - b);
    const noActionRates = rows
        .map((row) =>
            responseRatePercent(Math.max(0, row.impressions - row.responses - row.closes), row.impressions)
        )
        .sort((a, b) => a - b);
    return {
        surveyCount: rows.length,
        responseP10: round1(percentile(responseRates, 0.1)),
        responseP25: round1(percentile(responseRates, 0.25)),
        responseMedian: round1(percentile(responseRates, 0.5)),
        responseP75: round1(percentile(responseRates, 0.75)),
        responseP90: round1(percentile(responseRates, 0.9)),
        closeMedian: round1(percentile(closeRates, 0.5)),
        noActionMedian: round1(percentile(noActionRates, 0.5)),
        responseRates,
    };
}

export function shortSurveyName(name: string): string {
    const parts = name.split("|").map((part) => part.trim()).filter(Boolean);
    const head = parts.length >= 2 ? `${parts[0]} | ${parts[1]}` : name.trim();
    return head
        .replace(/\s+(Single Choice Question|Multiple Choice Question|Single-Choice Question|Yes\/No Question)\s*$/i, "")
        .trim();
}

export function evaluateAlerts(input: AlertInput, benchmarks: AlertBenchmarks): Alert[] {
    const quiet = quietDays(input);
    const eligible = input.impressions >= MIN_IMPRESSIONS;
    const fired: Alert[] = [];

    if (input.active && quiet != null && quiet.days >= 14) {
        fired.push(silentLive(quiet));
    }
    if (!eligible || input.impressions <= 0) {
        return fired;
    }

    const responseRate = responseRatePercent(input.responses, input.impressions);
    const closeRate = responseRatePercent(input.closes, input.impressions);
    const noActionRate = responseRatePercent(
        Math.max(0, input.impressions - input.responses - input.closes),
        input.impressions
    );

    const low = lowResponse(responseRate, benchmarks);
    if (low) fired.push(low);
    const high = highResponse(responseRate, benchmarks);
    if (high) fired.push(high);
    if (input.impressions >= 300 && input.responses < 30) fired.push(stalled(input));
    if (input.impressions >= 500 && noActionRate > 70) fired.push(ignored(noActionRate, benchmarks));
    if (closeRate > 60) fired.push(closedALot(closeRate, benchmarks));

    const shifted = answersShifted(input);
    if (shifted) fired.push(shifted);
    const closeCall = tooClose(input);
    let headline = headlineResult(input);
    if (closeCall && headline && headline.values.question === closeCall.values.question) headline = null;
    if (headline) fired.push(headline);
    if (closeCall) fired.push(closeCall);
    const settled = answerSettled(input);
    if (settled) fired.push(settled);
    const rare = rareOption(input);
    if (rare) fired.push(rare);
    const started = fastStart(input);
    if (started) fired.push(started);
    if (!fired.some((alert) => alert.id === "low_response_rate")) {
        const ranked = productRank(input);
        if (ranked) fired.push(ranked);
    }
    const compared = versusPrevious(input);
    if (compared) fired.push(compared);
    const devices = deviceAnswersDiffer(input);
    if (devices) fired.push(devices);
    const gap = segmentRateGap(input);
    if (gap) fired.push(gap);
    const dropped = rateDropped(input, responseRate);
    if (dropped) fired.push(dropped);
    const skipped = questionSkipped(input);
    if (skipped) fired.push(skipped);

    return fired;
}

export function collectAlerts(input: AlertInput, benchmarks: AlertBenchmarks): Alert[] {
    return rank(evaluateAlerts(input, benchmarks), input.active);
}

export function computeAlerts(input: AlertInput, benchmarks: AlertBenchmarks): Alert[] {
    return collectAlerts(input, benchmarks).slice(0, 3);
}

function rank(alerts: Alert[], live: boolean): Alert[] {
    const boosted = alerts.map((alert) => ({ ...alert, score: alert.score + statusBoost(alert, live) }));
    const best = new Map<string, Alert>();
    for (const alert of boosted) {
        const current = best.get(alert.group);
        if (!current || compareAlerts(alert, current) < 0) best.set(alert.group, alert);
    }
    return [...best.values()].sort(compareAlerts);
}

function statusBoost(alert: Alert, live: boolean): number {
    if (live && (alert.id === "silent_live" || alert.id === "rate_dropped" || alert.id === "stalled")) return 1;
    if (!live && alert.type === "finding") return 0.5;
    return 0;
}

function compareAlerts(a: Alert, b: Alert): number {
    if (b.score !== a.score) return b.score - a.score;
    const type = TYPE_RANK[a.type] - TYPE_RANK[b.type];
    if (type !== 0) return type;
    return RULE_ORDER.indexOf(a.id) - RULE_ORDER.indexOf(b.id);
}

function lowResponse(rate: number, benchmarks: AlertBenchmarks): Alert | null {
    if (benchmarks.surveyCount === 0 || rate >= benchmarks.responseP10) return null;
    const worse = benchmarks.responseRates.filter((value) => value < rate).length;
    const title =
        worse >= 10
            ? `${oneDecimal(rate)}% answered, below most of your surveys.`
            : `${oneDecimal(rate)}% answered. That’s in your bottom ${worse + 1}.`;
    return {
        id: "low_response_rate",
        group: "rate",
        type: "problem",
        kicker: "LOW RESPONSE RATE",
        title,
        body: `Your surveys usually get ${band(benchmarks.responseP25, benchmarks.responseP75)}. Only ${worse} of ${benchmarks.surveyCount} comparable surveys did worse.`,
        score: 3 + Math.min(1, safeDivide(benchmarks.responseP10 - rate, benchmarks.responseP10)),
        values: { rate, worse, compared: benchmarks.surveyCount },
    };
}

function highResponse(rate: number, benchmarks: AlertBenchmarks): Alert | null {
    if (benchmarks.surveyCount === 0 || rate <= benchmarks.responseP90) return null;
    const better = benchmarks.responseRates.filter((value) => value > rate).length;
    return {
        id: "high_response_rate",
        group: "rate",
        type: "positive",
        kicker: "STRONG RESPONSE RATE",
        title: `${oneDecimal(rate)}% answered. That’s in your top ${better + 1}.`,
        body: `Your surveys usually get ${band(benchmarks.responseP25, benchmarks.responseP75)}. Worth reusing this question style or placement.`,
        score: 1 + Math.min(1, safeDivide(rate - benchmarks.responseP90, benchmarks.responseP90)),
        values: { rate, better },
    };
}

function stalled(input: AlertInput): Alert {
    return {
        id: "stalled",
        group: "rate",
        type: "problem",
        kicker: "NOT GETTING ANSWERS",
        title: `${formatCount(input.responses)} answers from ${formatCount(input.impressions)} impressions.`,
        body: "Not enough to read the results. Check that the question shows correctly on mobile and isn’t hidden behind other popups.",
        score: 4.5,
        values: { responses: input.responses, impressions: input.impressions },
    };
}

function ignored(share: number, benchmarks: AlertBenchmarks): Alert {
    return {
        id: "ignored",
        group: "engagement",
        type: "problem",
        kicker: "MOSTLY IGNORED",
        title: `${oneDecimal(share)}% of visitors neither answered nor closed it.`,
        body: `Typical is about ${Math.round(benchmarks.noActionMedian)}%. The popup may be easy to miss on this page. Check placement or timing.`,
        score: 3 + Math.min(1, (share - 70) / 30),
        values: { share },
    };
}

function closedALot(rate: number, benchmarks: AlertBenchmarks): Alert {
    return {
        id: "closed_a_lot",
        group: "engagement",
        type: "problem",
        kicker: "CLOSED A LOT",
        title: `${oneDecimal(rate)}% closed it without answering.`,
        body: `Typical is about ${Math.round(benchmarks.closeMedian)}%. The question may feel intrusive or show too early. Try a later trigger.`,
        score: 3 + Math.min(1, (rate - 60) / 40),
        values: { closeRate: rate },
    };
}

function answersShifted(input: AlertInput): Alert | null {
    let best: { question: AlertQuestion; lead: AlertShift; opposite: AlertShift | null } | null = null;
    for (const question of input.questions) {
        if (question.type !== "radio" || question.answers < 100) continue;
        const shifts = question.shifts.filter((shift) => Math.abs(shift.delta) >= 12);
        if (shifts.length === 0) continue;
        const lead = [...shifts].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
        const opposite =
            shifts
                .filter((shift) => shift !== lead && Math.sign(shift.delta) === -Math.sign(lead.delta))
                .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0] ?? null;
        if (!best || Math.abs(lead.delta) > Math.abs(best.lead.delta)) best = { question, lead, opposite };
    }
    if (!best) return null;
    const verb = best.lead.delta > 0 ? "rose" : "fell";
    const qid = input.questionCount >= 2 ? ` · Q${best.question.number}` : "";
    const opposite = best.opposite;
    const oppositeSentence = opposite
        ? `“${opposite.label}” ${opposite.delta > 0 ? "rose" : "fell"} ${Math.abs(opposite.delta)}. `
        : "";
    return {
        id: "answers_shifted",
        group: "answers",
        type: "caution",
        kicker: `ANSWERS SHIFTED${qid}`,
        title: `“${best.lead.label}” ${verb} ${Math.abs(best.lead.delta)} points in the second half.`,
        body: `${oppositeSentence}Check whether traffic sources changed mid-run before trusting the split.`,
        score: 2.5 + Math.min(1, (Math.abs(best.lead.delta) - 12) / 18),
        values: { question: best.question.number, delta: best.lead.delta },
    };
}

function headlineResult(input: AlertInput): Alert | null {
    let best: Alert | null = null;
    for (const question of input.questions) {
        if (question.type !== "radio" || question.answers < 100 || question.options.length < 2) continue;
        const ranked = [...question.options].sort((a, b) => b.count - a.count);
        const top = ranked[0];
        const second = ranked[1];
        if (second.count <= 0) continue;
        const topShare = (top.count / question.answers) * 100;
        const secondShare = (second.count / question.answers) * 100;
        const ratio = topShare / secondShare;
        if (ratio < 1.5) continue;
        const alert: Alert = {
            id: "headline_result",
            group: "answers",
            type: "finding",
            kicker: `TOP ANSWER · Q${question.number}`,
            title: `${Math.round(topShare)}% chose “${top.label}”.`,
            body: `That’s ${ratioText(ratio)}× the next answer, “${second.label}” (${Math.round(secondShare)}%).`,
            score: 2 + Math.min(1, (ratio - 1.5) / 1.5),
            values: { question: question.number, share: Math.round(topShare), ratio },
        };
        if (!best || alert.score > best.score) best = alert;
    }
    return best;
}

function deviceAnswersDiffer(input: AlertInput): Alert | null {
    let best: Alert | null = null;
    for (const question of input.questions) {
        if (question.type !== "radio" || question.mobileAnswers < 30 || question.desktopAnswers < 30) continue;
        const gap = [...question.deviceGaps].sort(
            (a, b) => Math.abs(b.mobileShare - b.desktopShare) - Math.abs(a.mobileShare - a.desktopShare)
        )[0];
        if (!gap) continue;
        const points = Math.abs(gap.mobileShare - gap.desktopShare);
        if (points < 10) continue;
        const alert: Alert = {
            id: "device_answers_differ",
            group: "segments",
            type: "finding",
            kicker: `MOBILE VS DESKTOP · Q${question.number}`,
            title: `“${gap.label}” is ${Math.round(gap.mobileShare)}% on mobile vs ${Math.round(gap.desktopShare)}% on desktop.`,
            body: "Different audiences answer differently here. Filter by device before acting on the overall split.",
            score: 2 + Math.min(1, (points - 10) / 20),
            values: { question: question.number, gap: points },
        };
        if (!best || alert.score > best.score) best = alert;
    }
    return best;
}

function segmentRateGap(input: AlertInput): Alert | null {
    if (!input.segmentsReady) return null;
    let best: Alert | null = null;
    for (const kind of ["device", "page"] as const) {
        const rows = input.segments.filter((segment) => segment.kind === kind && segment.impressions >= 200 && segment.rate > 0);
        if (rows.length < 2) continue;
        const ranked = [...rows].sort((a, b) => b.rate - a.rate);
        const high = ranked[0];
        const low = ranked[ranked.length - 1];
        const ratio = high.rate / low.rate;
        if (ratio < 1.5) continue;
        const lowName = low.name.toLowerCase();
        const kicker =
            kind === "page"
                ? "PAGE GAP"
                : lowName === "mobile"
                  ? "MOBILE UNDERPERFORMS"
                  : `${low.name.toUpperCase()} UNDERPERFORMS`;
        const alert: Alert = {
            id: "segment_rate_gap",
            group: "segments",
            type: "problem",
            kicker,
            title: `${high.name} answers ${ratioText(ratio)}× more often than ${low.name}.`,
            body: `${oneDecimal(high.rate)}% vs ${oneDecimal(low.rate)}%. The ${low.name} version of the popup may need a lighter layout or different timing.`,
            score: 2.5 + Math.min(1, (ratio - 1.5) / 1.5),
            values: { ratio, highRate: high.rate, lowRate: low.rate },
        };
        if (!best || alert.score > best.score) best = alert;
    }
    return best;
}

function silentLive(quiet: { days: number; since: string }): Alert {
    return {
        id: "silent_live",
        group: "live",
        type: "problem",
        kicker: "STILL LIVE, NO ANSWERS",
        title: `No answers for ${quiet.days} days, but the survey is still on.`,
        body: "Turn it off or check that the page still shows it.",
        score: 5,
        values: { days: quiet.days, since: quiet.since },
    };
}

function rateDropped(input: AlertInput, lifetimeRate: number): Alert | null {
    if (!input.active || !input.recentWindow || input.recentWindow.impressions < 50) return null;
    const windowRate = responseRatePercent(input.recentWindow.responses, input.recentWindow.impressions);
    const drop = lifetimeRate - windowRate;
    if (drop <= 5) return null;
    return {
        id: "rate_dropped",
        group: "live",
        type: "problem",
        kicker: "RESPONSE RATE DROPPING",
        title: `${oneDecimal(windowRate)}% answered in the last 3 active days, down from ${oneDecimal(lifetimeRate)}%.`,
        body: "Normal daily swings are under 5 points, so this is likely real. Check for page or traffic changes.",
        score: 3 + Math.min(1, (drop - 5) / 10),
        values: { windowRate, lifetimeRate, drop },
    };
}

function questionSkipped(input: AlertInput): Alert | null {
    if (input.questionCount < 2) return null;
    const skipped = input.questions
        .filter((question) => question.answeredShare < 40)
        .sort((a, b) => a.answeredShare - b.answeredShare)[0];
    if (!skipped) return null;
    const skip = Math.round(100 - skipped.answeredShare);
    const qid = `Q${skipped.number}`;
    return {
        id: "question_skipped",
        group: "coverage",
        type: "caution",
        kicker: `${qid} OFTEN SKIPPED`,
        title: `${skip}% skipped ${qid}.`,
        body:
            skipped.type === "text"
                ? "Normal for open text. Make it required only if you need it from everyone."
                : "Check that the question is clear and the options fit.",
        score: 1.5,
        values: { question: skipped.number, skip },
    };
}

function questionTag(input: AlertInput, number: number): string {
    return input.questionCount >= 2 ? ` · Q${number}` : "";
}

export function leaderSinceFromSequence(optionIds: string[]): number | null {
    if (optionIds.length === 0) return null;
    const totals = new Map<string, number>();
    for (const id of optionIds) totals.set(id, (totals.get(id) ?? 0) + 1);
    const top = Math.max(...totals.values());
    const leaders = [...totals.entries()].filter(([, count]) => count === top);
    if (leaders.length !== 1) return null;
    const finalLeader = leaders[0][0];
    const running = new Map<string, number>();
    let lastDifferent = 0;
    for (let index = 0; index < optionIds.length; index++) {
        const id = optionIds[index];
        running.set(id, (running.get(id) ?? 0) + 1);
        const high = Math.max(...running.values());
        const current = [...running.entries()].filter(([, count]) => count === high);
        const leading = current.length === 1 ? current[0][0] : null;
        if (leading !== finalLeader) lastDifferent = index + 1;
    }
    return lastDifferent + 1;
}

function tooClose(input: AlertInput): Alert | null {
    let best: { question: AlertQuestion; top: { label: string; count: number }; second: { label: string; count: number }; gap: number } | null = null;
    for (const question of input.questions) {
        if (question.type !== "radio" || question.answers < 100 || question.options.length < 2) continue;
        const ranked = [...question.options].sort((a, b) => b.count - a.count);
        const topShare = (ranked[0].count / question.answers) * 100;
        const secondShare = (ranked[1].count / question.answers) * 100;
        const gap = topShare - secondShare;
        if (gap > 3) continue;
        if (!best || gap < best.gap) best = { question, top: ranked[0], second: ranked[1], gap };
    }
    if (!best) return null;
    return {
        id: "too_close",
        group: "answers",
        type: "caution",
        kicker: `TOO CLOSE TO CALL${questionTag(input, best.question.number)}`,
        title: `“${best.top.label}” ${Math.round((best.top.count / best.question.answers) * 100)}% vs “${best.second.label}” ${Math.round((best.second.count / best.question.answers) * 100)}%.`,
        body: "The top two are within the margin of error. Don’t pick a winner from this alone.",
        score: 2.2,
        values: { question: best.question.number, gap: best.gap },
    };
}

function answerSettled(input: AlertInput): Alert | null {
    let best: { question: AlertQuestion; since: number; label: string } | null = null;
    for (const question of input.questions) {
        if (question.type !== "radio" || question.answers < 100 || question.leaderSince == null || question.leaderSince > 30) continue;
        if (question.shifts.some((shift) => Math.abs(shift.delta) >= 12)) continue;
        const label = [...question.options].sort((a, b) => b.count - a.count)[0]?.label;
        if (!label) continue;
        if (!best || question.leaderSince < best.since) best = { question, since: question.leaderSince, label };
    }
    if (!best) return null;
    return {
        id: "answer_settled",
        group: "stability",
        type: "finding",
        kicker: `RESULT IS STABLE${questionTag(input, best.question.number)}`,
        title: `“${best.label}” has led since answer ${best.since}.`,
        body: "The top answer didn’t change as more people answered, so you can trust it.",
        score: 1.2,
        values: { question: best.question.number, since: best.since },
    };
}

function shareLabel(share: number): string {
    if (share < 1) return share.toFixed(1);
    return String(Math.round(share));
}

function rareOption(input: AlertInput): Alert | null {
    let best: { question: AlertQuestion; label: string; share: number; others: number } | null = null;
    for (const question of input.questions) {
        if (question.type === "text" || question.answers < 100 || question.options.length === 0) continue;
        const people = question.type === "checkbox" ? question.respondents || question.answers : question.answers;
        if (people <= 0) continue;
        const rare = question.options
            .map((option) => ({ label: option.label, share: (option.count / people) * 100 }))
            .filter((option) => option.share < 3)
            .sort((a, b) => a.share - b.share);
        if (rare.length === 0) continue;
        const candidate = { question, label: rare[0].label, share: rare[0].share, others: rare.length - 1 };
        if (!best || candidate.share < best.share) best = candidate;
    }
    if (!best) return null;
    const pct = shareLabel(best.share);
    const title =
        best.others > 0
            ? `Only ${pct}% chose “${best.label}”, and ${best.others} other option${best.others === 1 ? "" : "s"} got under 3%.`
            : `Only ${pct}% chose “${best.label}”.`;
    return {
        id: "rare_option",
        group: "options",
        type: "finding",
        kicker: `RARELY PICKED${questionTag(input, best.question.number)}`,
        title,
        body: "Consider replacing it next time. A stronger option may split the result more usefully.",
        score: 1.8,
        values: { question: best.question.number, share: best.share, others: best.others },
    };
}

function hourText(hours: number): string {
    if (hours < 1) return "in under an hour";
    const rounded = Math.round(hours * 10) / 10;
    const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return `in ${text} hours`;
}

function fastStart(input: AlertInput): Alert | null {
    const hours = input.hoursTo100;
    if (hours == null || hours > 24) return null;
    const median = input.medianHoursTo100;
    const usual =
        median == null ? "" : `Most of your surveys take about ${Math.round(median)} hours. `;
    return {
        id: "fast_start",
        group: "pace",
        type: "positive",
        kicker: "FAST START",
        title: `100 answers ${hourText(hours)}.`,
        body: `${usual}Plenty of traffic on this page for quick tests.`,
        score: hours <= 12 ? 2 : 1.5,
        values: { hours },
    };
}

function ordinal(rank: number): string {
    const mod100 = rank % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${rank}th`;
    switch (rank % 10) {
        case 1:
            return `${rank}st`;
        case 2:
            return `${rank}nd`;
        case 3:
            return `${rank}rd`;
        default:
            return `${rank}th`;
    }
}

function productRank(input: AlertInput): Alert | null {
    const product = input.product?.trim();
    const peers = input.productPeers ?? [];
    if (!product || peers.length < 4) return null;
    const mine = responseRatePercent(input.responses, input.impressions);
    const higher = peers.filter((peer) => peer.rate > mine).length;
    const rank = 1 + higher;
    const best = [...peers].sort((a, b) => b.rate - a.rate)[0];
    const topQuarter = rank <= Math.ceil(peers.length / 4);
    const body = rank === 1 ? "" : `Best: “${best.shortName}” at ${oneDecimal(best.rate)}%.`;
    return {
        id: "product_rank",
        group: "compare",
        type: topQuarter ? "positive" : "neutral",
        kicker: topQuarter ? `TOP FOR ${product.toUpperCase()}` : `${product.toUpperCase()} SURVEYS`,
        title: topQuarter
            ? `${rank === 1 ? "Best" : ordinal(rank)} response rate of your ${peers.length} ${product} surveys.`
            : `Ranks ${ordinal(rank)} of ${peers.length} ${product} surveys by response rate.`,
        body,
        score: topQuarter ? 1.6 : 0.8,
        values: { rank, peers: peers.length, rate: mine },
    };
}

function versusPrevious(input: AlertInput): Alert | null {
    const previous = input.previousVersion;
    if (!previous || previous.impressions < 200 || input.impressions < 200) return null;
    const rate = responseRatePercent(input.responses, input.impressions);
    const when = previous.firstImpressionAt ? monthDay(previous.firstImpressionAt) : "earlier";
    const moved = [...(previous.options ?? [])].sort(
        (a, b) => Math.abs(b.share - b.previousShare) - Math.abs(a.share - a.previousShare)
    )[0];
    const shift =
        moved && Math.abs(moved.share - moved.previousShare) >= 10
            ? ` “${moved.label}” went from ${Math.round(moved.previousShare)}% to ${Math.round(moved.share)}%.`
            : "";
    return {
        id: "vs_previous_version",
        group: "compare",
        type: "finding",
        kicker: "VS EARLIER VERSION",
        title: `${oneDecimal(rate)}% answered, vs ${oneDecimal(previous.rate)}% last time.`,
        body: `“${previous.shortName}” ran ${when}.${shift}`,
        score: 2 + Math.min(1, Math.abs(rate - previous.rate) / 10),
        values: { rate, previousRate: previous.rate },
    };
}

function monthDay(iso: string): string {
    const [, month, day] = iso.split("-").map(Number);
    const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${names[(month || 1) - 1]} ${day}`;
}

function quietDays(input: AlertInput): { days: number; since: string } | null {
    const since = input.responses > 0 ? input.lastResponseDay : input.firstImpressionDay;
    if (!since || since > input.today) return null;
    return { days: daysBetween(since, input.today), since };
}

export function daysBetween(from: string, to: string): number {
    const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
    const [toYear, toMonth, toDay] = to.split("-").map(Number);
    const start = Date.UTC(fromYear, (fromMonth || 1) - 1, fromDay || 1);
    const end = Date.UTC(toYear, (toMonth || 1) - 1, toDay || 1);
    return Math.max(0, Math.round((end - start) / 86400000));
}

function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    if (sorted.length === 1) return sorted[0];
    const rank = (sorted.length - 1) * p;
    const low = Math.floor(rank);
    const high = Math.ceil(rank);
    if (low === high) return sorted[low];
    return sorted[low] + (sorted[high] - sorted[low]) * (rank - low);
}

function round1(value: number): number {
    return Math.round(value * 10) / 10;
}

function oneDecimal(value: number): string {
    return value.toFixed(1);
}

function band(low: number, high: number): string {
    if (low === high) return `${oneDecimal(low)}%`;
    return `${oneDecimal(low)}–${oneDecimal(high)}%`;
}

function safeDivide(part: number, whole: number): number {
    if (whole <= 0) return 0;
    return part / whole;
}

function ratioText(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatCount(value: number): string {
    return value.toLocaleString("en-US");
}
