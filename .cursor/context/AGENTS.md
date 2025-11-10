# AGENTS.md - Instructions pour Cursor AI

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 2.0.0  
**Dernière mise à jour:** 2025-01-29

Ce fichier fournit des instructions complètes et optimisées pour guider Cursor AI dans le projet Saxium, intégrant les meilleures pratiques de développement, déploiement et DevOps.

## 🎯 Contexte du Projet

Saxium est une application full-stack de gestion de projets pour **JLM Menuiserie** (BTP/Menuiserie française). Stack: React 19 + TypeScript, Express 5, PostgreSQL (Drizzle ORM), IA multi-modèles (Claude Sonnet 4 + GPT-5).

**Architecture:** Migration progressive vers modules (`server/modules/*`), services métier (`server/services/*`), types partagés (`shared/schema.ts`)

## 🏆 Philosophie de Qualité

**Objectif:** Application **parfaite** et **exemple en matière de qualité**

**Priorités (dans l'ordre):**
1. **Robustesse** - Résistance aux erreurs, gestion d'erreurs complète
2. **Maintenabilité** - Code clair, documenté, testé, évolutif
3. **Performance** - Optimisation continue, latence minimale

**Principe:** Toujours privilégier robustesse et maintenabilité. Performance vient après, mais toujours optimiser.

**Référence:** `@.cursor/rules/quality-principles.md` - Principes de qualité complets

## 📋 Règles Essentielles

### Avant Toute Modification

1. **Lire la documentation pertinente:**
   - `projectbrief.md` pour comprendre le périmètre
   - `activeContext.md` pour connaître l'état actuel
   - `systemPatterns.md` pour comprendre l'architecture
   - `server/utils/README-UTILS.md` avant modification backend

2. **Vérifier les fichiers de mémoire:**
   - `projectbrief.md` - Objectifs et périmètre
   - `productContext.md` - Expérience utilisateur
   - `activeContext.md` - Focus actuel
   - `systemPatterns.md` - Patterns architecturaux
   - `techContext.md` - Stack technique
   - `progress.md` - État du projet

### Backend (Express)

**TOUJOURS:**
- ✅ Utiliser `asyncHandler` pour toutes les routes (pas de try-catch)
- ✅ Utiliser `logger` de `server/utils/logger.ts` (jamais `console.log`)
- ✅ Utiliser erreurs typées (`ValidationError`, `NotFoundError`, etc.)
- ✅ Valider avec Zod avant traitement
- ✅ Utiliser types depuis `@shared/schema.ts`

**NE JAMAIS:**
- ❌ Utiliser `console.log`/`error` dans le code serveur
- ❌ Créer des `try-catch` dans les routes
- ❌ Lancer des erreurs génériques `throw new Error()`
- ❌ Créer migrations SQL manuelles (utiliser `npm run db:push`)
- ❌ Modifier `package.json`, `vite.config.ts`, `drizzle.config.ts` directement

### Frontend (React)

**TOUJOURS:**
- ✅ Utiliser TanStack Query pour server state
- ✅ Utiliser React Hook Form + Zod pour formulaires
- ✅ Utiliser composants UI depuis `@/components/ui/`
- ✅ Lazy loading pour pages non critiques
- ✅ Memoization pour calculs coûteux

**NE JAMAIS:**
- ❌ Mettre server state dans Context API (utiliser TanStack Query)
- ❌ Créer composants UI custom si équivalent existe dans `@/components/ui/`
- ❌ Utiliser styles inline (utiliser Tailwind CSS)

### Base de Données

**TOUJOURS:**
- ✅ Utiliser Drizzle ORM (jamais SQL brut)
- ✅ Utiliser types depuis `@shared/schema.ts`
- ✅ Utiliser transactions pour opérations multiples
- ✅ Paginer pour grandes listes

**NE JAMAIS:**
- ❌ Exécuter SQL brut (toujours via Drizzle ORM)
- ❌ Changer types de colonnes ID (serial ↔ varchar)
- ❌ Créer requêtes N+1 (utiliser `KpiRepository` pour requêtes complexes)

### Services IA

**TOUJOURS:**
- ✅ Utiliser `getAIService()` pour obtenir instance (singleton)
- ✅ Toujours fournir `userRole` pour RBAC
- ✅ Utiliser `SQLEngineService` pour SQL sécurisé (jamais SQL brut)
- ✅ Utiliser cache intelligent (ne pas recréer si déjà en cache)

**NE JAMAIS:**
- ❌ Exécuter SQL brut (toujours via SQLEngineService)
- ❌ Créer nouvelles instances de services IA (utiliser getters)

### Architecture Modulaire

**Lors de la création/modification de routes:**
- ✅ Préférer créer/modifier dans `server/modules/[module]/routes.ts`
- ✅ Utiliser factory pattern: `export function create[Module]Router(...)`
- ✅ Exporter depuis `server/modules/[module]/index.ts`
- ⚠️ Éviter de modifier `server/routes-poc.ts` (legacy, migration en cours)

**Modules existants:**
- ✅ `server/modules/auth/` - Authentification
- ✅ `server/modules/documents/` - OCR et documents
- 🔄 `server/modules/chiffrage/` - En cours de migration
- ⏳ `server/modules/suppliers/` - À migrer
- ⏳ `server/modules/projects/` - À migrer
- ⏳ `server/modules/analytics/` - À migrer

### Tests

**TOUJOURS:**
- ✅ Tester après chaque modification significative
- ✅ Utiliser `asyncHandler` dans les tests (même pattern que routes)
- ✅ Vérifier couverture de code (objectif: 85% backend, 80% frontend)
- ✅ Tests exhaustifs (succès, erreurs, cas limites)
- ✅ Tests E2E pour workflows critiques

### Qualité et Robustesse

**TOUJOURS:**
- ✅ Gestion d'erreurs exhaustive (tous les cas couverts)
- ✅ Validation stricte de toutes les entrées
- ✅ Protection contre injections (SQL, XSS, etc.)
- ✅ Code clair et auto-documenté
- ✅ Types TypeScript stricts (pas de `any`)
- ✅ Documentation inline pour logique complexe
- ✅ Refactoring continu (réduction dette technique)

**NE JAMAIS:**
- ❌ Ignorer les erreurs potentielles
- ❌ Faire confiance aux entrées utilisateur
- ❌ Code dupliqué (DRY principle)
- ❌ Fonctions > 100 lignes (diviser si nécessaire)
- ❌ Types `any` (utiliser types stricts)

**Référence:** `@.cursor/rules/quality-principles.md` - Principes de qualité complets

## 🔗 Utilisation du Contexte

### Symboles @ pour Contexte Explicite

**Quand utiliser @ :**
- ✅ Pour inclure fichiers spécifiques pertinents
- ✅ Pour inclure dossiers entiers si nécessaire
- ✅ Pour référencer symboles spécifiques

**Exemples:**
```
@projectbrief.md - Pour comprendre les objectifs
@activeContext.md - Pour connaître l'état actuel
@server/utils/README-UTILS.md - Pour patterns backend
@server/modules/auth/routes.ts - Pour exemple de route modulaire
```

### Documentation Interne

**Fichiers de référence:**
- `projectbrief.md` - Objectifs et périmètre
- `productContext.md` - Expérience utilisateur
- `activeContext.md` - Focus actuel et prochaines étapes
- `systemPatterns.md` - Patterns architecturaux
- `techContext.md` - Stack technique
- `progress.md` - État du projet

**Documentation technique:**
- `server/utils/README-UTILS.md` - Utilitaires backend
- `server/modules/README.md` - Architecture modulaire
- `docs/` - Documentation technique détaillée

## 🎯 Workflows Courants

### Créer une Nouvelle Route

**Étapes:**
1. Vérifier si module existe dans `server/modules/`
2. Si oui, ajouter route dans `server/modules/[module]/routes.ts`
3. Si non, créer nouveau module ou ajouter dans module approprié
4. Utiliser `asyncHandler`, `validateBody`, `logger`
5. Ajouter rate limiting si nécessaire
6. Tester la route
7. Vérifier couverture de code

**Pattern:**
```typescript
import { asyncHandler } from '../utils/error-handler';
import { validateBody } from '../middleware/validation';
import { logger } from '../utils/logger';
import { rateLimits } from '../middleware/rate-limit';
import { z } from 'zod';

const schema = z.object({
  field: z.string().min(1)
});

router.post('/api/route',
  rateLimits.general, // Rate limiting
  validateBody(schema), // Validation
  asyncHandler(async (req, res) => {
    logger.info('[Module] Action', {
      metadata: { userId: req.user?.id }
    });
    
    const result = await service.method(req.body);
    res.json({ success: true, data: result });
  })
);
```

### Modifier un Service

**Étapes:**
1. Lire `server/utils/README-UTILS.md`
2. Vérifier si service existe dans `server/services/`
3. Utiliser `logger` au lieu de `console.log`
4. Utiliser `withErrorHandling` pour gestion d'erreurs
5. Ajouter métriques de performance si nécessaire
6. Tester le service
7. Vérifier impact sur performance

**Pattern:**
```typescript
import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';

async method(params: Params): Promise<Result> {
  const endTimer = logger.time('method');
  
  return withErrorHandling(
    async () => {
      logger.debug('[Service] Début méthode', {
        metadata: { params }
      });
      
      const result = await this.storage.method(params);
      
      endTimer(); // Log automatique du temps
      
      logger.info('[Service] Méthode réussie', {
        metadata: { resultId: result.id }
      });
      
      return result;
    },
    {
      operation: 'method',
      service: 'ServiceName',
      metadata: { params }
    }
  );
}
```

### Ajouter une Fonctionnalité IA

**Étapes:**
1. Vérifier services IA existants dans `server/services/`
2. Utiliser `getAIService()` pour obtenir instance
3. Toujours fournir `userRole` pour RBAC
4. Utiliser `SQLEngineService` pour SQL sécurisé
5. Implémenter cache intelligent
6. Ajouter circuit breaker si nécessaire
7. Tester avec différents rôles utilisateur
8. Monitorer coûts et latence

**Pattern:**
```typescript
import { getAIService } from '../services/AIService';
import { SQLEngineService } from '../services/SQLEngineService';
import { getContextCacheService } from '../services/ContextCacheService';

const aiService = getAIService(storage);
const cacheService = getContextCacheService(storage);
const sqlEngine = new SQLEngineService(
  aiService,
  rbacService,
  businessContextService,
  eventBus,
  storage
);

// Avec cache
const cacheKey = generateCacheKey(query, userRole);
const cached = await cacheService.get(cacheKey);
if (cached) return cached;

const result = await sqlEngine.executeNaturalLanguageQuery({
  naturalLanguageQuery: query,
  userId: user.id,
  userRole: user.role
});

await cacheService.set(cacheKey, result, { ttl: 86400 });
```

### Déployer une Modification

**Étapes:**
1. Vérifier tests passent localement
2. Vérifier types TypeScript (`npm run check`)
3. Vérifier couverture de code
4. Commit et push
5. Vérifier CI/CD passe
6. Tester en staging (si disponible)
7. Déployer en production
8. Monitorer après déploiement

**Checklist:**
- [ ] Tests passent localement
- [ ] Types TypeScript OK
- [ ] Couverture de code maintenue
- [ ] CI/CD passe
- [ ] Variables d'environnement vérifiées
- [ ] Backup base de données (si majeur)
- [ ] Plan de rollback préparé
- [ ] Monitoring activé

## 📝 Conventions de Code

### Naming
- **Services:** `PascalCase` + `Service` (ex: `AIService`)
- **Routes:** `kebab-case` (ex: `/api/offers/:id`)
- **Composants:** `PascalCase` (ex: `OfferCard`)
- **Hooks:** `camelCase` avec préfixe `use` (ex: `useOffer`)
- **Types:** `PascalCase` (ex: `User`, `InsertUser`)
- **Modules:** `kebab-case` (ex: `auth`, `documents`)
- **Fichiers:** `kebab-case` pour routes, `PascalCase` pour composants

### Imports
```typescript
// 1. Imports externes
import { z } from 'zod';
import { Router } from 'express';

// 2. Imports partagés
import type { User, InsertUser } from '@shared/schema';

// 3. Imports internes (utils d'abord)
import { logger } from '../utils/logger';
import { asyncHandler } from '../utils/error-handler';
import { validateBody } from '../middleware/validation';

// 4. Imports services/modules
import { getAIService } from '../services/AIService';
import { createAuthRouter } from '../modules/auth';
```

### Structure de Fichiers

**Backend (Module):**
```
server/modules/[module]/
├── routes.ts          # Routes du module
├── services.ts        # Services spécifiques (optionnel)
├── types.ts           # Types spécifiques
└── index.ts           # Exports publics
```

**Backend (Service):**
```
server/services/
└── [Service]Service.ts  # Service métier
```

**Frontend (Composant):**
```
client/src/
├── components/
│   ├── ui/            # Composants UI réutilisables
│   └── [Component].tsx # Composants métier
├── hooks/
│   └── use[Hook].ts   # Hooks React
└── pages/
    └── [Page].tsx      # Pages
```

### Documentation Inline

**TOUJOURS:**
- ✅ Documenter fonctions complexes (> 20 lignes)
- ✅ Documenter types/interfaces publiques
- ✅ Documenter "pourquoi" pas "quoi"
- ✅ Exemples d'utilisation pour APIs publiques

**Pattern:**
```typescript
/**
 * Calcule la durée d'une phase de projet en fonction du contexte
 * 
 * @param phase - Phase du projet (etude, planification, etc.)
 * @param context - Contexte du projet (type, complexité, surface, etc.)
 * @param activeRules - Règles métier actives pour ce projet
 * @returns Durée calculée avec confiance et facteurs appliqués
 * 
 * @example
 * ```typescript
 * const duration = await calculatePhaseDuration(
 *   'etude',
 *   { type: 'fenetre', complexity: 'moyen', surface: 50 },
 *   activeRules
 * );
 * ```
 */
async calculatePhaseDuration(
  phase: ProjectStatus,
  context: ProjectContext,
  activeRules: DateIntelligenceRule[]
): Promise<PhaseDurationResult> {
  // ...
}
```

## 🚀 CI/CD et Déploiement

### Pipeline CI/CD Actuel

**GitHub Actions:** `.github/workflows/ci.yml`

**Étapes automatiques:**
1. ✅ Type checking TypeScript (`npm run check`)
2. ✅ Tests unitaires backend (Vitest)
3. ✅ Tests de régression Monday.com
4. ✅ Génération couverture de code
5. ✅ Upload artifacts (coverage reports)

**TOUJOURS:**
- ✅ Vérifier que les tests passent avant commit
- ✅ Utiliser `npm ci` (pas `npm install`) en CI
- ✅ Vérifier couverture de code après modifications
- ✅ Tester localement avant push

**NE JAMAIS:**
- ❌ Pousser code qui casse les tests CI
- ❌ Ignorer les warnings TypeScript
- ❌ Commiter sans vérifier localement

### Déploiement

**Environnements:**
- **Development:** Local avec Docker Compose (`npm run dev:nhost`)
- **Production:** VPS OVH avec Docker (`docker-compose.production.yml`)

**Workflow de Déploiement:**

1. **Pré-déploiement:**
   ```bash
   # Vérifier tests
   npm run test
   
   # Vérifier types
   npm run check
   
   # Build production
   npm run build
   ```

2. **Déploiement Production:**
   ```bash
   # Sur serveur VPS
   git pull origin main
   npm ci
   npm run build
   docker-compose -f docker-compose.production.yml up -d --build
   ```

3. **Post-déploiement:**
   - Vérifier logs: `docker-compose -f docker-compose.production.yml logs -f`
   - Vérifier santé application
   - Monitorer métriques

**TOUJOURS:**
- ✅ Faire backup base de données avant déploiement majeur
- ✅ Tester en staging avant production
- ✅ Vérifier variables d'environnement
- ✅ Monitorer après déploiement
- ✅ Avoir plan de rollback

**NE JAMAIS:**
- ❌ Déployer sans tests
- ❌ Déployer vendredi soir
- ❌ Ignorer les erreurs de build
- ❌ Modifier production directement

### Infrastructure as Code (IaC)

**Docker Compose:**
- `docker-compose.yml` - Développement local
- `docker-compose.production.yml` - Production

**TOUJOURS:**
- ✅ Versionner configurations Docker
- ✅ Utiliser variables d'environnement pour secrets
- ✅ Documenter changements infrastructure
- ✅ Tester configurations localement

**Référence:** `@docs/NHOST_DEPLOYMENT.md` - Guide déploiement complet

## 📊 Monitoring et Observabilité

### Logging Structuré

**TOUJOURS:**
- ✅ Utiliser `logger` de `server/utils/logger.ts` (jamais `console.log`)
- ✅ Inclure correlation IDs pour traçabilité
- ✅ Logger avec métadonnées structurées
- ✅ Niveaux appropriés (info, warn, error, fatal)

**Pattern:**
```typescript
import { logger } from '../utils/logger';

logger.info('Opération réussie', {
  metadata: {
    module: 'ModuleName',
    operation: 'operationName',
    userId: req.user?.id,
    entityId: entity.id,
    correlationId: req.correlationId
  }
});
```

### Métriques

**Métriques à Monitorer:**
- ✅ Latence API (objectif < 100ms)
- ✅ Latence chatbot (objectif < 3s)
- ✅ Taux d'erreur
- ✅ Cache hit rate
- ✅ Utilisation mémoire/CPU
- ✅ Requêtes DB lentes (> 1s)

**TOUJOURS:**
- ✅ Logger métriques performance
- ✅ Alerter sur dégradation
- ✅ Monitorer services externes (IA, APIs tierces)

### Alertes

**Alertes Critiques:**
- ❌ Taux d'erreur > 5%
- ❌ Latence API > 500ms
- ❌ Circuit breakers ouverts
- ❌ Base de données inaccessible
- ❌ Services IA indisponibles

**TOUJOURS:**
- ✅ Configurer alertes pour métriques critiques
- ✅ Avoir plan d'action pour chaque alerte
- ✅ Documenter procédures d'incident

## 🔒 Sécurité et Conformité

### Authentification et Autorisation

**TOUJOURS:**
- ✅ Utiliser Microsoft OAuth en production
- ✅ Vérifier RBAC sur toutes les routes sensibles
- ✅ Valider permissions avant opérations
- ✅ Logger tentatives d'accès non autorisées

**NE JAMAIS:**
- ❌ Exposer endpoints sans authentification
- ❌ Faire confiance aux données client
- ❌ Stocker secrets en clair
- ❌ Logger données sensibles

### Protection des Données

**TOUJOURS:**
- ✅ Valider toutes les entrées (Zod)
- ✅ Sanitizer requêtes SQL (Drizzle ORM uniquement)
- ✅ Protéger contre injections (SQL, XSS)
- ✅ Utiliser HTTPS en production
- ✅ Chiffrer données sensibles

**NE JAMAIS:**
- ❌ Exécuter SQL brut
- ❌ Faire confiance aux entrées utilisateur
- ❌ Exposer données sensibles dans logs
- ❌ Transmettre secrets en clair

### Rate Limiting

**TOUJOURS:**
- ✅ Appliquer rate limiting global
- ✅ Rate limiting par route pour endpoints sensibles
- ✅ Logger tentatives de rate limit
- ✅ Configurer limites appropriées

**Pattern:**
```typescript
// Global
app.use(rateLimits.general); // 100 req/h

// Par route
router.post('/api/sensitive',
  rateLimits.processing, // 10 req/h
  asyncHandler(async (req, res) => {
    // ...
  })
);
```

### Conformité

**Standards:**
- ✅ Respect normes BTP françaises (RT2012, PMR, BBC)
- ✅ Gestion calendriers BTP (congés, saisonnalité)
- ✅ Traçabilité complète des actions
- ✅ Protection données personnelles (RGPD)

## 🤖 MLOps et Services IA

### Gestion des Modèles IA

**Services IA:**
- `AIService` - Sélection automatique modèle (Claude/GPT)
- `ChatbotOrchestrationService` - Pipeline complet
- `SQLEngineService` - Text-to-SQL sécurisé
- `BusinessContextService` - Contexte métier enrichi

**TOUJOURS:**
- ✅ Utiliser `getAIService()` pour obtenir instance (singleton)
- ✅ Toujours fournir `userRole` pour RBAC
- ✅ Utiliser cache intelligent (24h pour requêtes IA)
- ✅ Monitorer coûts et latence
- ✅ Circuit breakers pour appels IA

**NE JAMAIS:**
- ❌ Créer nouvelles instances de services IA
- ❌ Appeler APIs IA sans timeout
- ❌ Ignorer erreurs services IA
- ❌ Exécuter SQL brut (toujours via SQLEngineService)

### Cache et Performance IA

**TOUJOURS:**
- ✅ Utiliser cache pour requêtes similaires
- ✅ Invalider cache lors modifications données
- ✅ Monitorer cache hit rate
- ✅ Optimiser prompts pour réduire tokens

**Pattern:**
```typescript
// Vérification cache
const cacheKey = generateCacheKey(query, userRole);
const cached = await cacheService.get(cacheKey);
if (cached) return cached;

// Génération avec timeout
const result = await Promise.race([
  aiService.generate(query),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), 30000)
  )
]);

// Mise en cache
await cacheService.set(cacheKey, result, { ttl: 86400 });
```

## ⚠️ Points d'Attention Actuels

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

### Déploiement
- Automatiser pipeline CI/CD complet
- Ajouter tests E2E dans CI
- Automatiser déploiement production (optionnel)

## 🔗 Références Rapides

### Documentation Projet
- **Règles détaillées:** `.cursor/rules/`
- **Documentation projet:** Fichiers `*.md` à la racine
- **Documentation technique:** `docs/`
- **Utilitaires:** `server/utils/README-UTILS.md`

### Déploiement
- **Guide déploiement:** `@docs/NHOST_DEPLOYMENT.md`
- **CI/CD:** `.github/workflows/ci.yml`
- **Docker:** `docker-compose.yml`, `docker-compose.production.yml`

### Monitoring
- **Logging:** `server/utils/logger.ts`
- **Métriques:** Services avec logging structuré
- **Alertes:** Circuit breakers, rate limiting

### Sécurité
- **Auth:** `server/modules/auth/`
- **RBAC:** `server/services/RBACService.ts`
- **Validation:** `server/middleware/validation.ts`

## 🎯 Optimisation du Comportement de l'Agent

**Référence:** `@.cursor/rules/agent-optimization.md` - Stratégies d'optimisation complètes  
**Référence:** `@.cursor/rules/autonomous-workflows.md` - Workflows autonomes pour runs plus longs  
**Référence:** `@.cursor/rules/auto-detection.md` - Détection automatique des anti-patterns  
**Référence:** `@.cursor/rules/advanced-learning.md` - Stratégies d'apprentissage avancées (Reflexion, ICE)  
**Référence:** `@.cursor/rules/context-search.md` - Recherche contextuelle avancée  
**Référence:** `@.cursor/rules/long-term-autonomy.md` - Autonomie longue durée (heures/jours)  
**Référence:** `@.cursor/rules/automated-testing-debugging.md` - Tests E2E et débogage automatisé  
**Référence:** `@.cursor/rules/transversal-performance.md` - Performance transversale et autonomie  
**Référence:** `@.cursor/rules/pre-task-evaluation.md` - **NOUVEAU** Évaluation préalable impérative (rapidité, performance, robustesse, maintenabilité)

### Stratégies d'Optimisation

**Avant de Commencer une Tâche:**
1. ✅ **ÉVALUER PRÉALABLEMENT** différentes approches selon 4 critères (rapidité, performance, robustesse, maintenabilité)
2. ✅ Lire `activeContext.md` pour connaître l'état actuel
3. ✅ Lire `projectbrief.md` pour comprendre le périmètre
4. ✅ Lire `systemPatterns.md` pour comprendre l'architecture
5. ✅ Vérifier fichiers de référence pertinents avec `@`
6. ✅ Comprendre le contexte avant de modifier
7. ✅ Chercher code similaire existant (`codebase_search`)
8. ✅ Détecter anti-patterns dans fichiers cibles
9. ✅ Corriger anti-patterns automatiquement

**Référence:** `@.cursor/rules/pre-task-evaluation.md` - Évaluation préalable complète

**Pendant le Développement:**
1. ✅ Utiliser patterns établis (ne pas réinventer)
2. ✅ Réutiliser code existant (DRY principle)
3. ✅ Suivre conventions de code du projet
4. ✅ Détecter et corriger anti-patterns en temps réel
5. ✅ Valider modifications après chaque étape
6. ✅ Tester au fur et à mesure
7. ✅ Logger avec contexte structuré

**Après le Développement:**
1. ✅ Détecter anti-patterns dans code modifié
2. ✅ Corriger anti-patterns automatiquement
3. ✅ Valider types TypeScript
4. ✅ Valider conventions du projet
5. ✅ Vérifier tests passent
6. ✅ Vérifier couverture de code
7. ✅ Vérifier pas de régression
8. ✅ Mettre à jour documentation si nécessaire
9. ✅ Documenter apprentissages

### Utilisation Optimale du Contexte

**Quand utiliser @ :**
- ✅ Pour inclure fichiers spécifiques pertinents
- ✅ Pour inclure dossiers entiers si nécessaire
- ✅ Pour référencer symboles spécifiques
- ✅ Pour comprendre patterns existants
- ✅ Pour éviter duplication

**Exemples:**
```
@projectbrief.md - Pour comprendre les objectifs
@activeContext.md - Pour connaître l'état actuel
@server/utils/README-UTILS.md - Pour patterns backend
@server/modules/auth/routes.ts - Pour exemple de route modulaire
@.cursor/rules/quality-principles.md - Pour principes de qualité
```

**NE JAMAIS:**
- ❌ Inclure fichiers non pertinents
- ❌ Dupliquer code existant
- ❌ Ignorer patterns établis
- ❌ Modifier sans comprendre le contexte

### Recherche et Exploration

**Avant de Modifier:**
1. ✅ Chercher code similaire existant
2. ✅ Vérifier si fonctionnalité existe déjà
3. ✅ Comprendre dépendances
4. ✅ Identifier impacts potentiels

**Outils de Recherche:**
- ✅ `codebase_search` pour recherche sémantique
- ✅ `grep` pour recherche exacte
- ✅ `glob_file_search` pour trouver fichiers
- ✅ `read_file` pour lire fichiers pertinents

**Pattern:**
```typescript
// 1. Chercher code similaire (recherche hiérarchique)
// Niveau 1: Recherche générale
const general = await codebase_search("How does X work?", ["server"]);

// Niveau 2: Recherche ciblée sur patterns
const patterns = await codebase_search("What are the patterns for X?", ["server"]);

// Niveau 3: Recherche exacte
const exact = await grep("pattern", "server");

// Niveau 4: Lecture ciblée
const files = identifyRelevantFiles(general, patterns, exact);
const contents = await Promise.all(files.map(f => read_file(f)));
```

**Référence:** `@.cursor/rules/context-search.md` - Recherche contextuelle avancée

**Pattern Complet:**
```typescript
// 1. Chercher code similaire (recherche hiérarchique)
// Niveau 1: Recherche générale
const general = await codebase_search("How does X work?", ["server"]);

// Niveau 2: Recherche ciblée sur patterns
const patterns = await codebase_search("What are the patterns for X?", ["server"]);

// Niveau 3: Recherche exacte
const exact = await grep("pattern", "server");

// Niveau 4: Lecture ciblée
const files = identifyRelevantFiles(general, patterns, exact);
const contents = await Promise.all(files.map(f => read_file(f)));

// 5. Comprendre patterns
read_file("server/utils/README-UTILS.md");

// 6. Appliquer patterns
```

### Gestion des Erreurs et Debugging

**TOUJOURS:**
- ✅ Lire messages d'erreur complets
- ✅ Vérifier logs structurés
- ✅ Utiliser correlation IDs pour traçabilité
- ✅ Tester cas limites
- ✅ Vérifier validation des entrées

**NE JAMAIS:**
- ❌ Ignorer erreurs potentielles
- ❌ Supprimer code sans comprendre pourquoi
- ❌ Modifier sans tester
- ❌ Ignorer warnings TypeScript

### Amélioration Continue

**TOUJOURS:**
- ✅ Refactoriser code dupliqué
- ✅ Améliorer patterns existants
- ✅ Documenter décisions techniques
- ✅ Optimiser performance si nécessaire
- ✅ Réduire dette technique

**Pattern:**
```typescript
// Avant: Code dupliqué
function method1() {
  // ... logique A
  // ... logique B
}

function method2() {
  // ... logique A (dupliqué)
  // ... logique C
}

// Après: Code réutilisable
function sharedLogicA() {
  // ... logique A
}

function method1() {
  sharedLogicA();
  // ... logique B
}

function method2() {
  sharedLogicA();
  // ... logique C
}
```

## 🚀 Autonomie et Runs Longs

### Stratégies pour Runs Autonomes Plus Longs

**Principe:** L'agent doit être capable de travailler de manière autonome sur des runs plus longs sans intervention humaine.

**TOUJOURS:**
- ✅ Planifier les tâches complexes en sous-tâches
- ✅ Valider chaque étape avant de continuer
- ✅ Détecter et corriger les erreurs automatiquement
- ✅ Documenter les actions importantes
- ✅ Adapter les stratégies selon les résultats

### 1. Planification Autonome

**Pattern:**
```typescript
// 1. Analyser tâche complète
const task = analyzeTask(userRequest);

// 2. Décomposer en sous-tâches
const subtasks = decomposeTask(task);

// 3. Planifier exécution
const plan = planExecution(subtasks);

// 4. Exécuter avec validation à chaque étape
for (const subtask of plan) {
  const result = await executeSubtask(subtask);
  validateResult(result);
  if (!result.success) {
    await autoCorrect(result);
  }
}
```

### 2. Validation et Auto-Correction Continue

**Pattern:**
```typescript
// Après chaque modification
const validation = await validateModification(modifiedCode);
if (!validation.success) {
  const correctedCode = await autoCorrect(modifiedCode, validation.errors);
  const revalidation = await validateModification(correctedCode);
  if (!revalidation.success) {
    await documentIssue(correctedCode, revalidation.errors);
  }
}
```

### 3. Gestion d'Erreurs Autonome

**Pattern:**
```typescript
async function executeWithRecovery(operation: () => Promise<Result>): Promise<Result> {
  let attempts = 0;
  while (attempts < 3) {
    try {
      const result = await operation();
      if (validateResult(result)) {
        return result;
      }
      await applyCorrection(result);
      attempts++;
    } catch (error) {
      const correction = analyzeError(error);
      if (correction.canAutoCorrect) {
        await applyCorrection(correction);
        attempts++;
      } else {
        await documentError(error);
        throw error;
      }
    }
  }
  throw new Error('Max attempts reached');
}
```

### 4. Apprentissage Continu

**Pattern:**
```typescript
// Après chaque action
const analysis = analyzeResult(result);
if (analysis.success) {
  await recordSuccessPattern(action, result);
} else {
  await recordFailurePattern(action, result);
}
const adaptedStrategy = adaptStrategy(analysis);
await updateStrategy(adaptedStrategy);
```

**Référence:** `@.cursor/rules/autonomous-workflows.md` - Workflows autonomes complets  
**Référence:** `@.cursor/rules/auto-detection.md` - Détection automatique des anti-patterns

## 📚 Ressources et Références

### Documentation Essentielle

**Fichiers de Contexte:**
- `projectbrief.md` - Objectifs et périmètre
- `productContext.md` - Expérience utilisateur
- `activeContext.md` - Focus actuel et prochaines étapes
- `systemPatterns.md` - Patterns architecturaux
- `techContext.md` - Stack technique
- `progress.md` - État du projet

**Règles Détaillées:**
- `.cursor/rules/core.md` - Règles fondamentales
- `.cursor/rules/quality-principles.md` - Principes de qualité
- `.cursor/rules/code-quality.md` - Standards qualité code
- `.cursor/rules/backend.md` - Patterns backend
- `.cursor/rules/frontend.md` - Patterns frontend
- `.cursor/rules/workflows.md` - Workflows détaillés
- `.cursor/rules/agent-optimization.md` - Stratégies d'optimisation agent
- `.cursor/rules/autonomous-workflows.md` - Workflows autonomes pour runs plus longs
- `.cursor/rules/auto-detection.md` - Détection automatique des anti-patterns
- `.cursor/rules/advanced-learning.md` - **NOUVEAU** Stratégies d'apprentissage avancées (Reflexion, ICE)
- `.cursor/rules/context-search.md` - **NOUVEAU** Recherche contextuelle avancée
- `.cursor/rules/context-usage.md` - Utilisation optimale du contexte

**Documentation Technique:**
- `server/utils/README-UTILS.md` - Utilitaires backend
- `server/modules/README.md` - Architecture modulaire
- `docs/` - Documentation technique détaillée
- `docs/NHOST_DEPLOYMENT.md` - Guide déploiement

### Quick Reference

**Créer une route API:**
1. `@.cursor/rules/core.md`
2. `@.cursor/rules/backend.md`
3. `@.cursor/rules/workflows.md`
4. `@server/modules/auth/routes.ts` (exemple)

**Créer un composant React:**
1. `@.cursor/rules/core.md`
2. `@.cursor/rules/frontend.md`
3. `@.cursor/rules/workflows.md`
4. `@client/src/components/ui/button.tsx` (exemple)

**Modifier un service IA:**
1. `@.cursor/rules/core.md`
2. `@.cursor/rules/ai-services.md`
3. `@server/services/AIService.ts`
4. `@server/services/ChatbotOrchestrationService.ts`

**Déployer:**
1. `@docs/NHOST_DEPLOYMENT.md`
2. `.github/workflows/ci.yml`
3. `docker-compose.production.yml`

---

**Note:** Ce fichier est une alternative simple aux règles structurées. Pour plus de détails, voir `.cursor/rules/`.

**Version:** 2.0.0  
**Dernière mise à jour:** 2025-01-29

