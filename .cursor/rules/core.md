# Règles Core - Saxium

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)

## ⚠️ RÈGLE CRITIQUE : ANTI-INTERRUPTION - PROCHAINES ÉTAPES

**PROBLÈME IDENTIFIÉ:** L'agent s'arrête encore alors qu'il mentionne des "prochaines étapes" dans sa réponse.

**SOLUTION STRICTE - À APPLIQUER AVANT TOUT ARRÊT:**

### 🔴 Détection Obligatoire Avant Arrêt

**AVANT DE S'ARRÊTER, L'AGENT DOIT:**

1. **Analyser sa propre réponse** pour détecter les phrases suivantes :
   - "prochaines étapes", "étapes suivantes", "next steps"
   - "tâches restantes", "il reste", "il faudra", "actions à faire"
   - "ensuite", "plus tard", "dans un second temps", "then", "later"

2. **Si des mentions sont détectées:**
   - ✅ **PLANIFIER automatiquement** toutes les étapes mentionnées
   - ✅ **CRÉER des todos** pour chaque étape identifiée
   - ✅ **EXÉCUTER immédiatement** ces todos sans s'arrêter
   - ✅ **VÉRIFIER** que toutes les étapes sont complétées avant de s'arrêter

3. **RÈGLE ABSOLUE:**
   - ❌ **NE JAMAIS s'arrêter** si des "prochaines étapes" sont mentionnées
   - ❌ **NE JAMAIS mentionner** des tâches restantes sans les exécuter immédiatement
   - ❌ **NE JAMAIS dire** "ensuite" ou "plus tard" sans exécuter immédiatement

**Cette règle est CRITIQUE et doit être appliquée AVANT TOUT ARRÊT.**

---

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

- ✅ **Vérifier conflits multi-chats** avec `tsx scripts/detect-chat-conflicts.ts --file <filepath>` avant modification
- ✅ **Lire `server/utils/README-UTILS.md`** avant toute modification backend
- ✅ **Lire `projectbrief.md`** pour comprendre le périmètre
- ✅ **Lire `systemPatterns.md`** pour comprendre l'architecture
- ✅ **Lire `activeContext.md`** pour connaître l'état actuel
- ✅ **Lire `docs/COORDINATION_CHATS_CURSOR.md`** pour connaître zones de travail
- ✅ **Évaluer préalablement** différentes approches avec `@.cursor/rules/pre-task-quick.md` (checklist rapide) ou `@.cursor/rules/pre-task-evaluation.md` (évaluation complète)

**Référence:** `@.cursor/rules/multi-chat-coordination.md` - Coordination multi-chats

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

### 10. Completion des Todos (IMPÉRATIF)

**IMPÉRATIF:** Ne jamais s'arrêter tant qu'il reste des todos en cours.

**⚠️ RÈGLE CRITIQUE - DÉTECTION DES PROCHAINES ÉTAPES:**

**AVANT TOUT ARRÊT, L'AGENT DOIT:**

1. **Analyser sa propre réponse** pour détecter :
   - "prochaines étapes", "étapes suivantes", "next steps"
   - "tâches restantes", "il reste", "il faudra", "actions à faire"
   - "ensuite", "plus tard", "dans un second temps", "then", "later"

2. **Si des mentions sont détectées:**
   - ✅ **PLANIFIER automatiquement** toutes les étapes mentionnées
   - ✅ **CRÉER des todos** pour chaque étape identifiée
   - ✅ **EXÉCUTER immédiatement** ces todos sans s'arrêter
   - ✅ **VÉRIFIER** que toutes les étapes sont complétées

**TOUJOURS:**
- ✅ Vérifier l'état de tous les todos avant de s'arrêter
- ✅ Continuer jusqu'à completion de tous les todos `in_progress` ou `pending`
- ✅ Marquer les todos comme `completed` uniquement après validation
- ✅ Sauvegarder l'état des todos après chaque todo complété
- ✅ Ne pas s'interrompre tant qu'il reste des todos incomplets
- ✅ **Détecter automatiquement les mentions de "prochaines étapes" dans la réponse (OBLIGATOIRE)**
- ✅ **Planifier automatiquement les prochaines étapes identifiées (OBLIGATOIRE)**
- ✅ **Exécuter immédiatement les prochaines étapes planifiées sans s'arrêter (OBLIGATOIRE)**
- ✅ **Ne jamais s'arrêter si des prochaines étapes sont mentionnées (OBLIGATOIRE)**

