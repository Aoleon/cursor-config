# Rapport Automatisé d'Élimination de la Dette Technique

**Date:** 2025-11-11T09:48:21.897Z

---

## 📊 Résumé Exécutif

- **Services dupliqués:** 0 groupes
- **Fichiers monolithiques:** 82 fichiers
- **Types 'any':** 371 occurrences
- **Code deprecated:** 693 occurrences
- **TODO/FIXME:** 75 occurrences
- **Corrections automatiques:** 0 fichiers

## 🔴 Fichiers Monolithiques (Priorité)

### ./server/services/MondayImportService.ts

- **Lignes:** 997
- **Méthodes:** 217
- **Responsabilités:** Query/Read, Delete, Update, Create, Import/Export
- **Plan de réduction:**
  - Séparer en 5 modules: Query/Read, Delete, Update, Create, Import/Export
- **Priorité:** 3

### ./server/services/DateIntelligenceService.ts

- **Lignes:** 930
- **Méthodes:** 218
- **Responsabilités:** Query/Read, Create, Context Building, Update, Caching
- **Plan de réduction:**
  - Séparer en 5 modules: Query/Read, Create, Context Building, Update, Caching
- **Priorité:** 3

### ./server/storage/base/BaseRepository.ts

- **Lignes:** 912
- **Méthodes:** 231
- **Responsabilités:** Create, Update, Delete, Query/Read
- **Plan de réduction:**
  - Séparer en 4 modules: Create, Update, Delete, Query/Read
- **Priorité:** 3

### ./server/routes/monitoring.ts

- **Lignes:** 841
- **Méthodes:** 179
- **Responsabilités:** Query/Read
- **Plan de réduction:**
- **Priorité:** 3

### ./server/seeders/mondaySeed.ts

- **Lignes:** 832
- **Méthodes:** 260
- **Responsabilités:** Create, Update, Query/Read
- **Plan de réduction:**
- **Priorité:** 3

### ./server/storage/date-intelligence/DateIntelligenceRepository.ts

- **Lignes:** 821
- **Méthodes:** 247
- **Responsabilités:** Query/Read, Create, Update, Delete
- **Plan de réduction:**
  - Séparer en 4 modules: Query/Read, Create, Update, Delete
- **Priorité:** 3

### ./server/services/MondayProductionMigrationService.ts

- **Lignes:** 816
- **Méthodes:** 207
- **Responsabilités:** Create, Query/Read
- **Plan de réduction:**
- **Priorité:** 3

### ./server/services/consolidated/BusinessAnalyticsService.ts

- **Lignes:** 810
- **Méthodes:** 168
- **Responsabilités:** Query/Read, Analytics, Create, Caching
- **Plan de réduction:**
  - Séparer en 4 modules: Query/Read, Analytics, Create, Caching
- **Priorité:** 3

### ./server/services/consolidated/MondayMigrationService.ts

- **Lignes:** 804
- **Méthodes:** 231
- **Responsabilités:** Migration, Query/Read, Create, Import/Export
- **Plan de réduction:**
  - Séparer en 4 modules: Migration, Query/Read, Create, Import/Export
- **Priorité:** 3

### ./server/replitAuth.ts

- **Lignes:** 797
- **Méthodes:** 222
- **Responsabilités:** Query/Read, Create, Update
- **Plan de réduction:**
- **Priorité:** 3

### ./server/services/SafetyGuardsService.ts

- **Lignes:** 791
- **Méthodes:** 193
- **Responsabilités:** Query/Read, Update, Create, Delete
- **Plan de réduction:**
  - Séparer en 4 modules: Query/Read, Update, Create, Delete
- **Priorité:** 3

### ./server/modules/admin/routes.ts

- **Lignes:** 789
- **Méthodes:** 171
- **Responsabilités:** Create, Query/Read, Update
- **Plan de réduction:**
- **Priorité:** 3

### ./server/documentProcessor.ts

- **Lignes:** 767
- **Méthodes:** 177
- **Responsabilités:** Create, Query/Read
- **Plan de réduction:**
- **Priorité:** 3

