# Base de Connaissances - Saxium

**Dernière mise à jour:** 2025-01-29  
**Objectif:** Documenter la compréhension approfondie du projet pour optimiser les performances de l'agent AI

## 📋 Vue d'Ensemble

Saxium est une application full-stack de gestion de projets pour **JLM Menuiserie** (BTP/Menuiserie française). L'application couvre tout le workflow de la pré-vente au SAV, avec une forte intégration IA et des capacités de synchronisation avec des systèmes externes.

## 🏗️ Architecture Technique

### Stack Technologique

**Frontend:**
- React 19 + TypeScript
- Vite (build tool)
- Wouter (routing léger)
- TanStack Query (server state management)
- Radix UI (composants accessibles)
- Tailwind CSS (styling)
- React Hook Form + Zod (formulaires validés)

**Backend:**
- Express 5 + TypeScript
- Node.js
- Drizzle ORM (PostgreSQL)
- EventBus (architecture événementielle)
- WebSocket (temps réel)
- Passport.js (authentification)

**Base de Données:**
- PostgreSQL (Neon)
- Drizzle ORM (type-safe queries)
- Migrations via Drizzle Kit

**IA/ML:**
- Anthropic Claude Sonnet 4 (requêtes simples/menuiserie)
- OpenAI GPT-5 (requêtes complexes)
- AIService (sélection automatique de modèle)
- ChatbotOrchestrationService (pipeline complet)
- SQLEngineService (Text-to-SQL sécurisé)
- BusinessContextService (contexte métier enrichi)

**Intégrations:**
- Monday.com (synchronisation bidirectionnelle)
- OneDrive (synchronisation documents)
- Microsoft OAuth (authentification)
- Batigest (export documents)

### Architecture Modulaire

**Migration en cours:** De `routes-poc.ts` (monolithique) vers `server/modules/*` (modulaire)

**Modules existants:**
- ✅ `auth/` - Authentification (basic + Microsoft OAuth)
- ✅ `chiffrage/` - Gestion chiffrage/offres
- ✅ `documents/` - OCR et traitement documents
- ✅ `chatbot/` - Chatbot IA
- ✅ `suppliers/` - Gestion fournisseurs
- ✅ `projects/` - Gestion projets
- ✅ `analytics/` - Analytics et KPIs
- ✅ `monday/` - Intégration Monday.com
- ✅ `batigest/` - Export Batigest
- ✅ `admin/` - Administration
- ✅ `commercial/` - Commercial
- 🔄 Autres modules en migration

**Pattern utilisé:** Factory Pattern
```typescript
export function create[Module]Router(storage: IStorage, eventBus: EventBus): Router
```

## 🔐 Authentification

### Système Multi-Provider

**1. Basic Auth (Développement uniquement)**
- Route: `/api/login/basic`
- Bloqué en production (`NODE_ENV !== 'development'`)
- Rôles validés: `admin`, `ca`, `chef_equipe`, `technicien_be`, `technicien_terrain`, `client`
- Session Express

**2. Microsoft OAuth (Production)**
- Routes: `/auth/microsoft`, `/auth/microsoft/callback`, `/auth/microsoft/logout`
- Passport.js avec stratégie Azure AD
- Token refresh automatique
- Session Express

**Middleware:**
- `isAuthenticated` - Vérifie session user (basic ou Microsoft)
- Support multi-provider: `req.session?.user || req.user`
- Vérification expiration token pour Microsoft

## 🤖 Services IA

### AIService (Multi-Modèles)

**Fonctionnalités:**
- Sélection automatique de modèle (Claude Sonnet 4 vs GPT-5)
- Cache intelligent (DB + mémoire)
- Retry logic avec backoff exponentiel
- Circuit breakers par provider
- Rate limiting par utilisateur
- Timeout 15s par défaut
- Monitoring usage (tokens, coûts, latence)

