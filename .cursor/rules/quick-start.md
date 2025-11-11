# Quick Start - Saxium

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

Guide de démarrage rapide avec les 5 règles essentielles à vérifier avant toute modification.

## 🚀 Checklist Rapide (5 Règles Essentielles)

### 1. Lire la Documentation Pertinente

**Avant toute modification:**
- [ ] Lire `activeContext.md` pour connaître l'état actuel
- [ ] Lire `projectbrief.md` pour comprendre le périmètre
- [ ] Lire `systemPatterns.md` pour comprendre l'architecture
- [ ] Lire `server/utils/README-UTILS.md` si modification backend

**Référence:** `@.cursor/rules/core.md` - Règles fondamentales

### 2. Évaluer l'Approche (Si Tâche Complexe)

**Pour tâches complexes:**
- [ ] Consulter `@.cursor/rules/pre-task-quick.md` - Checklist rapide 5 points
- [ ] Consulter `@.cursor/rules/pre-task-evaluation.md` - Évaluation complète
- [ ] Évaluer selon 4 critères : rapidité, performance, robustesse, maintenabilité

**Référence:** `@.cursor/rules/pre-task-evaluation.md` - Évaluation préalable complète

### 3. Utiliser les Patterns Établis

**Backend:**
- [ ] Utiliser `asyncHandler` pour toutes les routes (pas de try-catch)
- [ ] Utiliser `logger` de `server/utils/logger.ts` (jamais `console.log`)
- [ ] Utiliser erreurs typées (`ValidationError`, `NotFoundError`, etc.)
- [ ] Valider avec Zod avant traitement

**Frontend:**
- [ ] Utiliser TanStack Query pour server state
- [ ] Utiliser React Hook Form + Zod pour formulaires
- [ ] Utiliser composants UI depuis `@/components/ui/`

**Référence:** `@.cursor/rules/backend.md` - Patterns backend  
**Référence:** `@.cursor/rules/frontend.md` - Patterns frontend

### 4. Éviter les Anti-Patterns

**NE JAMAIS:**
- ❌ Utiliser `console.log`/`error` dans le code serveur
- ❌ Créer des `try-catch` dans les routes
- ❌ Lancer des erreurs génériques `throw new Error()`
- ❌ Exécuter SQL brut (toujours via Drizzle ORM)
- ❌ Utiliser types `any` (utiliser types stricts)

**Référence:** `@.cursor/rules/anti-patterns.md` - Anti-patterns consolidés

### 5. Tester et Valider

**Après modification:**
- [ ] Vérifier types TypeScript (`npm run check`)
- [ ] Vérifier tests passent localement
- [ ] Vérifier couverture de code maintenue
- [ ] Vérifier pas de régression

**Référence:** `@.cursor/rules/testing.md` - Patterns tests

### 6. Completion des Todos (IMPÉRATIF pour Tâches Complexes)

**Pour tâches avec plusieurs todos:**
- [ ] Vérifier l'état de tous les todos avant de s'arrêter
- [ ] Continuer jusqu'à completion de tous les todos `in_progress` ou `pending`
- [ ] Marquer les todos comme `completed` uniquement après validation
- [ ] Ne pas s'interrompre tant qu'il reste des todos incomplets

**Référence:** `@.cursor/rules/todo-completion.md` - Règles de completion des todos (IMPÉRATIF)

### 7. Itération Automatique jusqu'à Perfection (IMPÉRATIF)

**Pour tâches nécessitant itération:**
- [ ] Détecter tous les problèmes après chaque modification (TypeScript, tests, fonctionnalités)
- [ ] Itérer automatiquement jusqu'à ce que tous les problèmes soient résolus
- [ ] Corriger automatiquement tous les problèmes auto-corrigeables
- [ ] Valider complètement avant de s'arrêter (TypeScript, tests, fonctionnalité complète)
- [ ] Ne pas s'arrêter s'il reste des erreurs ou des tests qui échouent

