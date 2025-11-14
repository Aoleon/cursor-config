#!/usr/bin/env node

/**
 * Wrapper JavaScript pour le service de stockage TypeScript
 * Utilise tsx pour exécuter directement le code TypeScript
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Exécute le service de stockage via tsx
 */
async function callService(method, args = {}) {
  try {
    const scriptPath = join(__dirname, 'cursor-storage-service-call.ts');
    const argsJson = JSON.stringify(args);
    
    const { stdout, stderr } = await execFileAsync('npx', ['tsx', scriptPath, method, argsJson], {
      cwd: join(__dirname, '..'),
      maxBuffer: 10 * 1024 * 1024, // 10MB
      timeout: 30000, // 30 secondes
    });

    if (stderr && !stderr.includes('Warning')) {
      console.error(`Stderr: ${stderr}`);
    }

    const result = JSON.parse(stdout.trim());
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  } catch (error) {
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch (e) {
        throw new Error(`Erreur: ${error.message}\nStdout: ${error.stdout}`);
      }
    }
    throw error;
  }
}

export async function syncConversations(args) {
  return await callService('syncConversations', args);
}

export async function getStoredConversations(args) {
  return await callService('getStoredConversations', args);
}