**Sélection de modèle:**
- **Claude Sonnet 4:** Requêtes simples, domaine menuiserie
- **GPT-5:** Requêtes complexes, analyses approfondies

**Cache:**
- TTL: 24h par défaut
- Cache DB (`aiQueryCache`) + cache mémoire (fallback)
- Invalidation automatique via EventBus

### ChatbotOrchestrationService

**Pipeline complet:**
1. Analyse de pattern (type, complexité, focus)
2. Génération contexte métier (parallèle)
3. Sélection modèle IA (parallèle)
4. Génération SQL si nécessaire (SQLEngineService)
5. Exécution actions si nécessaire (ActionExecutionService)
6. Formatage réponse
7. Suggestions contextuelles
8. Cache résultat

**Optimisations:**
- Traitement parallèle (contexte + modèle simultané)
- Cache LRU pour requêtes similaires
- Latence cible: < 3s (actuel ~2.5s ✅)

### SQLEngineService (Text-to-SQL Sécurisé)

**Pipeline:**
1. Validation requête NL
2. Construction contexte intelligent
3. Génération SQL via IA
4. Nettoyage SQL généré
5. Validation AST (node-sql-parser)
6. Application RBAC (filtres colonnes/tables)
7. Exécution sécurisée (read-only)
8. Correction typos si erreur

**Sécurité:**
- Protection injection SQL (validation AST)
- RBAC strict (colonnes filtrées par rôle)
- Opérations read-only uniquement
- Colonnes sensibles filtrées automatiquement

### BusinessContextService

**Fonctionnalités:**
- Génération contexte métier enrichi
- Base de connaissances menuiserie
- Exemples de requêtes par rôle
- Schémas DB avec descriptions
- Calendrier BTP français
- Apprentissage adaptatif

**Cache:**
- Cache mémoire (TTL 60min)
- Cache DB (`businessContextCache`)
- Invalidation automatique

## 📊 Gestion de Données

### Storage Layer (IStorage)

**Interface centralisée** pour toutes les opérations DB:
- Users, AOs, Offers, Projects, Tasks
- Suppliers, Documents, Contacts
- Alerts, Metrics, Analytics
- Chatbot conversations, AI queries

**Implémentation:** Drizzle ORM avec PostgreSQL

### EventBus

**Architecture événementielle:**
- Publication événements temps réel
- Invalidation cache automatique (TanStack Query)
- Historique événements
- Filtres par type/entité

**Types d'événements:**
- `ao:created`, `ao:updated`, `ao:deleted`
- `offer:created`, `offer:updated`
- `project:created`, `project:updated`
- `document:uploaded`, `document:synced`
- `monday:webhook:received`
- `chatbot:query:processed`
- Etc.

### WebSocket (Temps Réel)

**WebSocketManager:**
- Connexions authentifiées
- Broadcast événements temps réel
- Filtres par type/entité
- Heartbeat (ping/pong)
- Reconnexion automatique

**Messages:**
- `event` - Événement temps réel
- `ping`/`pong` - Heartbeat
- `auth` - Authentification
- `subscribe`/`unsubscribe` - Filtres

## 📄 Gestion Documents

### OCR Service

**Fonctionnalités:**
- Traitement PDF (Tesseract.js)
- Extraction texte
- Extraction champs structurés (référence, client, dates)
- Confiance score
- Support formats: PDF, JPEG, PNG, TIFF

**Routes:**
- `POST /api/ocr/process-pdf` - Traitement OCR
- `POST /api/ocr/create-ao-from-pdf` - Création AO depuis PDF

### Document Processor

**Fonctionnalités:**
- Analyse contenu documents
- Extraction informations AO structurées
- Extraction contacts avec linking
- Extraction lots menuiserie
- Support formats: PDF, TXT, DOC, DOCX

### OneDrive Integration

**OneDriveService:**
- Authentification OAuth 2.0 (Client Credentials)
- Opérations CRUD (upload, download, liste, recherche)
- Delta sync (synchronisation incrémentale)
- Cache métadonnées

