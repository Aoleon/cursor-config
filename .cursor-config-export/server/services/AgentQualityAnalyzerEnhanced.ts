import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentAutoReviewer } from './AgentAutoReviewer';
import { getAgentCodeSmellDetector } from './AgentCodeSmellDetector';
import { getAgentArchitectureAnalyzer } from './AgentArchitectureAnalyzer';
import { getAgentProactiveQualityChecker } from './AgentProactiveQualityChecker';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface EnhancedQualityAnalysis {
  overallScore: number; // 0-100
  passed: boolean;
  dimensions: {
    correctness: {
      score: number;
      issues: number;
      critical: number;
    };
    maintainability: {
      score: number;
      issues: number;
      complexity: number;
    };
    performance: {
      score: number;
      issues: number;
      bottlenecks: number;
    };
    security: {
      score: number;
      issues: number;
      vulnerabilities: number;
    };
    testability: {
      score: number;
      coverage: number;
      missingTests: number;
    };
  };
  issues: Array<{
    id: string;
    dimension: 'correctness' | 'maintainability' | 'performance' | 'security' | 'testability';
    severity: 'low' | 'medium' | 'high' | 'critical';
    file: string;
    line?: number;
    description: string;
    suggestion: string;
    autoFixable: boolean;
    estimatedFixTime: number; // minutes
  }>;
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    dimension: string;
    action: string;
    estimatedImpact: number; // 0-100
    estimatedEffort: number; // minutes
  }>;
  trends: {
    scoreEvolution: Array<{
      timestamp: number;
      score: number;
    }>;
    issuesEvolution: Array<{
      timestamp: number;
      count: number;
    }>;
  };
}

// ========================================
// AGENT QUALITY ANALYZER ENHANCED
// ========================================

/**
 * Service d'analyse qualité améliorée et approfondie
 * Analyse multi-dimensionnelle avec détection rapide
 * Optimisé pour correction automatique rapide
 */
