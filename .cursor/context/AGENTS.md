# AGENTS.md - Instructions pour Cursor AI

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)

Ce fichier fournit des instructions simples et directes pour guider Cursor AI dans le projet Saxium.

## 🎯 Contexte du Projet

Saxium est une application full-stack de gestion de projets pour **JLM Menuiserie** (BTP/Menuiserie française). Stack: React 19 + TypeScript, Express 5, PostgreSQL (Drizzle ORM), IA multi-modèles (Claude Sonnet 4 + GPT-5).

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

1. Vérifier si module existe dans `server/modules/`
2. Si oui, ajouter route dans `server/modules/[module]/routes.ts`
3. Si non, créer nouveau module ou ajouter dans module approprié
4. Utiliser `asyncHandler`, `validateBody`, `logger`
5. Tester la route

### Modifier un Service

1. Lire `server/utils/README-UTILS.md`
2. Vérifier si service existe dans `server/services/`
3. Utiliser `logger` au lieu de `console.log`
4. Utiliser `withErrorHandling` pour gestion d'erreurs
5. Tester le service

### Ajouter une Fonctionnalité IA

1. Vérifier services IA existants dans `server/services/`
2. Utiliser `getAIService()` pour obtenir instance
3. Toujours fournir `userRole` pour RBAC
4. Utiliser `SQLEngineService` pour SQL sécurisé
5. Tester avec différents rôles utilisateur

## 📝 Conventions de Code

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

## 🔗 Références Rapides

- **Règles détaillées:** `.cursor/rules/`
- **Documentation projet:** Fichiers `*.md` à la racine
- **Documentation technique:** `docs/`
- **Utilitaires:** `server/utils/README-UTILS.md`

---

**Note:** Ce fichier est une alternative simple aux règles structurées. Pour plus de détails, voir `.cursor/rules/`.

