import type { DailyStatDay, DailyStats } from "../types";

export const ANSWER_COLORS = ["#667eea", "#e53e3e", "#38a169", "#805ad5", "#2b6cb0", "#dd6b20", "#319795"];

export function browserTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function todayIso(timeZone = browserTimeZone()): string {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const year = parts.find((part) => part.type === "year")?.value ?? "1970";
    const month = parts.find((part) => part.type === "month")?.value ?? "01";
    const day = parts.find((part) => part.type === "day")?.value ?? "01";
    return `${year}-${month}-${day}`;
}

export function addCalendarDays(isoDate: string, days: number): string {
    const [year, month, day] = isoDate.split("-").map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + days));
    const y = next.getUTCFullYear();
    const m = String(next.getUTCMonth() + 1).padStart(2, "0");
    const d = String(next.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export function formatCount(value: number): string {
    return value.toLocaleString("en-US");
}

export function formatRate(value: number): string {
    return `${value.toFixed(1)}%`;
}

/** Calendar date, rendered without shifting across timezones. */
export function formatDayLabel(isoDate: string): string {
    const [year, month, day] = isoDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    }).format(date);
}

export function formatDayChip(from: string, to: string): string {
    const start = formatMonthDay(from);
    const end = formatMonthDay(to, true);
    if (from === to) return end;
    return `${start} – ${end}`;
}

function formatMonthDay(isoDate: string, withYear = false): string {
    const [year, month, day] = isoDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        ...(withYear ? { year: "numeric" } : {}),
        timeZone: "UTC",
    }).format(date);
}

export function shortOptionLabel(text: string, max = 8): string {
    const trimmed = text.trim();
    if (trimmed.length <= max) return trimmed.toUpperCase();
    return `${trimmed.slice(0, max - 1).trimEnd().toUpperCase()}…`;
}

export function optionSlug(text: string): string {
    const slug = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
    return slug || "answer";
}

export function responseRatePercent(responses: number, impressions: number): number {
    if (impressions <= 0) return 0;
    return Math.round((responses / impressions) * 1000) / 10;
}

export interface SummaryQuestion {
    number: number;
    questionType: string;
    options: Array<{ id: string; option_text: string }>;
    days: DailyStatDay[];
}

export interface SummaryTable {
    headers: string[];
    rows: string[][];
}

function uniqueSlug(base: string, used: Set<string>): string {
    let slug = base;
    let n = 2;
    while (used.has(slug)) {
        slug = `${base}_${n}`;
        n += 1;
    }
    used.add(slug);
    return slug;
}

/** One row per day, oldest first, matching the export preview. */
export function buildDailySummaryTable(questions: SummaryQuestion[]): SummaryTable {
    const prefix = questions.length > 1;
    const used = new Set<string>(["date", "impressions", "responses", "response_rate", "dismissals"]);
    const headers = prefix ? ["date", "impressions", "dismissals"] : ["date", "impressions", "responses", "response_rate", "dismissals"];

    const columns: Array<{ header: string; value: (date: string) => string }> = [];

    for (const question of questions) {
        const qPrefix = prefix ? `q${question.number}_` : "";
        const byDate = new Map(question.days.map((day) => [day.date, day]));
        if (prefix) {
            const responsesHeader = uniqueSlug(`${qPrefix}responses`, used);
            const rateHeader = uniqueSlug(`${qPrefix}response_rate`, used);
            headers.push(responsesHeader, rateHeader);
            columns.push(
                {
                    header: responsesHeader,
                    value: (date) => String(byDate.get(date)?.responses ?? 0),
                },
                {
                    header: rateHeader,
                    value: (date) => formatRate(byDate.get(date)?.response_rate ?? 0),
                }
            );
        }
        if (question.questionType !== "text") {
            for (const option of question.options) {
                const header = uniqueSlug(`${qPrefix}${optionSlug(option.option_text)}`, used);
                headers.push(header);
                columns.push({
                    header,
                    value: (date) => String(byDate.get(date)?.options[option.id] ?? 0),
                });
            }
        }
    }

    const dates = new Set<string>();
    for (const question of questions) {
        for (const day of question.days) dates.add(day.date);
    }
    const ordered = [...dates].sort();

    const impressions = new Map<string, DailyStatDay>();
    for (const question of questions) {
        for (const day of question.days) {
            if (!impressions.has(day.date)) impressions.set(day.date, day);
        }
    }

    const rows = ordered.map((date) => {
        const day = impressions.get(date);
        const base = prefix
            ? [date, String(day?.impressions ?? 0), String(day?.dismissals ?? 0)]
            : [
                  date,
                  String(day?.impressions ?? 0),
                  String(day?.responses ?? 0),
                  formatRate(day?.response_rate ?? 0),
                  String(day?.dismissals ?? 0),
              ];
        return [...base, ...columns.map((column) => column.value(date))];
    });

    return { headers, rows };
}

export function dailyExportBasename(surveyName: string, from: string, to: string): string {
    const safe = surveyName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "survey";
    const range = from === to ? from : `${from}_to_${to}`;
    return `${safe}-daily_${range}`;
}

export function statsToSummaryQuestion(stats: DailyStats, questionNumber: number): SummaryQuestion {
    return {
        number: questionNumber,
        questionType: stats.question?.question_type ?? "text",
        options: stats.question?.options ?? [],
        days: stats.days,
    };
}

export function toCsv(headers: string[], rows: string[][]): string {
    const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","));
    return "\uFEFF" + lines.join("\n");
}

function escapeCell(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
}

export async function rowsToXlsxBlob(sheets: Array<{ name: string; headers: string[]; rows: string[][] }>): Promise<Blob> {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    for (const sheet of sheets) {
        const worksheet = workbook.addWorksheet(sheet.name.slice(0, 31) || "Sheet");
        worksheet.addRow(sheet.headers);
        for (const row of sheet.rows) worksheet.addRow(row);
        worksheet.getRow(1).font = { bold: true };
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
}

export async function filesToZipBlob(files: Array<{ name: string; content: string }>): Promise<Blob> {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const file of files) zip.file(file.name, file.content);
    return zip.generateAsync({ type: "blob" });
}
