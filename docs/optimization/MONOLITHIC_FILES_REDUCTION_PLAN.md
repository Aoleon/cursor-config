# Plan de Réduction des Fichiers Monolithiques

## Objectif
Réduire les fichiers monolithiques (>2000 lignes) pour améliorer la maintenabilité et la testabilité.

## Fichiers à Réduire

### Priorité 1 - Fichiers Critiques (>3000 lignes)
1. **server/storage-poc.ts** - 8654 lignes
   - Statut: En cours de réduction (déjà -457 lignes)
   - Actions: Continuer migration vers repositories modulaires

2. **server/services/ChatbotOrchestrationService.ts** - 4107 lignes
   - Actions: Extraire sous-services (MessageHandler, ResponseBuilder, etc.)

3. **server/ocrService.ts** - 3353 lignes
   - Actions: Extraire parsers par type de document

4. **server/services/BusinessContextService.ts** - 3271 lignes
   - Actions: Extraire context builders par domaine

5. **server/services/PredictiveEngineService.ts** - 3083 lignes
   - Actions: Extraire forecasters, risk analyzers, recommenders

### Priorité 2 - Fichiers Importants (2000-3000 lignes)
6. **server/storage/facade/StorageFacade.ts** - 2934 lignes
   - Statut: En cours de réduction (délégation vers repositories)
   - Actions: Continuer migration

7. **server/services/ContextBuilderService.ts** - 2706 lignes
   - Actions: Extraire builders par type de contexte

8. **server/services/AIService.ts** - 2614 lignes
   - Actions: Extraire providers (Claude, GPT, etc.)

9. **server/services/ContextCacheService.ts** - 2519 lignes
   - Actions: Extraire cache strategies

10. **server/eventBus.ts** - 2403 lignes
    - Actions: Extraire event handlers par domaine

11. **server/services/DateAlertDetectionService.ts** - 2248 lignes
    - Actions: Extraire detectors par type d'alerte

12. **server/services/SQLEngineService.ts** - 2024 lignes
    - Actions: Extraire query builders, validators

13. **server/modules/commercial/routes.ts** - 2013 lignes
    - Actions: Extraire route handlers par domaine

## Stratégie de Réduction

### Approche
1. Identifier les responsabilités distinctes dans chaque fichier
2. Extraire les sous-services/helpers dans des fichiers séparés
3. Utiliser composition au lieu de monolithisme
4. Maintenir la compatibilité via facades/interfaces

### Critères de Succès
- Réduction de ≥30% pour chaque fichier
- Pas de régression fonctionnelle
- Tests passent toujours
- Code plus maintenable et testable

## Prochaines Étapes
1. Analyser chaque fichier pour identifier extractions possibles
2. Extraire progressivement les sous-services
3. Mettre à jour les imports et tests
4. Valider que tout fonctionne


