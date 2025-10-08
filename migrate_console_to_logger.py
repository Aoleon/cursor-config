#!/usr/bin/env python3
"""
Script de migration automatique des console.* vers logger structuré
Migre ContextCacheService, emailService, PredictiveEngineService, SQLEngineService
"""

import re

def migrate_context_cache():
    """Migre ContextCacheService.ts"""
    with open('server/services/ContextCacheService.ts', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Vérifie que logger est déjà importé (il l'est)
    if 'import { logger }' not in content:
        print("ERREUR: Logger non importé dans ContextCacheService!")
        return
    
    # console.log migrations vers logger.info
    replacements = [
        (r"console\.log\(`\[ContextCache\] Invalidation persistante par tags: \$\{tags\.join\(', '\)\}`\);",
         """logger.info('Invalidation persistante par tags', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'invalidateFromPersistentCacheByTags',
        tags: tags.join(', ')
      }
    });"""),
        
        (r"console\.log\(`\[ContextCache\] Prewarming \$\{entityType\} avec filtres:`, filters\);",
         """logger.info('Prewarming avec filtres', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'prewarmEntityType',
        entityType,
        filters: JSON.stringify(filters)
      }
    });"""),
        
        (r"console\.log\(`\[ContextCache\] Prewarming \$\{entityType\} terminé: \$\{limit\} contextes générés`\);",
         """logger.info('Prewarming terminé', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'prewarmEntityType',
        entityType,
        contextsGenerated: limit
      }
    });"""),
        
        (r"console\.log\(`\[ContextCache\] Préchargement pattern: \$\{pattern\}`\);",
         """logger.info('Préchargement pattern', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'preloadContextForPattern',
        pattern
      }
    });"""),
        
        (r"console\.log\(`\[ContextCache\] Invalidation cascade pour \$\{entityType\} liée à \$\{entityId\}`\);",
         """logger.info('Invalidation cascade', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'invalidateRelatedEntities',
        entityType,
        relatedEntityId: entityId
      }
    });"""),
        
        (r"console\.log\('\[ContextCache\] Prewarming déjà en cours d\\'exécution'\);",
         """logger.info('Prewarming déjà en cours', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'startIntelligentPrewarming'
      }
    });"""),
        
        (r"console\.log\('\[ContextCache\] 🔥 Système de prewarming intelligent démarré avec succès'\);",
         """logger.info('Système de prewarming intelligent démarré', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'startIntelligentPrewarming'
      }
    });"""),
        
        (r"console\.log\('\[ContextCache\] Système de prewarming arrêté'\);",
         """logger.info('Système de prewarming arrêté', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'stopIntelligentPrewarming'
      }
    });"""),
        
        (r"console\.log\('\[ContextCache\] Prewarming reporté - hors période optimale'\);",
         """logger.info('Prewarming reporté - hors période optimale', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'executeIntelligentPrewarming'
      }
    });"""),
        
        (r"console\.log\(`\[ContextCache\] 🚀 Début prewarming intelligent \(période de pointe: \$\{isPeakHours\}\)`\);",
         """logger.info('Début prewarming intelligent', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'executeIntelligentPrewarming',
        isPeakHours
      }
    });"""),
        
        (r"console\.log\(`\[ContextCache\] ✅ Prewarming terminé en \$\{Date\.now\(\) - startTime\}ms - \$\{prewarmingResults\.contextsPrewarmed\} contextes`\);",
         """logger.info('Prewarming terminé', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'executeIntelligentPrewarming',
        durationMs: Date.now() - startTime,
        contextsPrewarmed: prewarmingResults.contextsPrewarmed
      }
    });"""),
        
        # console.error migrations
        (r"console\.error\(`\[ContextCache\] ❌ Erreur prewarming intelligent:`, error\);",
         """logger.error('Erreur prewarming intelligent', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'executeIntelligentPrewarming',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });"""),
        
        (r"console\.error\(`\[ContextCache\] Erreur prewarming \$\{entityType\}:`, error\);",
         """logger.error('Erreur prewarming', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'executePrewarmingStrategy',
        entityType,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });"""),
        
        (r"console\.log\('\[ContextCache\] 🔄 Prewarming initial au démarrage\.\.\.'\);",
         """logger.info('Prewarming initial au démarrage', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'executeInitialPrewarming'
      }
    });"""),
        
        (r"console\.log\('\[ContextCache\] ✅ Prewarming initial terminé'\);",
         """logger.info('Prewarming initial terminé', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'executeInitialPrewarming'
      }
    });"""),
        
        (r"console\.log\(`\[ContextCache\] 📊 Monitoring: Hit rate prewarming: \$\{\(prewarmingHitRate \* 100\)\.toFixed\(1\)\}%, Utilisation: \$\{\(cacheUtilization \* 100\)\.toFixed\(1\)\}%`\);",
         """logger.info('Monitoring prewarming', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'monitorPrewarmingEffectiveness',
        prewarmingHitRate: (prewarmingHitRate * 100).toFixed(1) + '%',
        cacheUtilization: (cacheUtilization * 100).toFixed(1) + '%'
      }
    });"""),
        
        # console.warn migrations
        (r"console\.warn\('\[ContextCache\] ⚠️ Efficacité prewarming faible - révision de stratégie recommandée'\);",
         """logger.warn('Efficacité prewarming faible - révision recommandée', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'monitorPrewarmingEffectiveness'
      }
    });"""),
        
        (r"console\.log\('\[ContextCache\] Intégration PredictiveEngine activée pour preloading intelligent'\);",
         """logger.info('Intégration PredictiveEngine activée', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'integratePredictiveEngine'
      }
    });"""),
        
        (r"console\.log\('\[ContextCache\] Preloading prédictif désactivé'\);",
         """logger.info('Preloading prédictif désactivé', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'preloadContextByPrediction'
      }
    });"""),
        
        (r"console\.log\(`\[ContextCache\] Preloading prédictif: \$\{entityType\}:\$\{entityId\} \(priorité: \$\{priority\}\)`\);",
         """logger.info('Preloading prédictif démarré', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'preloadContextByPrediction',
        entityType,
        entityId,
        priority
      }
    });"""),
        
        (r"console\.log\(`\[ContextCache\] Contexte déjà en cache: \$\{entityType\}:\$\{entityId\}`\);",
         """logger.info('Contexte déjà en cache', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'preloadContextByPrediction',
        entityType,
        entityId
      }
    });"""),
        
        (r"console\.log\(`\[ContextCache\] Preloading prédictif complété: \$\{entityType\}:\$\{entityId\} en \$\{duration\}ms`\);",
         """logger.info('Preloading prédictif complété', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'preloadContextByPrediction',
        entityType,
        entityId,
        durationMs: duration
      }
    });"""),
        
        (r"console\.error\(`\[ContextCache\] Erreur preloading prédictif \$\{entityType\}:\$\{entityId\}:`, error\);",
         """logger.error('Erreur preloading prédictif', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'preloadContextByPrediction',
        entityType,
        entityId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });"""),
        
        (r"console\.log\('\[ContextCache\] PredictiveEngine non intégré'\);",
         """logger.info('PredictiveEngine non intégré', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'integrateHeatMapData'
      }
    });"""),
        
        (r"console\.log\('\[ContextCache\] Intégration heat-map pour optimisation cache\.\.\.'\);",
         """logger.info('Intégration heat-map pour optimisation cache', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'integrateHeatMapData'
      }
    });"""),
        
        (r"console\.log\('\[ContextCache\] Intégration heat-map terminée'\);",
         """logger.info('Intégration heat-map terminée', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'integrateHeatMapData'
      }
    });"""),
        
        (r"console\.error\('\[ContextCache\] Erreur intégration heat-map:', error\);",
         """logger.error('Erreur intégration heat-map', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'integrateHeatMapData',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });"""),
        
        (r"console\.log\('\[ContextCache\] Optimisation LRU avec scoring prédictif\.\.\.'\);",
         """logger.info('Optimisation LRU avec scoring prédictif', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'optimizeLRUWithPredictiveScoring'
      }
    });"""),
        
        (r"console\.log\(`\[ContextCache\] Éviction prédictive: \$\{item\.key\.substring\(0, 40\)\}\.\.\. \(score: \$\{item\.predictiveScore\}\)`\);",
         """logger.info('Éviction prédictive', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'optimizeLRUWithPredictiveScoring',
        cacheKey: item.key.substring(0, 40) + '...',
        predictiveScore: item.predictiveScore
      }
    });"""),
        
        (r"console\.log\(`\[ContextCache\] Optimisation LRU terminée: \$\{evictedCount\} entrées évincées`\);",
         """logger.info('Optimisation LRU terminée', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'optimizeLRUWithPredictiveScoring',
        evictedCount
      }
    });"""),
        
        (r"console\.error\('\[ContextCache\] Erreur optimisation LRU prédictive:', error\);",
         """logger.error('Erreur optimisation LRU prédictive', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'optimizeLRUWithPredictiveScoring',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });"""),
        
        (r"console\.log\(`\[ContextCache\] Preloading \$\{hotEntities\.length\} entités chaudes\.\.\.`\);",
         """logger.info('Preloading entités chaudes', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'preloadHotEntities',
        hotEntitiesCount: hotEntities.length
      }
    });"""),
        
        (r"console\.warn\(`\[ContextCache\] Erreur preloading entité chaude \$\{entity\.entityType\}:\$\{entity\.entityId\}:`, error\);",
         """logger.warn('Erreur preloading entité chaude', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'preloadHotEntities',
        entityType: entity.entityType,
        entityId: entity.entityId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });"""),
        
        (r"console\.log\(`\[ContextCache\] Éviction entité froide: \$\{entityKey\}`\);",
         """logger.info('Éviction entité froide', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'evictColdEntities',
        entityKey
      }
    });"""),
        
        (r"console\.log\(`\[ContextCache\] \$\{evictedCount\} entités froides évincées`\);",
         """logger.info('Entités froides évincées', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'evictColdEntities',
        evictedCount
      }
    });"""),
        
        (r"console\.log\('\[ContextCache\] Mode preloading agressif - heures de pointe'\);",
         """logger.info('Mode preloading agressif - heures de pointe', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'calculatePreloadingBudget'
      }
    });"""),
        
        (r"console\.log\('\[ContextCache\] Mode preloading modéré - horaires business'\);",
         """logger.info('Mode preloading modéré - horaires business', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'calculatePreloadingBudget'
      }
    });"""),
        
        (r"console\.log\('\[ContextCache\] Mode preloading conservateur - hors horaires'\);",
         """logger.info('Mode preloading conservateur - hors horaires', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'calculatePreloadingBudget'
      }
    });"""),
        
        (r"console\.warn\('\[ContextCache\] Erreur récupération score prédictif:', error\);",
         """logger.warn('Erreur récupération score prédictif', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'getPredictiveScore',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });"""),
        
        (r"console\.log\(`\[ContextCache\] Contexte prédictif stocké: \$\{cacheKey\} \(TTL: \$\{ttlHours\}h, priorité: \$\{priority\}\)`\);",
         """logger.info('Contexte prédictif stocké', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'storePredictiveContext',
        cacheKey,
        ttlHours,
        priority
      }
    });"""),
        
        (r"console\.log\('\[ContextCache\] Cycles prédictifs automatiques démarrés'\);",
         """logger.info('Cycles prédictifs automatiques démarrés', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'startPredictiveCycles'
      }
    });"""),
        
        (r"console\.log\('\[ContextCache\] Cycle preloading prédictif\.\.\.'\);",
         """logger.info('Cycle preloading prédictif démarré', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'startPredictiveCycles'
      }
    });"""),
        
        (r"console\.log\(`\[ContextCache\] Cycle prédictif terminé: \$\{viablePredictions\.length\} contextes preloadés`\);",
         """logger.info('Cycle prédictif terminé', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'startPredictiveCycles',
        contextsPreloaded: viablePredictions.length
      }
    });"""),
        
        (r"console\.error\('\[ContextCache\] Erreur cycle preloading prédictif:', error\);",
         """logger.error('Erreur cycle preloading prédictif', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'startPredictiveCycles',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });"""),
        
        (r"console\.log\(`\[ContextCache\] Preloading prédictif \$\{enabled \? 'ACTIVÉ' : 'DÉSACTIVÉ'\}`\);",
         """logger.info('État preloading prédictif modifié', {
      metadata: {
        service: 'ContextCacheService',
        operation: 'togglePredictivePreloading',
        enabled
      }
    });"""),
    ]
    
    for old, new in replacements:
        content = re.sub(old, new, content)
    
    with open('server/services/ContextCacheService.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ ContextCacheService.ts migré")

if __name__ == "__main__":
    migrate_context_cache()
    print("Migration terminée!")
