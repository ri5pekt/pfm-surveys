import { sql } from "kysely";
import { db } from "../db/connection";
import {
    alertBenchmarksFrom,
    collectAlerts,
    daysBetween,
    leaderSinceFromSequence,
    shortSurveyName,
    type Alert,
    type AlertBenchmarks,
    type AlertInput,
    type AlertQuestion,
    type AlertSegment,
    type AlertWindow,
} from "./alerts";
import { addCalendarDays, responseRatePercent, todayInTimeZone } from "./dailyStats";

const NY = "America/New_York";
const BENCH_TTL_MS = 10 * 60 * 1000;
const HOME_TTL_MS = 5 * 60 * 1000;

interface BenchCache {
    at: number;
    value: AlertBenchmarks;
}
const benchmarksCache = new Map<string, BenchCache>();
const homeCache = new Map<string, { at: number; value: SurveyHome }>();
const peerCache = new Map<string, { at: number; byProduct: Map<string, ProductPeer[]> }>();
const paceCache = new Map<string, { at: number; median: number | null }>();

interface ProductPeer {
    surveyId: string;
    shortName: string;
    rate: number;
}

export function invalidateAlertCaches(): void {
    benchmarksCache.clear();
    homeCache.clear();
    peerCache.clear();
    paceCache.clear();
}

export async function getAlertBenchmarks(tenantId: string): Promise<AlertBenchmarks> {
    const cached = benchmarksCache.get(tenantId);
    if (cached && Date.now() - cached.at < BENCH_TTL_MS) return cached.value;
    const rows = await sql<{ impressions: number; responses: number; closes: number }>`
        SELECT
            ss.total_impressions::int AS impressions,
            ss.total_responses::int AS responses,
            ss.total_closes::int AS closes
        FROM survey_stats ss
        INNER JOIN surveys s ON s.id = ss.survey_id
        INNER JOIN sites si ON si.id = s.site_id
        WHERE si.tenant_id = ${tenantId}::uuid
          AND ss.total_impressions >= 200
          AND NOT s.is_test
    `.execute(db);
    const value = alertBenchmarksFrom(
        rows.rows.map((row) => ({
            impressions: Number(row.impressions) || 0,
            responses: Number(row.responses) || 0,
            closes: Number(row.closes) || 0,
        }))
    );
    benchmarksCache.set(tenantId, { at: Date.now(), value });
    return value;
}

export interface HomeCard {
    type: "problem" | "caution";
    rule: string;
    surveyId?: string;
    kicker: string;
    title: string;
    body: string;
    cta: "View stats" | "See surveys";
    canTurnOff?: boolean;
    score: number;
}

export interface SurveyHome {
    summary: {
        live: number;
        liveCollecting: number;
        liveSilent: number;
        launchedThisMonth: number;
        launchedLastMonth: number;
        thisMonthLabel: string;
        lastMonthLabel: string;
        rate30d: number | null;
        usualRate: number;
        rate30dLow: boolean;
        answersTotal: number;
        surveysWithAnswers: number;
        since: string | null;
    };
    benchmark: { p10: number; p90: number; minImpressions: number };
    attention: HomeCard[];
    attentionTotal: number;
    flaggedIds: string[];
    counts: { all: number; live: number; ended: number; draft: number; attention: number; tests: number };
}

interface HomeSurvey {
    id: string;
    name: string;
    active: boolean;
    isTest: boolean;
    createdBy: string | null;
    impressions: number;
    responses: number;
    closes: number;
    firstImpressionDay: string | null;
    lastResponseDay: string | null;
}

const LIST_RULES = new Set(["silent_live", "stalled", "low_response_rate", "rate_dropped", "ignored"]);

export async function getSurveyHome(tenantId: string, siteId: string, ownerId: string | null): Promise<SurveyHome | null> {
    const key = `${siteId}:${ownerId ?? "all"}`;
    const cached = homeCache.get(key);
    if (cached && Date.now() - cached.at < HOME_TTL_MS) return cached.value;

    const site = await sql<{ id: string }>`
        SELECT id FROM sites WHERE id = ${siteId}::uuid AND tenant_id = ${tenantId}::uuid
    `.execute(db);
    if (!site.rows[0]) return null;

    const today = todayInTimeZone(NY);
    const benchmarks = await getAlertBenchmarks(tenantId);
    const surveys = await loadHomeSurveys(siteId, ownerId);
    const liveIds = surveys.filter((survey) => survey.active && !survey.isTest && survey.impressions >= 200).map((survey) => survey.id);
    const windows = await recentWindows(liveIds);
    const value = buildHome(surveys, benchmarks, windows, today);
    homeCache.set(key, { at: Date.now(), value });
    return value;
}

