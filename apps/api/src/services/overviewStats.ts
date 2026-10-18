import { sql } from "kysely";
import { db } from "../db/connection";
import { addCalendarDays, eachCalendarDay, responseRatePercent, todayInTimeZone } from "./dailyStats";

const NY = "America/New_York";
/** Device and page were first stored on impressions on this New York date. */
const SEGMENT_FROM = "2026-10-18";
const BENCHMARK_MIN_IMPRESSIONS = 200;
const MAX_DAILY_DAYS = 1500;
const COVERAGE_MIN = 0.5;

export type OverviewDevice = "mobile" | "desktop" | "tablet";

export interface OverviewBenchmark {
    p25: number;
    median: number;
    p75: number;
    scaleMax: number;
}

export interface OverviewShift {
    from: number;
    to: number;
    delta: number;
}

export interface OverviewOption {
    id: string;
    label: string;
    count: number;
    share: number;
    shift: OverviewShift | null;
    comments: Array<{ text: string; at: string }>;
}

export interface OverviewQuestion {
    id: string;
    order: number;
    number: number;
    text: string;
    short: string;
    type: string;
    typeLabel: string;
    answers: number;
    options?: OverviewOption[];
    averagePicks?: number;
    answeredShare?: number;
    latest?: Array<{
        text: string;
        at: string;
        device: string | null;
        browser: string | null;
        location: string | null;
    }>;
}

export interface OverviewSegmentRow {
    name?: string;
    url?: string;
    responses: number;
    impressions: number;
    rate: number;
    shareOfResponses: number;
}

export interface OverviewAlert {
    id: "low_response" | "ignored" | "high_close" | "mix_shifted" | "still_live";
    tone: "problem" | "caution";
    kicker: string;
    title: string;
    body: string;
}

export interface OverviewResult {
    survey: {
        name: string;
        active: boolean;
        status: "live" | "ended" | "draft";
        run: { kind: "live" | "ended" | "none"; from: string | null; to: string | null; days: number | null };
        questions: Array<{ id: string; order: number; number: number; text: string; short: string; type: string; typeLabel: string }>;
        primaryPage: string | null;
    };
    totals: {
        impressions: number;
        responses: number;
        closes: number;
        responseRate: number;
        closeRate: number;
        noAction: number;
        noActionRate: number;
    };
    benchmarks: {
        surveyCount: number;
        responseRate: OverviewBenchmark;
        closeRate: OverviewBenchmark;
        noAction: OverviewBenchmark;
    };
    questions: OverviewQuestion[];
    alerts: {
        comparedTo: number;
        items: OverviewAlert[];
    };
    segments: {
        from: string;
        lifetimeImpressions: number;
        devices: { ready: boolean; taggedImpressions: number; rows: OverviewSegmentRow[] };
        pages: { ready: boolean; taggedImpressions: number; rows: OverviewSegmentRow[] };
    };
    daily: Array<{ date: string; responses: number }>;
    latest: Array<{
        answer: string;
        device: string | null;
        browser: string | null;
        location: string | null;
        at: string;
    }>;
}

function asNumber(value: unknown): number {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
}

function asDay(value: unknown): string | null {
    if (value == null || value === "") return null;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    const text = String(value).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function round1(value: number): number {
    return Math.round(value * 10) / 10;
}

function wholePercent(part: number, whole: number): number {
    if (whole <= 0) return 0;
    return Math.round((part / whole) * 100);
}

/** Linear percentile, same definition as percentile_cont. */
function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    if (sorted.length === 1) return sorted[0];
    const rank = (sorted.length - 1) * p;
    const low = Math.floor(rank);
    const high = Math.ceil(rank);
    if (low === high) return sorted[low];
    return sorted[low] + (sorted[high] - sorted[low]) * (rank - low);
}

function benchmark(rates: number[], scaleMax: number, floor: number): OverviewBenchmark {
    const sorted = [...rates].sort((a, b) => a - b);
    const p75 = round1(percentile(sorted, 0.75));
    return {
        p25: round1(percentile(sorted, 0.25)),
        median: round1(percentile(sorted, 0.5)),
        p75,
        scaleMax: Math.max(floor, Math.ceil(Math.max(floor, p75) / 10) * 10, scaleMax),
    };
}

function responseScale(rates: number[], thisRate: number): OverviewBenchmark {
    const band = benchmark(rates, 30, 30);
    const top = Math.max(band.scaleMax, thisRate, band.p75);
    return { ...band, scaleMax: Math.max(30, Math.ceil(top / 10) * 10) };
}

