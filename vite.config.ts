import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Séparer React et ses dépendances principales
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom') || 
              id.includes('node_modules/wouter')) {
            return 'vendor-react';
          }

          // Séparer les composants Radix UI (très volumineux)
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-radix';
          }

          // Séparer Recharts (graphiques)
          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts';
          }

          // Séparer React Query
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'vendor-query';
          }

          // Séparer Lucide Icons
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }

          // Séparer les autres dépendances lourdes
          if (id.includes('node_modules/date-fns')) {
            return 'vendor-date';
          }

          // Reste des node_modules
          if (id.includes('node_modules')) {
            return 'vendor-other';
          }
        }
      }
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