async function loadHomeSurveys(siteId: string, ownerId: string | null): Promise<HomeSurvey[]> {
    const ownerSql = ownerId ? sql`AND s.created_by = ${ownerId}::uuid` : sql`TRUE`;
    const rows = await sql<{
        id: string;
        name: string;
        active: boolean;
        is_test: boolean;
        created_by: string | null;
        impressions: number | null;
        responses: number | null;
        closes: number | null;
        first_impression_at: Date | null;
        last_response_day: string | null;
    }>`
        SELECT
            s.id,
            s.name,
            s.active,
            s.is_test,
            s.created_by,
            COALESCE(ss.total_impressions, 0)::int AS impressions,
            COALESCE(ss.total_responses, 0)::int AS responses,
            COALESCE(ss.total_closes, 0)::int AS closes,
            ss.first_impression_at,
            to_char(
                (MAX(r.timestamp) AT TIME ZONE 'UTC') AT TIME ZONE ${NY},
                'YYYY-MM-DD'
            ) AS last_response_day
        FROM surveys s
        LEFT JOIN survey_stats ss ON ss.survey_id = s.id
        LEFT JOIN responses r ON r.survey_id = s.id
        WHERE s.site_id = ${siteId}::uuid
          AND ${ownerSql}
        GROUP BY s.id, ss.total_impressions, ss.total_responses, ss.total_closes, ss.first_impression_at
    `.execute(db);
    return rows.rows.map((row) => ({
        id: row.id,
        name: row.name,
        active: row.active,
        isTest: row.is_test,
        createdBy: row.created_by,
        impressions: Number(row.impressions) || 0,
        responses: Number(row.responses) || 0,
        closes: Number(row.closes) || 0,
        firstImpressionDay: row.first_impression_at ? todayInTimeZone(NY, new Date(row.first_impression_at)) : null,
        lastResponseDay: row.last_response_day,
    }));
}

export async function recentWindows(surveyIds: string[]): Promise<Map<string, AlertWindow | null>> {
    const windows = new Map<string, AlertWindow | null>();
    if (surveyIds.length === 0) return windows;
    const [impressionRows, responseRows] = await Promise.all([
        sql<{ survey_id: string; day: string; impressions: number }>`
            SELECT survey_id,
                   to_char((processed_at AT TIME ZONE ${NY})::date, 'YYYY-MM-DD') AS day,
                   COUNT(*)::int AS impressions
            FROM event_dedup
            WHERE survey_id = ANY(${sql.raw(`ARRAY[${surveyIds.map((id) => `'${id}'`).join(",")}]::uuid[]`)})
              AND event_type = 'impression'
            GROUP BY survey_id, day
        `.execute(db),
        sql<{ survey_id: string; day: string; responses: number }>`
            SELECT survey_id,
                   to_char(((timestamp AT TIME ZONE 'UTC') AT TIME ZONE ${NY})::date, 'YYYY-MM-DD') AS day,
                   COUNT(*)::int AS responses
            FROM responses
            WHERE survey_id = ANY(${sql.raw(`ARRAY[${surveyIds.map((id) => `'${id}'`).join(",")}]::uuid[]`)})
            GROUP BY survey_id, day
        `.execute(db),
    ]);
    const impressions = new Map<string, Array<{ day: string; impressions: number }>>();
    for (const row of impressionRows.rows) {
        const list = impressions.get(row.survey_id) ?? [];
        list.push({ day: row.day, impressions: Number(row.impressions) || 0 });
        impressions.set(row.survey_id, list);
    }
    const responses = new Map<string, Map<string, number>>();
    for (const row of responseRows.rows) {
        const map = responses.get(row.survey_id) ?? new Map<string, number>();
        map.set(row.day, Number(row.responses) || 0);
        responses.set(row.survey_id, map);
    }
    for (const id of surveyIds) {
        const days = (impressions.get(id) ?? [])
            .filter((day) => day.impressions >= 1)
            .sort((a, b) => (a.day < b.day ? 1 : -1))
            .slice(0, 3);
        if (days.length === 0) {
            windows.set(id, null);
            continue;
        }
        const responseDays = responses.get(id) ?? new Map<string, number>();
        windows.set(id, {
            impressions: days.reduce((sum, day) => sum + day.impressions, 0),
            responses: days.reduce((sum, day) => sum + (responseDays.get(day.day) ?? 0), 0),
        });
    }
    return windows;
}