**Référence:** `@.cursor/rules/iterative-perfection.md` - Règles d'itération automatique jusqu'à perfection (IMPÉRATIF)

### 8. Exécution Persistante (IMPÉRATIF pour Runs Longs)

**⚠️ RÈGLE CRITIQUE - DÉTECTION DES PROCHAINES ÉTAPES:**

**AVANT TOUT ARRÊT, L'AGENT DOIT:**

1. **Analyser sa propre réponse** pour détecter :
   - "prochaines étapes", "étapes suivantes", "next steps"
   - "tâches restantes", "il reste", "il faudra", "actions à faire"
   - "ensuite", "plus tard", "dans un second temps", "then", "later"

2. **Si des mentions sont détectées:**
   - [ ] **PLANIFIER automatiquement** toutes les étapes mentionnées
   - [ ] **CRÉER des todos** pour chaque étape identifiée
   - [ ] **EXÉCUTER immédiatement** ces todos sans s'arrêter
   - [ ] **VÉRIFIER** que toutes les étapes sont complétées

**Pour runs autonomes ou tâches complexes:**
- [ ] Vérifier exhaustivement avant TOUT arrêt (todos, erreurs, tests, fonctionnalités, validation)
- [ ] Forcer continuation si vérifications échouent
- [ ] Détecter signes d'arrêt prématuré (temps court, todos non vérifiés, validation non effectuée)
- [ ] **Détecter mentions de "prochaines étapes" dans la réponse de l'agent (OBLIGATOIRE)**
- [ ] **Détecter annonces de tâches restantes sans exécution (OBLIGATOIRE)**
- [ ] **Détecter mentions d'actions futures ("ensuite", "plus tard") (OBLIGATOIRE)**
- [ ] **Planifier automatiquement les prochaines étapes identifiées (OBLIGATOIRE)**
- [ ] **Exécuter immédiatement les prochaines étapes planifiées (OBLIGATOIRE)**
- [ ] **Ne jamais s'arrêter si des prochaines étapes sont mentionnées (OBLIGATOIRE)**
- [ ] Maintenir keep-alive pendant runs longs (checkpoints réguliers toutes les 5 minutes)
- [ ] Optimiser contexte régulièrement (toutes les 15 minutes)
- [ ] Sauvegarder état régulièrement (toutes les 5-10 minutes)
- [ ] Détecter stagnation et forcer progression
- [ ] Continuer jusqu'à completion complète même pour runs très longs

**RÈGLE ABSOLUE:**
**Si l'agent mentionne des "prochaines étapes" dans sa réponse, il DOIT les planifier et les exécuter immédiatement. Aucun arrêt n'est autorisé tant que ces étapes ne sont pas complétées.**

**Référence:** `@.cursor/rules/persistent-execution.md` - Règles d'exécution persistante (IMPÉRATIF)

### 9. Itérations Avancées et Coordination des Rôles (IMPÉRATIF pour Runs Longs)

**Pour runs autonomes ou tâches complexes:**
- [ ] Apprendre des patterns d'erreurs précédents pour optimiser itérations
- [ ] Prioriser corrections selon apprentissages (fréquence, impact, succès)
- [ ] Adapter stratégies selon apprentissages
- [ ] Coordonner rôles avec apprentissage collectif
- [ ] Valider avec validation croisée améliorée entre rôles
- [ ] Améliorer continuellement les stratégies d'itération
- [ ] Adapter itérations selon complexité de la tâche
- [ ] Réutiliser solutions efficaces pour erreurs similaires
- [ ] Évaluer performances après chaque itération
- [ ] Détecter dégradations de performance en temps réel
- [ ] Adapter stratégies dynamiquement selon performances
- [ ] Optimiser ressources (contexte, mémoire, calculs) en temps réel
- [ ] Coordonner rôles avec feedback en temps réel
- [ ] Valider à plusieurs niveaux (syntaxe, sémantique, architecture, business)
- [ ] Gérer proactivement les ressources pour runs longs

