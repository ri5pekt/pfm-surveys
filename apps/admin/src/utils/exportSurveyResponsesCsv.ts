import { surveysApi } from "../services/api";
import type { ResponseRow, SurveyQuestion } from "../types";

export interface ExportSurveyCsvOptions {
    surveyId: string;
    surveyName: string;
    questions: SurveyQuestion[];
    /** If omitted, all questions are exported */
    questionIds?: string[];
    fromDate?: string;
    toDate?: string;
    onProgress?: (label: string, percent: number) => void;
}

function escapeCell(v: string | null | undefined): string {
    const s = v ?? "";
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

function downloadCsv(filename: string, csvContent: string): void {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function buildCsvFromRows(
    allRows: ResponseRow[],
    allQuestions: SurveyQuestion[],
    exportQuestions: SurveyQuestion[]
): { csvContent: string; submissionCount: number } {
    type AnswerRow = ResponseRow;
    const bySession = new Map<string, Map<string, AnswerRow[]>>();

    for (const row of allRows) {
        const sid = row.session_id ?? `__no_session_${row.id}`;
        if (!bySession.has(sid)) bySession.set(sid, new Map());
        const byQ = bySession.get(sid)!;
        if (!byQ.has(row.question_id)) byQ.set(row.question_id, []);
        byQ.get(row.question_id)!.push(row);
    }

    for (const byQ of bySession.values()) {
        for (const rows of byQ.values()) {
            rows.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        }
    }

    type Submission = { sid: string; meta: AnswerRow; answers: Map<string, string> };
    const submissions: Submission[] = [];

    for (const [sid, byQ] of bySession.entries()) {
        const maxRounds = Math.max(0, ...[...byQ.values()].map((r) => r.length));
        for (let round = 0; round < maxRounds; round++) {
            const answers = new Map<string, string>();
            let meta: AnswerRow | null = null;
            for (const [qId, rows] of byQ.entries()) {
                const r = rows[round];
                if (r) {
                    answers.set(qId, r.display_label);
                    if (!meta || new Date(r.timestamp) < new Date(meta.timestamp)) meta = r;
                }
            }
            if (meta) submissions.push({ sid, meta, answers });
        }
    }

    submissions.sort((a, b) => new Date(b.meta.timestamp).getTime() - new Date(a.meta.timestamp).getTime());

    const questionHeaders = exportQuestions.map((q) => {
        const originalIndex = allQuestions.findIndex((oq) => oq.id === q.id);
        return `Q${originalIndex + 1}: ${q.question_text}`;
    });
    const headers = [
        "Session ID",
        "Date",
        "Page URL",
        "IP",
        "Country",
        "State",
        "City",
        "Browser",
        "OS",
        "Device",
        ...questionHeaders,
    ];

    const csvLines: string[] = [headers.map(escapeCell).join(",")];

    for (const { sid, meta, answers } of submissions) {
        const questionAnswers = exportQuestions.map((q) => answers.get(q.id) ?? "");
        const cells = [
            sid.startsWith("__no_session_") ? "" : sid,
            meta.timestamp ? new Date(meta.timestamp).toLocaleString() : "",
            meta.page_url ?? "",
            meta.ip ?? "",
            meta.country ?? "",
            meta.state_name ?? meta.state ?? "",
            meta.city ?? "",
            meta.browser ?? "",
            meta.os ?? "",
            meta.device ?? "",
            ...questionAnswers,
        ];
        csvLines.push(cells.map(escapeCell).join(","));
    }

    return {
        csvContent: "\uFEFF" + csvLines.join("\n"),
        submissionCount: submissions.length,
    };
}

/**
 * Fetch all responses for a survey and download a CSV file.
 * Returns the number of submission rows written.
 */
export async function exportSurveyResponsesCsv(options: ExportSurveyCsvOptions): Promise<number> {
    const { surveyId, surveyName, questions, fromDate, toDate, onProgress } = options;
    const selectedIds = options.questionIds ?? questions.map((q) => q.id);
    const exportQuestions = questions.filter((q) => selectedIds.includes(q.id));

    if (exportQuestions.length === 0) {
        throw new Error("No questions selected for export");
    }

    const LIMIT = 500;
    const dateParams = {
        ...(fromDate ? { from_date: fromDate } : {}),
        ...(toDate ? { to_date: toDate } : {}),
    };

    onProgress?.("Fetching responses…", 0);

    const firstPage = await surveysApi.getResponses(surveyId, {
        page: 1,
        limit: LIMIT,
        ...dateParams,
    });

    const total = firstPage.total;
    const totalPages = Math.max(1, Math.ceil(total / LIMIT));
    let allRows = [...firstPage.responses];

    onProgress?.(`Fetching responses… ${allRows.length} / ${total}`, Math.round((1 / totalPages) * 75));

    for (let page = 2; page <= totalPages; page++) {
        const pageData = await surveysApi.getResponses(surveyId, {
            page,
            limit: LIMIT,
            ...dateParams,
        });
        allRows = allRows.concat(pageData.responses);
        onProgress?.(
            `Fetching responses… ${allRows.length} / ${total}`,
            Math.round((page / totalPages) * 75)
        );
    }

    onProgress?.("Building CSV…", 82);

    const { csvContent, submissionCount } = buildCsvFromRows(allRows, questions, exportQuestions);

    onProgress?.("Preparing download…", 95);

    const safeName = surveyName.replace(/[^a-z0-9]+/gi, "_").toLowerCase() || "survey";
    const filename = `${safeName}_responses_${new Date().toISOString().split("T")[0]}.csv`;
    downloadCsv(filename, csvContent);

    onProgress?.(`Done! Exported ${submissionCount} responses.`, 100);

    return submissionCount;
}

/** Small delay so browsers don't coalesce rapid multi-file downloads. */
export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