function buildHome(
    surveys: HomeSurvey[],
    benchmarks: AlertBenchmarks,
    windows: Map<string, AlertWindow | null>,
    today: string
): SurveyHome {
    const real = surveys.filter((survey) => !survey.isTest);
    const tests = surveys.length - real.length;
    const live = real.filter((survey) => survey.active);
    const silent = live.filter((survey) => isSilent(survey, today));
    const month = nyMonth(today);
    const previous = month.month === 1 ? { year: month.year - 1, month: 12 } : { year: month.year, month: month.month - 1 };
    const launchedThisMonth = real.filter((survey) => sameMonth(survey.firstImpressionDay, month)).length;
    const launchedLastMonth = real.filter((survey) => sameMonth(survey.firstImpressionDay, previous)).length;
    const sinceDay = addCalendarDays(today, -30);
    const recent = real.filter(
        (survey) =>
            survey.firstImpressionDay != null &&
            survey.firstImpressionDay >= sinceDay &&
            survey.firstImpressionDay <= today &&
            survey.impressions >= 200
    );
    const recentImpressions = recent.reduce((sum, survey) => sum + survey.impressions, 0);
    const recentResponses = recent.reduce((sum, survey) => sum + survey.responses, 0);
    const rate30d = recentImpressions > 0 ? responseRatePercent(recentResponses, recentImpressions) : null;
    const answersTotal = real.reduce((sum, survey) => sum + survey.responses, 0);
    const firsts = real.map((survey) => survey.firstImpressionDay).filter((day): day is string => !!day).sort();

    const cards: HomeCard[] = [];
    for (const survey of live) {
        const alerts = collectAlerts(homeInput(survey, today, windows.get(survey.id) ?? null), benchmarks);
        const best = alerts.find((alert) => LIST_RULES.has(alert.id));
        if (best) cards.push(surveyCard(survey, best, today));
    }
    const portfolio = portfolioCard(recent, benchmarks, sinceDay);
    if (portfolio) cards.push(portfolio);
    cards.sort((a, b) => b.score - a.score);
    const surveyCards = cards.filter((card) => card.surveyId);

    return {
        summary: {
            live: live.length,
            liveCollecting: live.length - silent.length,
            liveSilent: silent.length,
            launchedThisMonth,
            launchedLastMonth,
            thisMonthLabel: MONTH_LONG[month.month - 1],
            lastMonthLabel: MONTH_LONG[previous.month - 1],
            rate30d,
            usualRate: benchmarks.responseMedian,
            rate30dLow: rate30d != null && benchmarks.surveyCount > 0 && rate30d < benchmarks.responseP10,
            answersTotal,
            surveysWithAnswers: real.filter((survey) => survey.responses > 0).length,
            since: firsts[0] ? sinceLabel(firsts[0], month.year) : null,
        },
        benchmark: { p10: benchmarks.responseP10, p90: benchmarks.responseP90, minImpressions: 200 },
        attention: cards.slice(0, 4),
        attentionTotal: cards.length,
        flaggedIds: surveyCards.map((card) => card.surveyId!).filter(Boolean),
        counts: {
            all: real.length,
            live: live.length,
            ended: real.filter((survey) => !survey.active && (survey.impressions > 0 || survey.responses > 0)).length,
            draft: real.filter((survey) => !survey.active && survey.impressions === 0 && survey.responses === 0).length,
            attention: surveyCards.length,
            tests,
        },
    };
}

function homeInput(survey: HomeSurvey, today: string, recentWindow: AlertWindow | null): AlertInput {
    return {
        impressions: survey.impressions,
        responses: survey.responses,
        closes: survey.closes,
        active: survey.active,
        today,
        lastResponseDay: survey.lastResponseDay,
        firstImpressionDay: survey.firstImpressionDay,
        questionCount: 1,
        questions: [],
        segmentsReady: false,
        segments: [],
        recentWindow,
    };
}

