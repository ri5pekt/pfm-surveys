import { sql } from "kysely";
import { db } from "../db/connection";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Keep a custom or all-time range from turning into an unbounded scan. */
const MAX_DAYS = 1500;

export interface DailyOptionCount {
    id: string;
    option_text: string;
    order_index: number;
    count: number;
}

export interface DailyStatDay {
    date: string;
    impressions: number;
    responses: number;
    response_rate: number;
    dismissals: number;
    options: Record<string, number>;
}

export interface DailyQuestion {
    id: string;
    question_text: string;
    question_type: string;
    order_index: number;
    options: Array<{ id: string; option_text: string; order_index: number }>;
}

export interface DailyStatsResult {
    timezone: string;
    from: string;
    to: string;
    truncated: boolean;
    question: DailyQuestion | null;
    days: DailyStatDay[];
}

export function isIsoDate(value: string | undefined): value is string {
    return !!value && DATE_RE.test(value);
}

export function isValidTimeZone(timeZone: string): boolean {
    try {
        Intl.DateTimeFormat("en-US", { timeZone });
        return true;
    } catch {
        return false;
    }
}

/** Responses ÷ impressions, as a percentage rounded to one decimal. */
export function responseRatePercent(responses: number, impressions: number): number {
    if (impressions <= 0) return 0;
    return Math.round((responses / impressions) * 1000) / 10;
}

export function addCalendarDays(isoDate: string, days: number): string {
    const [year, month, day] = isoDate.split("-").map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + days));
    const y = next.getUTCFullYear();
    const m = String(next.getUTCMonth() + 1).padStart(2, "0");
    const d = String(next.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export function eachCalendarDay(from: string, to: string): string[] {
    const days: string[] = [];
    let cursor = from;
    while (cursor <= to && days.length <= MAX_DAYS) {
        days.push(cursor);
        cursor = addCalendarDays(cursor, 1);
    }
    return days;
}

export function todayInTimeZone(timeZone: string, now = new Date()): string {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(now);
    const year = parts.find((part) => part.type === "year")?.value ?? "1970";
    const month = parts.find((part) => part.type === "month")?.value ?? "01";
    const day = parts.find((part) => part.type === "day")?.value ?? "01";
    return `${year}-${month}-${day}`;
}

function asNumber(value: unknown): number {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
}

function asDay(value: unknown): string {
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }
    return String(value ?? "").slice(0, 10);
}

/**
 * Daily impressions and dismissals come from event_dedup.processed_at.
 * Daily answers come from responses.timestamp.
 * Both are bucketed in the requested IANA timezone.
 * Radio and text "responses" are answer rows. Checkbox "responses" are distinct sessions.
 */
