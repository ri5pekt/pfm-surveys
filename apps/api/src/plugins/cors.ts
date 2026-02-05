import fp from "fastify-plugin";
import cors from "@fastify/cors";
import type { FastifyPluginAsync } from "fastify";

const corsPlugin: FastifyPluginAsync = async (fastify) => {
    // Allow all origins for the embed widget to work on any website
    // Security is handled by domain validation in the site configuration
    fastify.register(cors, {
        origin: true, // Allow all origins
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
        exposedHeaders: ["Content-Type"],
    });
};

export default fp(corsPlugin);
