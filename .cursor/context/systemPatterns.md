# System Patterns - Saxium

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

---

## 🏗️ Architecture Système

### Architecture Globale

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (React)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │  Pages   │  │Components│  │  Hooks   │  │  Utils   ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘│
│         │            │            │            │        │
│         └────────────┴────────────┴────────────┘        │
│                    TanStack Query                         │
│                         │                                 │
└─────────────────────────┼─────────────────────────────────┘
                          │ HTTP/WebSocket
┌─────────────────────────┼─────────────────────────────────┐
│                    SERVER (Express)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │ Modules  │  │ Services │  │Middleware│  │  Routes  ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘│
│         │            │            │            │        │
│         └────────────┴────────────┴────────────┘        │
│                    EventBus                                │
│                         │                                 │
└─────────────────────────┼─────────────────────────────────┘
                          │
┌─────────────────────────┼─────────────────────────────────┐
│              DATABASE (PostgreSQL)                        │
│                    Drizzle ORM                            │
└───────────────────────────────────────────────────────────┘
```

### Couches Principales

1. **Présentation (Client)**
   - React 19 avec TypeScript
   - Routing: Wouter
   - State: TanStack Query + Context API
   - UI: Radix UI + Tailwind CSS

2. **Application (Server)**
   - Express 5 avec TypeScript
   - Modules métier (`server/modules/*`)
   - Services (`server/services/*`)
   - Middleware (`server/middleware/*`)

3. **Domaine (Shared)**
   - Types TypeScript (`shared/schema.ts`)
   - Schémas Zod pour validation
   - Types métier partagés

4. **Infrastructure**
   - PostgreSQL avec Drizzle ORM
   - EventBus pour événements temps réel
   - WebSocket pour notifications

---

## 🎨 Patterns de Design

### 1. Factory Pattern (Modules)

**Utilisation:** Création de routers modulaires

```typescript
// server/modules/auth/routes.ts
export function createAuthRouter(
  storage: IStorage, 
  eventBus: EventBus
): Router {
  const router = Router();
  // Routes...
  return router;
}
```

**Avantages:**
- ✅ Injection de dépendances
- ✅ Testabilité
- ✅ Réutilisabilité

### 2. Service Layer Pattern

**Utilisation:** Logique métier isolée dans services

```typescript
// server/services/AIService.ts
export class AIService {
  constructor(storage: IStorage) {
    // Initialisation
  }
  
  async generateSQL(request: AiQueryRequest): Promise<AiQueryResponse> {
    // Logique métier
  }
}
```

**Avantages:**
- ✅ Séparation des responsabilités
- ✅ Réutilisabilité
- ✅ Testabilité

### 3. Repository Pattern (Storage)

**Utilisation:** Abstraction de l'accès aux données

```typescript
// server/storage-poc.ts
export interface IStorage {
  getOffers(): Promise<Offer[]>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  // ...
}
```

**Avantages:**
- ✅ Abstraction base de données
- ✅ Testabilité (mocks)
- ✅ Flexibilité (changement DB)

### 4. Event-Driven Architecture (EventBus)

**Utilisation:** Communication asynchrone entre composants

```typescript
// Publication d'événement
eventBus.publish({
  type: 'offer.created',
  entity: 'offer',
  entityId: offer.id,
  // ...
});

// Abonnement
eventBus.subscribe((event) => {
  // Traitement
}, { eventTypes: ['offer.created'] });
```

**Avantages:**
- ✅ Découplage
- ✅ Scalabilité
- ✅ Traçabilité

### 5. Middleware Chain Pattern

**Utilisation:** Pipeline de traitement des requêtes

```typescript
// server/index.ts
app.use(securityHeaders());
app.use(sanitizeQuery());
app.use(rateLimits.general);
app.use(correlationMiddleware);
app.use(compression());
// ...
```

**Avantages:**
- ✅ Modularité
- ✅ Réutilisabilité
- ✅ Ordre de traitement contrôlé

### 6. Circuit Breaker Pattern

**Utilisation:** Protection contre pannes externes

```typescript
// server/services/AIService.ts
const claudeBreaker = circuitBreakerManager.getBreaker('claude', {
  threshold: 5,
  timeout: 60000,
  onOpen: () => logger.warn('Circuit ouvert'),
  onClose: () => logger.info('Circuit fermé')
});
```

**Avantages:**
- ✅ Résilience
- ✅ Performance (évite appels inutiles)
- ✅ Monitoring

### 7. Cache-Aside Pattern

**Utilisation:** Cache intelligent pour requêtes IA

```typescript
// Vérification cache
const cached = await getCachedContext(cacheKey);
if (cached) return cached;

// Génération si absent
const context = await generateContext();
await setCachedContext(cacheKey, context);
return context;
```

**Avantages:**
- ✅ Performance
- ✅ Réduction coûts API
- ✅ Flexibilité (TTL configurable)

---

## 🔧 Décisions Techniques Clés

### 1. Modularisation Progressive

**Décision:** Migration progressive de `routes-poc.ts` vers modules

**Raison:**
- ✅ Pas de breaking changes
- ✅ Tests à chaque étape
- ✅ Réduction progressive de la dette technique

**Pattern:**
```
routes-poc.ts (legacy)
    ↓
server/modules/[module]/routes.ts (nouveau)
    ↓
server/modules/[module]/index.ts (export)
    ↓
server/routes.ts (agrégation)
```

### 2. Types Partagés (Shared Schema)

**Décision:** Types TypeScript dans `shared/schema.ts`

**Raison:**
- ✅ Cohérence frontend/backend
- ✅ Validation Zod intégrée
- ✅ Source unique de vérité

**Pattern:**
```typescript
// shared/schema.ts
export const users = pgTable("users", { /* ... */ });
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Utilisation
import type { User } from "@shared/schema";
```

### 3. Validation Zod Centralisée

**Décision:** Validation avec Zod pour toutes les entrées

**Raison:**
- ✅ Type safety
- ✅ Validation runtime
- ✅ Messages d'erreur clairs

**Pattern:**
```typescript
const schema = z.object({
  query: z.string().min(3).max(500),
  // ...
});