**Référence:** `@.cursor/rules/advanced-iteration-and-role-coordination.md` - Règles d'itérations avancées et coordination des rôles (IMPÉRATIF)

### 10. Supervision Architecte Sénior (IMPÉRATIF pour Tâches Complexes)

**Pour tâches complexes (> 3 todos) ou runs autonomes:**
- [ ] Examiner demande initiale complètement avant de créer todos (fonctionnel, technique, business)
- [ ] Créer tous les todos nécessaires pour compléter la demande initiale
- [ ] Superviser, prioriser, piloter et revoir le code avec critères d'architecte
- [ ] Réévaluer completion après chaque itération
- [ ] Comparer demande initiale avec résultats obtenus
- [ ] Identifier tâches manquantes ou incomplètes
- [ ] Calculer taux de completion précis
- [ ] Créer nouvelles tâches si completion < 100%
- [ ] Itérer jusqu'à completion complète à 100%
- [ ] Évaluer performances après chaque tâche (temps, qualité, robustesse, maintenabilité)
- [ ] Prioriser intelligemment les tâches selon impact, urgence, dette technique
- [ ] Superviser architecture globale, valider décisions architecturales
- [ ] Guider développements vers objectifs, éviter dérives architecturales
- [ ] Review automatique avec critères d'architecte (architecture, qualité, robustesse, performance, maintenabilité, sécurité)
- [ ] Itérer jusqu'à perfection atteinte avec supervision continue

**Référence:** `@.cursor/rules/senior-architect-oversight.md` - Règles de supervision architecte sénior (IMPÉRATIF)

### 9. Supervision Consultant Client (IMPÉRATIF pour Tâches Complexes)

**Pour tâches complexes (> 3 todos) ou runs autonomes:**
- [ ] Valider alignement avec cahier des charges (objectifs POC, périmètre fonctionnel, principes)
- [ ] Valider alignement avec résultats d'audit (problèmes identifiés, points de friction, goulots d'étranglement)
- [ ] Valider alignement avec objectifs business (problèmes résolus, résultats attendus)
- [ ] Valider alignement avec problématiques de base (5 problématiques de base)
- [ ] Détecter fonctionnalités hors périmètre ou contraires aux attentes client
- [ ] Vérifier que les développements résolvent les problématiques de base identifiées
- [ ] Valider conjointement avec architecte sénior avant de continuer

**Référence:** `@.cursor/rules/client-consultant-oversight.md` - Règles de supervision consultant client (IMPÉRATIF)

### 10. Gestionnaire de Migration/Refactoring (IMPÉRATIF pour Migrations/Refactorings)

**Pour tâches de migration/refactoring:**
- [ ] Superviser migration de `routes-poc.ts` (11,998 LOC) vers modules
- [ ] Superviser migration de `storage-poc.ts` (8,758 LOC) vers repositories
- [ ] Détecter automatiquement les régressions pendant la migration
- [ ] Valider cohérence des modules migrés
- [ ] Gérer dépendances entre modules
- [ ] Maintenir compatibilité avec code legacy
- [ ] Exécuter tests de régression après migration

**Référence:** `@.cursor/rules/migration-refactoring-manager.md` - Règles de gestionnaire migration/refactoring (IMPÉRATIF)

### 11. Gestionnaire de Dette Technique (IMPÉRATIF pour Consolidations/Dette Technique)

**Pour tâches de consolidation/dette technique:**
- [ ] Identifier services dupliqués (Monday.com, Analytics, Intelligence)
- [ ] Planifier consolidation des services dupliqués
- [ ] Superviser réduction fichiers monolithiques (`routes-poc.ts`, `storage-poc.ts`)
- [ ] Détecter anti-patterns et code smells
- [ ] Prioriser élimination dette technique selon impact
- [ ] Valider qualité après consolidation
- [ ] Exécuter tests de régression après consolidation

**Référence:** `@.cursor/rules/tech-debt-manager.md` - Règles de gestionnaire dette technique (IMPÉRATIF)

### 12. Spécialiste Hard Coding (IMPÉRATIF pour Tâches Complexes)