### ./server/modules/batigest/routes.ts

- **Lignes:** 765
- **Méthodes:** 205
- **Responsabilités:** Create, Query/Read, Update, Import/Export
- **Plan de réduction:**
  - Séparer en 4 modules: Create, Query/Read, Update, Import/Export
- **Priorité:** 3

### ./server/batigestService.ts

- **Lignes:** 761
- **Méthodes:** 241
- **Responsabilités:** Query/Read, Analytics
- **Plan de réduction:**
- **Priorité:** 3

### ./server/monitoring/alert-manager.ts

- **Lignes:** 757
- **Méthodes:** 161
- **Responsabilités:** Query/Read, Delete, Create
- **Plan de réduction:**
- **Priorité:** 3

### ./server/services/consolidated/TechnicalMetricsService.ts

- **Lignes:** 753
- **Méthodes:** 163
- **Responsabilités:** Query/Read, Create, Delete, Caching
- **Plan de réduction:**
  - Séparer en 4 modules: Query/Read, Create, Delete, Caching
- **Priorité:** 3

### ./server/storage/analytics.ts

- **Lignes:** 753
- **Méthodes:** 280
- **Responsabilités:** Query/Read, Analytics
- **Plan de réduction:**
- **Priorité:** 3

### ./server/utils/mondayValidator.ts

- **Lignes:** 748
- **Méthodes:** 247
- **Responsabilités:** Query/Read
- **Plan de réduction:**
- **Priorité:** 3

### ./server/services/MondayProductionFinalService.ts

- **Lignes:** 745
- **Méthodes:** 251
- **Responsabilités:** Context Building, Create, Query/Read
- **Plan de réduction:**
- **Priorité:** 3

## ⚠️ Types 'any' (371 occurrences)

**Impact:** Perte de type safety, erreurs runtime potentielles

**Fichiers principaux:**
- ./server/batigestService.ts: 7 occurrences
- ./server/config/monday-migration-mapping.ts: 13 occurrences
- ./server/documentProcessor.ts: 2 occurrences
- ./server/eventBus.ts: 3 occurrences
- ./server/middleware/db-error-handler.ts: 3 occurrences
- ./server/middleware/errorHandler.ts: 9 occurrences
- ./server/middleware/rate-limiter.ts: 2 occurrences
- ./server/middleware/security.ts: 1 occurrences
- ./server/middleware/validation.ts: 7 occurrences
- ./server/migration/analyze-monday-complete.ts: 6 occurrences

## ⚠️ Code Deprecated/Legacy (693 occurrences)

**Impact:** Code obsolète, risque de bugs, maintenance difficile

**Fichiers principaux:**
- ./server/middleware/rate-limiter.ts: 15 occurrences
- ./server/modules/commercial/routes.ts: 1 occurrences
- ./server/modules/monday/routes.ts: 1 occurrences
- ./server/routes-poc.ts: 2 occurrences
- ./server/routes.ts: 1 occurrences
- ./server/services/ContextBuilderService.ts: 1 occurrences
- ./server/services/DocumentSyncService.ts: 1 occurrences
- ./server/services/MondayMigrationService.ts: 4 occurrences
- ./server/services/SQLEngineService.ts: 1 occurrences
- ./server/services/consolidated/MondayMigrationService.ts: 3 occurrences

## ⚠️ TODO/FIXME (75 occurrences)

**Impact:** Tâches non terminées, code incomplet

**Fichiers principaux:**
- ./server/eventBus.ts: 7 occurrences
- ./server/index.ts: 1 occurrences
- ./server/modules/commercial/routes.ts: 1 occurrences
- ./server/routes-admin.ts: 1 occurrences
- ./server/routes-migration.ts: 1 occurrences
- ./server/services/AIService.ts: 4 occurrences
- ./server/services/ChatbotOrchestrationService.ts: 14 occurrences
- ./server/services/ContextBuilderService.ts: 14 occurrences
- ./server/services/DateAlertDetectionService.ts: 4 occurrences
- ./server/services/DocumentSyncService.ts: 1 occurrences