router.post('/api/route', 
  validateBody(schema),
  asyncHandler(async (req, res) => {
    // req.body validé
  })
);
```

### 4. Error Handling Centralisé

**Décision:** Middleware de gestion d'erreurs global

**Raison:**
- ✅ Cohérence
- ✅ Logging structuré
- ✅ Réponses standardisées

**Pattern:**
```typescript
// server/middleware/errorHandler.ts
app.use(errorHandler); // Dernier middleware

// Dans routes
asyncHandler(async (req, res) => {
  // Erreurs automatiquement capturées
  throw new NotFoundError('Resource not found');
});
```

### 5. Logging Structuré

**Décision:** Logger avec métadonnées structurées

**Raison:**
- ✅ Traçabilité
- ✅ Debugging facilité
- ✅ Monitoring

**Pattern:**
```typescript
logger.info('Action effectuée', {
  metadata: {
    module: 'ModuleName',
    operation: 'operationName',
    userId: req.user?.id,
    // ...
  }
});
```

---

## 🔗 Relations entre Composants

### Flux de Données Principal

```
User Action
    ↓
React Component
    ↓
TanStack Query Hook
    ↓
API Request (HTTP)
    ↓
Express Route
    ↓
Middleware Chain
    ↓
Module/Service
    ↓
Storage (IStorage)
    ↓
Database (PostgreSQL)
    ↓
Response
    ↓
EventBus (si événement)
    ↓
WebSocket (si temps réel)
    ↓
Client Update
```

### Services et Dépendances

```
AIService
    ├── Storage
    ├── ContextBuilderService
    ├── ContextCacheService
    └── TechnicalMetricsService

ChatbotOrchestrationService
    ├── AIService
    ├── RBACService
    ├── SQLEngineService
    ├── BusinessContextService
    ├── ActionExecutionService
    └── EventBus

SQLEngineService
    ├── AIService
    ├── RBACService
    ├── BusinessContextService
    └── EventBus