**Pour tâches complexes nécessitant hard coding:**
- [ ] Réduire radicalement les erreurs avec approche "hard coding" (défenses en profondeur)
- [ ] Automatiser tâches très complexes avec approche créative innovante
- [ ] Explorer solutions non conventionnelles et proposer approches innovantes
- [ ] Travailler sous supervision architecte sénior
- [ ] Valider solutions avec architecte sénior
- [ ] Itérer jusqu'à validation architecturale
- [ ] Documenter innovations et solutions hard coding

**Référence:** `@.cursor/rules/hard-coding-specialist.md` - Règles de spécialiste hard coding (IMPÉRATIF)

### 13. Détection Proactive de Code Similaire (IMPÉRATIF)

**Avant création/modification de code:**
- [ ] Rechercher code similaire dans le projet
- [ ] Rechercher patterns similaires
- [ ] Réutiliser code existant si similaire (> 80%)
- [ ] Suivre patterns établis du projet
- [ ] Éviter duplication de code

**Référence:** `@.cursor/rules/similar-code-detection.md` - Règles de détection proactive (IMPÉRATIF)

### 14. Mémoire Persistante des Apprentissages (IMPÉRATIF)

**Pour tâches récurrentes ou similaires:**
- [ ] Chercher dans la mémoire avant d'agir
- [ ] Réutiliser patterns réussis
- [ ] Réutiliser solutions efficaces
- [ ] Éviter de répéter les mêmes erreurs
- [ ] Sauvegarder nouveaux apprentissages

**Référence:** `@.cursor/rules/learning-memory.md` - Règles de mémoire persistante (IMPÉRATIF)

### 15. Validation Préventive (IMPÉRATIF)

**Avant toute modification:**
- [ ] Analyser impact de la modification
- [ ] Valider dépendances
- [ ] Détecter problèmes potentiels
- [ ] Valider types et tests
- [ ] Appliquer corrections préventives si nécessaire

**Référence:** `@.cursor/rules/preventive-validation.md` - Règles de validation préventive (IMPÉRATIF)

### 16. Récupération Automatique après Erreurs (IMPÉRATIF)

**Si erreur détectée:**
- [ ] Détecter erreur automatiquement
- [ ] Classifier type d'erreur
- [ ] Récupérer automatiquement si possible
- [ ] Réessayer avec corrections
- [ ] Apprendre de l'erreur

**Référence:** `@.cursor/rules/error-recovery.md` - Règles de récupération automatique (IMPÉRATIF)

### 17. Détection Proactive des Conflits (IMPÉRATIF)

**Avant modification:**
- [ ] Détecter conflits de code potentiels
- [ ] Détecter conflits de dépendances potentiels
- [ ] Résoudre automatiquement si possible
- [ ] Proposer résolutions pour conflits complexes

**Référence:** `@.cursor/rules/conflict-detection.md` - Règles de détection proactive (IMPÉRATIF)

### 18. Détection Proactive des Bugs (IMPÉRATIF)

**Avant implémentation:**
- [ ] Détecter bugs potentiels
- [ ] Analyser risques de bugs
- [ ] Corriger automatiquement si possible
- [ ] Prévenir bugs récurrents

**Référence:** `@.cursor/rules/bug-prevention.md` - Règles de détection proactive (IMPÉRATIF)

## 📋 Workflow Simplifié (3 Étapes)

### Étape 1: Préparation

1. **Lire documentation pertinente**
   - `activeContext.md` - État actuel
   - `projectbrief.md` - Périmètre
   - `systemPatterns.md` - Architecture

2. **Évaluer approche** (si complexe)
   - Consulter `@.cursor/rules/pre-task-quick.md`
   - Évaluer selon 4 critères si nécessaire

3. **Chercher code similaire**
   - Utiliser `codebase_search` pour recherche sémantique
   - Vérifier si fonctionnalité existe déjà
   - Comprendre dépendances

### Étape 2: Implémentation