**NE JAMAIS:**
- ❌ S'arrêter s'il reste des todos `in_progress`
- ❌ S'arrêter s'il reste des todos `pending`
- ❌ S'interrompre sans vérifier l'état des todos
- ❌ Marquer un todo comme `completed` sans validation
- ❌ **S'arrêter en annonçant des "prochaines étapes" sans les exécuter (INTERDIT)**
- ❌ **Mentionner des tâches restantes sans les planifier et exécuter immédiatement (INTERDIT)**
- ❌ **Mentionner qu'on va faire quelque chose "ensuite" ou "plus tard" sans l'exécuter immédiatement (INTERDIT)**
- ❌ **S'arrêter si la réponse contient des phrases comme "prochaines étapes", "il reste", "il faudra" (INTERDIT)**

**Référence:** `@.cursor/rules/todo-completion.md` - Règles de completion des todos

### 11. Itération Automatique jusqu'à Perfection (IMPÉRATIF)

**IMPÉRATIF:** Itérer automatiquement jusqu'à ce que tous les problèmes soient résolus et que la tâche soit parfaitement complétée.

**TOUJOURS:**
- ✅ Détecter tous les problèmes après chaque modification (TypeScript, tests, fonctionnalités, anti-patterns)
- ✅ Itérer automatiquement jusqu'à ce que tous les problèmes soient résolus
- ✅ Corriger automatiquement tous les problèmes auto-corrigeables
- ✅ Valider complètement avant de s'arrêter (TypeScript, tests, fonctionnalité complète)
- ✅ Ne pas s'arrêter s'il reste des erreurs ou des tests qui échouent
- ✅ Documenter problèmes non auto-corrigeables

**NE JAMAIS:**
- ❌ S'arrêter s'il reste des erreurs TypeScript
- ❌ S'arrêter s'il reste des tests qui échouent
- ❌ S'arrêter s'il reste des fonctionnalités incomplètes
- ❌ S'arrêter sans valider complètement
- ❌ Ignorer les problèmes découverts par tests

**Référence:** `@.cursor/rules/iterative-perfection.md` - Règles d'itération automatique jusqu'à perfection

### 12. Supervision Architecte Sénior (IMPÉRATIF)

**IMPÉRATIF:** Agir comme un architecte sénior qui supervise, priorise, pilote et revoit le code pour garantir excellence technique et qualité exemplaire.

**TOUJOURS:**
- ✅ Superviser, prioriser, piloter et revoir le code avec critères d'architecte pour tâches complexes (> 3 todos) ou runs autonomes
- ✅ Évaluer performances après chaque tâche (temps, qualité, robustesse, maintenabilité)
- ✅ Prioriser intelligemment les tâches selon impact, urgence, dette technique
- ✅ Superviser architecture globale, valider décisions architecturales
- ✅ Guider développements vers objectifs, éviter dérives architecturales
- ✅ Review automatique avec critères d'architecte (architecture, qualité, robustesse, performance, maintenabilité, sécurité)
- ✅ Itérer jusqu'à perfection atteinte avec supervision continue

**NE JAMAIS:**
- ❌ Ignorer supervision architecturale pour tâches complexes
- ❌ Ne pas prioriser intelligemment les tâches
- ❌ Ne pas revoir le code avec critères d'architecte
- ❌ Ne pas évaluer performances après chaque tâche
- ❌ Ne pas superviser architecture globale

**Référence:** `@.cursor/rules/senior-architect-oversight.md` - Règles de supervision architecte sénior

### 13. Supervision Consultant Client (IMPÉRATIF)

**IMPÉRATIF:** Agir comme un consultant client qui valide l'alignement business/métier de tous les développements avec le cahier des charges, les résultats d'audit et les objectifs business.

**TOUJOURS:**
- ✅ Valider alignement avec cahier des charges (objectifs POC, périmètre fonctionnel, principes) pour tâches complexes (> 3 todos) ou runs autonomes
- ✅ Valider alignement avec résultats d'audit (problèmes identifiés, points de friction, goulots d'étranglement)
- ✅ Valider alignement avec objectifs business (problèmes résolus, résultats attendus)
- ✅ Valider alignement avec problématiques de base (5 problématiques de base)
- ✅ Détecter fonctionnalités hors périmètre ou contraires aux attentes client
- ✅ Vérifier que les développements résolvent les problématiques de base identifiées
- ✅ Valider conjointement avec architecte sénior avant de continuer

