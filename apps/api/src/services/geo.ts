import { db } from "../db/connection";

/** Geo result for targeting (country code, region code, city). */
export interface UserGeo {
    country?: string;
    state?: string;
    city?: string;
}

const GEO_TIMEOUT_MS = 4000;
const IP_API_BASE = "https://pro.ip-api.com/json";

/**
 * Resolve IP to geo from cache or ip-api.com.
 * Returns { country, state, city } for use in user targeting; null on failure or missing key.
 */
export async function getGeoForIp(ip: string): Promise<UserGeo | null> {
    const apiKey = process.env.IP_API_KEY;
    if (!apiKey || !ip) return null;

    const cached = await db
        .selectFrom("ip_geolocation_cache")
        .select(["country", "state", "state_name", "city", "lookup_count"])
        .where("ip", "=", ip)
        .executeTakeFirst();

    if (cached) {
        await db
            .updateTable("ip_geolocation_cache")
            .set({
                last_seen_at: new Date(),
                lookup_count: cached.lookup_count + 1,
            })
            .where("ip", "=", ip)
            .execute();

        return {
            country: cached.country ?? undefined,
            state: cached.state ?? undefined,
            city: cached.city ?? undefined,
        };
    }

    const url = `${IP_API_BASE}/${encodeURIComponent(
        ip
    )}?fields=status,countryCode,region,regionName,city&key=${encodeURIComponent(apiKey)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);

    try {
        const res = await fetch(url, { signal: controller.signal, headers: { "Cache-Control": "no-cache" } });
        clearTimeout(timeout);
        const body = (await res.json()) as {
            status?: string;
            countryCode?: string;
            region?: string;
            regionName?: string;
            city?: string;
        };

        if (body?.status !== "success") return null;

        const country = body.countryCode != null ? String(body.countryCode).toUpperCase() : undefined;
        const state = body.region != null ? String(body.region).toUpperCase() : undefined;
        const state_name = body.regionName != null ? String(body.regionName) : undefined;
        const city = body.city != null ? String(body.city) : undefined;

        try {
            await db
                .insertInto("ip_geolocation_cache")
                .values({
                    ip,
                    country: country ?? null,
                    state: state ?? null,
                    state_name: state_name ?? null,
                    city: city ?? null,
                    lookup_count: 1,
                    first_seen_at: new Date(),
                    last_seen_at: new Date(),
                    created_at: new Date(),
                })
                .execute();
        } catch {
            // Ignore duplicate (race)
        }

        return { country, state, city };
    } catch {
        clearTimeout(timeout);
        return null;
    }
}
