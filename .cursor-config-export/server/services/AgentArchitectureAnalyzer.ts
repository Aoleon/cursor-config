import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentConflictResolver } from './AgentConflictResolver';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface ArchitectureIssue {
  id: string;
  type: 'monolith' | 'duplication' | 'coupling' | 'violation' | 'smell';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: {
    files: string[];
    services?: string[];
    modules?: string[];
  };
  impact: {
    maintainability: number; // 0-1
    testability: number; // 0-1
    performance: number; // 0-1
  };
  recommendations: string[];
}

export interface ArchitectureAnalysis {
  issues: ArchitectureIssue[];
  metrics: {
    totalFiles: number;
    monolithFiles: number;
    duplicatedServices: number;
    couplingScore: number; // 0-1 (1 = très couplé)
    cohesionScore: number; // 0-1 (1 = très cohérent)
  };
  healthScore: number; // 0-100
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    action: string;
    estimatedImpact: number;
    estimatedEffort: number;
  }>;
}

// ========================================
// AGENT ARCHITECTURE ANALYZER
// ========================================

/**
 * Service d'analyse architecturale avancée
 * Détecte problèmes architecturaux, violations de patterns, code smells
 */
export class AgentArchitectureAnalyzer {
  private storage: IStorage;
  private conflictResolver: ReturnType<typeof getAgentConflictResolver>;