function surveyCard(survey: HomeSurvey, alert: Alert, today: string): HomeCard {
    const title = shortSurveyName(survey.name);
    const liveDays =
        survey.firstImpressionDay && survey.firstImpressionDay <= today
            ? daysBetween(survey.firstImpressionDay, today) + 1
            : null;
    if (alert.id === "silent_live") {
        return {
            type: "problem",
            rule: alert.id,
            surveyId: survey.id,
            kicker: "LIVE, NO ANSWERS",
            title,
            body: `Still on, but no answers since ${monthDay(String(alert.values.since))} (${alert.values.days} days).`,
            cta: "View stats",
            canTurnOff: true,
            score: alert.score,
        };
    }
    if (alert.id === "stalled") {
        return {
            type: "problem",
            rule: alert.id,
            surveyId: survey.id,
            kicker: "NOT GETTING ANSWERS",
            title,
            body: `${formatCount(survey.responses)} answers from ${formatCount(survey.impressions)} impressions. Check that it shows correctly.`,
            cta: "View stats",
            canTurnOff: true,
            score: alert.score,
        };
    }
    if (alert.id === "low_response_rate") {
        return {
            type: "problem",
            rule: alert.id,
            surveyId: survey.id,
            kicker: "LOW RESPONSE RATE",
            title,
            body: `Live for ${liveDays ?? "—"} days at ${one(Number(alert.values.rate))}%, in your bottom 10%. ${formatCount(survey.impressions)} impressions so far.`,
            cta: "View stats",
            score: alert.score,
        };
    }
    if (alert.id === "rate_dropped") {
        return {
            type: "problem",
            rule: alert.id,
            surveyId: survey.id,
            kicker: "RESPONSE RATE DROPPING",
            title,
            body: `${one(Number(alert.values.windowRate))}% in the last 3 active days, down from ${one(Number(alert.values.lifetimeRate))}%.`,
            cta: "View stats",
            score: alert.score,
        };
    }
    return {
        type: "problem",
        rule: alert.id,
        surveyId: survey.id,
        kicker: "MOSTLY IGNORED",
        title,
        body: `${one(Number(alert.values.share))}% of visitors neither answered nor closed it.`,
        cta: "View stats",
        score: alert.score,
    };
}

function portfolioCard(recent: HomeSurvey[], benchmarks: AlertBenchmarks, sinceDay: string): HomeCard | null {
    if (recent.length < 3 || benchmarks.surveyCount === 0) return null;
    const impressions = recent.reduce((sum, survey) => sum + survey.impressions, 0);
    const responses = recent.reduce((sum, survey) => sum + survey.responses, 0);
    const rate = responseRatePercent(responses, impressions);
    if (rate >= benchmarks.responseP25) return null;
    const bottom = recent.filter((survey) => responseRatePercent(survey.responses, survey.impressions) < benchmarks.responseP10).length;
    const who = bottom === recent.length ? `All ${recent.length}` : `${bottom} of ${recent.length}`;
    return {
        type: "caution",
        rule: "portfolio_rate_drop",
        kicker: "RECENT SURVEYS DOWN",
        title: `Last 30 days: ${one(rate)}% answered.`,
        body: `Your usual is ${one(benchmarks.responseMedian)}%. ${who} surveys launched since ${monthDay(sinceDay)} are in your bottom 10%.`,
        cta: "See surveys",
        score: 4,
    };
}

function isSilent(survey: HomeSurvey, today: string): boolean {
    const since = survey.responses > 0 ? survey.lastResponseDay : survey.firstImpressionDay;
    if (!since || since > today) return false;
    return daysBetween(since, today) >= 14;
}

export interface OverviewAlertItem {
    id: string;
    tone: "problem" | "caution" | "finding" | "positive" | "neutral";
    kicker: string;
    title: string;
    body: string;
}