function fixedScale(rates: number[]): OverviewBenchmark {
    const band = benchmark(rates, 100, 100);
    return { ...band, scaleMax: 100 };
}

function typeLabel(type: string): string {
    if (type === "checkbox") return "Multiple choice";
    if (type === "text") return "Text";
    return "Single choice";
}

function shortText(text: string): string {
    const trimmed = text.trim();
    if (trimmed.length <= 32) return trimmed;
    return `${trimmed.slice(0, 31).trimEnd()}…`;
}

export function answerPageKey(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const noHash = trimmed.split("#")[0];
    try {
        const withProto = /^https?:\/\//i.test(noHash)
            ? noHash
            : `https://placeholder.local${noHash.startsWith("/") ? "" : "/"}${noHash}`;
        const url = new URL(withProto);
        const path = url.pathname.replace(/\/+$/, "");
        return path || "/";
    } catch {
        const noQuery = noHash.split("?")[0].replace(/\/+$/, "");
        return noQuery || null;
    }
}

function locationLabel(country: string | null, stateName: string | null, state: string | null): string | null {
    const place = (stateName || state || "").trim();
    const nation = (country || "").trim();
    if (nation && place) return `${nation}, ${place}`;
    return nation || place || null;
}

function asIso(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    const text = String(value ?? "");
    if (!text) return "";
    if (text.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(text)) return text;
    return `${text.replace(" ", "T")}Z`;
}

function daysInclusive(from: string, to: string): number {
    const span = eachCalendarDay(from, to);
    return span.length;
}

function deviceSql(device: OverviewDevice | null) {
    if (!device) return sql`TRUE`;
    return sql`lower(btrim(device)) = ${device}`;
}

export function parseOverviewDevice(value: string | undefined): OverviewDevice | null | { error: string } {
    if (!value || value === "all") return null;
    if (value === "mobile" || value === "desktop" || value === "tablet") return value;
    return { error: "device must be all, mobile, desktop, or tablet" };
}

const ALERT_LIMIT = 3;
const LOW_RESPONSE_UNDER = 6;
const LOW_RESPONSE_MIN_IMPRESSIONS = 200;
const IGNORED_OVER = 70;
const IGNORED_MIN_IMPRESSIONS = 500;
const HIGH_CLOSE_OVER = 60;
const HIGH_CLOSE_MIN_IMPRESSIONS = 200;
const STALE_LIVE_DAYS = 14;
const ALERT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface AlertShift {
    questionNumber: number;
    label: string;
    delta: number;
}

function ratePhrase(value: number): string {
    const shown = round1(value);
    return Number.isInteger(shown) ? String(shown) : shown.toFixed(1);
}

function bandPhrase(p25: number, p75: number): string {
    const low = Math.round(p25);
    const high = Math.round(p75);
    if (low === high) return `${low}%`;
    return `${low}–${high}%`;
}

function quoted(label: string): string {
    return `“${label}”`;
}

function daysBetween(from: string, to: string): number {
    const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
    const [toYear, toMonth, toDay] = to.split("-").map(Number);
    const start = Date.UTC(fromYear, (fromMonth || 1) - 1, fromDay || 1);
    const end = Date.UTC(toYear, (toMonth || 1) - 1, toDay || 1);
    return Math.max(0, Math.round((end - start) / 86400000));
}

function alertDate(iso: string): string {
    const [year, month, day] = iso.split("-").map(Number);
    return `${ALERT_MONTHS[(month || 1) - 1]} ${day}, ${year}`;
}

