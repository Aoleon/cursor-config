import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import type { IStorage } from '../storage-poc';
import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// ========================================
// DOCUMENTATEUR DE SCRIPTS
// ========================================
// Documente automatiquement les scripts utilisés
// Enregistre les résultats et problèmes rencontrés
// Enrichit les scripts en fonction des expériences
// ========================================

export interface ScriptDocumentation {
  scriptPath: string;
  scriptName: string;
  description: string;
  purpose: string;
  usage: string;
  parameters?: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
    default?: unknown;
  }>;
  examples: string[];
  executionHistory: Array<{
    timestamp: number;
    success: boolean;
    duration: number;
    output?: string;
    errors?: string[];
    context?: Record<string, unknown>;
  }>;
  problemsEncountered: Array<{
    timestamp: number;
    problem: string;
    solution?: string;
    fixed: boolean;
  }>;
  improvements: Array<{
    timestamp: number;
    improvement: string;
    implemented: boolean;
  }>;
  successRate: number;
  averageExecutionTime: number;
  lastUsed: number;
  usageCount: number;
  tags: string[];
  relatedScripts: string[];
}

export interface ScriptEnrichment {
  scriptPath: string;
  improvements: string[];
  newParameters?: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  newExamples?: string[];
  fixes?: Array<{
    problem: string;
    solution: string;
  }>;
}

/**
 * Service de documentation et d'enrichissement des scripts
 * Documente automatiquement les scripts utilisés
 * Enregistre les résultats et problèmes
 * Enrichit les scripts en fonction des expériences
 */