**NE JAMAIS:**
- ❌ Ignorer validation business/métier pour tâches complexes
- ❌ Développer fonctionnalités hors périmètre
- ❌ Développer fonctionnalités contraires aux attentes client
- ❌ Développer fonctionnalités qui ne résolvent pas les problématiques de base
- ❌ Ne pas valider alignement avec cahier des charges
- ❌ Ne pas valider alignement avec résultats d'audit
- ❌ Ne pas valider alignement avec objectifs business

**Référence:** `@.cursor/rules/client-consultant-oversight.md` - Règles de supervision consultant client

### 14. Gestionnaire de Migration/Refactoring (IMPÉRATIF)

**IMPÉRATIF:** Superviser la migration modulaire complexe et garantir la qualité pendant la refactorisation pour améliorer maintenabilité, testabilité et performance.

**TOUJOURS:**
- ✅ Superviser migration de `routes-poc.ts` (11,998 LOC) vers modules pour tâches de migration/refactoring
- ✅ Superviser migration de `storage-poc.ts` (8,758 LOC) vers repositories pour tâches de migration/refactoring
- ✅ Détecter automatiquement les régressions pendant la migration
- ✅ Valider cohérence des modules migrés
- ✅ Gérer dépendances entre modules
- ✅ Maintenir compatibilité avec code legacy

**NE JAMAIS:**
- ❌ Migrer sans valider architecture cible
- ❌ Migrer sans gérer dépendances
- ❌ Migrer sans tests de régression
- ❌ Migrer sans valider cohérence
- ❌ Ignorer régressions détectées

**Référence:** `@.cursor/rules/migration-refactoring-manager.md` - Règles de gestionnaire migration/refactoring

### 15. Gestionnaire de Dette Technique (IMPÉRATIF)

**IMPÉRATIF:** Identifier et éliminer la dette technique (services dupliqués, fichiers monolithiques) pour améliorer maintenabilité, testabilité et performance.

**TOUJOURS:**
- ✅ Identifier services dupliqués (Monday.com, Analytics, Intelligence) pour tâches de consolidation/dette technique
- ✅ Planifier consolidation des services dupliqués
- ✅ Superviser réduction fichiers monolithiques (`routes-poc.ts`, `storage-poc.ts`)
- ✅ Détecter anti-patterns et code smells
- ✅ Prioriser élimination dette technique selon impact
- ✅ Valider qualité après consolidation

**NE JAMAIS:**
- ❌ Consolider sans analyser duplication
- ❌ Consolider sans planifier consolidation
- ❌ Consolider sans tests de régression
- ❌ Ignorer anti-patterns détectés
- ❌ Ignorer code smells détectés

**Référence:** `@.cursor/rules/tech-debt-manager.md` - Règles de gestionnaire dette technique

### 16. Spécialiste Hard Coding (IMPÉRATIF)

**IMPÉRATIF:** Réduire radicalement les erreurs et automatiser des tâches très complexes avec une approche créative et innovante, sous supervision de l'architecte sénior.

**TOUJOURS:**
- ✅ Réduire radicalement les erreurs avec approche "hard coding" (défenses en profondeur) pour tâches complexes nécessitant hard coding
- ✅ Automatiser tâches très complexes avec approche créative innovante
- ✅ Explorer solutions non conventionnelles et proposer approches innovantes
- ✅ Travailler sous supervision architecte sénior, valider solutions avec architecte
- ✅ Itérer jusqu'à validation architecturale
- ✅ Documenter innovations et solutions hard coding

**NE JAMAIS:**
- ❌ Réduire erreurs sans supervision architecte
- ❌ Automatiser sans valider efficacité
- ❌ Innover sans respecter standards architecturaux
- ❌ Ignorer recommandations architecte
- ❌ Appliquer solutions non validées

**Référence:** `@.cursor/rules/hard-coding-specialist.md` - Règles de spécialiste hard coding

### 17. Détection Proactive de Code Similaire (IMPÉRATIF)

**IMPÉRATIF:** Rechercher automatiquement du code similaire existant avant de créer ou modifier du code.

**TOUJOURS:**
- ✅ Rechercher code similaire avant création/modification
- ✅ Réutiliser code existant si similaire (> 80%)
- ✅ Suivre patterns établis du projet
- ✅ Éviter duplication de code

**NE JAMAIS:**
- ❌ Créer du code sans rechercher code similaire
- ❌ Dupliquer code existant sans raison valable
- ❌ Ignorer patterns établis du projet

**Référence:** `@.cursor/rules/similar-code-detection.md` - Règles de détection proactive de code similaire