export async function loadOverviewAlerts(args: {
    tenantId: string;
    surveyId: string;
    benchmarks: AlertBenchmarks;
    impressions: number;
    responses: number;
    closes: number;
    active: boolean;
    lastResponseDay: string | null;
    firstImpressionDay: string | null;
    questions: Array<{ id: string; number: number; type: string }>;
    options: Array<{ id: string; question_id: string; option_text: string }>;
    shifts: Map<string, Map<string, { delta: number }>>;
    segments: {
        devices: { ready: boolean; rows: Array<{ name?: string; impressions: number; rate: number }> };
        pages: { ready: boolean; rows: Array<{ url?: string; impressions: number; rate: number }> };
    };
}): Promise<OverviewAlertItem[]> {
    const today = todayInTimeZone(NY);
    const [questions, recent, context] = await Promise.all([
        loadAlertQuestions(args),
        recentWindows([args.surveyId]),
        loadAlertContext(args.tenantId, args.surveyId, args.options),
    ]);
    const segments: AlertSegment[] = [];
    if (args.segments.devices.ready) {
        for (const row of args.segments.devices.rows) {
            if (row.name) segments.push({ kind: "device", name: row.name, impressions: row.impressions, rate: row.rate });
        }
    }
    if (args.segments.pages.ready) {
        for (const row of args.segments.pages.rows) {
            if (row.url) segments.push({ kind: "page", name: row.url, impressions: row.impressions, rate: row.rate });
        }
    }
    const input: AlertInput = {
        impressions: args.impressions,
        responses: args.responses,
        closes: args.closes,
        active: args.active,
        today,
        lastResponseDay: args.lastResponseDay,
        firstImpressionDay: args.firstImpressionDay,
        questionCount: args.questions.length,
        questions,
        segmentsReady: args.segments.devices.ready || args.segments.pages.ready,
        segments,
        recentWindow: recent.get(args.surveyId) ?? null,
        product: context.product,
        hoursTo100: context.hoursTo100,
        medianHoursTo100: context.medianHoursTo100,
        productPeers: context.productPeers,
        previousVersion: context.previousVersion,
    };
    return collectAlerts(input, args.benchmarks).slice(0, 3).map((alert) => ({
        id: alert.id,
        tone: alert.type,
        kicker: alert.kicker,
        title: alert.title,
        body: alert.body,
    }));
}

async function loadAlertContext(
    tenantId: string,
    surveyId: string,
    options: Array<{ id: string; question_id: string; option_text: string }>
): Promise<{
    product: string | null;
    hoursTo100: number | null;
    medianHoursTo100: number | null;
    productPeers: ProductPeer[];
    previousVersion: AlertInput["previousVersion"];
}> {
    const survey = await sql<{ product: string | null; previous_version_id: string | null }>`
        SELECT product, previous_version_id FROM surveys WHERE id = ${surveyId}::uuid
    `.execute(db);
    const product = survey.rows[0]?.product ?? null;
    const previousId = survey.rows[0]?.previous_version_id ?? null;
    const [hoursTo100, medianPace, peers, previousVersion] = await Promise.all([
        hoursTo100For(surveyId),
        medianHoursTo100(tenantId),
        peersFor(tenantId, product),
        previousVersionFor(previousId, options),
    ]);
    return { product, hoursTo100, medianHoursTo100: medianPace, productPeers: peers, previousVersion };
}

async function hoursTo100For(surveyId: string): Promise<number | null> {
    const row = await sql<{ hours: number | null }>`
        WITH submits AS (
            SELECT COALESCE(NULLIF(btrim(session_id), ''), 'row:' || id::text) AS submit_key,
                   MIN(timestamp) AS ts
            FROM responses
            WHERE survey_id = ${surveyId}::uuid
            GROUP BY 1
        ),
        ordered AS (
            SELECT ts, row_number() OVER (ORDER BY ts) AS n FROM submits
        )
        SELECT EXTRACT(EPOCH FROM (
            (SELECT ts FROM ordered WHERE n = 100) - (SELECT ts FROM ordered WHERE n = 1)
        )) / 3600 AS hours
    `.execute(db);
    const hours = row.rows[0]?.hours;
    return hours == null || Number.isNaN(Number(hours)) ? null : Number(hours);
}

async function medianHoursTo100(tenantId: string): Promise<number | null> {
    const cached = paceCache.get(tenantId);
    if (cached && Date.now() - cached.at < BENCH_TTL_MS) return cached.median;
    const rows = await sql<{ hours: number }>`
        WITH submits AS (
            SELECT r.survey_id,
                   COALESCE(NULLIF(btrim(r.session_id), ''), 'row:' || r.id::text) AS submit_key,
                   MIN(r.timestamp) AS ts
            FROM responses r
            INNER JOIN surveys s ON s.id = r.survey_id
            INNER JOIN sites si ON si.id = s.site_id
            WHERE si.tenant_id = ${tenantId}::uuid
              AND NOT s.is_test
            GROUP BY r.survey_id, 2
        ),
        ordered AS (
            SELECT survey_id, ts, row_number() OVER (PARTITION BY survey_id ORDER BY ts) AS n
            FROM submits
        )
        SELECT EXTRACT(EPOCH FROM (MAX(ts) FILTER (WHERE n = 100) - MIN(ts) FILTER (WHERE n = 1))) / 3600 AS hours
        FROM ordered
        GROUP BY survey_id
        HAVING MAX(n) >= 100
    `.execute(db);
    const values = rows.rows.map((row) => Number(row.hours)).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    const median = values.length === 0 ? null : values.length % 2 === 1 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
    paceCache.set(tenantId, { at: Date.now(), median });
    return median;
}