**OneDriveSyncService:**
- Synchronisation automatique documents
- Scan parallèle catégories (AO, Offres, Projets)
- Création/Mise à jour/Suppression documents DB
- Invalidation cache avant sync

**DocumentSyncService:**
- Orchestration synchronisation
- Mapping OneDrive → DB
- Gestion catégories documents

## 🔄 Intégrations Externes

### Monday.com

**Services:**
- `MondayIntegrationService` - GraphQL execution
- `MondayDataService` - Transformation données
- `MondayImportService` - Import Monday → Saxium
- `MondayExportService` - Export Saxium → Monday
- `MondayWebhookService` - Traitement webhooks

**Fonctionnalités:**
- Synchronisation bidirectionnelle
- Mapping intelligent colonnes Monday ↔ Saxium
- Extractors (AOBaseExtractor, LotExtractor, ContactExtractor, etc.)
- Webhooks pour changements temps réel
- Migration complète données

**Mapping:**
- 42/51 champs AO mappés (82.4%)
- Configuration: `server/services/monday/boardConfigs/ao-planning-3946257560.json`
- Board cible: AO Planning (ID: 3946257560)

### Batigest

**BatigestExportService:**
- Export devis XML
- Export bons de commande XML
- Génération PDF avec templates
- Templates Handlebars

**Routes:**
- `POST /api/batigest/export-devis` - Export devis
- `POST /api/batigest/export-bon-commande` - Export BC

## 📅 DateIntelligence

### DateIntelligenceService

**Fonctionnalités:**
- Calcul durées phases projets
- Règles métier configurables
- Multiplicateurs contextuels (complexité, surface, accessibilité)
- Cascade updates (propagation changements)
- Détection problèmes planning
- Alertes dates critiques

**Règles:**
- Durées de base par phase
- Multiplicateurs (complexité, surface, sur-mesure, accessibilité)
- Buffers configurables
- Calendrier BTP (vacances, saisons)

**Phases:**
- `brouillon`, `etude`, `validation`, `production`, `chantier`, `reception`, `sav`

## 🔒 Sécurité

### RBAC (Role-Based Access Control)

**RBACService:**
- Permissions par rôle et table
- Actions: `read`, `write`, `create`, `delete`, `export`
- Contextes utilisateur (restrictions temporelles)
- Audit logs
- Filtres colonnes sensibles

**Rôles:**
- `admin` - Accès complet
- `ca` - Commercial
- `chef_equipe` - Chef d'équipe
- `technicien_be` - Technicien bureau d'études
- `technicien_terrain` - Technicien terrain
- `client` - Client

### Rate Limiting

**Middleware:**
- Rate limits par route/type
- Limites configurables
- Monitoring automatique

**Limites:**
- Auth: 5 req/15min
- Chatbot: 10 req/min
- Processing: 20 req/min
- API général: 100 req/min

### Circuit Breakers

**CircuitBreakerManager:**
- Circuit breakers par service externe
- Threshold configurable
- Timeout automatique
- Retry après timeout

**Services protégés:**
- Claude API
- OpenAI API
- Monday.com API
- OneDrive API

## 🧪 Tests

### Configuration

**Vitest:**
- Tests unitaires backend/frontend
- Coverage: 85% backend, 80% frontend (objectif)
- Configuration séparée: `vitest.backend.config.ts`, `vitest.frontend.config.ts`

**Playwright:**
- Tests E2E
- Workflows critiques
- Configuration: `playwright.config.ts`

### Structure

**Backend:**
- `tests/` - Tests unitaires
- `e2e/workflows/` - Tests E2E

**Frontend:**
- `client/src/lib/__tests__/` - Tests unitaires
- Tests composants avec Vitest

## 🛠️ Utilitaires

### Logger Structuré

**Utilisation:**
```typescript
import { logger } from '@/utils/logger';

logger.info('Message', { metadata: { userId: '123' } });
logger.debug('Debug', { metadata });
logger.warn('Warning');
logger.error('Error', error, { metadata });
logger.fatal('Fatal', error);
```