/** Ranked rule catalog. At most three cards, and nothing is added to fill the row. */
export function buildOverviewAlerts(input: {
    impressions: number;
    responseRate: number;
    closeRate: number;
    noActionRate: number;
    active: boolean;
    today: string;
    lastResponseDay: string | null;
    firstImpressionDay: string | null;
    responseRates: number[];
    responseP25: number;
    responseP75: number;
    closeP25: number;
    closeP75: number;
    noActionMedian: number;
    shifts: AlertShift[];
}): OverviewAlert[] {
    const alerts: OverviewAlert[] = [];

    if (
        input.impressions >= LOW_RESPONSE_MIN_IMPRESSIONS &&
        input.responseRate < LOW_RESPONSE_UNDER &&
        input.responseRates.length > 0
    ) {
        const worse = input.responseRates.filter((rate) => rate < input.responseRate).length;
        const rank = worse + 1;
        const usual = bandPhrase(input.responseP25, input.responseP75);
        const compared = input.responseRates.length;
        const title =
            rank === 1
                ? `${ratePhrase(input.responseRate)}% answered. That’s the lowest of your surveys.`
                : `${ratePhrase(input.responseRate)}% answered. That’s in your bottom ${rank}.`;
        const comparison =
            worse === 0
                ? `No comparable survey did worse.`
                : worse === 1
                  ? `Only 1 of ${compared} comparable surveys did worse.`
                  : `Only ${worse} of ${compared} comparable surveys did worse.`;
        alerts.push({
            id: "low_response",
            tone: "problem",
            kicker: "LOW RESPONSE RATE",
            title,
            body: `Your surveys usually get ${usual}. ${comparison}`,
        });
    }

    if (input.impressions >= IGNORED_MIN_IMPRESSIONS && input.noActionRate > IGNORED_OVER) {
        alerts.push({
            id: "ignored",
            tone: "problem",
            kicker: "MOSTLY IGNORED",
            title: `${ratePhrase(input.noActionRate)}% of visitors neither answered nor closed it.`,
            body: `Typical is about ${Math.round(input.noActionMedian)}%. The popup may be easy to miss on this page. Check placement or timing.`,
        });
    }

    if (input.impressions >= HIGH_CLOSE_MIN_IMPRESSIONS && input.closeRate > HIGH_CLOSE_OVER) {
        alerts.push({
            id: "high_close",
            tone: "problem",
            kicker: "HIGH CLOSE RATE",
            title: `${ratePhrase(input.closeRate)}% of visitors closed it.`,
            body: `Your surveys usually close at ${bandPhrase(input.closeP25, input.closeP75)}.`,
        });
    }

    const shifted = mixShiftAlert(input.shifts);
    if (shifted) alerts.push(shifted);

    const stale = stillLiveAlert(input);
    if (stale) alerts.push(stale);

    return alerts.slice(0, ALERT_LIMIT);
}

function mixShiftAlert(shifts: AlertShift[]): OverviewAlert | null {
    if (shifts.length === 0) return null;
    const byQuestion = new Map<number, AlertShift[]>();
    for (const shift of shifts) {
        const list = byQuestion.get(shift.questionNumber) ?? [];
        list.push(shift);
        byQuestion.set(shift.questionNumber, list);
    }
    let bestNumber = 0;
    let bestAbs = -1;
    for (const [number, list] of byQuestion) {
        const abs = Math.max(...list.map((shift) => Math.abs(shift.delta)));
        if (abs > bestAbs || (abs === bestAbs && (bestNumber === 0 || number < bestNumber))) {
            bestAbs = abs;
            bestNumber = number;
        }
    }
    const list = byQuestion.get(bestNumber) ?? [];
    const rising = list.filter((shift) => shift.delta > 0).sort((a, b) => b.delta - a.delta);
    const falling = list.filter((shift) => shift.delta < 0).sort((a, b) => a.delta - b.delta);
    const lead = rising[0] ?? falling[0];
    if (!lead) return null;
    const opposite = lead.delta > 0 ? falling[0] : rising[0];
    const verb = lead.delta > 0 ? "rose" : "fell";
    const points = Math.abs(lead.delta) === 1 ? "point" : "points";
    const oppositeVerb = opposite && opposite.delta > 0 ? "rose" : "fell";
    return {
        id: "mix_shifted",
        tone: "caution",
        kicker: `ANSWERS SHIFTED · Q${bestNumber}`,
        title: `${quoted(lead.label)} ${verb} ${Math.abs(lead.delta)} ${points} in the second half.`,
        body: opposite
            ? `${quoted(opposite.label)} ${oppositeVerb} ${Math.abs(opposite.delta)}. Check whether traffic sources changed mid-run before trusting the split.`
            : "Check whether traffic sources changed mid-run before trusting the split.",
    };
}

function stillLiveAlert(input: {
    active: boolean;
    today: string;
    lastResponseDay: string | null;
    firstImpressionDay: string | null;
}): OverviewAlert | null {
    if (!input.active) return null;
    const anchor = input.lastResponseDay ?? input.firstImpressionDay;
    if (!anchor || anchor > input.today) return null;
    const quietDays = daysBetween(anchor, input.today);
    if (quietDays < STALE_LIVE_DAYS) return null;
    if (!input.lastResponseDay) {
        return {
            id: "still_live",
            tone: "caution",
            kicker: "STILL MARKED LIVE",
            title: `No answers in ${quietDays} days, and it’s still live.`,
            body: `The first impression was ${alertDate(anchor)}. Turn it off if this run is finished.`,
        };
    }
    return {
        id: "still_live",
        tone: "caution",
        kicker: "STILL MARKED LIVE",
        title: `No answer in ${quietDays} days, and it’s still live.`,
        body: `The last answer was ${alertDate(input.lastResponseDay)}. Turn it off if this run is finished.`,
    };
}