async function peersFor(tenantId: string, product: string | null): Promise<ProductPeer[]> {
    if (!product) return [];
    const cached = peerCache.get(tenantId);
    if (cached && Date.now() - cached.at < BENCH_TTL_MS) return cached.byProduct.get(product) ?? [];
    const rows = await sql<{ id: string; name: string; product: string; impressions: number; responses: number }>`
        SELECT s.id, s.name, s.product,
               ss.total_impressions::int AS impressions,
               ss.total_responses::int AS responses
        FROM surveys s
        INNER JOIN sites si ON si.id = s.site_id
        INNER JOIN survey_stats ss ON ss.survey_id = s.id
        WHERE si.tenant_id = ${tenantId}::uuid
          AND NOT s.is_test
          AND s.product IS NOT NULL
          AND ss.total_impressions >= 200
    `.execute(db);
    const byProduct = new Map<string, ProductPeer[]>();
    for (const row of rows.rows) {
        const list = byProduct.get(row.product) ?? [];
        list.push({
            surveyId: row.id,
            shortName: shortSurveyName(row.name),
            rate: responseRatePercent(Number(row.responses) || 0, Number(row.impressions) || 0),
        });
        byProduct.set(row.product, list);
    }
    peerCache.set(tenantId, { at: Date.now(), byProduct });
    return byProduct.get(product) ?? [];
}

async function previousVersionFor(
    previousId: string | null,
    currentOptions: Array<{ id: string; question_id: string; option_text: string }>
): Promise<AlertInput["previousVersion"]> {
    if (!previousId) return null;
    const row = await sql<{
        name: string;
        impressions: number | null;
        responses: number | null;
        first_impression_at: Date | null;
    }>`
        SELECT s.name, ss.total_impressions::int AS impressions, ss.total_responses::int AS responses, ss.first_impression_at
        FROM surveys s
        LEFT JOIN survey_stats ss ON ss.survey_id = s.id
        WHERE s.id = ${previousId}::uuid
    `.execute(db);
    const previous = row.rows[0];
    if (!previous) return null;
    const impressions = Number(previous.impressions) || 0;
    const matched = await matchingOptionShares(previousId, currentOptions);
    return {
        shortName: shortSurveyName(previous.name),
        firstImpressionAt: previous.first_impression_at ? todayInTimeZone(NY, new Date(previous.first_impression_at)) : null,
        impressions,
        rate: responseRatePercent(Number(previous.responses) || 0, impressions),
        options: matched ?? undefined,
    };
}

async function matchingOptionShares(
    previousId: string,
    currentOptions: Array<{ question_id: string; option_text: string }>
): Promise<Array<{ label: string; previousShare: number; share: number }> | null> {
    const currentQuestions = new Set(currentOptions.map((option) => option.question_id));
    if (currentQuestions.size !== 1) return null;
    const currentLabels = currentOptions.map((option) => option.option_text);
    const previousQuestions = await sql<{ id: string; question_type: string }>`
        SELECT id, question_type FROM questions WHERE survey_id = ${previousId}::uuid
    `.execute(db);
    const radios = previousQuestions.rows.filter((question) => question.question_type !== "checkbox" && question.question_type !== "text");
    if (radios.length !== 1) return null;
    const previousOptions = await sql<{ option_text: string; n: number }>`
        SELECT ao.option_text, COUNT(r.id)::int AS n
        FROM answer_options ao
        LEFT JOIN responses r ON r.answer_option_id = ao.id AND r.survey_id = ${previousId}::uuid
        WHERE ao.question_id = ${radios[0].id}::uuid
        GROUP BY ao.option_text, ao.order_index
        ORDER BY ao.order_index
    `.execute(db);
    const previousLabels = previousOptions.rows.map((option) => option.option_text);
    if (previousLabels.length !== currentLabels.length || previousLabels.some((label) => !currentLabels.includes(label))) return null;
    const currentCounts = await sql<{ option_text: string; n: number }>`
        SELECT ao.option_text, COUNT(r.id)::int AS n
        FROM answer_options ao
        LEFT JOIN responses r ON r.answer_option_id = ao.id
        WHERE ao.question_id = ${[...currentQuestions][0]}::uuid
        GROUP BY ao.option_text
    `.execute(db);
    const currentTotal = currentCounts.rows.reduce((sum, option) => sum + (Number(option.n) || 0), 0);
    const previousTotal = previousOptions.rows.reduce((sum, option) => sum + (Number(option.n) || 0), 0);
    if (currentTotal <= 0 || previousTotal <= 0) return null;
    const currentShare = new Map(currentCounts.rows.map((option) => [option.option_text, ((Number(option.n) || 0) / currentTotal) * 100]));
    return previousOptions.rows.map((option) => ({
        label: option.option_text,
        previousShare: ((Number(option.n) || 0) / previousTotal) * 100,
        share: currentShare.get(option.option_text) ?? 0,
    }));
}