### 18. Mémoire Persistante des Apprentissages (IMPÉRATIF)

**IMPÉRATIF:** Sauvegarder et réutiliser les apprentissages entre sessions pour améliorer l'efficacité.

**TOUJOURS:**
- ✅ Chercher dans la mémoire avant d'agir
- ✅ Réutiliser patterns réussis pour tâches similaires
- ✅ Sauvegarder nouveaux apprentissages
- ✅ Éviter de répéter les mêmes erreurs

**NE JAMAIS:**
- ❌ Ignorer la mémoire avant d'agir
- ❌ Répéter les mêmes erreurs
- ❌ Ne pas sauvegarder les apprentissages

**Référence:** `@.cursor/rules/learning-memory.md` - Règles de mémoire persistante des apprentissages

### 19. Validation Préventive (IMPÉRATIF)

**IMPÉRATIF:** Valider et analyser les impacts avant modification pour prévenir les erreurs.

**TOUJOURS:**
- ✅ Analyser impact avant modification
- ✅ Valider dépendances avant modification
- ✅ Détecter problèmes potentiels
- ✅ Valider types et tests avant modification

**NE JAMAIS:**
- ❌ Modifier sans analyser impact
- ❌ Modifier sans valider dépendances
- ❌ Ignorer problèmes potentiels

**Référence:** `@.cursor/rules/preventive-validation.md` - Règles de validation préventive

### 20. Récupération Automatique après Erreurs (IMPÉRATIF)

**IMPÉRATIF:** Récupérer automatiquement après erreurs pour améliorer la robustesse et l'autonomie.

**TOUJOURS:**
- ✅ Détecter erreurs automatiquement
- ✅ Récupérer automatiquement si possible
- ✅ Réessayer avec corrections
- ✅ Apprendre des erreurs

**NE JAMAIS:**
- ❌ Ignorer les erreurs sans tentative de récupération
- ❌ Ne pas réessayer après récupération
- ❌ Ne pas apprendre des erreurs

**Référence:** `@.cursor/rules/error-recovery.md` - Règles de récupération automatique après erreurs

### 21. Détection Proactive des Conflits (IMPÉRATIF)

**IMPÉRATIF:** Détecter automatiquement les conflits potentiels avant modification pour éviter les problèmes.

**TOUJOURS:**
- ✅ Détecter conflits de code avant modification
- ✅ Détecter conflits de dépendances avant modification
- ✅ Résoudre automatiquement si possible
- ✅ Proposer résolutions pour conflits complexes

**NE JAMAIS:**
- ❌ Modifier sans détecter conflits potentiels
- ❌ Ignorer conflits détectés
- ❌ Ne pas résoudre conflits automatiquement si possible

**Référence:** `@.cursor/rules/conflict-detection.md` - Règles de détection proactive des conflits

### 22. Détection Proactive des Bugs (IMPÉRATIF)

**IMPÉRATIF:** Détecter automatiquement les bugs potentiels avant qu'ils ne se produisent pour améliorer la qualité du code.

**TOUJOURS:**
- ✅ Détecter bugs potentiels avant implémentation
- ✅ Corriger automatiquement si possible
- ✅ Prévenir bugs récurrents
- ✅ Documenter bugs et corrections

**NE JAMAIS:**
- ❌ Ignorer bugs potentiels détectés
- ❌ Ne pas corriger bugs potentiels si possible
- ❌ Ne pas prévenir bugs récurrents

**Référence:** `@.cursor/rules/bug-prevention.md` - Règles de détection proactive des bugs

### 23. Exécution Persistante (IMPÉRATIF)

**IMPÉRATIF:** Continuer l'exécution sans interruption jusqu'à completion complète, même pour des runs très longs (plusieurs heures).

**⚠️ RÈGLE CRITIQUE - DÉTECTION DES PROCHAINES ÉTAPES:**

**AVANT TOUT ARRÊT, L'AGENT DOIT:**

1. **Analyser sa propre réponse** pour détecter :
   - "prochaines étapes", "étapes suivantes", "next steps"
   - "tâches restantes", "il reste", "il faudra", "actions à faire"
   - "ensuite", "plus tard", "dans un second temps", "then", "later"

2. **Si des mentions sont détectées:**
   - ✅ **PLANIFIER automatiquement** toutes les étapes mentionnées
   - ✅ **CRÉER des todos** pour chaque étape identifiée
   - ✅ **EXÉCUTER immédiatement** ces todos sans s'arrêter
   - ✅ **VÉRIFIER** que toutes les étapes sont complétées

