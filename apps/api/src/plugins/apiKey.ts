import fp from 'fastify-plugin';
import crypto from 'crypto';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection';

export interface ApiKeyContext {
    id: string;
    tenant_id: string;
    scopes: string[];
}

declare module 'fastify' {
    interface FastifyInstance {
        authenticateApiKey: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
    interface FastifyRequest {
        apiKey?: ApiKeyContext;
    }
}

const apiKeyPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.decorate('authenticateApiKey', async function (request: FastifyRequest, reply: FastifyReply) {
        const header = request.headers.authorization;

        if (!header || !header.startsWith('Bearer pfm_sk_')) {
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'Missing or invalid API key. Provide: Authorization: Bearer pfm_sk_live_...',
            });
        }

        const rawKey = header.slice('Bearer '.length);
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

        const apiKey = await db
            .selectFrom('api_keys')
            .select(['id', 'tenant_id', 'scopes', 'expires_at', 'revoked_at'])
            .where('key_hash', '=', keyHash)
            .executeTakeFirst();

        if (!apiKey) {
            return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid API key.' });
        }

        if (apiKey.revoked_at) {
            return reply.status(401).send({ error: 'Unauthorized', message: 'API key has been revoked.' });
        }

        if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
            return reply.status(401).send({ error: 'Unauthorized', message: 'API key has expired.' });
        }

        // Fire-and-forget: update last_used_at without blocking the request
        db.updateTable('api_keys')
            .set({ last_used_at: new Date() })
            .where('id', '=', apiKey.id)
            .execute()
            .catch(() => { /* non-critical */ });

        request.apiKey = {
            id: apiKey.id,
            tenant_id: apiKey.tenant_id,
            scopes: apiKey.scopes ?? [],
        };
    });
};

export default fp(apiKeyPlugin);
