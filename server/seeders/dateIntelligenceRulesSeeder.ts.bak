import { storage } from "../storage-poc";
import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import { logger } from './utils/logger';
import { DEFAULT_MENUISERIE_RULES } from "../services/MenuiserieBusinessRules";
import type { InsertDateIntelligenceRule } from "@shared/schema";

/**
 * Seeder pour initialiser les règles métier menuiserie françaises
 * Utilisé au démarrage de l'application pour garantir la présence des règles essentielles
 */

export class DateIntelligenceRulesSeeder {
  
  /**
   * Initialise toutes les règles métier pré-configurées
   */
  static async seedDefaultRules(): Promise<{seeded: boolean; count: number}> {
    logger.info('[DateIntelligenceSeeder] Initialisation des règles métier menuiserie...');
    
    // CORRECTION BLOCKER 4: Confirmer le nombre de règles pré-configurées attendues
    const expectedRulesCount = DEFAULT_MENUISERIE_RULES.length;
    logger.info(`[DateIntelligenceSeeder] ASSERTION - Nombre de règles métier pré-configurées: ${expectedRulesCount} règles disponibles`);
    
    // Assertion de sécurité pour s'assurer qu'on a au moins 18+ règles comme requis
    if (expectedRulesCount < 18) {
      throw new AppError(`ASSERTION FAILED: Seulement ${expectedRulesCount} règles pré-configurées, minimum 18 requis`, 500);
    }
    
    return withErrorHandling(
    async () => {

      // Vérifier s'il y a déjà des règles
      const existingRules = await storage.getAllRules();
      
      if (existingRules.length > 0) {
        logger.info(`[DateIntelligenceSeeder] ${existingRules.length} règles déjà présentes, aucun seeding nécessaire`);
        // Log de confirmation même si pas de seeding
        logger.info(`[DateIntelligenceSeeder] VALIDATION CONFIRMATION - Total règles en base: ${existingRules.length}/${expectedRulesCount} règles attendues`);
        return {seeded: false, count: existingRules.length};
      }
      
      let seededCount = 0;
      let errorCount = 0;
      
      // Initialiser chaque règle pré-configurée
      for (const ruleConfig of DEFAULT_MENUISERIE_RULES) {
        try {
          // Ajouter le créateur système
          const ruleData: InsertDateIntelligenceRule = {
            ...ruleConfig,
            createdBy: 'system'
          };
          
          const seededRule = await storage.createRule(ruleData);
          seededCount++;
          
          logger.info(`[DateIntelligenceSeeder] Règle initialisée: ${seededRule.name} (${seededRule.phase || 'toutes phases'})`);
        
    },
    {
      operation: 'seedDefaultRules',
service: 'dateIntelligenceRulesSeeder',;
      metadata: {
                                                                                }
                                                                              });
      }
      
      logger.info(`[DateIntelligenceSeeder] Seeding terminé: ${seededCount} règles initialisées, ${errorCount} erreurs`);
      
      // CORRECTION BLOCKER 4: Confirmation finale explicite du nombre de règles seedées
      logger.info(`[DateIntelligenceSeeder] ✅ CONFIRMATION FINALE - Règles métier seedées: ${seededCount}/${expectedRulesCount} (${((seededCount/expectedRulesCount)*100).toFixed(1)}% succès)`);
      
      // Assertion finale pour validation
      if (seededCount >= 18) {
        logger.info(`[DateIntelligenceSeeder] ✅ VALIDATION RÉUSSIE - ${seededCount} règles seedées (minimum 18+ requis satisfait)`);
      } else {
        logger.warn($1)`);
      }
      
      if (seededCount > 0) {
        logger.info('[DateIntelligenceSeeder] 🎯 Règles métier menuiserie françaises prêtes pour utilisation');
      }
      
      return {seeded: true, count: seededCount};
      
    } catch (error) {
      logger.error('Erreur', '[DateIntelligenceSeeder] Erreur lors du seeding des règles:', error);
      throw new AppError('Impossible d\'initialiser les règles métier menuiserie', 500);
    }
  }
  
  /**
   * Réinitialise toutes les règles (suppression + recréation)
   * ATTENTION : Opération destructive, utiliser avec précaution
   */
  static async resetAllRules(): Promise<void> {
    logger.info('[DateIntelligenceSeeder] RESET des règles métier (opération destructive)...');
    
    return withErrorHandling(
    async () => {

      // Supprimer toutes les règles existantes
      const existingRules = await storage.getAllRules();
      let deletedCount = 0;
      
      for (const rule of existingRules) {
        try {
          await storage.deleteRule(rule.id);
          deletedCount++;
        
    },
    {
      operation: 'seedDefaultRules',
service: 'dateIntelligenceRulesSeeder',;
      metadata: {
      });
      }
      
      logger.info(`[DateIntelligenceSeeder] ${deletedCount} règles supprimées`);
      
      // Réinitialiser avec les règles par défaut
      await this.seedDefaultRules();
      
    } catch (error) {
      logger.error('Erreur', '[DateIntelligenceSeeder] Erreur lors du reset des règles:', error);
      throw new AppError('Impossible de réinitialiser les règles métier', 500);
    }
  }
  
  /**
   * Mise à jour incrémentale des règles (ajoute seulement les manquantes)
   */
  static async updateDefaultRules(): Promise<void> {
    logger.info('[DateIntelligenceSeeder] Mise à jour incrémentale des règles...');
    
    return withErrorHandling(
    async () => {

      const existingRules = await storage.getAllRules();
      const existingNames = new Set(existingRules.map(rule => rule.name));
      
      let addedCount = 0;
      
      // Ajouter seulement les règles manquantes
      for (const ruleConfig of DEFAULT_MENUISERIE_RULES) {
        if (!existingNames.has(ruleConfig.name)) {
          try {
            const ruleData: InsertDateIntelligenceRule = {
              ...ruleConfig,
              createdBy: 'system'
            };
            
            const addedRule = await storage.createRule(ruleData);
            addedCount++;
            
            logger.info(`[DateIntelligenceSeeder] Nouvelle règle ajoutée: ${addedRule.name}`);
          
    },
    {
      operation: 'seedDefaultRules',
service: 'dateIntelligenceRulesSeeder',;
      metadata: {
                                                                                }
                                                                              });
        }
      }
      
      logger.info(`[DateIntelligenceSeeder] Mise à jour terminée: ${addedCount} nouvelles règles ajoutées`);
      
    } catch (error) {
      logger.error('Erreur', '[DateIntelligenceSeeder] Erreur lors de la mise à jour des règles:', error);
      throw new AppError('Impossible de mettre à jour les règles métier', 500);
    }
  }
  
  /**
   * Obtenir les statistiques des règles métier
   */
  static async getRulesStatistics(): Promise<{
    totalRules: number;
    activeRules: number;
    rulesByPhase: Record<string, number>;
    rulesByProjectType: Record<string, number>;
    systemRules: number;
    customRules: number;
  }> {
    return withErrorHandling(
    async () => {

      const allRules = await storage.getAllRules();
      
      const stats = {
        totalRules: allRules.length,
        activeRules: allRules.filter(r => r.isActive).length,
        rulesByPhase: {} as Record<string, number>,
        rulesByProjectType: {} as Record<string, number>,
        systemRules: allRules.filter(r => r.createdBy === 'system').length,
        customRules: allRules.filter(r => r.createdBy !== 'system').length
      };
      
      // Compter par phase
      for (const rule of allRules) {
        const phase = rule.phase || 'all_phases';
        stats.rulesByPhase[phase] = (stats.rulesByPhase[phase] || 0) + 1;
      }
      
      // Compter par type de projet  
      for (const rule of allRules) {
        const projectType = rule.projectType || 'all_types';
        stats.rulesByProjectType[projectType] = (stats.rulesByProjectType[projectType] || 0) + 1;
      }
      
      return stats;
    
    },
    {
      operation: 'seedDefaultRules',
      service: 'dateIntelligenceRulesSeeder',
      metadata: {
                                                                                }
                                                                              });
  }
  
  /**
   * Valider la cohérence des règles (vérifications qualité)
   */
  static async validateRulesConsistency(): Promise<{
    isValid: boolean;
    issues: string[];
    warnings: string[];
  }> {
    logger.info('[DateIntelligenceSeeder] Validation de la cohérence des règles...');
    
    return withErrorHandling(
    async () => {

      const allRules = await storage.getAllRules();
      const issues: string[] = [];
      const warnings: string[] = [];
      
      // Vérification 1: Règles dupliquées par nom
      const ruleNames = allRules.map(r => r.name);
      const duplicateNames = ruleNames.filter((name, index) => ruleNames.indexOf(name) !== index);
      
      if (duplicateNames.length > 0) {
        issues.push(`Règles avec noms dupliqués: ${Array.from(new Set(duplicateNames)).join(', ')}`);
      }
      
      // Vérification 2: Règles avec durée base invalide
      const invalidDurationRules = allRules.filter(rule => 
        rule.baseDuration !== null && rule.baseDuration !== undefined && rule.baseDuration <= 0
      );
      
      if (invalidDurationRules.length > 0) {
        issues.push(`${invalidDurationRules.length} règles avec durée base invalide (≤ 0)`);
      }
      
      // Vérification 3: Règles avec priorité invalide
      const invalidPriorityRules = allRules.filter(rule => 
        rule.priority !== null && rule.priority !== undefined && 
        (rule.priority < 1 || rule.priority > 1000)
      );
      
      if (invalidPriorityRules.length > 0) {
        warnings.push(`${invalidPriorityRules.length} règles avec priorité hors de la plage 1-1000`);
      }
      
      // Vérification 4: Couverture des phases essentielles
      const requiredPhases = ['etude', 'planification', 'approvisionnement', 'chantier'];
      const coveredPhases = new Set(allRules.filter(r => r.phase).map(r => r.phase));
      
      const missingPhases = requiredPhases.filter(phase => !coveredPhases.has(phase as any));
      if (missingPhases.length > 0) {
        warnings.push(`Phases sans règles spécifiques: ${missingPhases.join(', ')}`);
      }
      
      // Vérification 5: Règles actives par phase
      const activeRulesByPhase: Record<string, number> = {};
      allRules.filter(r => r.isActive && r.phase).forEach(rule => {
        activeRulesByPhase[rule.phase!] = (activeRulesByPhase[rule.phase!] || 0) + 1;
      });
      
      const phasesWithoutActiveRules = requiredPhases.filter(phase => !activeRulesByPhase[phase]);
      if (phasesWithoutActiveRules.length > 0) {
        warnings.push(`Phases sans règles actives: ${phasesWithoutActiveRules.join(', ')}`);
      }
      
      const isValid = issues.length === 0;
      
      logger.info(`[DateIntelligenceSeeder] Validation terminée: ${isValid ? 'SUCCÈS' : 'ÉCHEC'}`);
      logger.info(`[DateIntelligenceSeeder] Issues: ${issues.length}, Warnings: ${warnings.length}`);
      
      return { isValid, issues, warnings };
      
    
    },
    {
      operation: 'seedDefaultRules',
      service: 'dateIntelligenceRulesSeeder',
      metadata: {
                                                                                }
                                                                              });
  }
}

/**
 * Fonction d'initialisation automatique appelée au démarrage
 */
export async function initializeDefaultRules(): Promise<void> {
  return withErrorHandling(
    async () => {

    logger.info('[DateIntelligenceSeeder] Initialisation automatique des règles métier...');
    
    // Seeder les règles par défaut si nécessaire
    const seedResult = await DateIntelligenceRulesSeeder.seedDefaultRules();
    
    // TOUJOURS valider la cohérence (même si pas de nouveau seeding)
    const validation = await DateIntelligenceRulesSeeder.validateRulesConsistency();
    if (!validation.isValid) {
      logger.warn($1);
      logger.info('[DateIntelligenceSeeder] 🔧 Auto-correction: Réinitialisation des règles invalides...');
      
      // AUTO-FIX: Reset et re-seed avec le code corrigé
      await DateIntelligenceRulesSeeder.resetAllRules();
      
      // Re-valider après auto-fix
      const revalidation = await DateIntelligenceRulesSeeder.validateRulesConsistency();
      if (revalidation.isValid) {
        logger.info('[DateIntelligenceSeeder] ✅ Auto-correction réussie - Validation: SUCCÈS');
      } else {
        logger.error('[DateIntelligenceSeeder] ❌ Auto-correction échouée - Issues persistent:', revalidation.issues);
      }
    } else {
      logger.info('[DateIntelligenceSeeder] ✅ Validation initiale: SUCCÈS - Aucune issue détectée');
    }
    
    if (validation.warnings.length > 0) {
      logger.warn($1);
    }
    
    // Afficher les statistiques
    const stats = await DateIntelligenceRulesSeeder.getRulesStatistics();
    logger.info('[DateIntelligenceSeeder] Statistiques des règles métier:');
    logger.info(`  - Total: ${stats.totalRules} règles (${stats.activeRules} actives)`);
    logger.info(`  - Système: ${stats.systemRules}, Personnalisées: ${stats.customRules}`);
    logger.info(`  - Par phase: ${JSON.stringify(stats.rulesByPhase)}`);
    
    logger.info('[DateIntelligenceSeeder] Système de règles métier prêt');
    
  
    },
    {
      operation: 'seedDefaultRules',
      service: 'dateIntelligenceRulesSeeder',
      metadata: {
                                                                                }
                                                                              });
}