export async function getOverviewStats(args: {
    surveyId: string;
    tenantId: string;
    device: OverviewDevice | null;
}): Promise<OverviewResult | null> {
    const { surveyId, tenantId, device } = args;

    const survey = await db
        .selectFrom("surveys")
        .innerJoin("sites", "surveys.site_id", "sites.id")
        .select(["surveys.id", "surveys.name", "surveys.active"])
        .where("surveys.id", "=", surveyId)
        .where("sites.tenant_id", "=", tenantId)
        .executeTakeFirst();
    if (!survey) return null;

    const stats = await db
        .selectFrom("survey_stats")
        .select(["total_impressions", "total_responses", "total_closes", "first_impression_at"])
        .where("survey_id", "=", surveyId)
        .executeTakeFirst();

    const impressions = asNumber(stats?.total_impressions);
    const responses = asNumber(stats?.total_responses);
    const closes = asNumber(stats?.total_closes);
    const noAction = Math.max(0, impressions - responses - closes);
    const status: OverviewResult["survey"]["status"] = survey.active
        ? "live"
        : impressions > 0 || responses > 0
          ? "ended"
          : "draft";

    const [questions, options, benchmarks, runTo, primaryPage, daily, latest, questionsBody, segments, shiftFacts] =
        await Promise.all([
            loadQuestions(surveyId),
            loadOptions(surveyId),
            loadBenchmarks(tenantId),
            lastResponseDay(surveyId),
            busiestPage(surveyId),
            loadDaily(surveyId, status, stats?.first_impression_at ?? null),
            loadLatest(surveyId),
            loadQuestionBodies(surveyId, device, responses),
            loadSegments(surveyId, impressions),
            loadShiftFacts(surveyId),
        ]);

    const questionMeta = questions.map((question, index) => ({
        id: question.id,
        order: question.order_index,
        number: index + 1,
        text: question.question_text,
        short: shortText(question.question_text),
        type: question.question_type,
        typeLabel: typeLabel(question.question_type),
    }));

    const run = buildRun(status, stats?.first_impression_at ?? null, runTo);

    const responseRates = benchmarks.map((row) => responseRatePercent(row.responses, row.impressions));
    const closeRates = benchmarks.map((row) => responseRatePercent(row.closes, row.impressions));
    const noActionRates = benchmarks.map((row) =>
        responseRatePercent(Math.max(0, row.impressions - row.responses - row.closes), row.impressions)
    );

    const thisResponse = responseRatePercent(responses, impressions);
    const thisClose = responseRatePercent(closes, impressions);
    const thisNoAction = responseRatePercent(noAction, impressions);
    const responseBand = responseScale(responseRates, thisResponse);
    const closeBand = fixedScale(closeRates);
    const noActionBand = fixedScale(noActionRates);
    const shiftHits: AlertShift[] = [];
    for (const meta of questionMeta) {
        const map = shiftFacts.get(meta.id);
        if (!map) continue;
        for (const option of options) {
            if (option.question_id !== meta.id) continue;
            const shift = map.get(option.id);
            if (!shift) continue;
            shiftHits.push({ questionNumber: meta.number, label: option.option_text, delta: shift.delta });
        }
    }
    const alerts = buildOverviewAlerts({
        impressions,
        responseRate: thisResponse,
        closeRate: thisClose,
        noActionRate: thisNoAction,
        active: survey.active,
        today: todayInTimeZone(NY),
        lastResponseDay: runTo,
        firstImpressionDay: stats?.first_impression_at ? nyDateFromTimestamptz(stats.first_impression_at) : null,
        responseRates,
        responseP25: responseBand.p25,
        responseP75: responseBand.p75,
        closeP25: closeBand.p25,
        closeP75: closeBand.p75,
        noActionMedian: noActionBand.median,
        shifts: shiftHits,
    });

    return {
        survey: {
            name: survey.name,
            active: survey.active,
            status,
            run,
            questions: questionMeta,
            primaryPage,
        },
        totals: {
            impressions,
            responses,
            closes,
            responseRate: thisResponse,
            closeRate: thisClose,
            noAction,
            noActionRate: thisNoAction,
        },
        benchmarks: {
            surveyCount: benchmarks.length,
            responseRate: responseBand,
            closeRate: closeBand,
            noAction: noActionBand,
        },
        questions: questionMeta.map((meta) => {
            const body = questionsBody.get(meta.id);
            const questionOptions = options.filter((option) => option.question_id === meta.id);
            return {
                ...meta,
                answers: body?.answers ?? 0,
                options:
                    meta.type === "text"
                        ? undefined
                        : mergeOptions(questionOptions, body, device ? undefined : shiftFacts.get(meta.id)),
                averagePicks: body?.averagePicks,
                answeredShare: body?.answeredShare,
                latest: body?.latest,
            };
        }),
        alerts: { comparedTo: benchmarks.length, items: alerts },
        segments,
        daily,
        latest,
    };
}

