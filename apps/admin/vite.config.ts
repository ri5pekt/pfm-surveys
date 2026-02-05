import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            "@": resolve(__dirname, "src"),
        },
    },
    server: {
        port: parseInt(process.env.VITE_PORT || "5173", 10),
        host: true,
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
});
