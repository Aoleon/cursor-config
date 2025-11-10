# Règles Utilisation Contexte - Saxium

**Référence:** [Cursor Working with Context](https://docs.cursor.com/guides/working-with-context)

## 🎯 Utilisation des Symboles @

### Quand Utiliser @

**✅ Utiliser @ pour:**
- Inclure fichiers spécifiques pertinents à la tâche
- Inclure dossiers entiers si nécessaire
- Référencer symboles spécifiques (fonctions, classes, types)
- Fournir contexte explicite à l'IA

**❌ Ne pas utiliser @ pour:**
- Fichiers déjà dans le contexte automatique
- Fichiers non pertinents à la tâche
- Trop de fichiers (limiter à 5-10 fichiers pertinents)

### Exemples d'Utilisation

#### Pour Comprendre l'Architecture
```
@projectbrief.md - Objectifs et périmètre du projet
@systemPatterns.md - Patterns architecturaux utilisés
@activeContext.md - État actuel et focus de travail
```

#### Pour Modifier Backend
```
@server/utils/README-UTILS.md - Patterns et utilitaires backend
@server/modules/auth/routes.ts - Exemple de route modulaire
@server/middleware/errorHandler.ts - Gestion d'erreurs
```

#### Pour Modifier Frontend
```
@client/src/components/ui/button.tsx - Exemple composant UI
@client/src/hooks/useOffer.ts - Exemple hook personnalisé
@client/src/lib/api-helpers.ts - Helpers API
```

#### Pour Services IA
```
@server/services/AIService.ts - Service IA principal
@server/services/ChatbotOrchestrationService.ts - Orchestration chatbot
@server/services/SQLEngineService.ts - Moteur SQL sécurisé
```

#### Pour Base de Données
```
@shared/schema.ts - Schéma base de données
@server/storage-poc.ts - Interface storage
@server/utils/database-helpers.ts - Helpers base de données
```

## 📚 Documentation Interne

### Fichiers de Mémoire du Projet

**Toujours référencer pour contexte complet:**
- `@projectbrief.md` - Objectifs, périmètre, fonctionnalités
- `@productContext.md` - Expérience utilisateur, workflows
- `@activeContext.md` - Focus actuel, changements récents
- `@systemPatterns.md` - Patterns architecturaux
- `@techContext.md` - Stack technique, dépendances
- `@progress.md` - État du projet, ce qui fonctionne

### Documentation Technique

**Pour modifications techniques:**
- `@server/utils/README-UTILS.md` - Utilitaires backend
- `@server/modules/README.md` - Architecture modulaire
- `@docs/` - Documentation technique détaillée

### Règles Cursor

**Pour comprendre les conventions:**
- `@.cursor/rules/core.md` - Règles fondamentales
- `@.cursor/rules/backend.md` - Règles backend
- `@.cursor/rules/frontend.md` - Règles frontend
- `@.cursor/rules/ai-services.md` - Règles services IA
- `@.cursor/rules/database.md` - Règles base de données
- `@.cursor/rules/testing.md` - Règles tests

## 🔍 Utilisation @Docs et @Web

### @Docs pour Documentation Externe

**Utiliser @Docs pour:**
- Documentation officielle frameworks (React, Express, Drizzle)
- Documentation bibliothèques (TanStack Query, Zod, Radix UI)
- Documentation outils (Vite, Playwright, Vitest)

**Exemples:**
```
@Docs React - Pour comprendre hooks React
@Docs Express - Pour patterns Express
@Docs Drizzle ORM - Pour requêtes Drizzle
@Docs TanStack Query - Pour state management
```

### @Web pour Recherche

**Utiliser @Web pour:**
- Informations récentes non dans la documentation
- Solutions à des problèmes spécifiques
- Meilleures pratiques actuelles
- Comparaisons de solutions

**Exemples:**
```
@Web "Drizzle ORM best practices 2025"
@Web "React 19 new features"
@Web "Express 5 migration guide"
```

## 📋 Workflows avec Contexte

### Workflow 1: Créer une Nouvelle Route

**Contexte nécessaire:**
```
@server/modules/auth/routes.ts - Exemple route modulaire
@server/utils/README-UTILS.md - Patterns backend
@server/middleware/validation.ts - Validation Zod
@activeContext.md - État actuel migration
```

### Workflow 2: Modifier un Service

**Contexte nécessaire:**
```
@server/services/AIService.ts - Exemple service
@server/utils/README-UTILS.md - Patterns services
@systemPatterns.md - Patterns de design
@activeContext.md - Changements récents
```

### Workflow 3: Ajouter Fonctionnalité IA

**Contexte nécessaire:**
```
@server/services/AIService.ts - Service IA principal
@server/services/ChatbotOrchestrationService.ts - Orchestration
@server/services/SQLEngineService.ts - SQL sécurisé
@.cursor/rules/ai-services.md - Règles services IA
```

### Workflow 4: Modifier Schéma Base de Données

**Contexte nécessaire:**
```
@shared/schema.ts - Schéma actuel
@server/storage-poc.ts - Interface storage
@.cursor/rules/database.md - Règles base de données
@activeContext.md - Migrations en cours
```

### Workflow 5: Créer Composant Frontend

**Contexte nécessaire:**
```
@client/src/components/ui/button.tsx - Exemple composant UI
@client/src/hooks/useOffer.ts - Exemple hook
@client/src/lib/api-helpers.ts - Helpers API
@.cursor/rules/frontend.md - Règles frontend
```

## 🎯 Bonnes Pratiques Contexte

### 1. Limiter le Nombre de Fichiers

**✅ CORRECT:**
- 5-10 fichiers pertinents maximum
- Fichiers directement liés à la tâche
- Fichiers de référence (projectbrief.md, etc.)

**❌ INCORRECT:**
- 20+ fichiers inclus
- Fichiers non pertinents
- Tous les fichiers du projet

### 2. Hiérarchiser le Contexte

**Ordre de priorité:**
1. Fichiers directement modifiés
2. Fichiers de référence (exemples, patterns)
3. Documentation projet (projectbrief.md, etc.)
4. Règles Cursor (.cursor/rules/)

### 3. Utiliser Fichiers de Mémoire

**Toujours inclure:**
- `@projectbrief.md` pour comprendre objectifs
- `@activeContext.md` pour connaître état actuel
- `@systemPatterns.md` pour comprendre architecture

### 4. Référencer Exemples Concrets

**Pour nouvelles fonctionnalités:**
- Trouver exemple similaire existant
- Référencer avec @
- Suivre le pattern établi

## 🔗 Références Rapides

### Fichiers Essentiels par Domaine

**Backend:**
- `@server/utils/README-UTILS.md`
- `@server/modules/[module]/routes.ts`
- `@server/middleware/errorHandler.ts`

**Frontend:**
- `@client/src/components/ui/[component].tsx`
- `@client/src/hooks/use[Entity].ts`
- `@client/src/lib/api-helpers.ts`

**IA:**
- `@server/services/AIService.ts`
- `@server/services/ChatbotOrchestrationService.ts`
- `@server/services/SQLEngineService.ts`

**Base de Données:**
- `@shared/schema.ts`
- `@server/storage-poc.ts`
- `@server/utils/database-helpers.ts`

---

**Note:** Utiliser le contexte de manière ciblée améliore la pertinence des suggestions de l'IA.

