# Context Services - Architecture

## Structure Cible

Le service `ContextBuilderService` (952 lignes) est en cours de découpage en services ciblés pour améliorer la maintenabilité.

### Services Créés

1. **ContextLoaderService** (`ContextLoaderService.ts`)
   - Responsabilité: Chargement des données depuis la base de données
   - Méthodes: `loadAoData()`, `loadOfferData()`, `loadProjectData()`, `fetchAoLots()`
   - LOC: ~100

2. **ContextMetricsService** (`ContextMetricsService.ts`)
   - Responsabilité: Suivi des métriques de performance
   - Méthodes: `trackQuery()`, `resetMetrics()`, `getMetrics()`, `buildPerformance()`
   - LOC: ~80

### Services À Créer

3. **ContextEnricherService** (à créer)
   - Responsabilité: Construction des différents types de contextes
   - Méthodes à extraire de `ContextBuilderService`:
     - `buildBusinessContextFrom*()` (3 méthodes)
     - `buildTechnicalContextFrom*()` (2 méthodes)
     - `buildRelationalContextFrom*()` (3 méthodes)
     - `buildTemporalContextFrom*()` (3 méthodes)
     - `buildAdministrativeContextFrom*()` (3 méthodes)
   - LOC estimé: ~600-700

4. **ContextHelperService** (optionnel)
   - Responsabilité: Méthodes utilitaires partagées
   - Méthodes: `extractCompletedPhases()`, `buildMilestonesFromDates()`, `extractProductTypes()`, etc.
   - LOC estimé: ~200-300

## Refactoring Restant

1. Extraire les méthodes d'enrichissement vers `ContextEnricherService`
2. Refactoriser `ContextBuilderService` pour utiliser les nouveaux services
3. Mettre à jour les tests pour refléter la nouvelle architecture
4. Documenter les responsabilités de chaque service

## Objectif

Réduire `ContextBuilderService` de 952 lignes à ~200-300 lignes en orchestrant les services spécialisés.

