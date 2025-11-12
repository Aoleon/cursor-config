import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface BusinessRequirement {
  id: string;
  type: 'functional' | 'non_functional' | 'constraint' | 'business_rule';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  source: 'user_request' | 'architecture' | 'ui' | 'business_logic';
}

export interface AlignmentCheck {
  requirement: BusinessRequirement;
  aligned: boolean;
  confidence: number; // 0-1
  evidence: string[];
  gaps: string[];
  recommendations: string[];
}

export interface BusinessAlignmentResult {
  overallAlignment: number; // 0-100
  checks: AlignmentCheck[];
  criticalGaps: string[];
  recommendations: string[];
}

// ========================================
// AGENT BUSINESS ALIGNMENT CHECKER
// ========================================

/**
 * Service de vérification d'alignement avec intentions business/architecture
 * Garantit que le code implémenté correspond aux intentions exprimées
 * Adapté pour flowdev où intentions sont exprimées en langage naturel
 */
export class AgentBusinessAlignmentChecker {
  private storage: IStorage;
  private requirements: Map<string, BusinessRequirement> = new Map();

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentBusinessAlignmentChecker');
    }
    this.storage = storage;
  }

  /**
   * Enregistre une intention/requirement business
   */
  registerRequirement(requirement: BusinessRequirement): void {
    this.requirements.set(requirement.id, requirement);
    
    logger.info('Requirement business enregistré', {
      metadata: {
        service: 'AgentBusinessAlignmentChecker',
        operation: 'registerRequirement',
        requirementId: requirement.id,
        type: requirement.type,
        priority: requirement.priority
      }
    });
  }

  /**
   * Vérifie alignement du code avec requirements business
   */
  async checkAlignment(
    files: string[],
    context?: {
      userRequest?: string;
      architectureIntent?: string;
      uiIntent?: string;
    }
  ): Promise<BusinessAlignmentResult> {
    return withErrorHandling(
      async () => {
        const checks: AlignmentCheck[] = [];

        // 1. Extraire requirements depuis contexte
        const extractedRequirements = this.extractRequirements(context);

        // 2. Vérifier alignement pour chaque requirement
        for (const requirement of extractedRequirements) {
          const check = await this.checkRequirementAlignment(requirement, files);
          checks.push(check);
        }

        // 3. Vérifier requirements enregistrés
        for (const requirement of Array.from(this.requirements.values())) {
          const check = await this.checkRequirementAlignment(requirement, files);
          checks.push(check);
        }

        // 4. Calculer alignement global
        const alignedChecks = checks.filter(c => c.aligned);
        const overallAlignment = checks.length > 0
          ? (alignedChecks.length / checks.length) * 100
          : 100;

        // 5. Identifier gaps critiques
        const criticalGaps = checks
          .filter(c => !c.aligned && c.requirement.priority === 'critical')
          .flatMap(c => c.gaps);

        // 6. Générer recommandations
        const recommendations = this.generateRecommendations(checks);

        logger.info('Vérification alignement business terminée', {
          metadata: {
            service: 'AgentBusinessAlignmentChecker',
            operation: 'checkAlignment',
            filesCount: files.length,
            requirementsCount: checks.length,
            alignedCount: alignedChecks.length,
            overallAlignment
          }
        });

        return {
          overallAlignment,
          checks,
          criticalGaps,
          recommendations
        };
      },
      {
        operation: 'checkAlignment',
        service: 'AgentBusinessAlignmentChecker',
        metadata: {}
      }
    );
  }

  /**
   * Extrait requirements depuis contexte
   */
  private extractRequirements(
    context?: {
      userRequest?: string;
      architectureIntent?: string;
      uiIntent?: string;
    }
  ): BusinessRequirement[] {
    const requirements: BusinessRequirement[] = [];

    if (context?.userRequest) {
      // Analyser requête utilisateur pour extraire requirements
      // Cette méthode serait enrichie avec NLP
      requirements.push({
        id: `req-user-${Date.now()}`,
        type: 'functional',
        description: context.userRequest,
        priority: 'high',
        source: 'user_request'
      });
    }

    if (context?.architectureIntent) {
      requirements.push({
        id: `req-arch-${Date.now()}`,
        type: 'non_functional',
        description: context.architectureIntent,
        priority: 'high',
        source: 'architecture'
      });
    }

    if (context?.uiIntent) {
      requirements.push({
        id: `req-ui-${Date.now()}`,
        type: 'functional',
        description: context.uiIntent,
        priority: 'medium',
        source: 'ui'
      });
    }

    return requirements;
  }

  /**
   * Vérifie alignement d'un requirement spécifique
   */
  private async checkRequirementAlignment(
    requirement: BusinessRequirement,
    files: string[]
  ): Promise<AlignmentCheck> {
    // Analyser fichiers pour vérifier si requirement est implémenté
    // Cette méthode serait enrichie avec analyse sémantique du code

    const evidence: string[] = [];
    const gaps: string[] = [];
    const aligned = false;
    const confidence = 0.5;

    // Logique de vérification serait implémentée ici
    // Pour l'instant, vérification basique

    // Exemple: Si requirement mentionne "authentification", vérifier présence code auth
    if (requirement.description.toLowerCase().includes('auth')) {
      // Chercher code d'authentification dans fichiers
      // evidence.push('Code authentification trouvé');
      // aligned = true;
      // confidence = 0.8;
    }

    const recommendations: string[] = [];
    if (!aligned) {
      recommendations.push(`Implémenter: ${requirement.description}`);
    }

    return {
      requirement,
      aligned,
      confidence,
      evidence,
      gaps,
      recommendations
    };
  }

  /**
   * Génère recommandations
   */
  private generateRecommendations(checks: AlignmentCheck[]): string[] {
    const recommendations: string[] = [];

    const unalignedCritical = checks.filter(
      c => !c.aligned && c.requirement.priority === 'critical'
    );

    for (const check of unalignedCritical) {
      recommendations.push(
        `CRITIQUE: ${check.requirement.description} - ${check.gaps.join(', ')}`
      );
    }

    const unalignedHigh = checks.filter(
      c => !c.aligned && c.requirement.priority === 'high'
    );

    for (const check of unalignedHigh) {
      recommendations.push(
        `IMPORTANT: ${check.requirement.description} - ${check.gaps.join(', ')}`
      );
    }

    return recommendations;
  }

  /**
   * Valide que l'implémentation correspond aux intentions
   */
  async validateImplementation(
    files: string[],
    userIntent: string
  ): Promise<{
    aligned: boolean;
    alignment: number;
    gaps: string[];
    recommendations: string[];
  }> {
    const alignment = await this.checkAlignment(files, {
      userRequest: userIntent
    });

    return {
      aligned: alignment.overallAlignment >= 80 && alignment.criticalGaps.length === 0,
      alignment: alignment.overallAlignment,
      gaps: alignment.criticalGaps,
      recommendations: alignment.recommendations
    };
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentBusinessAlignmentCheckerInstance: AgentBusinessAlignmentChecker | null = null;

export function getAgentBusinessAlignmentChecker(storage: IStorage): AgentBusinessAlignmentChecker {
  if (!agentBusinessAlignmentCheckerInstance) {
    agentBusinessAlignmentCheckerInstance = new AgentBusinessAlignmentChecker(storage);
  }
  return agentBusinessAlignmentCheckerInstance;
}