function buildRun(
    status: OverviewResult["survey"]["status"],
    firstImpression: Date | null,
    lastResponse: string | null
): OverviewResult["survey"]["run"] {
    const from = firstImpression ? nyDateFromTimestamptz(firstImpression) : lastResponse;
    if (!from || status === "draft") return { kind: "none", from: null, to: null, days: null };
    if (status === "live") {
        const to = todayInTimeZone(NY);
        const start = from <= to ? from : to;
        return { kind: "live", from: start, to, days: daysInclusive(start, to) };
    }
    const to = lastResponse && lastResponse >= from ? lastResponse : from;
    return { kind: "ended", from, to, days: daysInclusive(from, to) };
}

function nyDateFromTimestamptz(value: Date): string {
    return todayInTimeZone(NY, value);
}

async function loadQuestions(surveyId: string) {
    return db
        .selectFrom("questions")
        .select(["id", "question_text", "question_type", "order_index"])
        .where("survey_id", "=", surveyId)
        .orderBy("order_index", "asc")
        .execute();
}

async function loadOptions(surveyId: string) {
    return db
        .selectFrom("answer_options")
        .innerJoin("questions", "questions.id", "answer_options.question_id")
        .select([
            "answer_options.id",
            "answer_options.question_id",
            "answer_options.option_text",
            "answer_options.order_index",
        ])
        .where("questions.survey_id", "=", surveyId)
        .orderBy("answer_options.order_index", "asc")
        .execute();
}

async function loadBenchmarks(tenantId: string) {
    const rows = await sql<{ impressions: number; responses: number; closes: number }>`
        SELECT
            ss.total_impressions::int AS impressions,
            ss.total_responses::int AS responses,
            ss.total_closes::int AS closes
        FROM survey_stats ss
        INNER JOIN surveys s ON s.id = ss.survey_id
        INNER JOIN sites si ON si.id = s.site_id
        WHERE si.tenant_id = ${tenantId}::uuid
          AND ss.total_impressions >= ${BENCHMARK_MIN_IMPRESSIONS}
    `.execute(db);
    return rows.rows.map((row) => ({
        impressions: asNumber(row.impressions),
        responses: asNumber(row.responses),
        closes: asNumber(row.closes),
    }));
}

async function lastResponseDay(surveyId: string): Promise<string | null> {
    const row = await sql<{ day: string | null }>`
        SELECT to_char(
            (MAX(timestamp) AT TIME ZONE 'UTC') AT TIME ZONE ${NY},
            'YYYY-MM-DD'
        ) AS day
        FROM responses
        WHERE survey_id = ${surveyId}::uuid
    `.execute(db);
    return asDay(row.rows[0]?.day);
}

async function busiestPage(surveyId: string): Promise<string | null> {
    const rows = await sql<{ page_url: string | null; count: number }>`
        SELECT page_url, COUNT(*)::int AS count
        FROM responses
        WHERE survey_id = ${surveyId}::uuid
          AND page_url IS NOT NULL
          AND btrim(page_url) <> ''
        GROUP BY page_url
    `.execute(db);
    const totals = new Map<string, number>();
    for (const row of rows.rows) {
        const key = answerPageKey(row.page_url);
        if (!key) continue;
        totals.set(key, (totals.get(key) ?? 0) + asNumber(row.count));
    }
    let best: string | null = null;
    let bestCount = -1;
    for (const [key, count] of totals) {
        if (count > bestCount) {
            best = key;
            bestCount = count;
        }
    }
    return best;
}