async function loadAlertQuestions(args: {
    surveyId: string;
    questions: Array<{ id: string; number: number; type: string }>;
    options: Array<{ id: string; question_id: string; option_text: string }>;
    shifts: Map<string, Map<string, { delta: number }>>;
}): Promise<AlertQuestion[]> {
    const surveyId = args.surveyId;
    const [optionRows, peopleRows, deviceRows, devicePeople, submitRow, orderedRows, respondentRows] = await Promise.all([
        sql<{ question_id: string; answer_option_id: string; n: number }>`
            SELECT question_id, answer_option_id, COUNT(*)::int AS n
            FROM responses
            WHERE survey_id = ${surveyId}::uuid AND answer_option_id IS NOT NULL
            GROUP BY question_id, answer_option_id
        `.execute(db),
        sql<{ question_id: string; n: number }>`
            SELECT question_id, COUNT(*)::int AS n
            FROM responses
            WHERE survey_id = ${surveyId}::uuid
            GROUP BY question_id
        `.execute(db),
        sql<{ question_id: string; device: string; answer_option_id: string; n: number }>`
            SELECT question_id, lower(device) AS device, answer_option_id, COUNT(*)::int AS n
            FROM responses
            WHERE survey_id = ${surveyId}::uuid
              AND answer_option_id IS NOT NULL
              AND lower(device) IN ('mobile', 'desktop')
            GROUP BY question_id, lower(device), answer_option_id
        `.execute(db),
        sql<{ question_id: string; device: string; n: number }>`
            SELECT question_id, lower(device) AS device, COUNT(*)::int AS n
            FROM responses
            WHERE survey_id = ${surveyId}::uuid
              AND lower(device) IN ('mobile', 'desktop')
            GROUP BY question_id, lower(device)
        `.execute(db),
        sql<{ submits: number }>`
            SELECT COUNT(*)::int AS submits
            FROM (
                SELECT DISTINCT COALESCE(session_id, 'row:' || id::text), timestamp
                FROM responses
                WHERE survey_id = ${surveyId}::uuid
            ) submits
        `.execute(db),
        sql<{ question_id: string; answer_option_id: string }>`
            SELECT question_id, answer_option_id
            FROM responses
            WHERE survey_id = ${surveyId}::uuid AND answer_option_id IS NOT NULL
            ORDER BY timestamp ASC, id ASC
        `.execute(db),
        sql<{ question_id: string; n: number }>`
            SELECT question_id, COUNT(*)::int AS n
            FROM (
                SELECT DISTINCT question_id,
                       COALESCE(NULLIF(btrim(session_id), ''), 'row:' || id::text) AS submit_key,
                       timestamp
                FROM responses
                WHERE survey_id = ${surveyId}::uuid
            ) submits
            GROUP BY question_id
        `.execute(db),
    ]);
    const submits = Number(submitRow.rows[0]?.submits) || 0;
    const labels = new Map(args.options.map((option) => [option.id, option.option_text]));
    const ordered = new Map<string, string[]>();
    for (const row of orderedRows.rows) {
        const list = ordered.get(row.question_id) ?? [];
        list.push(row.answer_option_id);
        ordered.set(row.question_id, list);
    }
    const respondents = new Map(respondentRows.rows.map((row) => [row.question_id, Number(row.n) || 0]));
    const counts = new Map<string, Array<{ label: string; count: number }>>();
    for (const row of optionRows.rows) {
        const list = counts.get(row.question_id) ?? [];
        list.push({ label: labels.get(row.answer_option_id) || "Answer", count: Number(row.n) || 0 });
        counts.set(row.question_id, list);
    }
    const people = new Map(peopleRows.rows.map((row) => [row.question_id, Number(row.n) || 0]));
    const devicePeopleMap = new Map<string, { mobile: number; desktop: number }>();
    for (const row of devicePeople.rows) {
        const current = devicePeopleMap.get(row.question_id) ?? { mobile: 0, desktop: 0 };
        if (row.device === "mobile") current.mobile = Number(row.n) || 0;
        if (row.device === "desktop") current.desktop = Number(row.n) || 0;
        devicePeopleMap.set(row.question_id, current);
    }
    const deviceCounts = new Map<string, Map<string, { mobile: number; desktop: number }>>();
    for (const row of deviceRows.rows) {
        const byOption = deviceCounts.get(row.question_id) ?? new Map<string, { mobile: number; desktop: number }>();
        const current = byOption.get(row.answer_option_id) ?? { mobile: 0, desktop: 0 };
        if (row.device === "mobile") current.mobile = Number(row.n) || 0;
        if (row.device === "desktop") current.desktop = Number(row.n) || 0;
        byOption.set(row.answer_option_id, current);
        deviceCounts.set(row.question_id, byOption);
    }
    return args.questions.map((question) => {
        const answers = people.get(question.id) ?? 0;
        const type = question.type === "checkbox" || question.type === "text" ? question.type : "radio";
        const devices = devicePeopleMap.get(question.id) ?? { mobile: 0, desktop: 0 };
        const gaps = [...(deviceCounts.get(question.id) ?? new Map()).entries()].map(([id, countsForOption]) => ({
            label: labels.get(id) || "Answer",
            mobileShare: devices.mobile > 0 ? (countsForOption.mobile / devices.mobile) * 100 : 0,
            desktopShare: devices.desktop > 0 ? (countsForOption.desktop / devices.desktop) * 100 : 0,
        }));
        const shiftMap = args.shifts.get(question.id) ?? new Map<string, { delta: number }>();
        return {
            number: question.number,
            type,
            answers,
            answeredShare: submits > 0 ? (answers / submits) * 100 : 0,
            options: counts.get(question.id) ?? [],
            shifts: [...shiftMap.entries()].map(([id, shift]) => ({
                label: labels.get(id) || "Answer",
                delta: shift.delta,
            })),
            mobileAnswers: devices.mobile,
            desktopAnswers: devices.desktop,
            deviceGaps: gaps,
            leaderSince: type === "radio" ? leaderSinceFromSequence(ordered.get(question.id) ?? []) : null,
            respondents: respondents.get(question.id) ?? 0,
        };
    });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

function monthDay(iso: string): string {
    const [, month, day] = iso.split("-").map(Number);
    return `${MONTHS[(month || 1) - 1]} ${day}`;
}

function sinceLabel(iso: string, currentYear: number): string {
    const [year, month] = iso.split("-").map(Number);
    const name = MONTHS[(month || 1) - 1];
    return year === currentYear ? name : `${name} ${year}`;
}

function nyMonth(iso: string): { year: number; month: number } {
    const [year, month] = iso.split("-").map(Number);
    return { year, month };
}

function sameMonth(iso: string | null, month: { year: number; month: number }): boolean {
    if (!iso) return false;
    const value = nyMonth(iso);
    return value.year === month.year && value.month === month.month;
}

export function surveyListFields(row: {
    active: boolean;
    impressions: number;
    responses: number;
    firstImpressionDay: string | null;
    lastResponseDay: string | null;
    today: string;
}): { status: "live" | "ended" | "draft"; statusText: string; responseRate: number | null } {
    const responseRate = row.impressions > 0 ? responseRatePercent(row.responses, row.impressions) : null;
    if (row.active) {
        const since = row.responses > 0 ? row.lastResponseDay : row.firstImpressionDay;
        const quiet = since && since <= row.today ? daysBetween(since, row.today) : null;
        if (quiet != null && quiet >= 14) {
            return { status: "live", statusText: `Live · silent ${quiet} days`, responseRate };
        }
        if (row.firstImpressionDay && row.firstImpressionDay <= row.today) {
            return {
                status: "live",
                statusText: `Live · day ${daysBetween(row.firstImpressionDay, row.today) + 1}`,
                responseRate,
            };
        }
        return { status: "live", statusText: "Live", responseRate };
    }
    if (row.impressions > 0 || row.responses > 0) {
        return {
            status: "ended",
            statusText: row.lastResponseDay ? `Ended ${monthDay(row.lastResponseDay)}` : "Ended",
            responseRate,
        };
    }
    return { status: "draft", statusText: "Draft", responseRate };
}

function one(value: number): string {
    return value.toFixed(1);
}

function formatCount(value: number): string {
    return value.toLocaleString("en-US");
}
