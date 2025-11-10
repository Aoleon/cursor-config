# Règles Core - Saxium

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)

## 🎯 Contexte du Projet

Saxium est une application full-stack de gestion de projets pour **JLM Menuiserie** (BTP/Menuiserie française). L'application couvre le cycle complet : Appels d'Offres → Offres → Projets (6 phases) → SAV.

**Stack:** React 19 + TypeScript, Express 5, PostgreSQL (Drizzle ORM), IA multi-modèles (Claude Sonnet 4 + GPT-5)

**Architecture:** Migration progressive vers modules (`server/modules/*`), services métier (`server/services/*`), types partagés (`shared/schema.ts`)

## 🏆 Philosophie de Qualité

**Objectif:** Application **parfaite** et **exemple en matière de qualité**

**Priorités (dans l'ordre):**
1. **Robustesse** - Résistance aux erreurs, gestion d'erreurs complète
2. **Maintenabilité** - Code clair, documenté, testé, évolutif
3. **Performance** - Optimisation continue, latence minimale

**Principe:** Toujours privilégier robustesse et maintenabilité. Performance vient après, mais toujours optimiser.

**Référence:** `@.cursor/rules/quality-principles.md` - Principes de qualité complets

## 📋 Règles Fondamentales

### 1. Toujours Lire la Documentation Avant de Modifier

- ✅ **Lire `server/utils/README-UTILS.md`** avant toute modification backend
- ✅ **Lire `projectbrief.md`** pour comprendre le périmètre
- ✅ **Lire `systemPatterns.md`** pour comprendre l'architecture
- ✅ **Lire `activeContext.md`** pour connaître l'état actuel

### 2. Utilisation des Utilitaires Partagés

**NE JAMAIS:**
- ❌ Utiliser `console.log`/`error` dans le code serveur (utiliser `logger` de `server/utils/logger.ts`)
- ❌ Créer des `try-catch` dans les routes (utiliser `asyncHandler` de `server/utils/error-handler.ts`)
- ❌ Lancer des erreurs génériques `throw new Error()` (utiliser erreurs typées)

**TOUJOURS:**
- ✅ Utiliser `asyncHandler` pour toutes les routes Express
- ✅ Utiliser `logger` avec métadonnées structurées
- ✅ Utiliser erreurs typées (`ValidationError`, `NotFoundError`, etc.)

### 3. Gestion des Erreurs

```typescript
// ✅ CORRECT
import { asyncHandler } from '../utils/error-handler';
import { ValidationError, NotFoundError } from '../utils/error-handler';
import { logger } from '../utils/logger';

router.post('/api/route', asyncHandler(async (req, res) => {
  if (!req.body.field) {
    throw new ValidationError('field requis');
  }
  
  logger.info('Action effectuée', {
    metadata: { userId: req.user?.id, field: req.body.field }
  });
  
  const result = await service.method();
  res.json({ success: true, data: result });
}));

// ❌ INCORRECT
router.post('/api/route', async (req, res) => {
  try {
    console.log('Action');
    if (!req.body.field) {
      throw new Error('field requis');
    }
    // ...
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur' });
  }
});
```

### 4. Logging Structuré

```typescript
// ✅ CORRECT
import { logger } from '../utils/logger';

logger.info('Opération réussie', {
  metadata: {
    module: 'ModuleName',
    operation: 'operationName',
    userId: req.user?.id,
    entityId: entity.id
  }
});

logger.error('Erreur opération', error, {
  metadata: {
    module: 'ModuleName',
    operation: 'operationName',
    userId: req.user?.id
  }
});

// ❌ INCORRECT
console.log('Opération réussie');
console.error('Erreur:', error);
```

### 5. Types et Validation

**TOUJOURS:**
- ✅ Utiliser types depuis `@shared/schema.ts`
- ✅ Valider avec Zod avant traitement
- ✅ Utiliser `validateBody`/`validateQuery` middleware

```typescript
// ✅ CORRECT
import type { User, InsertUser } from '@shared/schema';
import { z } from 'zod';
import { validateBody } from '../middleware/validation';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email()
});

router.post('/api/users', 
  validateBody(schema),
  asyncHandler(async (req, res) => {
    const userData: InsertUser = req.body;
    // ...
  })
);
```

### 6. Architecture Modulaire

**Lors de la création/modification de routes:**
- ✅ Préférer créer/modifier dans `server/modules/[module]/routes.ts`
- ✅ Utiliser factory pattern: `export function create[Module]Router(...)`
- ✅ Exporter depuis `server/modules/[module]/index.ts`
- ⚠️ Éviter de modifier `server/routes-poc.ts` (legacy, migration en cours)

### 7. Base de Données

**NE JAMAIS:**
- ❌ Créer des migrations SQL manuelles (utiliser `npm run db:push`)
- ❌ Changer les types de colonnes ID (serial ↔ varchar)
- ❌ Modifier directement `drizzle.config.ts`

**TOUJOURS:**
- ✅ Modifier le schéma dans `shared/schema.ts`
- ✅ Utiliser Drizzle ORM pour les requêtes
- ✅ Utiliser transactions pour opérations multiples

### 8. Tests

**TOUJOURS:**
- ✅ Tester après chaque modification significative
- ✅ Utiliser `asyncHandler` dans les tests (même pattern que routes)
- ✅ Vérifier couverture de code (objectif: 85% backend, 80% frontend)
- ✅ Tests exhaustifs (succès, erreurs, cas limites)
- ✅ Tests E2E pour workflows critiques

### 9. Qualité et Robustesse

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

## 🔗 Références Essentielles

- **Documentation projet:** `projectbrief.md`, `productContext.md`, `systemPatterns.md`, `techContext.md`
- **État actuel:** `activeContext.md`, `progress.md`
- **Utilitaires:** `server/utils/README-UTILS.md`
- **Modules:** `server/modules/README.md`