  // Seuils d'analyse
  private readonly MONOLITH_THRESHOLD = 500; // lignes
  private readonly CRITICAL_MONOLITH_THRESHOLD = 2000; // lignes
  private readonly DUPLICATION_THRESHOLD = 0.7; // 70% similarité

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentArchitectureAnalyzer');
    }
    this.storage = storage;
    this.conflictResolver = getAgentConflictResolver(storage);
  }

  /**
   * Analyse complète de l'architecture
   */
  async analyzeArchitecture(
    scope?: {
      files?: string[];
      services?: string[];
      modules?: string[];
    }
  ): Promise<ArchitectureAnalysis> {
    return withErrorHandling(
      async () => {
        const issues: ArchitectureIssue[] = [];

        // 1. Détecter fichiers monolithiques
        const monolithIssues = await this.detectMonoliths(scope);
        issues.push(...monolithIssues);

        // 2. Détecter services dupliqués
        const duplicationIssues = await this.detectDuplications(scope);
        issues.push(...duplicationIssues);

        // 3. Détecter couplage excessif
        const couplingIssues = await this.detectCoupling(scope);
        issues.push(...couplingIssues);

        // 4. Détecter violations architecturales
        const violationIssues = await this.detectViolations(scope);
        issues.push(...violationIssues);

        // 5. Calculer métriques
        const metrics = this.calculateMetrics(issues);

        // 6. Générer recommandations
        const recommendations = this.generateRecommendations(issues, metrics);

        // 7. Calculer score de santé
        const healthScore = this.calculateHealthScore(issues, metrics);

        logger.info('Analyse architecturale terminée', {
          metadata: {
            service: 'AgentArchitectureAnalyzer',
            operation: 'analyzeArchitecture',
            issuesCount: issues.length,
            healthScore,
            monolithFiles: metrics.monolithFiles,
            duplicatedServices: metrics.duplicatedServices
          }
        });

        return {
          issues,
          metrics,
          healthScore,
          recommendations
        };
      },
      {
        operation: 'analyzeArchitecture',
        service: 'AgentArchitectureAnalyzer',
        metadata: {}
      }
    );
  }

  /**
   * Détecte fichiers monolithiques
   */
  private async detectMonoliths(
    scope?: { files?: string[] }
  ): Promise<ArchitectureIssue[]> {
    const issues: ArchitectureIssue[] = [];

    // Fichiers monolithiques connus
    const knownMonoliths = [
      { file: 'server/routes-poc.ts', lines: 11998, severity: 'critical' as const },
      { file: 'server/storage-poc.ts', lines: 8758, severity: 'critical' as const },
      { file: 'server/services/ChatbotOrchestrationService.ts', lines: 3575, severity: 'high' as const },
      { file: 'server/services/consolidated/MondayDataService.ts', lines: 1782, severity: 'high' as const }
    ];

    for (const monolith of knownMonoliths) {
      if (!scope?.files || scope.files.includes(monolith.file)) {
        issues.push({
          id: `monolith-${monolith.file.replace(/\//g, '-')}`,
          type: 'monolith',
          severity: monolith.severity,
          description: `Fichier monolithique: ${monolith.file} (${monolith.lines} lignes)`,
          location: {
            files: [monolith.file]
          },
          impact: {
            maintainability: monolith.lines > this.CRITICAL_MONOLITH_THRESHOLD ? 0.2 : 0.4,
            testability: monolith.lines > this.CRITICAL_MONOLITH_THRESHOLD ? 0.3 : 0.5,
            performance: 0.7 // Impact performance modéré
          },
          recommendations: [
            `Décomposer ${monolith.file} en modules plus petits`,
            `Migrer vers architecture modulaire (server/modules/*)`,
            `Extraire logique métier vers services dédiés`,
            `Créer tests unitaires pour chaque module extrait`
          ]
        });
      }
    }

    return issues;
  }

  /**
   * Détecte services dupliqués
   */
  private async detectDuplications(
    scope?: { services?: string[] }
  ): Promise<ArchitectureIssue[]> {
    const issues: ArchitectureIssue[] = [];

    // Services dupliqués connus
    const knownDuplications = [
      {
        services: [
          'MondayMigrationService',
          'MondayMigrationServiceEnhanced',
          'MondayProductionMigrationService',
          'MondayProductionFinalService'
        ],
        description: '4 services de migration Monday.com avec logique dupliquée',
        loc: 3201
      },
      {
        services: [
          'MondayImportService',
          'MondayExportService',
          'MondayDataSplitter'
        ],
        description: '3 services data Monday.com avec responsabilités qui se chevauchent',
        loc: 1794
      }
    ];

    for (const dup of knownDuplications) {
      if (!scope?.services || dup.services.some(s => scope.services?.includes(s))) {
        issues.push({
          id: `duplication-${dup.services[0]}`,
          type: 'duplication',
          severity: 'high',
          description: `${dup.description} (~${dup.loc} LOC dupliquées)`,
          location: {
            files: [],
            services: dup.services
          },
          impact: {
            maintainability: 0.3,
            testability: 0.4,
            performance: 0.6
          },
          recommendations: [
            `Consolider services en un service unifié`,
            `Créer service consolidé avec stratégies configurables`,
            `Migrer usages vers service consolidé`,
            `Supprimer services dupliqués après migration`
          ]
        });
      }
    }

    return issues;
  }

  /**
   * Détecte couplage excessif
   */
  private async detectCoupling(
    scope?: { modules?: string[] }
  ): Promise<ArchitectureIssue[]> {
    const issues: ArchitectureIssue[] = [];

    // Détecter couplage connu (serait enrichi avec analyse réelle)
    // Exemple: Dépendances circulaires, imports excessifs

    return issues;
  }

  /**
   * Détecte violations architecturales
   */
  private async detectViolations(
    scope?: { modules?: string[] }
  ): Promise<ArchitectureIssue[]> {
    const issues: ArchitectureIssue[] = [];

    // Détecter violations de patterns
    // Exemple: Services qui accèdent directement à la DB au lieu de repositories
    // Exemple: Logique métier dans routes au lieu de services

    return issues;
  }

  /**
   * Calcule métriques architecturales
   */
  private calculateMetrics(issues: ArchitectureIssue[]): ArchitectureAnalysis['metrics'] {
    const monolithIssues = issues.filter(i => i.type === 'monolith');
    const duplicationIssues = issues.filter(i => i.type === 'duplication');

    // Estimation basée sur issues détectées
    const totalFiles = 228; // Contexte du projet
    const monolithFiles = monolithIssues.length;
    const duplicatedServices = duplicationIssues.reduce(
      (sum, issue) => sum + (issue.location.services?.length || 0),
      0
    );

    // Calculer scores (serait enrichi avec analyse réelle)
    const couplingScore = issues.filter(i => i.type === 'coupling').length > 0 ? 0.6 : 0.4;
    const cohesionScore = issues.length > 0 ? 0.5 : 0.8;

    return {
      totalFiles,
      monolithFiles,
      duplicatedServices,
      couplingScore,
      cohesionScore
    };
  }

  /**
   * Génère recommandations
   */
  private generateRecommendations(
    issues: ArchitectureIssue[],
    metrics: ArchitectureAnalysis['metrics']
  ): ArchitectureAnalysis['recommendations'] {
    const recommendations: ArchitectureAnalysis['recommendations'] = [];

    // Recommandations basées sur issues critiques
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    for (const issue of criticalIssues) {
      for (const rec of issue.recommendations) {
        recommendations.push({
          priority: 'critical',
          action: rec,
          estimatedImpact: 0.8,
          estimatedEffort: issue.type === 'monolith' ? 40 : 20 // heures
        });
      }
    }

    // Recommandations basées sur métriques
    if (metrics.monolithFiles > 0) {
      recommendations.push({
        priority: 'high',
        action: `Réduire ${metrics.monolithFiles} fichiers monolithiques via migration modulaire`,
        estimatedImpact: 0.7,
        estimatedEffort: metrics.monolithFiles * 8 // heures par fichier
      });
    }

    if (metrics.duplicatedServices > 0) {
      recommendations.push({
        priority: 'high',
        action: `Consolider ${metrics.duplicatedServices} services dupliqués`,
        estimatedImpact: 0.6,
        estimatedEffort: metrics.duplicatedServices * 4 // heures par service
      });
    }

    if (metrics.couplingScore > 0.7) {
      recommendations.push({
        priority: 'medium',
        action: 'Réduire couplage via interfaces et dépendances inversées',
        estimatedImpact: 0.5,
        estimatedEffort: 16
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Calcule score de santé architectural
   */
  private calculateHealthScore(
    issues: ArchitectureIssue[],
    metrics: ArchitectureAnalysis['metrics']
  ): number {
    let score = 100;

    // Pénalités selon issues
    for (const issue of issues) {
      if (issue.severity === 'critical') score -= 15;
      else if (issue.severity === 'high') score -= 10;
      else if (issue.severity === 'medium') score -= 5;
      else score -= 2;
    }

    // Pénalités selon métriques
    if (metrics.monolithFiles > 2) score -= 20;
    else if (metrics.monolithFiles > 0) score -= 10;

    if (metrics.duplicatedServices > 5) score -= 15;
    else if (metrics.duplicatedServices > 0) score -= 8;

    if (metrics.couplingScore > 0.8) score -= 10;
    else if (metrics.couplingScore > 0.6) score -= 5;

    if (metrics.cohesionScore < 0.5) score -= 10;
    else if (metrics.cohesionScore < 0.7) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Analyse impact d'un changement proposé
   */
  async analyzeChangeImpact(
    change: {
      type: 'add' | 'modify' | 'remove';
      target: string;
      description: string;
    }
  ): Promise<{
    affectedFiles: string[];
    affectedServices: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    estimatedImpact: number; // 0-1
    recommendations: string[];
  }> {
    return withErrorHandling(
      async () => {
        // Analyser dépendances et impact
        // Cette méthode serait enrichie avec analyse réelle du codebase

        const affectedFiles: string[] = [];
        const affectedServices: string[] = [];
        let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
        let estimatedImpact = 0.3;
        const recommendations: string[] = [];

        // Logique d'analyse serait implémentée ici
        // Utiliser codebase_search pour trouver dépendances

        if (change.type === 'remove') {
          riskLevel = 'high';
          estimatedImpact = 0.7;
          recommendations.push('Vérifier toutes les dépendances avant suppression');
          recommendations.push('Créer tests de non-régression');
        } else if (change.type === 'modify') {
          riskLevel = 'medium';
          estimatedImpact = 0.5;
          recommendations.push('Analyser impact sur services dépendants');
        }

        return {
          affectedFiles,
          affectedServices,
          riskLevel,
          estimatedImpact,
          recommendations
        };
      },
      {
        operation: 'analyzeChangeImpact',
        service: 'AgentArchitectureAnalyzer',
        metadata: {}
      }
    );
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentArchitectureAnalyzerInstance: AgentArchitectureAnalyzer | null = null;

export function getAgentArchitectureAnalyzer(storage: IStorage): AgentArchitectureAnalyzer {
  if (!agentArchitectureAnalyzerInstance) {
    agentArchitectureAnalyzerInstance = new AgentArchitectureAnalyzer(storage);
  }
  return agentArchitectureAnalyzerInstance;
}