export class AgentQualityAnalyzerEnhanced {
  private storage: IStorage;
  private autoReviewer: ReturnType<typeof getAgentAutoReviewer>;
  private codeSmellDetector: ReturnType<typeof getAgentCodeSmellDetector>;
  private architectureAnalyzer: ReturnType<typeof getAgentArchitectureAnalyzer>;
  private proactiveChecker: ReturnType<typeof getAgentProactiveQualityChecker>;
  private analysisHistory: Map<string, EnhancedQualityAnalysis> = new Map();

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentQualityAnalyzerEnhanced');
    }
    this.storage = storage;
    this.autoReviewer = getAgentAutoReviewer(storage);
    this.codeSmellDetector = getAgentCodeSmellDetector(storage);
    this.architectureAnalyzer = getAgentArchitectureAnalyzer(storage);
    this.proactiveChecker = getAgentProactiveQualityChecker(storage);
  }

  /**
   * Analyse qualité approfondie
   */
  async analyzeEnhanced(
    files: string[],
    options?: {
      includeTrends?: boolean;
      includeRecommendations?: boolean;
      fastMode?: boolean;
    }
  ): Promise<EnhancedQualityAnalysis> {
    return withErrorHandling(
      async () => {
        const includeTrends = options?.includeTrends ?? true;
        const includeRecommendations = options?.includeRecommendations ?? true;
        const fastMode = options?.fastMode ?? false;

        // 1. Review automatique
        const review = await this.autoReviewer.reviewCode(files);

        // 2. Analyse code smells
        const codeSmells = await this.codeSmellDetector.detectCodeSmells({ files });

        // 3. Analyse architecture
        const architecture = await this.architectureAnalyzer.analyzeArchitecture({ files });

        // 4. Vérification proactive
        const proactiveResults = await this.proactiveChecker.checkContinuous(files);

        // 5. Construire analyse multi-dimensionnelle
        const dimensions = this.buildDimensions(review, codeSmells, architecture, proactiveResults);

        // 6. Collecter toutes les issues
        const issues = this.collectIssues(review, codeSmells, architecture, proactiveResults);

        // 7. Calculer score global
        const overallScore = this.calculateOverallScore(dimensions);

        // 8. Générer recommandations
        const recommendations = includeRecommendations
          ? this.generateRecommendations(issues, dimensions)
          : [];

        // 9. Analyser tendances
        const trends = includeTrends
          ? this.analyzeTrends(files)
          : {
              scoreEvolution: [],
              issuesEvolution: []
            };

        const passed = overallScore >= 85 &&
                      dimensions.correctness.critical === 0 &&
                      dimensions.security.vulnerabilities === 0;

        const analysis: EnhancedQualityAnalysis = {
          overallScore,
          passed,
          dimensions,
          issues,
          recommendations,
          trends
        };

        // Stocker historique
        for (const file of files) {
          this.analysisHistory.set(file, analysis);
        }

        logger.info('Analyse qualité approfondie terminée', {
          metadata: {
            service: 'AgentQualityAnalyzerEnhanced',
            operation: 'analyzeEnhanced',
            filesCount: files.length,
            overallScore,
            passed,
            issuesCount: issues.length,
            fastMode
          }
        });

        return analysis;
      },
      {
        operation: 'analyzeEnhanced',
        service: 'AgentQualityAnalyzerEnhanced',
        metadata: {}
      }
    );
  }

  /**
   * Construit dimensions de qualité
   */
  private buildDimensions(
    review: Awaited<ReturnType<ReturnType<typeof getAgentAutoReviewer>['reviewCode']>>,
    codeSmells: Awaited<ReturnType<ReturnType<typeof getAgentCodeSmellDetector>['detectCodeSmells']>>,
    architecture: Awaited<ReturnType<ReturnType<typeof getAgentArchitectureAnalyzer>['analyzeArchitecture']>>,
    proactiveResults: Map<string, Awaited<ReturnType<ReturnType<typeof getAgentProactiveQualityChecker>['checkProactive']>>>
  ): EnhancedQualityAnalysis['dimensions'] {
    // Correctness
    const correctnessIssues = review.issues.filter(i => i.type === 'error');
    const correctnessCritical = correctnessIssues.filter(i => i.severity === 'critical').length;
    const correctnessScore = Math.max(0, 100 - (correctnessIssues.length * 10) - (correctnessCritical * 20));

    // Maintainability
    const maintainabilityIssues = codeSmells.smells.filter(s => 
      s.type === 'long_method' || s.type === 'large_class' || s.type === 'duplication'
    );
    const complexity = maintainabilityIssues.length;
    const maintainabilityScore = Math.max(0, 100 - (maintainabilityIssues.length * 5) - (complexity * 3));

    // Performance
    const performanceIssues = review.issues.filter(i => i.type === 'performance');
    const bottlenecks = performanceIssues.filter(i => i.severity === 'high' || i.severity === 'critical').length;
    const performanceScore = Math.max(0, 100 - (performanceIssues.length * 8) - (bottlenecks * 15));

    // Security
    const securityIssues = review.issues.filter(i => i.type === 'security');
    const vulnerabilities = securityIssues.filter(i => i.severity === 'critical').length;
    const securityScore = Math.max(0, 100 - (securityIssues.length * 15) - (vulnerabilities * 30));

    // Testability
    const testIssues = review.issues.filter(i => i.type === 'suggestion' && i.description.includes('test'));
    const missingTests = testIssues.length;
    const testabilityScore = Math.max(0, 100 - (missingTests * 10));

    return {
      correctness: {
        score: correctnessScore,
        issues: correctnessIssues.length,
        critical: correctnessCritical
      },
      maintainability: {
        score: maintainabilityScore,
        issues: maintainabilityIssues.length,
        complexity
      },
      performance: {
        score: performanceScore,
        issues: performanceIssues.length,
        bottlenecks
      },
      security: {
        score: securityScore,
        issues: securityIssues.length,
        vulnerabilities
      },
      testability: {
        score: testabilityScore,
        coverage: 85, // Placeholder, serait calculé réellement
        missingTests
      }
    };
  }

  /**
   * Collecte toutes les issues
   */
  private collectIssues(
    review: Awaited<ReturnType<ReturnType<typeof getAgentAutoReviewer>['reviewCode']>>,
    codeSmells: Awaited<ReturnType<ReturnType<typeof getAgentCodeSmellDetector>['detectCodeSmells']>>,
    architecture: Awaited<ReturnType<ReturnType<typeof getAgentArchitectureAnalyzer>['analyzeArchitecture']>>,
    proactiveResults: Map<string, Awaited<ReturnType<ReturnType<typeof getAgentProactiveQualityChecker>['checkProactive']>>>
  ): EnhancedQualityAnalysis['issues'] {
    const issues: EnhancedQualityAnalysis['issues'] = [];

    // Issues depuis review
    for (const issue of review.issues) {
      issues.push({
        id: `review-${issue.id}`,
        dimension: this.mapIssueTypeToDimension(issue.type),
        severity: issue.severity,
        file: issue.file,
        line: issue.line,
        description: issue.description,
        suggestion: issue.suggestion,
        autoFixable: issue.autoFixable,
        estimatedFixTime: this.estimateFixTime(issue.severity, issue.autoFixable)
      });
    }

    // Issues depuis code smells
    for (const smell of codeSmells.smells) {
      issues.push({
        id: `smell-${smell.id}`,
        dimension: 'maintainability',
        severity: smell.severity,
        file: smell.location.file,
        line: smell.location.line,
        description: smell.description,
        suggestion: smell.recommendation,
        autoFixable: smell.autoFixable,
        estimatedFixTime: this.estimateFixTime(smell.severity, smell.autoFixable)
      });
    }

    // Issues depuis architecture
    for (const issue of architecture.issues) {
      issues.push({
        id: `arch-${issue.id}`,
        dimension: 'maintainability',
        severity: issue.severity,
        file: issue.location.files?.[0] || 'unknown',
        description: issue.description,
        suggestion: issue.recommendations[0] || 'Corriger problème architectural',
        autoFixable: false,
        estimatedFixTime: this.estimateFixTime(issue.severity, false)
      });
    }

    return issues;
  }

  /**
   * Mappe type d'issue vers dimension
   */
  private mapIssueTypeToDimension(
    type: string
  ): 'correctness' | 'maintainability' | 'performance' | 'security' | 'testability' {
    switch (type) {
      case 'error':
        return 'correctness';
      case 'performance':
        return 'performance';
      case 'security':
        return 'security';
      case 'suggestion':
        return 'testability';
      default:
        return 'maintainability';
    }
  }

  /**
   * Estime temps de correction
   */
  private estimateFixTime(
    severity: 'low' | 'medium' | 'high' | 'critical',
    autoFixable: boolean
  ): number {
    if (autoFixable) return 1; // 1 minute pour auto-fix

    switch (severity) {
      case 'critical':
        return 30;
      case 'high':
        return 15;
      case 'medium':
        return 5;
      case 'low':
        return 2;
    }
  }

  /**
   * Calcule score global
   */
  private calculateOverallScore(
    dimensions: EnhancedQualityAnalysis['dimensions']
  ): number {
    // Score pondéré par dimension
    return Math.round(
      dimensions.correctness.score * 0.3 +
      dimensions.maintainability.score * 0.25 +
      dimensions.performance.score * 0.15 +
      dimensions.security.score * 0.2 +
      dimensions.testability.score * 0.1
    );
  }

  /**
   * Génère recommandations
   */
  private generateRecommendations(
    issues: EnhancedQualityAnalysis['issues'],
    dimensions: EnhancedQualityAnalysis['dimensions']
  ): EnhancedQualityAnalysis['recommendations'] {
    const recommendations: EnhancedQualityAnalysis['recommendations'] = [];

    // Recommandations critiques
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push({
        priority: 'critical',
        dimension: 'all',
        action: `Corriger ${criticalIssues.length} issue(s) critique(s)`,
        estimatedImpact: 95,
        estimatedEffort: criticalIssues.reduce((sum, i) => sum + i.estimatedFixTime, 0)
      });
    }

    // Recommandations par dimension
    if (dimensions.correctness.score < 80) {
      recommendations.push({
        priority: 'high',
        dimension: 'correctness',
        action: 'Corriger erreurs de code',
        estimatedImpact: 90,
        estimatedEffort: 20
      });
    }

    if (dimensions.security.score < 80) {
      recommendations.push({
        priority: 'critical',
        dimension: 'security',
        action: 'Corriger vulnérabilités de sécurité',
        estimatedImpact: 100,
        estimatedEffort: 30
      });
    }

    if (dimensions.performance.score < 80) {
      recommendations.push({
        priority: 'high',
        dimension: 'performance',
        action: 'Optimiser performances',
        estimatedImpact: 75,
        estimatedEffort: 25
      });
    }

    // Recommandations auto-fixables
    const autoFixable = issues.filter(i => i.autoFixable);
    if (autoFixable.length > 0) {
      recommendations.push({
        priority: 'medium',
        dimension: 'all',
        action: `Corriger automatiquement ${autoFixable.length} issue(s)`,
        estimatedImpact: 60,
        estimatedEffort: autoFixable.length
      });
    }

    return recommendations;
  }

  /**
   * Analyse tendances
   */
  private analyzeTrends(
    files: string[]
  ): EnhancedQualityAnalysis['trends'] {
    const scoreEvolution: Array<{ timestamp: number; score: number }> = [];
    const issuesEvolution: Array<{ timestamp: number; count: number }> = [];

    // Analyser historique pour chaque fichier
    for (const file of files) {
      const history = this.analysisHistory.get(file);
      if (history) {
        scoreEvolution.push({
          timestamp: Date.now(),
          score: history.overallScore
        });
        issuesEvolution.push({
          timestamp: Date.now(),
          count: history.issues.length
        });
      }
    }

    return {
      scoreEvolution,
      issuesEvolution
    };
  }

  /**
   * Analyse rapide (mode optimisé)
   */
  async analyzeFast(files: string[]): Promise<{
    score: number;
    criticalIssues: number;
    autoFixable: number;
    passed: boolean;
  }> {
    return withErrorHandling(
      async () => {
        // Analyse rapide avec seulement checks essentiels
        const review = await this.autoReviewer.reviewCode(files, {
          checkErrors: true,
          checkCodeSmells: false,
          checkArchitecture: false,
          checkSecurity: true,
          checkPerformance: false,
          checkTests: false,
          checkDocumentation: false,
          checkStandards: true
        });

        const criticalIssues = review.summary.critical;
        const autoFixable = review.summary.autoFixable;
        const passed = review.passed && criticalIssues === 0;

        return {
          score: review.score,
          criticalIssues,
          autoFixable,
          passed
        };
      },
      {
        operation: 'analyzeFast',
        service: 'AgentQualityAnalyzerEnhanced',
        metadata: {}
      }
    );
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentQualityAnalyzerEnhancedInstance: AgentQualityAnalyzerEnhanced | null = null;

export function getAgentQualityAnalyzerEnhanced(storage: IStorage): AgentQualityAnalyzerEnhanced {
  if (!agentQualityAnalyzerEnhancedInstance) {
    agentQualityAnalyzerEnhancedInstance = new AgentQualityAnalyzerEnhanced(storage);
  }
  return agentQualityAnalyzerEnhancedInstance;
}

