# Rapport de Consolidation Automatique des Services

**Date:** 2025-11-11T09:49:09.609Z

---

## 📊 Résumé

- **Groupes de services dupliqués:** 8
- **Services à consolider:** 28
- **Fichiers dépendants à mettre à jour:** 45

## MondayService

**Service cible:** `server/services/consolidated/MondayService.ts`

**Services sources:**
- `MondayDataSplitter` (20 méthodes)
- `MondayExportService` (34 méthodes)
- `MondayImportService` (48 méthodes)
- `MondayMigrationService` (23 méthodes)
- `MondayMigrationServiceEnhanced` (33 méthodes)
- `MondayProductionFinalService` (35 méthodes)
- `MondayProductionMigrationService` (43 méthodes)
- `MondaySchemaAnalyzer` (21 méthodes)
- `MondayService` (38 méthodes)
- `MondayWebhookService` (4 méthodes)
- `MondayDataService` (105 méthodes)
- `MondayIntegrationService` (59 méthodes)
- `MondayMigrationService` (61 méthodes)

**Méthodes communes:** 62
- constructor, mapMasterToContactData, mapContactToIndividualData, analyzeItem, if, getItem, for, exportProject, CreateItem, create_item...

**Méthodes uniques par service:**
- `MondayDataSplitter`: 1 méthodes
- `MondayExportService`: 0 méthodes
- `MondayImportService`: 8 méthodes
- `MondayMigrationService`: 21 méthodes
- `MondayMigrationServiceEnhanced`: 6 méthodes
- `MondayProductionFinalService`: 15 méthodes
- `MondayProductionMigrationService`: 23 méthodes
- `MondaySchemaAnalyzer`: 2 méthodes
- `MondayService`: 0 méthodes
- `MondayWebhookService`: 1 méthodes
- `MondayDataService`: 9 méthodes
- `MondayIntegrationService`: 1 méthodes

**Fichiers dépendants:** 21
- `./server/modules/monday/index.ts`, `./server/modules/monday/routes.ts`, `./server/services/MondayWebhookService.ts`, `./server/routes-migration.ts`, `./server/scripts/migrate-from-monday.ts`...

---

## BusinessService

**Service cible:** `server/services/consolidated/BusinessService.ts`

**Services sources:**
- `BusinessContextService` (89 méthodes)
- `BusinessAnalyticsService` (28 méthodes)

**Méthodes communes:** 2
- constructor, if

**Méthodes uniques par service:**
- `BusinessContextService`: 50 méthodes
- `BusinessAnalyticsService`: 17 méthodes

**Fichiers dépendants:** 8
- `./server/modules/chatbot/routes.ts`, `./server/modules/ops/routes.ts`, `./server/routes-poc.ts`, `./server/services/ChatbotOrchestrationService.ts`, `./server/services/SQLEngineService.ts`...

---

## ContextService

**Service cible:** `server/services/consolidated/ContextService.ts`

**Services sources:**
- `ContextBuilderService` (154 méthodes)
- `ContextCacheService` (175 méthodes)
- `ContextTierService` (52 méthodes)

**Méthodes communes:** 4
- constructor, if, switch, for

**Méthodes uniques par service:**
- `ContextBuilderService`: 81 méthodes
- `ContextCacheService`: 94 méthodes
- `ContextTierService`: 32 méthodes

**Fichiers dépendants:** 4
- `./server/routes/ai-service.ts`, `./server/services/AIService.ts`, `./server/eventBus.ts`, `./server/services/ContextBuilderService.ts`

---

## DateService

**Service cible:** `server/services/consolidated/DateService.ts`

**Services sources:**
- `DateAlertDetectionService` (150 méthodes)
- `DateIntelligenceService` (52 méthodes)

**Méthodes communes:** 4
- constructor, if, for, switch

**Méthodes uniques par service:**
- `DateAlertDetectionService`: 62 méthodes
- `DateIntelligenceService`: 30 méthodes

**Fichiers dépendants:** 4
- `./server/routes-poc.ts`, `./server/services/PeriodicDetectionScheduler.ts`, `./server/modules/projects/routes.ts`, `./server/services/DateAlertDetectionService.ts`

---

## OneService

**Service cible:** `server/services/consolidated/OneService.ts`

**Services sources:**
- `OneDriveService` (40 méthodes)
- `OneDriveSyncService` (26 méthodes)

**Méthodes communes:** 2
- constructor, if

**Méthodes uniques par service:**
- `OneDriveService`: 24 méthodes
- `OneDriveSyncService`: 15 méthodes

**Fichiers dépendants:** 3
- `./server/routes/onedrive.ts`, `./server/services/DocumentSyncService.ts`, `./server/services/OneDriveSyncService.ts`

---

## MicrosoftService

**Service cible:** `server/services/consolidated/MicrosoftService.ts`

**Services sources:**
- `MicrosoftAuthService` (6 méthodes)
- `MicrosoftOAuthService` (7 méthodes)

**Méthodes communes:** 2
- constructor, if

**Méthodes uniques par service:**
- `MicrosoftAuthService`: 3 méthodes
- `MicrosoftOAuthService`: 2 méthodes

**Fichiers dépendants:** 2
- `./server/services/OneDriveService.ts`, `./server/modules/auth/microsoftAuth.ts`

---

## SyncService

**Service cible:** `server/services/consolidated/SyncService.ts`

**Services sources:**
- `SyncAuditService` (15 méthodes)
- `SyncScheduler` (14 méthodes)

**Méthodes communes:** 2
- constructor, if

**Méthodes uniques par service:**
- `SyncAuditService`: 6 méthodes
- `SyncScheduler`: 9 méthodes

**Fichiers dépendants:** 2
- `./server/modules/monday/index.ts`, `./server/modules/monday/routes.ts`

---

## MenuiserieService

**Service cible:** `server/services/consolidated/MenuiserieService.ts`

**Services sources:**
- `MenuiserieBusinessRules` (12 méthodes)
- `MenuiserieKnowledgeBase` (10 méthodes)

**Méthodes communes:** 2
- if, getSeasonalFactor

**Méthodes uniques par service:**
- `MenuiserieBusinessRules`: 7 méthodes
- `MenuiserieKnowledgeBase`: 7 méthodes

**Fichiers dépendants:** 1
- `./server/seeders/dateIntelligenceRulesSeeder.ts`

---