export async function getDailyStats(args: {
    surveyId: string;
    questionId?: string;
    from?: string;
    to?: string;
    timezone: string;
}): Promise<DailyStatsResult | { error: string; status: number }> {
    const { surveyId, timezone } = args;
    if (!isValidTimeZone(timezone)) {
        return { error: "Invalid timezone", status: 400 };
    }
    if ((args.from && !isIsoDate(args.from)) || (args.to && !isIsoDate(args.to))) {
        return { error: "Dates must be YYYY-MM-DD", status: 400 };
    }
    if ((args.from && !args.to) || (!args.from && args.to)) {
        return { error: "Provide both from and to, or neither", status: 400 };
    }
    if (args.from && args.to && args.from > args.to) {
        return { error: "from must be on or before to", status: 400 };
    }

    const questions = await db
        .selectFrom("questions")
        .select(["id", "question_text", "question_type", "order_index"])
        .where("survey_id", "=", surveyId)
        .orderBy("order_index", "asc")
        .execute();

    const selected = args.questionId
        ? questions.find((question) => question.id === args.questionId)
        : questions[0];
    if (args.questionId && !selected) {
        return { error: "Question not found", status: 404 };
    }

    let options: DailyQuestion["options"] = [];
    if (selected && selected.question_type !== "text") {
        options = await db
            .selectFrom("answer_options")
            .select(["id", "option_text", "order_index"])
            .where("question_id", "=", selected.id)
            .orderBy("order_index", "asc")
            .execute();
    }

    let from = args.from;
    let to = args.to;
    let truncated = false;
    if (!from || !to) {
        const bounds = await activityBounds(surveyId, timezone);
        const today = todayInTimeZone(timezone);
        from = bounds.from ?? today;
        to = bounds.to ?? today;
        if (from > to) {
            from = to;
        }
    }

    const span = eachCalendarDay(from, to);
    if (span.length > MAX_DAYS) {
        from = addCalendarDays(to, -(MAX_DAYS - 1));
        truncated = true;
    }
    const days = eachCalendarDay(from, to);
    const toExclusive = addCalendarDays(to, 1);

    const eventRows = await sql<{ day: string; event_type: string; count: number }>`
        SELECT
            to_char((processed_at AT TIME ZONE ${timezone})::date, 'YYYY-MM-DD') AS day,
            event_type,
            COUNT(*)::int AS count
        FROM event_dedup
        WHERE survey_id = ${surveyId}::uuid
          AND event_type IN ('impression', 'dismiss')
          AND processed_at >= (${from}::timestamp AT TIME ZONE ${timezone})
          AND processed_at < (${toExclusive}::timestamp AT TIME ZONE ${timezone})
        GROUP BY 1, 2
    `.execute(db);

    const impressionsByDay = new Map<string, number>();
    const dismissalsByDay = new Map<string, number>();
    for (const row of eventRows.rows) {
        const day = asDay(row.day);
        const count = asNumber(row.count);
        if (row.event_type === "impression") impressionsByDay.set(day, count);
        if (row.event_type === "dismiss") dismissalsByDay.set(day, count);
    }

    const responsesByDay = new Map<string, number>();
    const optionsByDay = new Map<string, Record<string, number>>();

    if (selected) {
        const countExpression =
            selected.question_type === "checkbox"
                ? sql`COUNT(DISTINCT COALESCE(session_id, 'row:' || id::text))::int`
                : sql`COUNT(*)::int`;

        const responseRows = await sql<{ day: string; responses: number }>`
            SELECT
                to_char((timestamp AT TIME ZONE ${timezone})::date, 'YYYY-MM-DD') AS day,
                ${countExpression} AS responses
            FROM responses
            WHERE survey_id = ${surveyId}::uuid
              AND question_id = ${selected.id}::uuid
              AND timestamp >= (${from}::timestamp AT TIME ZONE ${timezone})
              AND timestamp < (${toExclusive}::timestamp AT TIME ZONE ${timezone})
            GROUP BY 1
        `.execute(db);

        for (const row of responseRows.rows) {
            responsesByDay.set(asDay(row.day), asNumber(row.responses));
        }

        if (options.length > 0) {
            const optionRows = await sql<{ day: string; answer_option_id: string; count: number }>`
                SELECT
                    to_char((timestamp AT TIME ZONE ${timezone})::date, 'YYYY-MM-DD') AS day,
                    answer_option_id,
                    COUNT(*)::int AS count
                FROM responses
                WHERE survey_id = ${surveyId}::uuid
                  AND question_id = ${selected.id}::uuid
                  AND answer_option_id IS NOT NULL
                  AND timestamp >= (${from}::timestamp AT TIME ZONE ${timezone})
                  AND timestamp < (${toExclusive}::timestamp AT TIME ZONE ${timezone})
                GROUP BY 1, 2
            `.execute(db);

            for (const row of optionRows.rows) {
                const day = asDay(row.day);
                const bucket = optionsByDay.get(day) ?? {};
                bucket[String(row.answer_option_id)] = asNumber(row.count);
                optionsByDay.set(day, bucket);
            }
        }
    }

    return {
        timezone,
        from,
        to,
        truncated,
        question: selected
            ? {
                  id: selected.id,
                  question_text: selected.question_text,
                  question_type: selected.question_type,
                  order_index: selected.order_index,
                  options,
              }
            : null,
        days: days.map((date) => {
            const impressions = impressionsByDay.get(date) ?? 0;
            const responses = responsesByDay.get(date) ?? 0;
            return {
                date,
                impressions,
                responses,
                response_rate: responseRatePercent(responses, impressions),
                dismissals: dismissalsByDay.get(date) ?? 0,
                options: optionsByDay.get(date) ?? {},
            };
        }),
    };
}

async function activityBounds(
    surveyId: string,
    timezone: string
): Promise<{ from: string | null; to: string | null }> {
    const events = await sql<{ first_day: string | null; last_day: string | null }>`
        SELECT
            to_char(MIN(processed_at AT TIME ZONE ${timezone})::date, 'YYYY-MM-DD') AS first_day,
            to_char(MAX(processed_at AT TIME ZONE ${timezone})::date, 'YYYY-MM-DD') AS last_day
        FROM event_dedup
        WHERE survey_id = ${surveyId}::uuid
    `.execute(db);

    const answers = await sql<{ first_day: string | null; last_day: string | null }>`
        SELECT
            to_char(MIN(timestamp AT TIME ZONE ${timezone})::date, 'YYYY-MM-DD') AS first_day,
            to_char(MAX(timestamp AT TIME ZONE ${timezone})::date, 'YYYY-MM-DD') AS last_day
        FROM responses
        WHERE survey_id = ${surveyId}::uuid
    `.execute(db);

    const candidatesFrom = [events.rows[0]?.first_day, answers.rows[0]?.first_day]
        .map((value) => (value ? asDay(value) : ""))
        .filter((value) => isIsoDate(value));
    const candidatesTo = [events.rows[0]?.last_day, answers.rows[0]?.last_day]
        .map((value) => (value ? asDay(value) : ""))
        .filter((value) => isIsoDate(value));

    return {
        from: candidatesFrom.sort()[0] ?? null,
        to: candidatesTo.sort().at(-1) ?? null,
    };
}