**Timer:**
```typescript
const endTimer = logger.time('Operation');
await operation();
endTimer(); // Log automatique
```

### Error Handling

**Types d'erreurs:**
- `ValidationError` - 400
- `AuthenticationError` - 401
- `AuthorizationError` - 403
- `NotFoundError` - 404
- `ConflictError` - 409
- `DatabaseError` - 500
- `ExternalServiceError` - 502

**Pattern:**
```typescript
import { asyncHandler } from '@/utils/error-handler';

router.post('/api/route', asyncHandler(async (req, res) => {
  // Pas de try-catch nécessaire
  const result = await operation();
  res.json({ success: true, data: result });
}));
```

### Retry Logic

**withRetry:**
```typescript
import { withRetry } from '@/utils/retry-helper';

const result = await withRetry(
  () => externalApiCall(),
  { maxRetries: 3, initialDelayMs: 1000 }
);
```

## 📈 Performance

### Optimisations

**Backend:**
- Cache intelligent (DB + mémoire)
- Requêtes parallèles
- Pagination systématique
- Index DB optimisés
- Circuit breakers
- Timeouts stricts

**Frontend:**
- Lazy loading pages
- Code splitting par vendor
- Memoization calculs coûteux
- TanStack Query (cache + invalidation)
- Optimistic updates

**Métriques:**
- Latence API: < 100ms (objectif)
- Latence chatbot: < 3s (actuel ~2.5s ✅)
- Bundle size: < 500KB gzipped

## 🔄 Patterns Architecturaux

### Factory Pattern

**Modules:**
```typescript
export function create[Module]Router(
  storage: IStorage, 
  eventBus: EventBus
): Router
```

### Service Layer

**Services:**
- Logique métier isolée
- Réutilisables
- Testables
- Injection dépendances

### Repository Pattern

**IStorage:**
- Interface centralisée
- Abstraction DB
- Type-safe (Drizzle ORM)

### Event-Driven Architecture

**EventBus:**
- Découplage services
- Invalidation cache automatique
- Temps réel (WebSocket)

## 📝 Conventions

### Naming

- **Services:** `PascalCase` + `Service` (ex: `AIService`)
- **Routes:** `kebab-case` (ex: `/api/offers/:id`)
- **Composants:** `PascalCase` (ex: `OfferCard`)
- **Hooks:** `camelCase` avec préfixe `use` (ex: `useOffer`)
- **Types:** `PascalCase` (ex: `User`, `InsertUser`)

### Imports

```typescript
// 1. Imports externes
import { z } from 'zod';

// 2. Imports partagés
import type { User } from '@shared/schema';

// 3. Imports internes
import { logger } from '../utils/logger';
import { asyncHandler } from '../utils/error-handler';
```

## 🎯 Points d'Attention

### Migration Modulaire

- Migration progressive de `routes-poc.ts` vers modules
- Ne pas modifier `routes-poc.ts` sauf nécessité
- Préférer créer/modifier dans `server/modules/`

### Performance

- Latence chatbot: objectif < 3s (actuel ~2.5s ✅)
- Requêtes API: objectif < 100ms (actuel ~150ms 🔄)
- Optimiser requêtes SQL lentes (> 20s)

### Tests

- Couverture backend: objectif 85% (actuel ~82% 🔄)
- Couverture frontend: objectif 80% (actuel ~78% 🔄)
- Corriger tests flaky E2E

## 🔗 Références

- **Documentation projet:** Fichiers `*.md` à la racine
- **Documentation technique:** `docs/`
- **Utilitaires:** `server/utils/README-UTILS.md`
- **Modules:** `server/modules/README.md`
- **Règles Cursor:** `.cursor/rules/`

---

**Note:** Ce document est une synthèse de la compréhension du projet. Pour plus de détails, voir les fichiers de documentation spécifiques.