1. **Utiliser patterns établis**
   - Backend: `asyncHandler`, `logger`, erreurs typées, Zod
   - Frontend: TanStack Query, React Hook Form, composants UI
   - Database: Drizzle ORM, types depuis `@shared/schema.ts`

2. **Éviter anti-patterns**
   - Pas de `console.log`/`error`
   - Pas de `try-catch` dans routes
   - Pas de SQL brut
   - Pas de types `any`

3. **Suivre conventions**
   - Naming conventions
   - Structure de fichiers
   - Documentation inline

### Étape 3: Validation

1. **Vérifier types TypeScript**
   ```bash
   npm run check
   ```

2. **Vérifier tests**
   ```bash
   npm run test
   ```

3. **Vérifier couverture**
   - Maintenir objectifs : 85% backend, 80% frontend

4. **Vérifier pas de régression**
   - Tests E2E passent
   - Pas de breaking changes

## 🎯 Exemples par Type de Tâche

### Créer une Route API

**Règles à charger:**
1. `@.cursor/rules/core.md` - Règles fondamentales
2. `@.cursor/rules/backend.md` - Patterns backend
3. `@.cursor/rules/workflows.md` - Workflow création route
4. `@.cursor/rules/examples.md` - Exemples concrets

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
  rateLimits.general,
  validateBody(schema),
  asyncHandler(async (req, res) => {
    logger.info('[Module] Action', {
      metadata: { userId: req.user?.id }
    });
    
    const result = await service.method(req.body);
    res.json({ success: true, data: result });
  })
);
```

**Référence:** `@server/modules/auth/routes.ts` - Exemple de route modulaire

### Créer un Composant React

**Règles à charger:**
1. `@.cursor/rules/core.md` - Règles fondamentales
2. `@.cursor/rules/frontend.md` - Patterns frontend
3. `@.cursor/rules/workflows.md` - Workflow création composant
4. `@.cursor/rules/examples.md` - Exemples concrets

**Pattern:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

export function MyComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ['myData'],
    queryFn: fetchMyData
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <Button onClick={handleClick}>Action</Button>
    </div>
  );
}
```

**Référence:** `@client/src/components/ui/button.tsx` - Exemple composant UI

### Modifier un Service

**Règles à charger:**
1. `@.cursor/rules/core.md` - Règles fondamentales
2. `@.cursor/rules/backend.md` - Patterns backend
3. `@.cursor/rules/workflows.md` - Workflow modification service

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
      
      endTimer();
      
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

**Référence:** `@server/utils/README-UTILS.md` - Utilitaires backend

## 🔗 Références Essentielles

### Documentation Prioritaire

**P0 - Toujours appliquées:**
- `@.cursor/rules/core.md` - Règles fondamentales
- `@.cursor/rules/quality-principles.md` - Principes de qualité
- `@.cursor/rules/code-quality.md` - Standards qualité code

**P1 - Selon contexte:**
- `@.cursor/rules/backend.md` - Si modification backend
- `@.cursor/rules/frontend.md` - Si modification frontend
- `@.cursor/rules/database.md` - Si modification DB
- `@.cursor/rules/ai-services.md` - Si modification IA

**P2 - Sur demande:**
- `@.cursor/rules/pre-task-evaluation.md` - Évaluation complète
- `@.cursor/rules/pre-task-quick.md` - Évaluation rapide
- `@.cursor/rules/workflows.md` - Workflows détaillés

### Fichiers de Contexte

- `@projectbrief.md` - Objectifs et périmètre
- `@activeContext.md` - Focus actuel
- `@systemPatterns.md` - Patterns architecturaux

### Guides

- `@.cursor/rules/priority.md` - Priorités et matrice de chargement
- `@.cursor/rules/anti-patterns.md` - Anti-patterns consolidés
- `@.cursor/rules/examples.md` - Exemples concrets
- `@AGENTS.md` - Index simplifié des règles

---

**Note:** Ce guide de démarrage rapide couvre les 5 règles essentielles. Pour les détails complets, consultez les fichiers de règles référencés.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

