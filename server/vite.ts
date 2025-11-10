import express, { type Express } from "express";
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import fs from "fs";
import path from "path";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import type { Server } from "http";
import { setViteInstance } from "./vite-instance-manager";
export const log = console.log;
export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: {
        server,
      },
    },
    appType: "custom",
  });
  // Stocker l'instance Vite pour l'utiliser ailleurs
  setViteInstance(vite);
  app.use(vite.middlewares);
  app.use(async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientPath = path.resolve(import.meta.dirname, "..", "client");
        const template = fs.readFileSync(
          path.resolve(clientPath, "index.html"),
          "utf-8"  // ✅ Le 2e argument manque
        );
        const html = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);  
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist/public");
  if (!fs.existsSync(distPath)) {
    throw new AppError(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    , 500);
  }
  app.use(express.static(distPath));
  // Fallback to index.html for SPA routing
  app.use((_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}