import { storage } from "../storage-poc";
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
  static async seedDefaultRules(): Promise<void> {
    console.log('[DateIntelligenceSeeder] Initialisation des règles métier menuiserie...');
    
    // CORRECTION BLOCKER 4: Confirmer le nombre de règles pré-configurées attendues
    const expectedRulesCount = DEFAULT_MENUISERIE_RULES.length;
    console.log(`[DateIntelligenceSeeder] ASSERTION - Nombre de règles métier pré-configurées: ${expectedRulesCount} règles disponibles`);
    
    // Assertion de sécurité pour s'assurer qu'on a au moins 18+ règles comme requis
    if (expectedRulesCount < 18) {
      throw new Error(`ASSERTION FAILED: Seulement ${expectedRulesCount} règles pré-configurées, minimum 18 requis`);
    }
    
    try {
      // Vérifier s'il y a déjà des règles
      const existingRules = await storage.getAllRules();
      
      if (existingRules.length > 0) {
        console.log(`[DateIntelligenceSeeder] ${existingRules.length} règles déjà présentes, aucun seeding nécessaire`);
        // Log de confirmation même si pas de seeding
        console.log(`[DateIntelligenceSeeder] VALIDATION CONFIRMATION - Total règles en base: ${existingRules.length}/${expectedRulesCount} règles attendues`);
        return;
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
          
          console.log(`[DateIntelligenceSeeder] Règle initialisée: ${seededRule.name} (${seededRule.phase || 'toutes phases'})`);
        } catch (error) {
          errorCount++;
          console.error(`[DateIntelligenceSeeder] Erreur initialisation règle "${ruleConfig.name}":`, error);
        }
      }
      
      console.log(`[DateIntelligenceSeeder] Seeding terminé: ${seededCount} règles initialisées, ${errorCount} erreurs`);
      
      // CORRECTION BLOCKER 4: Confirmation finale explicite du nombre de règles seedées
      console.log(`[DateIntelligenceSeeder] ✅ CONFIRMATION FINALE - Règles métier seedées: ${seededCount}/${expectedRulesCount} (${((seededCount/expectedRulesCount)*100).toFixed(1)}% succès)`);
      
      // Assertion finale pour validation
      if (seededCount >= 18) {
        console.log(`[DateIntelligenceSeeder] ✅ VALIDATION RÉUSSIE - ${seededCount} règles seedées (minimum 18+ requis satisfait)`);
      } else {
        console.warn(`[DateIntelligenceSeeder] ⚠️ ATTENTION - Seulement ${seededCount} règles seedées (minimum 18 recommandé)`);
      }
      
      if (seededCount > 0) {
        console.log('[DateIntelligenceSeeder] 🎯 Règles métier menuiserie françaises prêtes pour utilisation');
      }
      
    } catch (error) {
      console.error('[DateIntelligenceSeeder] Erreur lors du seeding des règles:', error);
      throw new Error('Impossible d\'initialiser les règles métier menuiserie');
    }
  }
  
  /**
   * Réinitialise toutes les règles (suppression + recréation)
   * ATTENTION : Opération destructive, utiliser avec précaution
   */
  static async resetAllRules(): Promise<void> {
    console.log('[DateIntelligenceSeeder] RESET des règles métier (opération destructive)...');
    
    try {
      // Supprimer toutes les règles existantes
      const existingRules = await storage.getAllRules();
      let deletedCount = 0;
      
      for (const rule of existingRules) {
        try {
          await storage.deleteRule(rule.id);
          deletedCount++;
        } catch (error) {
          console.error(`[DateIntelligenceSeeder] Erreur suppression règle ${rule.id}:`, error);
        }
      }
      
      console.log(`[DateIntelligenceSeeder] ${deletedCount} règles supprimées`);
      
      // Réinitialiser avec les règles par défaut
      await this.seedDefaultRules();
      
    } catch (error) {
      console.error('[DateIntelligenceSeeder] Erreur lors du reset des règles:', error);
      throw new Error('Impossible de réinitialiser les règles métier');
    }
  }
  
  /**
   * Mise à jour incrémentale des règles (ajoute seulement les manquantes)
   */
  static async updateDefaultRules(): Promise<void> {
    console.log('[DateIntelligenceSeeder] Mise à jour incrémentale des règles...');
    
    try {
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
            
            console.log(`[DateIntelligenceSeeder] Nouvelle règle ajoutée: ${addedRule.name}`);
          } catch (error) {
            console.error(`[DateIntelligenceSeeder] Erreur ajout règle "${ruleConfig.name}":`, error);
          }
        }
      }
      
      console.log(`[DateIntelligenceSeeder] Mise à jour terminée: ${addedCount} nouvelles règles ajoutées`);
      
    } catch (error) {
      console.error('[DateIntelligenceSeeder] Erreur lors de la mise à jour des règles:', error);
      throw new Error('Impossible de mettre à jour les règles métier');
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
    try {
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
    } catch (error) {
      console.error('[DateIntelligenceSeeder] Erreur récupération statistiques:', error);
      throw new Error('Impossible de récupérer les statistiques des règles');
    }
  }
  
  /**
   * Valider la cohérence des règles (vérifications qualité)
   */
  static async validateRulesConsistency(): Promise<{
    isValid: boolean;
    issues: string[];
    warnings: string[];
  }> {
    console.log('[DateIntelligenceSeeder] Validation de la cohérence des règles...');
    
    try {
      const allRules = await storage.getAllRules();
      const issues: string[] = [];
      const warnings: string[] = [];
      
      // Vérification 1: Règles dupliquées par nom
      const ruleNames = allRules.map(r => r.name);
      const duplicateNames = ruleNames.filter((name, index) => ruleNames.indexOf(name) !== index);
      
      if (duplicateNames.length > 0) {
        issues.push(`Règles avec noms dupliqués: ${[...new Set(duplicateNames)].join(', ')}`);
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
      
      const missingPhases = requiredPhases.filter(phase => !coveredPhases.has(phase));
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
      
      console.log(`[DateIntelligenceSeeder] Validation terminée: ${isValid ? 'SUCCÈS' : 'ÉCHEC'}`);
      console.log(`[DateIntelligenceSeeder] Issues: ${issues.length}, Warnings: ${warnings.length}`);
      
      return { isValid, issues, warnings };
      
    } catch (error) {
      console.error('[DateIntelligenceSeeder] Erreur validation des règles:', error);
      throw new Error('Impossible de valider la cohérence des règles');
    }
  }
}

