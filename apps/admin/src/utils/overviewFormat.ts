const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatCount(value: number): string {
    return Number(value).toLocaleString("en-US");
}

export function formatMonthDay(iso: string): string {
    const [, month, day] = iso.split("-").map(Number);
    return `${MONTHS[(month || 1) - 1]} ${day}`;
}

export function formatMonthDayYear(iso: string): string {
    const [year, month, day] = iso.split("-").map(Number);
    return `${MONTHS[(month || 1) - 1]} ${day}, ${year}`;
}

export function formatNyDateTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }).format(date);
}

export function formatDevice(value: string | null | undefined): string | null {
    const key = (value || "").trim().toLowerCase();
    if (!key) return null;
    if (key === "mobile") return "Mobile";
    if (key === "desktop") return "Desktop";
    if (key === "tablet") return "Tablet";
    return value!.trim();
}

export function formatRate(value: number): string {
    return `${value.toFixed(1)}%`;
}

export function outsideBand(value: number, p25: number, p75: number): boolean {
    const shown = Math.round(value * 10) / 10;
    const low = Math.round(p25 * 10) / 10;
    const high = Math.round(p75 * 10) / 10;
    return shown < low || shown > high;
}

export function shiftLabel(from: number, to: number, delta: number): string {
    const arrow = delta > 0 ? "▲" : "▼";
    return `${from}% → ${to}%  ${arrow} ${Math.abs(delta)} pt`;
}
