import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
    // Load env file from monorepo root
    const env = loadEnv(mode, resolve(__dirname, "../../"), "");

    return {
        plugins: [vue()],
        // Explicitly define env vars so Vite exposes them
        define: {
            "import.meta.env.VITE_API_BASE_URL": JSON.stringify(env.VITE_API_BASE_URL || "http://localhost:3000"),
            "import.meta.env.VITE_EMBED_API_URL": JSON.stringify(env.VITE_EMBED_API_URL || env.VITE_API_BASE_URL || "http://localhost:3000"),
            "import.meta.env.VITE_PORT": JSON.stringify(env.VITE_PORT || "5173"),
        },
        resolve: {
            alias: {
                "@": resolve(__dirname, "src"),
            },
        },
        server: {
            port: parseInt(env.VITE_PORT || "5173", 10),
            host: true,
            // Proxy API requests to backend in dev mode
            // In production, Caddy handles routing, so relative URLs work everywhere
            proxy: {
                '/api': {
                    target: 'http://localhost:3000',
                    changeOrigin: true,
                },
                '/embed': {
                    target: 'http://localhost:3000',
                    changeOrigin: true,
                },
                '/health': {
                    target: 'http://localhost:3000',
                    changeOrigin: true,
                },
            },
        },
        build: {
            rollupOptions: {
                output: {
                    // Split vendor code into separate chunks for better caching
                    manualChunks: {
                        "vue-vendor": ["vue", "vue-router", "pinia"],
                        "primevue-vendor": ["primevue"],
                    },
                },
            },
            // Increase chunk size warning limit (default is 500kb)
            chunkSizeWarningLimit: 1000,
        },
    };
});