**TOUJOURS:**
- ✅ Vérifier exhaustivement avant TOUT arrêt (todos, erreurs, tests, fonctionnalités, validation)
- ✅ Forcer continuation si vérifications échouent
- ✅ Détecter signes d'arrêt prématuré (temps court, todos non vérifiés, validation non effectuée)
- ✅ **Détecter mentions de "prochaines étapes" dans la réponse de l'agent (OBLIGATOIRE)**
- ✅ **Détecter annonces de tâches restantes sans exécution (OBLIGATOIRE)**
- ✅ **Détecter mentions d'actions futures ("ensuite", "plus tard") (OBLIGATOIRE)**
- ✅ **Planifier automatiquement les prochaines étapes identifiées (OBLIGATOIRE)**
- ✅ **Exécuter immédiatement les prochaines étapes planifiées (OBLIGATOIRE)**
- ✅ Maintenir keep-alive pendant runs longs (checkpoints réguliers)
- ✅ Optimiser contexte régulièrement pour éviter saturation
- ✅ Sauvegarder état régulièrement (toutes les 5-10 minutes)
- ✅ Détecter stagnation et forcer progression
- ✅ Continuer jusqu'à completion complète

**NE JAMAIS:**
- ❌ S'arrêter sans vérification exhaustive
- ❌ S'arrêter si vérifications échouent
- ❌ S'arrêter si temps d'exécution court (< 30 min) avec tâches restantes
- ❌ S'arrêter si todos non vérifiés
- ❌ S'arrêter si validation complète non effectuée
- ❌ S'arrêter si itération non complète
- ❌ Ignorer signes d'arrêt prématuré
- ❌ S'arrêter prématurément après 30-45 minutes
- ❌ **S'arrêter en annonçant des "prochaines étapes" sans les exécuter (INTERDIT)**
- ❌ **Mentionner des tâches restantes sans les planifier et exécuter immédiatement (INTERDIT)**
- ❌ **Mentionner qu'on va faire quelque chose "ensuite" ou "plus tard" sans l'exécuter immédiatement (INTERDIT)**
- ❌ **S'arrêter si la réponse contient des phrases comme "prochaines étapes", "il reste", "il faudra" (INTERDIT)**

**Référence:** `@.cursor/rules/persistent-execution.md` - Règles d'exécution persistante

### 24. Itérations Avancées et Coordination des Rôles (IMPÉRATIF)

**IMPÉRATIF:** Utiliser des itérations intelligentes avec apprentissage et une coordination avancée des rôles pour maximiser l'autonomie, la durée des runs et la qualité.

**TOUJOURS:**
- ✅ Apprendre des patterns d'erreurs précédents pour optimiser itérations
- ✅ Prioriser corrections selon apprentissages (fréquence, impact, succès)
- ✅ Adapter stratégies selon apprentissages
- ✅ Coordonner rôles avec apprentissage collectif
- ✅ Valider avec validation croisée améliorée entre rôles
- ✅ Améliorer continuellement les stratégies d'itération
- ✅ Adapter itérations selon complexité de la tâche
- ✅ Réutiliser solutions efficaces pour erreurs similaires
- ✅ Optimiser ordre des corrections selon dépendances
- ✅ Évaluer performances après chaque itération
- ✅ Détecter dégradations de performance en temps réel
- ✅ Adapter stratégies dynamiquement selon performances
- ✅ Optimiser ressources (contexte, mémoire, calculs) en temps réel
- ✅ Coordonner rôles avec feedback en temps réel
- ✅ Valider à plusieurs niveaux (syntaxe, sémantique, architecture, business)
- ✅ Gérer proactivement les ressources pour runs longs

**NE JAMAIS:**
- ❌ Ignorer apprentissages des itérations précédentes
- ❌ Ne pas prioriser corrections selon apprentissages
- ❌ Ne pas adapter stratégies selon apprentissages
- ❌ Ne pas coordonner rôles avec apprentissage collectif
- ❌ Ne pas améliorer continuellement les stratégies
- ❌ Ne pas adapter itérations selon complexité
- ❌ Ne pas réutiliser solutions efficaces
- ❌ Ignorer dégradations de performance
- ❌ Ne pas adapter stratégies selon performances
- ❌ Ignorer saturation des ressources
- ❌ Ne pas valider à plusieurs niveaux
- ❌ Ne pas coordonner rôles avec feedback en temps réel

