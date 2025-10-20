/**
 * Gestionnaire d'instance Vite
 * 
 * Ce module permet de stocker et récupérer l'instance Vite pour l'utiliser
 * dans le fallback SPA sans modifier server/vite.ts (fichier protégé).
 */

import type { ViteDevServer } from 'vite';

let viteInstance: ViteDevServer | null = null;

export function setViteInstance(instance: ViteDevServer): void {
  viteInstance = instance;
}

export function getViteInstance(): ViteDevServer | null {
  return viteInstance;
}

export function hasViteInstance(): boolean {
  return viteInstance !== null;
}
