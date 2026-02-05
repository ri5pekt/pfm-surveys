import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyPluginAsync } from "fastify";

const jwtPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.register(jwt, {
        secret: process.env.JWT_ACCESS_SECRET || "your_jwt_access_secret_min_32_chars_change_this_in_production",
        sign: {
            expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "30d", // 30 days instead of 15 minutes
        },
    });

    fastify.decorate("authenticate", async function (request, reply) {
        try {
            await request.jwtVerify();
        } catch (err) {
            reply.send(err);
        }
    });
};

export default fp(jwtPlugin);