async function loadDaily(
    surveyId: string,
    status: OverviewResult["survey"]["status"],
    firstImpression: Date | null
): Promise<Array<{ date: string; responses: number }>> {
    const first = firstImpression ? nyDateFromTimestamptz(firstImpression) : null;
    const lastAnswer = await lastResponseDay(surveyId);
    const today = todayInTimeZone(NY);
    let from = first ?? lastAnswer;
    if (!from) return [];
    let to = status === "live" ? today : lastAnswer ?? from;
    if (to < from) to = from;
    if (daysInclusive(from, to) > MAX_DAILY_DAYS) {
        from = addCalendarDays(to, -(MAX_DAILY_DAYS - 1));
    }
    const toExclusive = addCalendarDays(to, 1);
    const rows = await sql<{ day: string; responses: number }>`
        SELECT day, COUNT(*)::int AS responses
        FROM (
            SELECT DISTINCT
                to_char(((timestamp AT TIME ZONE 'UTC') AT TIME ZONE ${NY})::date, 'YYYY-MM-DD') AS day,
                COALESCE(session_id, 'row:' || id::text) AS submit_key,
                timestamp
            FROM responses
            WHERE survey_id = ${surveyId}::uuid
              AND (timestamp AT TIME ZONE 'UTC') >= (${from}::timestamp AT TIME ZONE ${NY})
              AND (timestamp AT TIME ZONE 'UTC') < (${toExclusive}::timestamp AT TIME ZONE ${NY})
        ) submits
        GROUP BY day
    `.execute(db);
    const byDay = new Map(rows.rows.map((row) => [asDay(row.day), asNumber(row.responses)]));
    return eachCalendarDay(from, to).map((date) => ({ date, responses: byDay.get(date) ?? 0 }));
}

async function loadLatest(surveyId: string): Promise<OverviewResult["latest"]> {
    const rows = await sql<{
        answer: string | null;
        device: string | null;
        browser: string | null;
        country: string | null;
        state_name: string | null;
        state: string | null;
        at: Date;
    }>`
        SELECT answer, device, browser, country, state_name, state, timestamp AS at
        FROM (
            SELECT
                COALESCE(ao.option_text, NULLIF(btrim(r.answer_text), '')) AS answer,
                r.device,
                r.browser,
                r.country,
                r.state_name,
                r.state,
                r.timestamp,
                ROW_NUMBER() OVER (
                    PARTITION BY COALESCE(r.session_id, 'row:' || r.id::text), r.timestamp
                    ORDER BY q.order_index ASC, r.id ASC
                ) AS rn
            FROM responses r
            INNER JOIN questions q ON q.id = r.question_id
            LEFT JOIN answer_options ao ON ao.id = r.answer_option_id
            WHERE r.survey_id = ${surveyId}::uuid
        ) submits
        WHERE rn = 1
        ORDER BY timestamp DESC
        LIMIT 4
    `.execute(db);
    return rows.rows.map((row) => ({
        answer: row.answer?.trim() || "—",
        device: row.device,
        browser: row.browser,
        location: locationLabel(row.country, row.state_name, row.state),
        at: asIso(row.at),
    }));
}

interface QuestionBody {
    answers: number;
    counts: Map<string, number>;
    comments: Map<string, Array<{ text: string; at: string }>>;
    averagePicks?: number;
    answeredShare?: number;
    shifts: Map<string, OverviewShift>;
    latest?: OverviewQuestion["latest"];
}

async function loadQuestionBodies(
    surveyId: string,
    device: OverviewDevice | null,
    surveyResponses: number
): Promise<Map<string, QuestionBody>> {
    const questions = await loadQuestions(surveyId);
    const bodies = new Map<string, QuestionBody>();
    for (const question of questions) {
        if (question.question_type === "text") {
            bodies.set(question.id, await loadTextQuestion(surveyId, question.id, device, surveyResponses));
        } else if (question.question_type === "checkbox") {
            bodies.set(question.id, await loadChoiceQuestion(surveyId, question, device, true));
        } else {
            bodies.set(question.id, await loadChoiceQuestion(surveyId, question, device, false));
        }
    }
    return bodies;
}