export class AgentScriptDocumenter {
  private storage: IStorage;
  private documentation: Map<string, ScriptDocumentation> = new Map();
  private readonly DOCS_DIR = 'docs/scripts';
  private readonly DOCS_FILE = join(this.DOCS_DIR, 'scripts-documentation.json');

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentScriptDocumenter');
    }
    this.storage = storage;
    this.loadDocumentation();
  }

  /**
   * Documente un script après utilisation
   */
  async documentScriptUsage(
    scriptPath: string,
    result: {
      success: boolean;
      output: string;
      errors: string[];
      executionTime: number;
      context?: Record<string, unknown>;
    }
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        const scriptName = this.extractScriptName(scriptPath);
        let doc = this.documentation.get(scriptPath);

        if (!doc) {
          // Créer nouvelle documentation
          doc = await this.createDocumentation(scriptPath);
        }

        // Enregistrer exécution
        doc.executionHistory.push({
          timestamp: Date.now(),
          success: result.success,
          duration: result.executionTime,
          output: result.output.substring(0, 1000), // Limiter taille
          errors: result.errors,
          context: result.context
        });

        // Mettre à jour statistiques
        doc.usageCount++;
        doc.lastUsed = Date.now();
        doc.successRate = this.calculateSuccessRate(doc.executionHistory);
        doc.averageExecutionTime = this.calculateAverageTime(doc.executionHistory);

        // Enregistrer problèmes si erreurs
        if (!result.success && result.errors.length > 0) {
          doc.problemsEncountered.push({
            timestamp: Date.now(),
            problem: result.errors.join('; '),
            fixed: false
          });
        }

        this.documentation.set(scriptPath, doc);
        await this.saveDocumentation();

        logger.info('Script documenté', {
          metadata: {
            service: 'AgentScriptDocumenter',
            operation: 'documentScriptUsage',
            scriptPath,
            success: result.success,
            usageCount: doc.usageCount
          }
        });
      },
      {
        operation: 'documentScriptUsage',
        service: 'AgentScriptDocumenter',
        metadata: { scriptPath }
      }
    );
  }

  /**
   * Enrichit un script en fonction des problèmes rencontrés
   */
  async enrichScript(
    scriptPath: string,
    enrichment: ScriptEnrichment
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        const doc = this.documentation.get(scriptPath);
        if (!doc) {
          throw new Error(`Documentation non trouvée pour ${scriptPath}`);
        }

        // Ajouter améliorations
        for (const improvement of enrichment.improvements) {
          doc.improvements.push({
            timestamp: Date.now(),
            improvement,
            implemented: false
          });
        }

        // Ajouter nouveaux paramètres
        if (enrichment.newParameters) {
          doc.parameters = doc.parameters || [];
          doc.parameters.push(...enrichment.newParameters.map(p => ({
            ...p,
            required: false,
            default: undefined
          })));
        }

        // Ajouter nouveaux exemples
        if (enrichment.newExamples) {
          doc.examples.push(...enrichment.newExamples);
        }

        // Enregistrer fixes
        if (enrichment.fixes) {
          for (const fix of enrichment.fixes) {
            // Marquer problème comme résolu
            const problem = doc.problemsEncountered.find(
              p => p.problem.includes(fix.problem) && !p.fixed
            );
            if (problem) {
              problem.fixed = true;
              problem.solution = fix.solution;
            }
          }
        }

        this.documentation.set(scriptPath, doc);
        await this.saveDocumentation();

        logger.info('Script enrichi', {
          metadata: {
            service: 'AgentScriptDocumenter',
            operation: 'enrichScript',
            scriptPath,
            improvementsCount: enrichment.improvements.length,
            fixesCount: enrichment.fixes?.length || 0
          }
        });
      },
      {
        operation: 'enrichScript',
        service: 'AgentScriptDocumenter',
        metadata: { scriptPath }
      }
    );
  }

  /**
   * Récupère la documentation d'un script
   */
  getScriptDocumentation(scriptPath: string): ScriptDocumentation | null {
    return this.documentation.get(scriptPath) || null;
  }

  /**
   * Liste tous les scripts documentés
   */
  listDocumentedScripts(): Array<{
    scriptPath: string;
    scriptName: string;
    usageCount: number;
    successRate: number;
    lastUsed: number;
  }> {
    return Array.from(this.documentation.values()).map(doc => ({
      scriptPath: doc.scriptPath,
      scriptName: doc.scriptName,
      usageCount: doc.usageCount,
      successRate: doc.successRate,
      lastUsed: doc.lastUsed
    }));
  }

  /**
   * Trouve des scripts similaires à une tâche
   */
  findSimilarScripts(task: string): Array<{
    scriptPath: string;
    scriptName: string;
    relevance: number;
    reason: string;
  }> {
    const taskLower = task.toLowerCase();
    const keywords = taskLower.split(/\s+/).filter(w => w.length > 3);

    const matches: Array<{
      scriptPath: string;
      scriptName: string;
      relevance: number;
      reason: string;
    }> = [];

    for (const doc of Array.from(this.documentation.values())) {
      let relevance = 0;
      const reasons: string[] = [];

      // Vérifier nom du script
      if (keywords.some(kw => doc.scriptName.toLowerCase().includes(kw))) {
        relevance += 3;
        reasons.push('Nom similaire');
      }

      // Vérifier description
      if (keywords.some(kw => doc.description.toLowerCase().includes(kw))) {
        relevance += 2;
        reasons.push('Description similaire');
      }

      // Vérifier tags
      if (doc.tags.some((tag: string) => keywords.some(kw => tag.toLowerCase().includes(kw)))) {
        relevance += 2;
        reasons.push('Tags similaires');
      }

      // Bonus si script souvent utilisé avec succès
      if (doc.successRate > 0.8 && doc.usageCount > 3) {
        relevance += 1;
        reasons.push('Script fiable');
      }

      if (relevance > 0) {
        matches.push({
          scriptPath: doc.scriptPath,
          scriptName: doc.scriptName,
          relevance,
          reason: reasons.join(', ')
        });
      }
    }

    return matches.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Génère un rapport de documentation
   */
  generateDocumentationReport(): {
    totalScripts: number;
    totalExecutions: number;
    averageSuccessRate: number;
    scriptsByUsage: Array<{
      scriptName: string;
      usageCount: number;
      successRate: number;
    }>;
    problemsByScript: Array<{
      scriptName: string;
      problemsCount: number;
      fixedCount: number;
    }>;
  } {
    const docs = Array.from(this.documentation.values());

    const totalExecutions = docs.reduce((sum, doc) => sum + doc.usageCount, 0);
    const averageSuccessRate =
      docs.length > 0
        ? docs.reduce((sum, doc) => sum + doc.successRate, 0) / docs.length
        : 0;

    const scriptsByUsage = docs
      .map(doc => ({
        scriptName: doc.scriptName,
        usageCount: doc.usageCount,
        successRate: doc.successRate
      }))
      .sort((a, b) => b.usageCount - a.usageCount);

    const problemsByScript = docs
      .map(doc => ({
        scriptName: doc.scriptName,
        problemsCount: doc.problemsEncountered.length,
        fixedCount: doc.problemsEncountered.filter(p => p.fixed).length
      }))
      .filter(s => s.problemsCount > 0)
      .sort((a, b) => b.problemsCount - a.problemsCount);

    return {
      totalScripts: docs.length,
      totalExecutions,
      averageSuccessRate,
      scriptsByUsage,
      problemsByScript
    };
  }

  /**
   * Crée une documentation initiale pour un script
   */
  private async createDocumentation(scriptPath: string): Promise<ScriptDocumentation> {
    const scriptName = this.extractScriptName(scriptPath);
    let description = '';
    let purpose = '';
    let usage = '';

    try {
      // Lire le script pour extraire documentation
      const scriptContent = await readFile(scriptPath, 'utf-8');

      // Extraire description depuis commentaires
      const descriptionMatch = scriptContent.match(/\/\*\*[\s\S]*?\*\//);
      if (descriptionMatch) {
        const comments = descriptionMatch[0];
        description = comments
          .replace(/\/\*\*|\*\//g, '')
          .replace(/\*/g, '')
          .trim();
        purpose = description.split('\n')[0] || '';
      }

      // Extraire usage depuis commentaires
      const usageMatch = scriptContent.match(/Usage:\s*(.+)/i);
      if (usageMatch) {
        usage = usageMatch[1].trim();
      }

      // Extraire tags depuis nom et description
      const tags = this.extractTags(scriptName, description);
    } catch (error) {
      logger.debug('Erreur lecture script pour documentation', {
        metadata: {
          service: 'AgentScriptDocumenter',
          operation: 'createDocumentation',
          scriptPath,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }

    return {
      scriptPath,
      scriptName,
      description: description || `Script: ${scriptName}`,
      purpose: purpose || 'Automatisation de tâche',
      usage: usage || `tsx ${scriptPath}`,
      examples: [],
      executionHistory: [],
      problemsEncountered: [],
      improvements: [],
      successRate: 0,
      averageExecutionTime: 0,
      lastUsed: 0,
      usageCount: 0,
      tags: this.extractTags(scriptName, description),
      relatedScripts: []
    };
  }

  /**
   * Extrait le nom du script depuis le chemin
   */
  private extractScriptName(scriptPath: string): string {
    const parts = scriptPath.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.replace(/\.ts$/, '');
  }

  /**
   * Extrait des tags depuis nom et description
   */
  private extractTags(scriptName: string, description: string): string[] {
    const tags: string[] = [];
    const text = `${scriptName} ${description}`.toLowerCase();

    // Tags communs
    if (text.includes('fix') || text.includes('corriger')) tags.push('fix');
    if (text.includes('migrate') || text.includes('migrer')) tags.push('migration');
    if (text.includes('optimize') || text.includes('optimiser')) tags.push('optimization');
    if (text.includes('refactor')) tags.push('refactoring');
    if (text.includes('test')) tags.push('testing');
    if (text.includes('debt') || text.includes('dette')) tags.push('tech-debt');
    if (text.includes('consolidate') || text.includes('consolider')) tags.push('consolidation');
    if (text.includes('auto')) tags.push('automation');

    return tags;
  }

  /**
   * Calcule le taux de succès
   */
  private calculateSuccessRate(history: ScriptDocumentation['executionHistory']): number {
    if (history.length === 0) return 0;
    const successes = history.filter(h => h.success).length;
    return successes / history.length;
  }

  /**
   * Calcule le temps moyen d'exécution
   */
  private calculateAverageTime(history: ScriptDocumentation['executionHistory']): number {
    if (history.length === 0) return 0;
    const total = history.reduce((sum, h) => sum + h.duration, 0);
    return total / history.length;
  }

  /**
   * Charge la documentation depuis le fichier
   */
  private async loadDocumentation(): Promise<void> {
    try {
      if (existsSync(this.DOCS_FILE)) {
        const content = await readFile(this.DOCS_FILE, 'utf-8');
        const data = JSON.parse(content);
        this.documentation = new Map(Object.entries(data));
      }
    } catch (error) {
      logger.debug('Erreur chargement documentation scripts', {
        metadata: {
          service: 'AgentScriptDocumenter',
          operation: 'loadDocumentation',
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Sauvegarde la documentation dans le fichier
   */
  private async saveDocumentation(): Promise<void> {
    try {
      // Créer répertoire si nécessaire
      const { mkdir } = await import('fs/promises');
      await mkdir(this.DOCS_DIR, { recursive: true });

      // Sauvegarder
      const data = Object.fromEntries(this.documentation);
      await writeFile(this.DOCS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      logger.error('Erreur sauvegarde documentation scripts', {
        metadata: {
          service: 'AgentScriptDocumenter',
          operation: 'saveDocumentation',
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }
}

// ========================================
// SINGLETON
// ========================================

let agentScriptDocumenterInstance: AgentScriptDocumenter | null = null;

export function getAgentScriptDocumenter(storage: IStorage): AgentScriptDocumenter {
  if (!agentScriptDocumenterInstance) {
    agentScriptDocumenterInstance = new AgentScriptDocumenter(storage);
  }
  return agentScriptDocumenterInstance;
}

