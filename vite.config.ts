import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "@leadconnector/vibe-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // `vite dev` serves static assets only; the /api functions run in the
    // separate host started by `npm run dev:api`, the same sources Vercel
    // deploys. Without this proxy the app in development would talk to nothing.
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${process.env.API_PORT || 3101}`,
        changeOrigin: false,
      },
    },
    allowedHosts: [".modal.host"],
    watch: { aggregateTimeout: 2000 },
    hmr: { timeout: 30000,
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger({ tailwindConfig: true }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
