import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5174,
    proxy: {
      "/api": { target: "http://localhost:5000", changeOrigin: true },
    },
  },

  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    minify: "esbuild",
    cssMinify: true,
    target: "es2020",
    rollupOptions: {
      output: {
        entryFileNames:  "assets/[name]-[hash].js",
        chunkFileNames:  "assets/[name]-[hash].js",
        assetFileNames:  "assets/[name]-[hash][extname]",
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router-dom")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/i18next") || id.includes("node_modules/react-i18next") || id.includes("node_modules/i18next-browser-languagedetector")) {
            return "vendor-i18n";
          }
          if (id.includes("node_modules/axios")) {
            return "vendor-axios";
          }
        },
      },
    },
  },

  envPrefix: "VITE_",
});
