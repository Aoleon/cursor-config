import { logger } from './logger';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { withErrorHandling } from './error-handler';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface Todo {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  dependencies?: string[];
}

export interface ContextSnapshot {
  currentTask?: string | null;
  completedTasks: string[];
  pendingTasks: string[];
  errors: string[];
  warnings: string[];
  modifiedFiles?: string[];
  relevantFiles?: string[];
}

export interface ProgressSnapshot {
  completionRate: number;
  completedTodos: number;
  totalTodos: number;
  currentPhase?: string;
  estimatedRemaining?: number;
}

export interface NextStep {
  id: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dependencies?: string[];
}

export interface Checkpoint {
  id: string;
  timestamp: number;
  toolCallCount: number;
  todos: Todo[];
  context: ContextSnapshot;
  progress: ProgressSnapshot;
  nextSteps: NextStep[];
  continuationInstructions: string;
  metadata?: {
    sessionId?: string;
    userId?: string;
    reason?: string;
    severity?: 'warning' | 'critical' | 'emergency';
  };
}

// ========================================
// CONSTANTS
// ========================================

const CHECKPOINTS_DIR = path.join(process.cwd(), '.cursor', 'checkpoints');
const MAX_CHECKPOINTS = 50; // Limiter nombre de checkpoints pour éviter accumulation

// ========================================
// CHECKPOINT MANAGER
// ========================================

/**
 * Gestionnaire de checkpoints pour l'agent Cursor
 * Permet de sauvegarder et restaurer l'état de l'exécution
 */