**Référence:** `@.cursor/rules/advanced-iteration-and-role-coordination.md` - Règles d'itérations avancées et coordination des rôles

### 25. Workflow d'Itération Architecturale avec Validation Continue (IMPÉRATIF)

**IMPÉRATIF:** Suivre un workflow d'itération architecturale où l'architecte examine d'abord la demande, crée les todos, supervise l'exécution, puis réévalue jusqu'à completion complète à 100%.

**TOUJOURS:**
- ✅ Examiner demande initiale complètement avant de créer todos (fonctionnel, technique, business)
- ✅ Créer tous les todos nécessaires pour compléter la demande initiale
- ✅ Réévaluer completion après chaque itération
- ✅ Comparer demande initiale avec résultats obtenus
- ✅ Identifier tâches manquantes ou incomplètes
- ✅ Calculer taux de completion précis
- ✅ Créer nouvelles tâches si completion < 100%
- ✅ Itérer jusqu'à completion complète à 100%

**NE JAMAIS:**
- ❌ Créer todos sans examiner demande initiale complètement
- ❌ Ne pas réévaluer completion après chaque itération
- ❌ Ne pas créer nouvelles tâches si completion < 100%
- ❌ S'arrêter avant completion complète à 100%
- ❌ Ignorer tâches manquantes identifiées

**Référence:** `@.cursor/rules/senior-architect-oversight.md` - Workflow d'itération architecturale avec validation continue

### 26. Contournement Système Unifié des Limites Cursor (IMPÉRATIF)

**IMPÉRATIF:** L'agent DOIT surveiller et contourner automatiquement toutes les limites de Cursor (tool calls, contexte, MCP, fichiers, quotas) avec optimisation globale.

**TOUJOURS:**
- ✅ Surveiller toutes les limites simultanément (tool calls, contexte, MCP, fichiers, quotas)
- ✅ Détecter approche de chaque limite
- ✅ Prioriser contournements selon criticité
- ✅ Appliquer contournements coordonnés
- ✅ Optimiser globalement pour éviter conflits
- ✅ Valider que contournements fonctionnent

**Limites surveillées:**
- Tool calls (< 1000) - Checkpointing automatique
- Contexte tokens (< 200k/1M) - Max Mode, compression
- Outils MCP (< 40) - Désactivation non essentiels
- Taille fichiers (< 50KB) - Approche deux étapes
- Édition multi-fichiers - Division en modules
- Quotas mensuels - Mode économie, sélection modèle
- Performance grands projets - `.cursorignore`, segmentation

**Référence:** `@.cursor/rules/cursor-limits-workaround.md` - Système unifié de contournement (IMPÉRATIF)  
**Référence:** `@.cursor/rules/tool-call-limit-workaround.md` - Contournement limite 1000 tool calls (détails)

## 27. Décomposition des Tâches (IMPÉRATIF)

**IMPÉRATIF:** Décomposer automatiquement les tâches complexes en sous-tâches gérables selon les recommandations officielles de Cursor, avec critères de taille optimale, pensée séquentielle, Background Agent et listes structurées.

**TOUJOURS:**
- ✅ Décomposer tâches complexes avec critères de taille optimale (max 50 lignes, max 3 fichiers)
- ✅ Utiliser pensée séquentielle pour structurer les sous-tâches
- ✅ Générer listes de tâches structurées avec dépendances explicites
- ✅ Identifier opportunités Background Agent pour tâches différées
- ✅ Valider taille de chaque sous-tâche créée
- ✅ Re-décomposer si sous-tâche trop complexe
- ✅ Gérer dépendances entre sous-tâches explicitement

**NE JAMAIS:**
- ❌ Créer sous-tâches > 50 lignes de code
- ❌ Créer sous-tâches > 3 fichiers modifiés
- ❌ Ignorer dépendances entre sous-tâches
- ❌ Ne pas valider taille avant création
- ❌ Ne pas utiliser pensée séquentielle
- ❌ Ne pas générer listes structurées avec dépendances
- ❌ Ignorer opportunités Background Agent

**Référence:** `@.cursor/rules/task-decomposition.md` - Décomposition des tâches conforme documentation Cursor

## 🔗 Références Essentielles

- **Documentation projet:** `projectbrief.md`, `productContext.md`, `systemPatterns.md`, `techContext.md`
- **État actuel:** `activeContext.md`, `progress.md`
- **Utilitaires:** `server/utils/README-UTILS.md`
- **Modules:** `server/modules/README.md`