async function loadChoiceQuestion(
    surveyId: string,
    question: { id: string; question_type: string },
    device: OverviewDevice | null,
    checkbox: boolean
): Promise<QuestionBody> {
    const peopleExpr = checkbox
        ? sql`COUNT(DISTINCT COALESCE(session_id, 'row:' || id::text))::int`
        : sql`COUNT(*)::int`;
    const [peopleRow, optionRows, commentRows] = await Promise.all([
        sql<{ people: number; picks: number }>`
            SELECT ${peopleExpr} AS people, COUNT(*)::int AS picks
            FROM responses
            WHERE survey_id = ${surveyId}::uuid
              AND question_id = ${question.id}::uuid
              AND ${deviceSql(device)}
        `.execute(db),
        sql<{ answer_option_id: string; count: number }>`
            SELECT answer_option_id, COUNT(*)::int AS count
            FROM responses
            WHERE survey_id = ${surveyId}::uuid
              AND question_id = ${question.id}::uuid
              AND answer_option_id IS NOT NULL
              AND ${deviceSql(device)}
            GROUP BY answer_option_id
        `.execute(db),
        sql<{ answer_option_id: string; text: string; at: Date }>`
            SELECT answer_option_id, btrim(answer_text) AS text, timestamp AS at
            FROM responses
            WHERE survey_id = ${surveyId}::uuid
              AND question_id = ${question.id}::uuid
              AND answer_option_id IS NOT NULL
              AND NULLIF(btrim(answer_text), '') IS NOT NULL
              AND ${deviceSql(device)}
            ORDER BY timestamp DESC, id DESC
        `.execute(db),
    ]);
    const people = asNumber(peopleRow.rows[0]?.people);
    const picks = asNumber(peopleRow.rows[0]?.picks);
    const counts = new Map(optionRows.rows.map((row) => [String(row.answer_option_id), asNumber(row.count)]));
    const comments = new Map<string, Array<{ text: string; at: string }>>();
    for (const row of commentRows.rows) {
        const id = String(row.answer_option_id);
        const list = comments.get(id) ?? [];
        list.push({ text: row.text, at: asIso(row.at) });
        comments.set(id, list);
    }
    return {
        answers: people,
        counts,
        comments,
        averagePicks: checkbox && people > 0 ? Math.round((picks / people) * 10) / 10 : undefined,
        shifts: new Map(),
    };
}

async function loadShiftFacts(surveyId: string): Promise<Map<string, Map<string, OverviewShift>>> {
    const questions = await loadQuestions(surveyId);
    const facts = new Map<string, Map<string, OverviewShift>>();
    for (const question of questions) {
        if (question.question_type === "text" || question.question_type === "checkbox") continue;
        facts.set(question.id, await halfShifts(surveyId, question.id));
    }
    return facts;
}

async function halfShifts(surveyId: string, questionId: string): Promise<Map<string, OverviewShift>> {
    const rows = await sql<{ answer_option_id: string }>`
        SELECT answer_option_id
        FROM responses
        WHERE survey_id = ${surveyId}::uuid
          AND question_id = ${questionId}::uuid
          AND answer_option_id IS NOT NULL
        ORDER BY timestamp ASC, id ASC
    `.execute(db);
    const ids = rows.rows.map((row) => String(row.answer_option_id));
    const firstSize = Math.ceil(ids.length / 2);
    const first = ids.slice(0, firstSize);
    const second = ids.slice(firstSize);
    if (first.length < 50 || second.length < 50) return new Map();
    const tally = (list: string[]) => {
        const map = new Map<string, number>();
        for (const id of list) map.set(id, (map.get(id) ?? 0) + 1);
        return map;
    };
    const a = tally(first);
    const b = tally(second);
    const shifts = new Map<string, OverviewShift>();
    const optionIds = new Set([...a.keys(), ...b.keys()]);
    for (const id of optionIds) {
        const from = wholePercent(a.get(id) ?? 0, first.length);
        const to = wholePercent(b.get(id) ?? 0, second.length);
        const delta = to - from;
        if (Math.abs(delta) >= 10) shifts.set(id, { from, to, delta });
    }
    return shifts;
}

async function loadTextQuestion(
    surveyId: string,
    questionId: string,
    device: OverviewDevice | null,
    surveyResponses: number
): Promise<QuestionBody> {
    const countRow = await sql<{ people: number }>`
        SELECT COUNT(*)::int AS people
        FROM responses
        WHERE survey_id = ${surveyId}::uuid
          AND question_id = ${questionId}::uuid
          AND NULLIF(btrim(answer_text), '') IS NOT NULL
          AND ${deviceSql(device)}
    `.execute(db);
    const answers = asNumber(countRow.rows[0]?.people);
    const latestRows = await sql<{
        text: string;
        at: Date;
        device: string | null;
        browser: string | null;
        country: string | null;
        state_name: string | null;
        state: string | null;
    }>`
        SELECT answer_text AS text, timestamp AS at, device, browser, country, state_name, state
        FROM responses
        WHERE survey_id = ${surveyId}::uuid
          AND question_id = ${questionId}::uuid
          AND NULLIF(btrim(answer_text), '') IS NOT NULL
          AND ${deviceSql(device)}
        ORDER BY timestamp DESC
        LIMIT 8
    `.execute(db);
    return {
        answers,
        counts: new Map(),
        comments: new Map(),
        answeredShare: wholePercent(answers, surveyResponses),
        shifts: new Map(),
        latest: latestRows.rows.map((row) => ({
            text: row.text,
            at: asIso(row.at),
            device: row.device,
            browser: row.browser,
            location: locationLabel(row.country, row.state_name, row.state),
        })),
    };
}

