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
              id.includes('node_modules/wouter') ||
              id.includes('node_modules/scheduler')) {
            return 'vendor-react';
          }

          // Séparer les composants Radix UI (très volumineux)
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-radix';
          }

          // Séparer Recharts et D3 (graphiques)
          if (id.includes('node_modules/recharts') ||
              id.includes('node_modules/d3-') ||
              id.includes('node_modules/victory')) {
            return 'vendor-charts';
          }

          // Séparer React Query
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'vendor-query';
          }

          // Séparer Lucide Icons
          if (id.includes('node_modules/lucide-react') ||
              id.includes('node_modules/react-icons')) {
            return 'vendor-icons';
          }

          // Séparer les utilitaires de dates
          if (id.includes('node_modules/date-fns')) {
            return 'vendor-date';
          }

          // Séparer les bibliothèques de formulaires (volumineuses)
          if (id.includes('node_modules/react-hook-form') ||
              id.includes('node_modules/@hookform') ||
              id.includes('node_modules/zod')) {
            return 'vendor-forms';
          }

          // Séparer les bibliothèques UI/DnD
          if (id.includes('node_modules/@hello-pangea/dnd') ||
              id.includes('node_modules/react-dropzone') ||
              id.includes('node_modules/embla-carousel')) {
            return 'vendor-ui-utils';
          }

          // Séparer les bibliothèques PDF/Documents
          if (id.includes('node_modules/jspdf') ||
              id.includes('node_modules/pdf-parse') ||
              id.includes('node_modules/tesseract') ||
              id.includes('node_modules/xlsx') ||
              id.includes('node_modules/exceljs')) {
            return 'vendor-docs';
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
    allowedHosts: ['.replit.dev'],  // 👈 Ajouter cette ligne
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
