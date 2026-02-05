import type { ResponseRow } from "../types";

/**
 * Composable for formatting response data
 * Handles all text formatting, truncation, date formatting, and resource path generation
 */
export function useResponseFormatters() {
    // Text truncation
    function truncate(s: string, len: number) {
        if (!s) return "";
        return s.length <= len ? s : s.slice(0, len) + "…";
    }

    function truncateUrl(url: string) {
        if (!url) return "";
        try {
            const u = new URL(url, "https://x");
            const path = u.pathname || url;
            return path.length > 40 ? path.slice(0, 40) + "…" : path;
        } catch {
            return url.length > 40 ? url.slice(0, 40) + "…" : url;
        }
    }

    function truncatePageUrl(url: string | null | undefined): string {
        if (!url) return "—";
        try {
            const u = new URL(url);
            let display = u.pathname;
            if (u.search) display += u.search;
            if (display.length > 50) display = display.slice(0, 50) + "…";
            return display || "/";
        } catch {
            return url.length > 50 ? url.slice(0, 50) + "…" : url;
        }
    }

    // Date formatting
    function formatDate(iso: string) {
        const d = new Date(iso);
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    // Browser/OS labels
    function browserOsLabel(row: ResponseRow): string {
        const parts = [row.browser, row.os].filter(Boolean);
        return parts.length > 0 ? parts.join(" / ") : "";
    }

    // Location formatting
    function locationLabel(row: ResponseRow): string {
        const parts: string[] = [];
        if (row.city) parts.push(row.city);
        if (row.state_name || row.state) parts.push(row.state_name || row.state || "");
        if (row.country) parts.push(row.country);
        return parts.filter(Boolean).join(", ");
    }

    function formatLocation(row: ResponseRow): string {
        const parts: string[] = [];
        if (row.country) parts.push(row.country);
        if (row.state_name || row.state) parts.push(row.state_name || row.state || "");
        else if (row.city) parts.push(row.city);
        return parts.filter(Boolean).join(", ") || "—";
    }

    // Flag/icon URL generation
    const flagModules = import.meta.glob<{ default: string }>("../assets/icons/flags/*.png", { eager: true });

    function getFlagUrl(countryCode: string): string {
        const key = `../assets/icons/flags/${countryCode.toUpperCase()}.png`;
        return (flagModules[key] as { default: string } | undefined)?.default ?? "";
    }

    function handleFlagError(event: Event) {
        const img = event.target as HTMLImageElement;
        if (img) {
            img.style.display = "none";
        }
    }

    function flagPath(code: string | null | undefined): string | null {
        if (!code) return null;
        const key = `../assets/icons/flags/${String(code).toUpperCase()}.png`;
        return (flagModules[key] as { default: string } | undefined)?.default ?? null;
    }

    function countryName(code: string | null | undefined): string {
        if (!code) return "—";
        return COUNTRY_NAMES[code.toUpperCase()] || code.toUpperCase();
    }

    // ID formatting
    function shortId(eventId: number): string {
        return `#${eventId}`;
    }

    // Icon paths using import.meta.url
    function browserIconPath(name: string | null | undefined): string {
        if (!name) return new URL("../assets/icons/system/unknown.svg", import.meta.url).href;
        const n = (name ?? "").toLowerCase();
        if (n.includes("chrome")) return new URL("../assets/icons/browser/chrome.svg", import.meta.url).href;
        if (n.includes("firefox")) return new URL("../assets/icons/browser/firefox.svg", import.meta.url).href;
        if (n.includes("safari")) return new URL("../assets/icons/browser/safari.svg", import.meta.url).href;
        if (n.includes("edge")) return new URL("../assets/icons/browser/edge.svg", import.meta.url).href;
        return new URL("../assets/icons/system/unknown.svg", import.meta.url).href;
    }

    function osIconPath(name: string | null | undefined): string {
        if (!name) return new URL("../assets/icons/system/unknown.svg", import.meta.url).href;
        const n = (name ?? "").toLowerCase();
        if (n.includes("windows")) return new URL("../assets/icons/os/windows.svg", import.meta.url).href;
        if (n.includes("android")) return new URL("../assets/icons/os/android.svg", import.meta.url).href;
        if (n.includes("mac") || n.includes("ios") || n.includes("ipad") || n.includes("iphone"))
            return new URL("../assets/icons/os/apple.svg", import.meta.url).href;
        if (n.includes("linux")) return new URL("../assets/icons/os/linux.svg", import.meta.url).href;
        return new URL("../assets/icons/system/unknown.svg", import.meta.url).href;
    }

    function deviceIconPath(device: string | null | undefined): string {
        const d = (device ?? "").toLowerCase();
        if (d === "mobile") return new URL("../assets/icons/device/mobile.svg", import.meta.url).href;
        if (d === "tablet") return new URL("../assets/icons/device/tablet.svg", import.meta.url).href;
        return new URL("../assets/icons/device/desktop.svg", import.meta.url).href;
    }

    // Clipboard
    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text).catch((err) => console.error("Failed to copy:", err));
    }

    return {
        truncate,
        truncateUrl,
        truncatePageUrl,
        formatDate,
        browserOsLabel,
        locationLabel,
        formatLocation,
        getFlagUrl,
        handleFlagError,
        flagPath,
        countryName,
        shortId,
        browserIconPath,
        osIconPath,
        deviceIconPath,
        copyToClipboard,
    };
}

const COUNTRY_NAMES: Record<string, string> = {
    US: "United States",
    GB: "United Kingdom",
    CA: "Canada",
    AU: "Australia",
    DE: "Germany",
    FR: "France",
    ES: "Spain",
    IT: "Italy",
    NL: "Netherlands",
    SE: "Sweden",
    NO: "Norway",
    DK: "Denmark",
    FI: "Finland",
    PL: "Poland",
    BR: "Brazil",
    MX: "Mexico",
    AR: "Argentina",
    CL: "Chile",
    CO: "Colombia",
    PE: "Peru",
    IN: "India",
    CN: "China",
    JP: "Japan",
    KR: "South Korea",
    SG: "Singapore",
    TH: "Thailand",
    VN: "Vietnam",
    ID: "Indonesia",
    MY: "Malaysia",
    PH: "Philippines",
    ZA: "South Africa",
    NG: "Nigeria",
    EG: "Egypt",
    KE: "Kenya",
    RU: "Russia",
    UA: "Ukraine",
    TR: "Turkey",
    SA: "Saudi Arabia",
    AE: "United Arab Emirates",
    IL: "Israel",
    NZ: "New Zealand",
    IE: "Ireland",
    AT: "Austria",
    CH: "Switzerland",
    BE: "Belgium",
    PT: "Portugal",
    GR: "Greece",
    CZ: "Czech Republic",
    RO: "Romania",
    HU: "Hungary",
};
