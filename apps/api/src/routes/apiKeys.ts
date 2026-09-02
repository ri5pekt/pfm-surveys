/**
 * API Key management — /api/keys/
 * Protected by JWT (admin UI). Tenants use this to create and revoke their external API keys.
 *
 * POST   /api/keys          — create a new key (raw key returned once)
 * GET    /api/keys          — list all keys for the tenant (no raw key, only metadata)
 * DELETE /api/keys/:id      — revoke a key
 */

import type { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';
import { db } from '../db/connection';

const VALID_SCOPES = ['sites:read', 'surveys:read', 'responses:read'] as const;

function generateRawKey(): string {
    // pfm_sk_live_ + 32 random bytes as hex = 64 hex chars
    return 'pfm_sk_live_' + crypto.randomBytes(32).toString('hex');
}

const apiKeysRoutes: FastifyPluginAsync = async (fastify) => {
    // ── POST /api/keys — create ───────────────────────────────────────────────
    fastify.post<{
        Body: { name: string; scopes: string[]; expires_in_days?: number };
    }>('/', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        try {
            const { tenant_id } = request.user as { tenant_id: string };
            const { name, scopes, expires_in_days } = request.body;

            // Validate
            if (!name || typeof name !== 'string' || name.trim().length === 0) {
                return reply.status(400).send({ error: 'name is required' });
            }
            if (!Array.isArray(scopes) || scopes.length === 0) {
                return reply.status(400).send({ error: 'scopes must be a non-empty array' });
            }
            const invalidScopes = scopes.filter((s) => !(VALID_SCOPES as readonly string[]).includes(s));
            if (invalidScopes.length > 0) {
                return reply.status(400).send({
                    error: `Invalid scopes: ${invalidScopes.join(', ')}. Valid: ${VALID_SCOPES.join(', ')}`,
                });
            }

            const rawKey = generateRawKey();
            const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
            const keyPrefix = rawKey.slice(0, 20); // e.g. "pfm_sk_live_a1b2c3d4"

            const expiresAt = expires_in_days
                ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000)
                : null;

            const apiKey = await db
                .insertInto('api_keys')
                .values({
                    tenant_id,
                    name: name.trim(),
                    key_hash: keyHash,
                    key_prefix: keyPrefix,
                    scopes,
                    expires_at: expiresAt,
                } as any)
                .returning([
                    'id',
                    'name',
                    'key_prefix',
                    'scopes',
                    'expires_at',
                    'created_at',
                ])
                .executeTakeFirstOrThrow();

            // Return the raw key ONCE — after this it is never accessible again
            return reply.status(201).send({
                api_key: {
                    ...apiKey,
                    key: rawKey, // shown once
                },
                warning: 'Copy this key now. It will not be shown again.',
            });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // ── GET /api/keys — list ──────────────────────────────────────────────────
    fastify.get('/', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        try {
            const { tenant_id } = request.user as { tenant_id: string };

            const keys = await db
                .selectFrom('api_keys')
                .select([
                    'id',
                    'name',
                    'key_prefix',
                    'scopes',
                    'last_used_at',
                    'expires_at',
                    'revoked_at',
                    'created_at',
                ])
                .where('tenant_id', '=', tenant_id)
                .orderBy('created_at', 'desc')
                .execute();

            return reply.send({ api_keys: keys });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // ── DELETE /api/keys/:id — revoke ─────────────────────────────────────────
    fastify.delete<{ Params: { id: string } }>(
        '/:id',
        { onRequest: [fastify.authenticate] },
        async (request, reply) => {
            try {
                const { tenant_id } = request.user as { tenant_id: string };
                const { id } = request.params;

                const existing = await db
                    .selectFrom('api_keys')
                    .select(['id', 'revoked_at'])
                    .where('id', '=', id)
                    .where('tenant_id', '=', tenant_id)
                    .executeTakeFirst();

                if (!existing) {
                    return reply.status(404).send({ error: 'API key not found' });
                }
                if (existing.revoked_at) {
                    return reply.status(409).send({ error: 'API key is already revoked' });
                }

                await db
                    .updateTable('api_keys')
                    .set({ revoked_at: new Date() })
                    .where('id', '=', id)
                    .where('tenant_id', '=', tenant_id)
                    .execute();

                return reply.send({ success: true, message: 'API key revoked' });
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({ error: 'Internal server error' });
            }
        }
    );
};

export default apiKeysRoutes;
