import { logger } from './logger';
import { withErrorHandling } from './error-handler';
import { getAgentCheckpointManager } from './agent-checkpoint';
import type { ContextSnapshot } from './agent-checkpoint';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface FileContext {
  path: string;
  score: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  lastModified?: number;
  size?: number;
  dependencies?: string[];
}

export interface OptimizedContext {
  files: FileContext[];
  count: number;
  totalConsidered: number;
  evicted: number;
  optimized: boolean;
  metadata: {
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    optimizationTime: number;
  };
}

export interface ContextOptimizationOptions {
  maxFiles?: number;
  taskDescription?: string;
  modifiedFiles?: string[];
  relevantDirectories?: string[];
  preserveEssential?: boolean;
}

// ========================================
// CONTEXT OPTIMIZER
// ========================================

/**
 * Optimiseur de contexte pour l'agent Cursor
 * Calcule des scores de pertinence, priorise dynamiquement et évite les fichiers non pertinents
 */
export class ContextOptimizer {
  private readonly DEFAULT_MAX_FILES = 25;
  private readonly OPTIMIZATION_INTERVAL = 15 * 60 * 1000; // 15 minutes
  private lastOptimization: number = 0;

  /**
   * Calcule le score de pertinence d'un fichier
   */
  private calculateRelevanceScore(
    filePath: string,
    options: ContextOptimizationOptions
  ): { score: number; reason: string } {
    let score = 0;
    const reasons: string[] = [];

    // 1. Pertinence directe (fichier directement affecté) - 50%
    if (options.modifiedFiles?.includes(filePath)) {
      score += 0.5;
      reasons.push('fichier directement modifié');
    }

    // 2. Répertoire pertinent - 20%
    if (options.relevantDirectories) {
      const isInRelevantDir = options.relevantDirectories.some(dir => 
        filePath.startsWith(dir)
      );
      if (isInRelevantDir) {
        score += 0.2;
        reasons.push('répertoire pertinent');
      }
    }

    // 3. Fichier récemment modifié - 15%
    // (sera calculé si lastModified est fourni)

    // 4. Fichier de référence (exemples, patterns) - 10%
    if (filePath.includes('example') || 
        filePath.includes('pattern') || 
        filePath.includes('reference')) {
      score += 0.1;
      reasons.push('fichier de référence');
    }

    // 5. Documentation projet - 5%
    if (filePath.includes('.md') && 
        (filePath.includes('projectbrief') || 
         filePath.includes('activeContext') || 
         filePath.includes('systemPatterns'))) {
      score += 0.05;
      reasons.push('documentation projet');
    }

    // 6. Pénalité pour fichiers obsolètes ou non pertinents
    if (filePath.includes('node_modules') || 
        filePath.includes('.git') || 
        filePath.includes('dist') || 
        filePath.includes('build')) {
      score -= 0.3;
      reasons.push('fichier non pertinent (pénalité)');
    }

    // Normaliser score entre 0 et 1
    score = Math.max(0, Math.min(1, score));

    return {
      score,
      reason: reasons.length > 0 ? reasons.join(', ') : 'score par défaut'
    };
  }

  /**
   * Identifie les fichiers essentiels (ne jamais évincer)
   */
  private identifyEssentialFiles(
    files: FileContext[],
    options: ContextOptimizationOptions
  ): FileContext[] {
    const essential: FileContext[] = [];

    // Fichiers directement modifiés
    if (options.modifiedFiles) {
      for (const file of files) {
        if (options.modifiedFiles.includes(file.path)) {
          essential.push(file);
        }
      }
    }

    // Documentation projet essentielle
    const essentialDocs = files.filter(f => 
      f.path.includes('projectbrief.md') || 
      f.path.includes('activeContext.md') || 
      f.path.includes('systemPatterns.md')
    );
    essential.push(...essentialDocs);

    return essential;
  }

