import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 5173,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api-onemap": {
        target: "https://www.onemap.gov.sg",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-onemap/, ""),
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Split large, independent third-party libs into their own chunks so they
    // download in parallel and stay cached across app-code deploys.
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (id.includes("firebase") || id.includes("@firebase")) return "firebase";
            if (id.includes("recharts") || id.includes("d3-")) return "charts";
            if (id.includes("framer-motion")) return "framer";
            if (id.includes("@react-google-maps")) return "maps";
          }
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
}));