function mergeOptions(
    options: Array<{ id: string; option_text: string }>,
    body: QuestionBody | undefined,
    shifts?: Map<string, OverviewShift>
): OverviewOption[] {
    const people = body?.answers ?? 0;
    return options.map((option) => {
        const count = body?.counts.get(option.id) ?? 0;
        return {
            id: option.id,
            label: option.option_text,
            count,
            share: wholePercent(count, people),
            shift: shifts?.get(option.id) ?? null,
            comments: body?.comments.get(option.id) ?? [],
        };
    });
}

async function loadSegments(surveyId: string, lifetimeImpressions: number): Promise<OverviewResult["segments"]> {
    const fromExclusiveNext = addCalendarDays(SEGMENT_FROM, 0);
    const impressionRows = await sql<{ device: string | null; page_url: string | null; count: number }>`
        SELECT device, page_url, COUNT(*)::int AS count
        FROM event_dedup
        WHERE survey_id = ${surveyId}::uuid
          AND event_type = 'impression'
          AND processed_at >= (${fromExclusiveNext}::timestamp AT TIME ZONE ${NY})
        GROUP BY device, page_url
    `.execute(db);
    const responseRows = await sql<{ device: string | null; page_url: string | null; responses: number }>`
        SELECT device, page_url, COUNT(*)::int AS responses
        FROM (
            SELECT DISTINCT
                device,
                page_url,
                COALESCE(session_id, 'row:' || id::text) AS submit_key,
                timestamp
            FROM responses
            WHERE survey_id = ${surveyId}::uuid
              AND (timestamp AT TIME ZONE 'UTC') >= (${SEGMENT_FROM}::timestamp AT TIME ZONE ${NY})
        ) submits
        GROUP BY device, page_url
    `.execute(db);

    let deviceTagged = 0;
    let pageTagged = 0;
    const deviceImpressions = new Map<string, number>();
    const pageImpressions = new Map<string, number>();
    for (const row of impressionRows.rows) {
        const count = asNumber(row.count);
        const device = normalizeDevice(row.device);
        if (device) {
            deviceTagged += count;
            deviceImpressions.set(device, (deviceImpressions.get(device) ?? 0) + count);
        }
        const page = answerPageKey(row.page_url);
        if (page) {
            pageTagged += count;
            pageImpressions.set(page, (pageImpressions.get(page) ?? 0) + count);
        }
    }

    let windowResponses = 0;
    const deviceResponses = new Map<string, number>();
    const pageResponses = new Map<string, number>();
    for (const row of responseRows.rows) {
        const count = asNumber(row.responses);
        windowResponses += count;
        const device = normalizeDevice(row.device);
        if (device) deviceResponses.set(device, (deviceResponses.get(device) ?? 0) + count);
        const page = answerPageKey(row.page_url);
        if (page) pageResponses.set(page, (pageResponses.get(page) ?? 0) + count);
    }

    const ready = (tagged: number) => lifetimeImpressions > 0 && tagged / lifetimeImpressions >= COVERAGE_MIN;
    const deviceOrder = ["Mobile", "Desktop", "Tablet"];
    const deviceRows = deviceOrder
        .map((name) => {
            const key = name.toLowerCase();
            const imp = deviceImpressions.get(key) ?? 0;
            const resp = deviceResponses.get(key) ?? 0;
            return {
                name,
                impressions: imp,
                responses: resp,
                rate: responseRatePercent(resp, imp),
                shareOfResponses: wholePercent(resp, windowResponses),
            };
        })
        .filter((row) => row.impressions > 0 || row.responses > 0);

    const pageRows = [...pageImpressions.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .filter(([, imp]) => imp > 0)
        .map(([url, imp]) => {
            const resp = pageResponses.get(url) ?? 0;
            return {
                url,
                impressions: imp,
                responses: resp,
                rate: responseRatePercent(resp, imp),
                shareOfResponses: wholePercent(resp, windowResponses),
            };
        });

    return {
        from: SEGMENT_FROM,
        lifetimeImpressions,
        devices: { ready: ready(deviceTagged), taggedImpressions: deviceTagged, rows: deviceRows },
        pages: { ready: ready(pageTagged), taggedImpressions: pageTagged, rows: pageRows },
    };
}

function normalizeDevice(value: string | null): string | null {
    const key = (value || "").trim().toLowerCase();
    if (key === "mobile" || key === "desktop" || key === "tablet") return key;
    return null;
}