  /**
   * Priorise les fichiers par score de pertinence
   */
  private prioritizeFiles(
    files: FileContext[],
    options: ContextOptimizationOptions
  ): {
    high: FileContext[];
    medium: FileContext[];
    low: FileContext[];
  } {
    const scored = files.map(file => {
      const { score, reason } = this.calculateRelevanceScore(file.path, options);
      return {
        ...file,
        score,
        reason,
        priority: score > 0.7 ? 'high' as const : 
                  score > 0.4 ? 'medium' as const : 
                  'low' as const
      };
        }
    });

    // Trier par score décroissant
    scored.sort((a, b) => b.score - a.score);

    return {
      high: scored.filter(f => f.priority === 'high'),
      medium: scored.filter(f => f.priority === 'medium'),
      low: scored.filter(f => f.priority === 'low')
    };
  }

  /**
   * Optimise le contexte en sélectionnant les fichiers les plus pertinents
   */
  async optimizeContext(
    files: string[],
    options: ContextOptimizationOptions = {}
  ): Promise<OptimizedContext> {
    return withErrorHandling(
      async () => {
        const startTime = Date.now();
        const maxFiles = options.maxFiles || this.DEFAULT_MAX_FILES;

        // 1. Créer FileContext pour chaque fichier
        const fileContexts: FileContext[] = files.map(path => ({
          path,
          score: 0,
          priority: 'medium',
          reason: 'non évalué'
        }));

        // 2. Prioriser fichiers
        const prioritized = this.prioritizeFiles(fileContexts, options);

        // 3. Identifier fichiers essentiels
        const essentialFiles = this.identifyEssentialFiles(fileContexts, options);
        const essentialPaths = new Set(essentialFiles.map(f => f.path));

        // 4. Sélectionner fichiers à conserver
        const selected: FileContext[] = [];
        let evictedCount = 0;

        // Ajouter fichiers essentiels
        for (const essential of essentialFiles) {
          if (selected.length < maxFiles) {
            selected.push(essential);
          }
        }

        // Ajouter fichiers haute priorité
        for (const high of prioritized.high) {
          if (selected.length >= maxFiles) break;
          if (!essentialPaths.has(high.path)) {
            selected.push(high);
          }
        }

        // Ajouter fichiers priorité moyenne
        for (const medium of prioritized.medium) {
          if (selected.length >= maxFiles) break;
          if (!essentialPaths.has(medium.path)) {
            selected.push(medium);
          }
        }

        // Compter fichiers évincés
        evictedCount = files.length - selected.length;

        const optimizationTime = Date.now() - startTime;

        logger.info('Contexte optimisé', {
          metadata: {
            service: 'ContextOptimizer',
            operation: 'optimizeContext',
            originalCount: files.length,
            optimizedCount: selected.length,
            evictedCount,
            highPriority: prioritized.high.length,
            mediumPriority: prioritized.medium.length,
            lowPriority: prioritized.low.length,
            optimizationTime
          }
        });

        return {
          files: selected,
          count: selected.length,
          totalConsidered: files.length,
          evicted: evictedCount,
          optimized: evictedCount > 0,
          metadata: {
            highPriority: prioritized.high.length,
            mediumPriority: prioritized.medium.length,
            lowPriority: prioritized.low.length,
            optimizationTime
          }
        };
      },
      {
        operation: 'optimizeContext',
        service: 'ContextOptimizer',
        metadata: { filesCount: files.length }
      }
    );
  }

  /**
   * Optimise le contexte si nécessaire (basé sur intervalle ou taille)
   */
  async optimizeContextIfNeeded(
    files: string[],
    options: ContextOptimizationOptions = {}
  ): Promise<OptimizedContext> {
    const now = Date.now();
    const timeSinceLastOptimization = now - this.lastOptimization;
    const maxFiles = options.maxFiles || this.DEFAULT_MAX_FILES;

    // Optimiser si:
    // 1. Intervalle de temps dépassé (15 minutes)
    // 2. Nombre de fichiers dépasse la limite
    if (timeSinceLastOptimization > this.OPTIMIZATION_INTERVAL || 
        files.length > maxFiles) {
      const result = await this.optimizeContext(files, options);
      this.lastOptimization = now;
      return result;
    }

    // Pas d'optimisation nécessaire
    return {
      files: files.map(path => ({
        path,
        score: 0.5,
        priority: 'medium' as const,
        reason: 'non optimisé (pas nécessaire)'
      })),
      count: files.length,
      totalConsidered: files.length,
      evicted: 0,
      optimized: false,
      metadata: {
        highPriority: 0,
        mediumPriority: files.length,
        lowPriority: 0,
        optimizationTime: 0
      }
    };
  }

  /**
   * Réduit le contexte si saturation détectée
   */
  async reduceContextIfSaturated(
    files: string[],
    maxFiles: number = this.DEFAULT_MAX_FILES
  ): Promise<OptimizedContext> {
    if (files.length <= maxFiles) {
      return {
        files: files.map(path => ({
          path,
          score: 0.5,
          priority: 'medium' as const,
          reason: 'pas de saturation'
        })),
        count: files.length,
        totalConsidered: files.length,
        evicted: 0,
        optimized: false,
        metadata: {
          highPriority: 0,
          mediumPriority: files.length,
          lowPriority: 0,
          optimizationTime: 0
        }
      };
    }

    // Optimiser pour réduire
                }
    return this.optimizeContext(files, { maxFiles });
  }

  /**
   * Sauvegarde le contexte non essentiel dans un checkpoint
   */
  async saveContextToCheckpoint(
    nonEssentialFiles: string[],
    checkpointId: string
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        const checkpointManager = getAgentCheckpointManager();
        const checkpoint = await checkpointManager.loadCheckpoint(checkpointId);
        
        if (checkpoint) {
          // Ajouter fichiers non essentiels au contexte du checkpoint
          const updatedContext: ContextSnapshot = {
            ...checkpoint.context,
            relevantFiles: [
              ...(checkpoint.context.relevantFiles || []),
              ...nonEssentialFiles
            ]
          };
          
          // Mettre à jour le checkpoint (nécessiterait une méthode update)
          logger.info('Contexte non essentiel sauvegardé dans checkpoint', {
            metadata: {
              service: 'ContextOptimizer',
              operation: 'saveContextToCheckpoint',
              checkpointId,
              filesCount: nonEssentialFiles.length
            }
          });
        }
      },
      {
        operation: 'saveContextToCheckpoint',
        service: 'ContextOptimizer',
        metadata: { checkpointId, filesCount: nonEssentialFiles.length }
      }
    );
  }

  /**
   * Restaure le contexte depuis un checkpoint
   */
  async restoreContextFromCheckpoint(
    checkpointId: string,
    currentFiles: string[]
  ): Promise<string[]> {
    return withErrorHandling(
      async () => {
        const checkpointManager = getAgentCheckpointManager();
        const checkpoint = await checkpointManager.loadCheckpoint(checkpointId);
        
        if (!checkpoint) {
          return currentFiles;
        }
        
        // Restaurer fichiers pertinents du checkpoint
        const restoredFiles = checkpoint.context.relevantFiles || [];
        
        // Combiner avec fichiers actuels (éviter doublons)
        const combined = new Set([...currentFiles, ...restoredFiles]);
        
        logger.info('Contexte restauré depuis checkpoint', {
          metadata: {
            service: 'ContextOptimizer',
            operation: 'restoreContextFromCheckpoint',
            checkpointId,
            restoredFilesCount: restoredFiles.length,
            totalFilesCount: combined.size
          }
        });
        
        return Array.from(combined);
      },
      {
        operation: 'restoreContextFromCheckpoint',
        service: 'ContextOptimizer',
        metadata: { checkpointId }
      }
    );
  }

  /**
   * Réinitialise le timer d'optimisation
   */
  resetOptimizationTimer(): void {
    this.lastOptimization = 0;
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let contextOptimizerInstance: ContextOptimizer | null = null;

export function getContextOptimizer(): ContextOptimizer {
  if (!contextOptimizerInstance) {
    contextOptimizerInstance = new ContextOptimizer();
  }
  return contextOptimizerInstance;
}