/**
 * Fonction d'initialisation automatique appelée au démarrage
 */
export async function initializeDefaultRules(): Promise<void> {
  try {
    console.log('[DateIntelligenceSeeder] Initialisation automatique des règles métier...');
    
    // Seeder les règles par défaut si nécessaire
    await DateIntelligenceRulesSeeder.seedDefaultRules();
    
    // Valider la cohérence
    const validation = await DateIntelligenceRulesSeeder.validateRulesConsistency();
    if (!validation.isValid) {
      console.warn('[DateIntelligenceSeeder] Issues détectées dans les règles:', validation.issues);
    }
    
    if (validation.warnings.length > 0) {
      console.warn('[DateIntelligenceSeeder] Warnings:', validation.warnings);
    }
    
    // Afficher les statistiques
    const stats = await DateIntelligenceRulesSeeder.getRulesStatistics();
    console.log('[DateIntelligenceSeeder] Statistiques des règles métier:');
    console.log(`  - Total: ${stats.totalRules} règles (${stats.activeRules} actives)`);
    console.log(`  - Système: ${stats.systemRules}, Personnalisées: ${stats.customRules}`);
    console.log(`  - Par phase: ${JSON.stringify(stats.rulesByPhase)}`);
    
    console.log('[DateIntelligenceSeeder] Système de règles métier prêt');
    
  } catch (error) {
    console.error('[DateIntelligenceSeeder] ERREUR CRITIQUE lors de l\'initialisation des règles:', error);
    // Ne pas faire échouer le démarrage de l'application
    // mais alerter sur le problème
    console.warn('[DateIntelligenceSeeder] L\'application continue sans les règles pré-configurées');
  }
}