DateIntelligenceService
    ├── Storage
    └── EventBus

PredictiveEngineService
    ├── Storage
    ├── BusinessAnalyticsService
    └── EventBus
```

### Modules et Routes

```
server/modules/
    ├── auth/
    │   ├── routes.ts (createAuthRouter)
    │   ├── types.ts
    │   └── index.ts
    ├── documents/
    │   ├── coreRoutes.ts
    │   ├── types.ts
    │   └── index.ts
    ├── chiffrage/
    │   └── ...
    └── ...

server/routes.ts
    ├── Import modules
    ├── Création routers
    └── Enregistrement sur app
```

---

## 🛡️ Patterns de Sécurité

### 1. RBAC (Role-Based Access Control)

**Pattern:**
```typescript
// Vérification permission
const hasAccess = await rbacService.checkPermission(
  userId,
  'offer',
  'read'
);

// Filtrage automatique
const offers = await storage.getOffers();
const filtered = await rbacService.filterByRole(offers, userRole);
```

### 2. SQL Injection Protection

**Pattern:**
- ✅ Paramètres préparés (Drizzle ORM)
- ✅ Validation AST SQL
- ✅ Whitelist tables/colonnes
- ✅ Blocage DDL/DML

### 3. Rate Limiting

**Pattern:**
```typescript
// Global
app.use(rateLimits.general);

// Par route
router.post('/api/route', 
  rateLimits.processing,
  asyncHandler(async (req, res) => {
    // ...
  })
);
```

### 4. Input Sanitization

**Pattern:**
```typescript
// Middleware global
app.use(sanitizeQuery());

// Validation Zod
const schema = z.object({
  query: z.string().trim().min(3)
});
```

---

## 📊 Patterns de Performance

### 1. Lazy Loading (Frontend)

**Pattern:**
```typescript
// App.tsx
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Offers = lazy(() => import("@/pages/offers"));
```

### 2. Code Splitting (Vite)

**Pattern:**
```typescript
// vite.config.ts
rollupOptions: {
  output: {
    manualChunks: (id) => {
      if (id.includes('node_modules/react')) return 'vendor-react';
      // ...
    }
  }
}
```

### 3. Cache Intelligent

**Pattern:**
- ✅ Cache mémoire (Map)
- ✅ Cache DB (table dédiée)
- ✅ TTL configurable
- ✅ Invalidation automatique (EventBus)

### 4. Preloading Background

**Pattern:**
```typescript
// PredictiveEngineService
eventBus.integratePredictiveEngine(service);
// Preloading cycles: business_hours, peak, weekend, nightly
```

---

## 🔄 Patterns d'Intégration

### 1. Strategy Pattern (Monday Migration)

**Pattern:**
```typescript
interface IMigrationStrategy {
  migrate(options: MigrationOptions): Promise<MigrationResult>;
}

class ExcelImportStrategy implements IMigrationStrategy { }
class PatternBasedStrategy implements IMigrationStrategy { }
class APIMigrationStrategy implements IMigrationStrategy { }
```

### 2. Adapter Pattern (Intégrations)

**Pattern:**
```typescript
// Adapter pour différents providers
class OneDriveAdapter { }
class MondayAdapter { }
class BatigestAdapter { }
```

---

## 📝 Conventions de Code

### Naming
- **Modules:** `kebab-case` (ex: `auth`, `documents`)
- **Services:** `PascalCase` + `Service` (ex: `AIService`)
- **Routes:** `kebab-case` (ex: `/api/offers/:id`)
- **Types:** `PascalCase` (ex: `User`, `InsertUser`)

### Structure Fichiers
```
server/modules/[module]/
    ├── routes.ts (ou coreRoutes.ts)
    ├── services.ts (optionnel)
    ├── types.ts
    └── index.ts
```

### Exports
- ✅ Factory functions pour routers
- ✅ Classes pour services
- ✅ Types dans `types.ts`
- ✅ Index pour exports publics

---

**Note:** Ce document décrit les patterns architecturaux et techniques utilisés dans le projet. Il guide les décisions de design et l'évolution du code.


