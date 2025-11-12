import { logger } from '../utils/logger';
import type { IStorage } from '../storage-poc';
import { withErrorHandling } from '../utils/error-handler';

// ========================================
// GESTIONNAIRE DE VERROUS DE FICHIERS
// ========================================
// Évite les conflits lors de modifications parallèles
// dans plusieurs chats Cursor simultanés
// ========================================

export interface FileLock {
  filePath: string;
  chatId: string;
  userId?: string;
  lockedAt: Date;
  expiresAt: Date;
  operation: 'read' | 'write' | 'delete' | 'move';
  metadata?: {
    task?: string;
    description?: string;
  };
}

export interface LockConflict {
  filePath: string;
  currentLock: FileLock;
  requestedOperation: 'read' | 'write' | 'delete' | 'move';
  conflictType: 'write_write' | 'write_read' | 'delete_write' | 'move_write';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

export class AgentFileLockManager {
  private storage: IStorage;
  private locks: Map<string, FileLock> = new Map();
  private readonly DEFAULT_LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes par défaut
  private readonly MAX_LOCK_TTL_MS = 30 * 60 * 1000; // 30 minutes maximum
  private cleanupInterval?: NodeJS.Timeout;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentFileLockManager');
    }
    this.storage = storage;
    this.startCleanupInterval();
  }

  /**
   * Démarre l'intervalle de nettoyage des verrous expirés
   */
  private startCleanupInterval(): void {
    // Nettoyer toutes les 30 secondes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredLocks();
    }, 30000);
  }

  /**
   * Nettoie les verrous expirés
   */
  private cleanupExpiredLocks(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [filePath, lock] of Array.from(this.locks.entries())) {
      if (now > lock.expiresAt.getTime()) {
        this.locks.delete(filePath);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Verrous expirés nettoyés', {
        metadata: {
          service: 'AgentFileLockManager',
          operation: 'cleanupExpiredLocks',
          cleanedCount: cleaned,
          remainingLocks: this.locks.size
        }
      });
    }
  }

  /**
   * Acquiert un verrou sur un fichier
   * @param filePath Chemin du fichier
   * @param chatId ID du chat Cursor
   * @param operation Type d'opération
   * @param ttlMs Durée de vie du verrou en millisecondes
   * @returns true si verrou acquis, false si conflit
   */
  async acquireLock(
    filePath: string,
    chatId: string,
    operation: 'read' | 'write' | 'delete' | 'move',
    ttlMs?: number,
    metadata?: { task?: string; description?: string; userId?: string }
  ): Promise<{ success: boolean; conflict?: LockConflict; lock?: FileLock }> {
    return withErrorHandling(
      async () => {
        const normalizedPath = this.normalizePath(filePath);
        const existingLock = this.locks.get(normalizedPath);

        // Vérifier si un verrou existe déjà
        if (existingLock) {
          // Vérifier si le verrou est expiré
          if (Date.now() > existingLock.expiresAt.getTime()) {
            // Verrou expiré, le supprimer et continuer
            this.locks.delete(normalizedPath);
          } else {
            // Verrou actif, vérifier les conflits
            const conflict = this.detectConflict(existingLock, operation, chatId);
            if (conflict) {
              logger.warn('Conflit de verrou détecté', {
                metadata: {
                  service: 'AgentFileLockManager',
                  operation: 'acquireLock',
                  filePath: normalizedPath,
                  conflictType: conflict.conflictType,
                  severity: conflict.severity,
                  existingChatId: existingLock.chatId,
                  requestedChatId: chatId
                }
              });
              return { success: false, conflict };
            }
          }
        }

        // Acquérir le verrou
        const ttl = Math.min(ttlMs || this.DEFAULT_LOCK_TTL_MS, this.MAX_LOCK_TTL_MS);
        const lock: FileLock = {
          filePath: normalizedPath,
          chatId,
          userId: metadata?.userId,
          lockedAt: new Date(),
          expiresAt: new Date(Date.now() + ttl),
          operation,
          metadata: {
            task: metadata?.task,
            description: metadata?.description
          }
        };

        this.locks.set(normalizedPath, lock);

        logger.info('Verrou acquis', {
          metadata: {
            service: 'AgentFileLockManager',
            operation: 'acquireLock',
            filePath: normalizedPath,
            chatId,
            lockOperation: operation,
            ttlMs: ttl,
            expiresAt: lock.expiresAt.toISOString()
          }
        });

        return { success: true, lock };
      },
      {
        operation: 'acquireLock',
        service: 'AgentFileLockManager',
        metadata: { filePath, chatId, operation }
      }
    );
  }

  /**
   * Libère un verrou sur un fichier
   */
  async releaseLock(filePath: string, chatId: string): Promise<boolean> {
    return withErrorHandling(
      async () => {
        const normalizedPath = this.normalizePath(filePath);
        const lock = this.locks.get(normalizedPath);

        if (!lock) {
          return false; // Pas de verrou
        }

        // Vérifier que le verrou appartient à ce chat
        if (lock.chatId !== chatId) {
          logger.warn('Tentative de libération verrou par mauvais chat', {
            metadata: {
              service: 'AgentFileLockManager',
              operation: 'releaseLock',
              filePath: normalizedPath,
              lockChatId: lock.chatId,
              requestedChatId: chatId
            }
          });
          return false;
        }

        this.locks.delete(normalizedPath);

        logger.info('Verrou libéré', {
          metadata: {
            service: 'AgentFileLockManager',
            operation: 'releaseLock',
            filePath: normalizedPath,
            chatId
          }
        });

        return true;
      },
      {
        operation: 'releaseLock',
        service: 'AgentFileLockManager',
        metadata: { filePath, chatId }
      }
    );
  }

  /**
   * Libère tous les verrous d'un chat
   */
  async releaseAllLocks(chatId: string): Promise<number> {
    return withErrorHandling(
      async () => {
        let released = 0;

        for (const [filePath, lock] of Array.from(this.locks.entries())) {
          if (lock.chatId === chatId) {
            this.locks.delete(filePath);
            released++;
          }
        }

        if (released > 0) {
          logger.info('Tous les verrous du chat libérés', {
            metadata: {
              service: 'AgentFileLockManager',
              operation: 'releaseAllLocks',
              chatId,
              releasedCount: released
            }
          });
        }

        return released;
      },
      {
        operation: 'releaseAllLocks',
        service: 'AgentFileLockManager',
        metadata: { chatId }
      }
    );
  }

  /**
   * Vérifie si un fichier est verrouillé
   */
  isLocked(filePath: string): boolean {
    const normalizedPath = this.normalizePath(filePath);
    const lock = this.locks.get(normalizedPath);

    if (!lock) {
      return false;
    }

    // Vérifier si expiré
    if (Date.now() > lock.expiresAt.getTime()) {
      this.locks.delete(normalizedPath);
      return false;
    }

    return true;
  }

  /**
   * Récupère le verrou actuel d'un fichier
   */
  getLock(filePath: string): FileLock | null {
    const normalizedPath = this.normalizePath(filePath);
    const lock = this.locks.get(normalizedPath);

    if (!lock) {
      return null;
    }

    // Vérifier si expiré
    if (Date.now() > lock.expiresAt.getTime()) {
      this.locks.delete(normalizedPath);
      return null;
    }

    return lock;
  }

  /**
   * Récupère tous les verrous actifs
   */
  getAllLocks(): FileLock[] {
    const now = Date.now();
    const activeLocks: FileLock[] = [];

    for (const lock of Array.from(this.locks.values())) {
      if (now <= lock.expiresAt.getTime()) {
        activeLocks.push(lock);
      } else {
        // Nettoyer les verrous expirés
        this.locks.delete(lock.filePath);
      }
    }

    return activeLocks;
  }

  /**
   * Récupère tous les verrous d'un chat
   */
  getLocksByChat(chatId: string): FileLock[] {
    return this.getAllLocks().filter(lock => lock.chatId === chatId);
  }

  /**
   * Détecte un conflit entre un verrou existant et une opération demandée
   */
  private detectConflict(
    existingLock: FileLock,
    requestedOperation: 'read' | 'write' | 'delete' | 'move',
    requestedChatId: string
  ): LockConflict | null {
    // Pas de conflit si c'est le même chat
    if (existingLock.chatId === requestedChatId) {
      return null;
    }

    // Pas de conflit si les deux sont des lectures
    if (existingLock.operation === 'read' && requestedOperation === 'read') {
      return null;
    }

    // Détecter le type de conflit
    let conflictType: LockConflict['conflictType'];
    let severity: LockConflict['severity'] = 'medium';
    let recommendation = '';

    if (existingLock.operation === 'write' && requestedOperation === 'write') {
      conflictType = 'write_write';
      severity = 'high';
      recommendation = `Le fichier est en cours de modification dans le chat ${existingLock.chatId}. Attendez la fin de la modification ou contactez l'utilisateur du chat actif.`;
    } else if (existingLock.operation === 'write' && requestedOperation === 'read') {
      conflictType = 'write_read';
      severity = 'low';
      recommendation = `Le fichier est en cours de modification. La lecture peut retourner des données obsolètes.`;
    } else if (existingLock.operation === 'delete' && requestedOperation === 'write') {
      conflictType = 'delete_write';
      severity = 'critical';
      recommendation = `Le fichier est en cours de suppression. Impossible de le modifier.`;
    } else if (existingLock.operation === 'move' && requestedOperation === 'write') {
      conflictType = 'move_write';
      severity = 'high';
      recommendation = `Le fichier est en cours de déplacement. Impossible de le modifier.`;
    } else {
      // Autres combinaisons
      conflictType = 'write_write';
      severity = 'medium';
      recommendation = `Conflit d'opération détecté. Attendez la fin de l'opération en cours.`;
    }

    return {
      filePath: existingLock.filePath,
      currentLock: existingLock,
      requestedOperation,
      conflictType,
      severity,
      recommendation
    };
  }

  /**
   * Normalise un chemin de fichier
   */
  private normalizePath(filePath: string): string {
    // Normaliser les chemins relatifs/absolus
    return filePath.replace(/\\/g, '/').replace(/\/+/g, '/').trim();
  }

  /**
   * Vérifie les conflits potentiels pour plusieurs fichiers
   */
  async checkConflicts(
    filePaths: string[],
    chatId: string,
    operation: 'read' | 'write' | 'delete' | 'move'
  ): Promise<{ conflicts: LockConflict[]; safe: string[] }> {
    return withErrorHandling(
      async () => {
        const conflicts: LockConflict[] = [];
        const safe: string[] = [];

        for (const filePath of filePaths) {
          const normalizedPath = this.normalizePath(filePath);
          const existingLock = this.locks.get(normalizedPath);

          if (existingLock && Date.now() <= existingLock.expiresAt.getTime()) {
            const conflict = this.detectConflict(existingLock, operation, chatId);
            if (conflict) {
              conflicts.push(conflict);
            } else {
              safe.push(filePath);
            }
          } else {
            safe.push(filePath);
          }
        }

        return { conflicts, safe };
      },
      {
        operation: 'checkConflicts',
        service: 'AgentFileLockManager',
        metadata: { filePaths, chatId, operation }
      }
    );
  }

  /**
   * Prolonge un verrou existant
   */
  async extendLock(filePath: string, chatId: string, additionalTtlMs: number): Promise<boolean> {
    return withErrorHandling(
      async () => {
        const normalizedPath = this.normalizePath(filePath);
        const lock = this.locks.get(normalizedPath);

        if (!lock || lock.chatId !== chatId) {
          return false;
        }

        const newExpiresAt = new Date(Math.min(
          lock.expiresAt.getTime() + additionalTtlMs,
          Date.now() + this.MAX_LOCK_TTL_MS
        ));

        lock.expiresAt = newExpiresAt;

        logger.debug('Verrou prolongé', {
          metadata: {
            service: 'AgentFileLockManager',
            operation: 'extendLock',
            filePath: normalizedPath,
            chatId,
            newExpiresAt: newExpiresAt.toISOString()
          }
        });

        return true;
      },
      {
        operation: 'extendLock',
        service: 'AgentFileLockManager',
        metadata: { filePath, chatId }
      }
    );
  }

  /**
   * Arrête le gestionnaire et nettoie les ressources
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.locks.clear();
  }
}

// ========================================
// SINGLETON PATTERN
// ========================================

let fileLockManagerInstance: AgentFileLockManager | null = null;

export function getAgentFileLockManager(storage: IStorage): AgentFileLockManager {
  if (!fileLockManagerInstance) {
    fileLockManagerInstance = new AgentFileLockManager(storage);
  }
  return fileLockManagerInstance;
}

