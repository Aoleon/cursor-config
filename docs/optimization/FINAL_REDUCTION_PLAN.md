# Plan Final de Réduction de la Dette Technique

## État Actuel (après Phase 1 & 2.1)
- **Score dette technique**: 51.9% (objectif: <20%)
- **Types `any`**: 861 occurrences (objectif: <20)
- **TODO/FIXME**: 77 occurrences (objectif: <30)
- **Code deprecated/legacy**: 279 occurrences (objectif: <100)
- **Fichiers monolithiques**: 79 fichiers >500 lignes, 13 fichiers >2000 lignes

## Prochaines Étapes Prioritaires

### Phase 2.2: Réduction Fichiers Monolithiques (En cours)
**Objectif**: Réduire les 13 fichiers >2000 lignes de ≥30%

**Fichiers prioritaires**:
1. `server/storage-poc.ts` - 8654 lignes (déjà -457 lignes)
2. `server/services/ChatbotOrchestrationService.ts` - 4107 lignes
3. `server/ocrService.ts` - 3353 lignes
4. `server/services/BusinessContextService.ts` - 3271 lignes
5. `server/services/PredictiveEngineService.ts` - 3083 lignes
6. `server/storage/facade/StorageFacade.ts` - 2934 lignes
7. `server/services/ContextBuilderService.ts` - 2706 lignes
8. `server/services/AIService.ts` - 2614 lignes
9. `server/services/ContextCacheService.ts` - 2519 lignes
10. `server/eventBus.ts` - 2403 lignes
11. `server/services/DateAlertDetectionService.ts` - 2248 lignes
12. `server/services/SQLEngineService.ts` - 2024 lignes
13. `server/modules/commercial/routes.ts` - 2013 lignes

**Stratégie**:
- Extraire sous-services/helpers dans fichiers séparés
- Utiliser composition au lieu de monolithisme
- Maintenir compatibilité via facades/interfaces

### Phase 3.1: Réduction Types `any` (861 → <20)
**Objectif**: Réduire drastiquement les types `any` pour améliorer la type safety

**Stratégie**:
1. Identifier les patterns `any` les plus fréquents
2. Créer des types spécifiques pour remplacer `any`
3. Utiliser `unknown` au lieu de `any` quand nécessaire
4. Typer correctement les retours de fonctions

**Fichiers prioritaires**:
- `server/storage/` - Vérifier repositories
- `server/services/` - Typer correctement les services
- `server/modules/` - Typer correctement les routes

### Phase 3.2: Suppression Code Deprecated/Legacy (279 → <100)
**Objectif**: Supprimer ou refactorer le code obsolète

**Stratégie**:
1. Identifier le code deprecated/legacy
2. Vérifier si encore utilisé
3. Si utilisé: refactorer vers nouvelle implémentation
4. Si non utilisé: supprimer

### Phase 3.3: Résolution TODO/FIXME (77 → <30)
**Objectif**: Résoudre ou documenter les TODO/FIXME

**Stratégie**:
1. Identifier les TODO/FIXME critiques
2. Résoudre ceux qui sont simples
3. Documenter ceux qui nécessitent plus de travail
4. Créer des tickets pour les plus complexes

## Critères de Succès
- ✅ Score dette technique <20%
- ✅ Types `any` <20 occurrences
- ✅ TODO/FIXME <30 occurrences
- ✅ Code deprecated/legacy <100 occurrences
- ✅ Fichiers monolithiques réduits de ≥30%
- ✅ Pas de régression fonctionnelle
- ✅ Tests passent toujours

## Prochaines Actions Immédiates
1. Continuer réduction `storage-poc.ts` (objectif: <5000 lignes)
2. Extraire sous-services de `ChatbotOrchestrationService.ts`
3. Réduire types `any` dans `server/storage/` et `server/services/`
4. Supprimer code deprecated/legacy non utilisé
5. Résoudre TODO/FIXME simples