export class AgentCheckpointManager {
  /**
   * Initialise le dossier de checkpoints
   */
  private async ensureCheckpointsDir(): Promise<void> {
    try {
      await fs.mkdir(CHECKPOINTS_DIR, { recursive: true });
    } catch (error) {
      logger.error('Erreur lors de la création du dossier checkpoints', {
        metadata: {
          service: 'AgentCheckpointManager',
          operation: 'ensureCheckpointsDir',
          path: CHECKPOINTS_DIR,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Génère un ID unique pour un checkpoint
   */
  private generateCheckpointId(): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `checkpoint-${timestamp}-${random}`;
  }

  /**
   * Calcule le taux de completion basé sur les todos
   */
  private calculateCompletionRate(todos: Todo[]): number {
    if (todos.length === 0) return 1.0;
    const completed = todos.filter(t => t.status === 'completed').length;
    return completed / todos.length;
  }

  /**
   * Identifie les prochaines étapes basées sur les todos
   */
  private identifyNextSteps(todos: Todo[]): NextStep[] {
    const pendingTodos = todos.filter(t => 
      t.status === 'pending' || t.status === 'in_progress'
    );
    
    return pendingTodos.map(todo => ({
      id: todo.id,
      description: todo.content,
      priority: todo.status === 'in_progress' ? 'high' : 'medium',
      dependencies: todo.dependencies
    }));
  }

  /**
   * Génère les instructions de continuation
   */
  private generateContinuationInstructions(
    checkpoint: Checkpoint
  ): string {
    const completionPercent = (checkpoint.progress.completionRate * 100).toFixed(1);
    const remainingTodos = checkpoint.todos.filter(
      t => t.status === 'pending' || t.status === 'in_progress'
    );
    
    return `# CONTINUATION - Checkpoint ${checkpoint.id}

**Date:** ${new Date(checkpoint.timestamp).toISOString()}
**Tool Calls:** ${checkpoint.toolCallCount}/1000
**Completion:** ${completionPercent}%

## État Actuel

**Todos:** ${checkpoint.todos.length} total, ${checkpoint.progress.completedTodos} complétés, ${remainingTodos.length} restants

**Todos Restants:**
${remainingTodos.map(t => `- [${t.status}] ${t.content}`).join('\n')}

**Prochaine Étape:** ${checkpoint.nextSteps[0]?.description || 'Voir todos restants ci-dessus'}

## Instructions de Continuation

1. **Reprendre depuis checkpoint:** Utiliser \`@.cursor/checkpoints/${checkpoint.id}.json\`
2. **Continuer tâches:** Exécuter todos restants dans l'ordre de priorité
3. **Vérifier état:** Valider que tous les todos sont complétés
4. **Finaliser:** Compléter toutes les tâches restantes

**IMPORTANT:** 
- Ne pas recréer les todos déjà complétés
- Continuer uniquement les todos restants
- Respecter les dépendances entre todos
- Vérifier l'état avant de continuer

## Contexte

**Fichiers modifiés:** ${checkpoint.context.modifiedFiles?.length || 0}
**Fichiers pertinents:** ${checkpoint.context.relevantFiles?.length || 0}
**Erreurs:** ${checkpoint.context.errors.length}
**Avertissements:** ${checkpoint.context.warnings.length}

${checkpoint.metadata?.reason ? `**Raison:** ${checkpoint.metadata.reason}` : ''}
`;
  }

  /**
   * Crée un checkpoint automatique
   */
  async createCheckpoint(
    toolCallCount: number,
    todos: Todo[],
    context: ContextSnapshot,
    metadata?: Checkpoint['metadata']
  ): Promise<Checkpoint> {
    return withErrorHandling(
      async () => {
        await this.ensureCheckpointsDir();
        
        const checkpoint: Checkpoint = {
          id: this.generateCheckpointId(),
          timestamp: Date.now(),
          toolCallCount,
          todos,
          context,
          progress: {
            completionRate: this.calculateCompletionRate(todos),
            completedTodos: todos.filter(t => t.status === 'completed').length,
            totalTodos: todos.length,
            currentPhase: metadata?.reason || 'unknown'
          },
          nextSteps: this.identifyNextSteps(todos),
          continuationInstructions: '',
          metadata
        };
        
        // Générer instructions de continuation
        checkpoint.continuationInstructions = this.generateContinuationInstructions(checkpoint);
        
        // Sauvegarder checkpoint
        await this.saveCheckpoint(checkpoint);
        
        // Créer fichier de continuation markdown
        await this.createContinuationFile(checkpoint);
        
        // Nettoyer anciens checkpoints
        await this.cleanupOldCheckpoints();
        
        logger.info('Checkpoint créé', {
          metadata: {
            service: 'AgentCheckpointManager',
            operation: 'createCheckpoint',
            checkpointId: checkpoint.id,
            toolCallCount,
            completionRate: checkpoint.progress.completionRate,
            todosCount: todos.length
          }
        });
        
        return checkpoint;
      },
      {
        operation: 'createCheckpoint',
        service: 'AgentCheckpointManager',
        metadata: { toolCallCount }
      }
    );
  }

  /**
   * Crée un checkpoint d'urgence (à 950+ tool calls)
   */
  async createEmergencyCheckpoint(
    toolCallCount: number,
    todos: Todo[],
    context: ContextSnapshot
  ): Promise<Checkpoint> {
    return this.createCheckpoint(toolCallCount, todos, context, {
      severity: 'emergency',
      reason: 'Limite tool calls d\'urgence atteinte (>950)'
    });
  }

  /**
   * Sauvegarde un checkpoint en JSON
   */
  private async saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
    const filePath = path.join(CHECKPOINTS_DIR, `${checkpoint.id}.json`);
    await fs.writeFile(
      filePath,
      JSON.stringify(checkpoint, null, 2),
      'utf-8'
    );
  }

  /**
   * Crée un fichier de continuation markdown
   */
  private async createContinuationFile(checkpoint: Checkpoint): Promise<void> {
    const filePath = path.join(CHECKPOINTS_DIR, `${checkpoint.id}.md`);
    await fs.writeFile(
      filePath,
      checkpoint.continuationInstructions,
      'utf-8'
    );
  }

  /**
   * Charge un checkpoint depuis le fichier
   */
  async loadCheckpoint(checkpointId: string): Promise<Checkpoint | null> {
    return withErrorHandling(
      async () => {
        const filePath = path.join(CHECKPOINTS_DIR, `${checkpointId}.json`);
        
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const checkpoint = JSON.parse(content) as Checkpoint;
          
          logger.info('Checkpoint chargé', {
            metadata: {
              service: 'AgentCheckpointManager',
              operation: 'loadCheckpoint',
              checkpointId,
              toolCallCount: checkpoint.toolCallCount,
              completionRate: checkpoint.progress.completionRate
            }
          });
          
          return checkpoint;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            logger.warn('Checkpoint non trouvé', {
              metadata: {
                service: 'AgentCheckpointManager',
                operation: 'loadCheckpoint',
                checkpointId,
                error: 'File not found'
              }
            });
            return null;
          }
          throw error;
        }
      },
      {
        operation: 'loadCheckpoint',
        service: 'AgentCheckpointManager',
        metadata: { checkpointId }
      }
    );
  }

  /**
   * Trouve le dernier checkpoint créé
   */
  async findLatestCheckpoint(): Promise<Checkpoint | null> {
    return withErrorHandling(
      async () => {
        await this.ensureCheckpointsDir();
        
        try {
          const files = await fs.readdir(CHECKPOINTS_DIR);
          const checkpointFiles = files
            .filter(f => f.endsWith('.json'))
            .map(f => ({
              name: f,
              path: path.join(CHECKPOINTS_DIR, f)
            }));
          
          if (checkpointFiles.length === 0) {
            return null;
          }
          
          // Trier par timestamp (dans le nom du fichier)
          checkpointFiles.sort((a, b) => {
            const timestampA = parseInt(a.name.split('-')[1] || '0');
            const timestampB = parseInt(b.name.split('-')[1] || '0');
            return timestampB - timestampA; // Plus récent en premier
          });
          
          const latestFile = checkpointFiles[0];
          const checkpointId = latestFile.name.replace('.json', '');
          
          return await this.loadCheckpoint(checkpointId);
        } catch (error) {
          logger.warn('Erreur lors de la recherche du dernier checkpoint', {
            metadata: {
              service: 'AgentCheckpointManager',
              operation: 'findLatestCheckpoint',
              error: error instanceof Error ? error.message : String(error)
            }
          });
          return null;
        }
      },
      {
        operation: 'findLatestCheckpoint',
        service: 'AgentCheckpointManager',
        metadata: {}
      }
    );
  }

  /**
   * Nettoie les anciens checkpoints (garde les MAX_CHECKPOINTS plus récents)
   */
  private async cleanupOldCheckpoints(): Promise<void> {
    try {
      const files = await fs.readdir(CHECKPOINTS_DIR);
      const checkpointFiles = files
        .filter(f => f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: path.join(CHECKPOINTS_DIR, f)
        }));
      
      if (checkpointFiles.length <= MAX_CHECKPOINTS) {
        return;
      }
      
      // Trier par timestamp
      checkpointFiles.sort((a, b) => {
        const timestampA = parseInt(a.name.split('-')[1] || '0');
        const timestampB = parseInt(b.name.split('-')[1] || '0');
        return timestampB - timestampA;
      });
      
      // Supprimer les plus anciens
      const toDelete = checkpointFiles.slice(MAX_CHECKPOINTS);
      for (const file of toDelete) {
        try {
          await fs.unlink(file.path);
          // Supprimer aussi le fichier .md correspondant
          const mdPath = file.path.replace('.json', '.md');
          try {
            await fs.unlink(mdPath);
          } catch {
            // Ignorer si le fichier .md n'existe pas
          }
        } catch (error) {
          logger.warn('Erreur lors de la suppression d\'un ancien checkpoint', {
            metadata: {
              service: 'AgentCheckpointManager',
              operation: 'cleanupOldCheckpoints',
              file: file.name,
              error: error instanceof Error ? error.message : String(error)
            }
          });
        }
      }
      
      if (toDelete.length > 0) {
        logger.info('Anciens checkpoints nettoyés', {
          metadata: {
            service: 'AgentCheckpointManager',
            operation: 'cleanupOldCheckpoints',
            deletedCount: toDelete.length,
            remainingCount: MAX_CHECKPOINTS
          }
        });
      }
    } catch (error) {
      logger.warn('Erreur lors du nettoyage des checkpoints', {
        metadata: {
          service: 'AgentCheckpointManager',
          operation: 'cleanupOldCheckpoints',
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Supprime un checkpoint spécifique
   */
  async deleteCheckpoint(checkpointId: string): Promise<void> {
    return withErrorHandling(
      async () => {
        const jsonPath = path.join(CHECKPOINTS_DIR, `${checkpointId}.json`);
        const mdPath = path.join(CHECKPOINTS_DIR, `${checkpointId}.md`);
        
        try {
          await fs.unlink(jsonPath);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
        }
        
        try {
          await fs.unlink(mdPath);
        } catch (error) {
          // Ignorer si le fichier .md n'existe pas
        }
        
        logger.info('Checkpoint supprimé', {
          metadata: {
            service: 'AgentCheckpointManager',
            operation: 'deleteCheckpoint',
            checkpointId
          }
        });
      },
      {
        operation: 'deleteCheckpoint',
        service: 'AgentCheckpointManager',
        metadata: { checkpointId }
      }
    );
  }

  /**
   * Liste tous les checkpoints disponibles
   */
  async listCheckpoints(): Promise<Array<{ id: string; timestamp: number; completionRate: number }>> {
    return withErrorHandling(
      async () => {
        await this.ensureCheckpointsDir();
        
        try {
          const files = await fs.readdir(CHECKPOINTS_DIR);
          const checkpointFiles = files.filter(f => f.endsWith('.json'));
          
          const checkpoints: Array<{ id: string; timestamp: number; completionRate: number }> = [];
          
          for (const file of checkpointFiles) {
            const checkpointId = file.replace('.json', '');
            const checkpoint = await this.loadCheckpoint(checkpointId);
            if (checkpoint) {
              checkpoints.push({
                id: checkpoint.id,
                timestamp: checkpoint.timestamp,
                completionRate: checkpoint.progress.completionRate
              });
            }
          }
          
          // Trier par timestamp (plus récent en premier)
          checkpoints.sort((a, b) => b.timestamp - a.timestamp);
          
          return checkpoints;
        } catch (error) {
          logger.warn('Erreur lors de la liste des checkpoints', {
            metadata: {
              service: 'AgentCheckpointManager',
              operation: 'listCheckpoints',
              error: error instanceof Error ? error.message : String(error)
            }
          });
          return [];
        }
      },
      {
        operation: 'listCheckpoints',
        service: 'AgentCheckpointManager',
        metadata: {}
      }
    );
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentCheckpointManagerInstance: AgentCheckpointManager | null = null;

export function getAgentCheckpointManager(): AgentCheckpointManager {
  if (!agentCheckpointManagerInstance) {
    agentCheckpointManagerInstance = new AgentCheckpointManager();
  }
  return agentCheckpointManagerInstance;
}

