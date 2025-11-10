# Audit des Dépendances - Saxium

**Date:** 20 octobre 2025  
**Total dépendances:** 135  
**Packages obsolètes:** 83 (61%)

---

## 🎯 Résumé Exécutif

L'application utilise 83 packages obsolètes sur 135 dépendances totales. Plusieurs mises à jour **MAJOR** critiques sont disponibles, notamment :

- **React 18 → 19** (MAJOR - breaking changes significatifs)
- **Vite 5 → 7** (MAJOR x2 - refonte architecture)
- **Tailwind 3 → 4** (MAJOR - nouvelle configuration)
- **Zod 3 → 4** (MAJOR - API changes)
- **Express 4 → 5** (MAJOR - middleware changes)

**Recommandation** : Approche progressive par phases avec tests à chaque étape.

---

## 📊 Catégorisation par Niveau de Risque

### 🟢 RISQUE FAIBLE (Patch/Minor - Compatible)

**Radix UI Components** (31 packages) - SÛRS à mettre à jour
```
@radix-ui/react-accordion: 1.2.4 → 1.2.12
@radix-ui/react-alert-dialog: 1.1.7 → 1.1.15
@radix-ui/react-aspect-ratio: 1.1.3 → 1.1.7
@radix-ui/react-avatar: 1.1.4 → 1.1.10
@radix-ui/react-checkbox: 1.1.5 → 1.3.3
@radix-ui/react-collapsible: 1.1.4 → 1.1.12
@radix-ui/react-context-menu: 2.2.7 → 2.2.16
@radix-ui/react-dialog: 1.1.7 → 1.1.15
@radix-ui/react-dropdown-menu: 2.1.7 → 2.1.16
@radix-ui/react-hover-card: 1.1.7 → 1.1.15
@radix-ui/react-label: 2.1.3 → 2.1.7
@radix-ui/react-menubar: 1.1.7 → 1.1.16
@radix-ui/react-navigation-menu: 1.2.6 → 1.2.14
@radix-ui/react-popover: 1.1.7 → 1.1.15
@radix-ui/react-progress: 1.1.3 → 1.1.7
@radix-ui/react-radio-group: 1.2.4 → 1.3.8
@radix-ui/react-scroll-area: 1.2.4 → 1.2.10
@radix-ui/react-select: 2.1.7 → 2.2.6
@radix-ui/react-separator: 1.1.3 → 1.1.7
@radix-ui/react-slider: 1.2.4 → 1.3.6
@radix-ui/react-slot: 1.2.0 → 1.2.3
@radix-ui/react-switch: 1.1.4 → 1.2.6
@radix-ui/react-tabs: 1.1.4 → 1.1.13
@radix-ui/react-toast: 1.2.7 → 1.2.15
@radix-ui/react-toggle: 1.1.3 → 1.1.10
@radix-ui/react-toggle-group: 1.1.3 → 1.1.11
@radix-ui/react-tooltip: 1.2.0 → 1.2.8
```

**Icônes & Utilities**
```
lucide-react: 0.453.0 → 0.546.0 (MINOR - ajout d'icônes)
autoprefixer: 10.4.20 → 10.4.21 (PATCH)
bufferutil: 4.0.8 → 4.0.9 (PATCH)
sharp: 0.34.3 → 0.34.4 (PATCH)
```

**Testing Libraries**
```
@testing-library/jest-dom: 6.6.4 → 6.9.1 (MINOR)
@playwright/test: 1.54.1 → 1.56.1 (MINOR)
playwright: 1.54.1 → 1.56.1 (MINOR)
```

**Build Tools (Minor)**
```
esbuild: 0.25.0 → 0.25.11 (PATCH)
postcss: 8.4.47 → 8.5.6 (MINOR)
tsx: 4.19.2 → 4.20.6 (MINOR)
```

**Types (Minor)**
```
@types/express-session: 1.18.0 → 1.18.2 (PATCH)
@types/ws: 8.5.13 → 8.18.1 (MINOR)
```

---

### 🟡 RISQUE MOYEN (Minor avec Features)

**React Query** - Nouvelles features, pas de breaking changes
```
@tanstack/react-query: 5.60.5 → 5.90.5 (MINOR - 30 versions)
Changements: Nouvelles optimisations, bug fixes, amélioration TypeScript
Impact: Faible - API stable en v5
```

**React Hook Form** - Améliorations et bug fixes
```
react-hook-form: 7.55.0 → 7.65.0 (MINOR)
Impact: Faible - Compatible avec resolvers actuels
```

**Drizzle ORM** - Évolution rapide mais compatible
```
drizzle-orm: 0.39.1 → 0.39.3 (PATCH sûr) ou → 0.44.6 (MINOR - beaucoup de features)
drizzle-kit: 0.30.4 → 0.30.6 (PATCH sûr) ou → 0.31.5 (MINOR)
drizzle-zod: 0.7.0 → 0.7.1 (PATCH sûr) ou → 0.8.3 (MINOR)
Impact: Moyen - Vérifier breaking changes Drizzle entre 0.39 et 0.44
Recommandation: Commencer par 0.39.3, puis tester 0.44.6 si nécessaire
```

**Tailwind Plugins** - Minor sans breaking
```
@tailwindcss/typography: 0.5.15 → 0.5.19 (PATCH)
@tailwindcss/vite: 4.1.3 → 4.1.14 (MINOR - compatible Tailwind 3.x)
tw-animate-css: 1.2.5 → 1.4.0 (MINOR)
tailwind-merge: 2.6.0 → 2.6.0 (à jour) mais latest → 3.3.1 (MAJOR)
```

**Wouter** - Router stable
```
wouter: 3.3.5 → 3.7.1 (MINOR - nouvelles features)
Impact: Faible - API compatible
```

**Middlewares Express**
```
express-session: 1.18.1 → 1.18.2 (PATCH)
openid-client: 6.6.2 → 6.8.1 (MINOR)
```

**Document Tools (Minor)**
```
jspdf: 3.0.2 → 3.0.3 (PATCH)
puppeteer: 24.20.0 → 24.25.0 (MINOR)
node-sql-parser: 5.3.12 → 5.3.13 (PATCH)
msw: 2.10.4 → 2.11.6 (MINOR)
```

**React Components (Minor)**
```
react-icons: 5.4.0 → 5.5.0 (MINOR)
```

**Replit Plugins**
```
@replit/vite-plugin-cartographer: 0.2.7 → 0.3.2 (MINOR)
```

---

### 🔴 RISQUE ÉLEVÉ (MAJOR - Breaking Changes)

#### **Frontend Core - React 19 Ecosystem**

**⚠️ React 19 - BREAKING CHANGES MAJEURS**
```
react: 18.3.1 → 19.2.0 (MAJOR)
react-dom: 18.3.1 → 19.2.0 (MAJOR)
@types/react: 18.3.12 → 19.2.2 (MAJOR)
@types/react-dom: 18.3.1 → 19.2.2 (MAJOR)

Breaking Changes principaux:
- Nouveau compilateur React (React Compiler intégré)
- API use() pour Suspense
- Changements dans forwardRef (deprecated)
- Nouvelles règles de hooks
- Server Components natifs
- Form actions natives

Impact: TRÈS ÉLEVÉ - Tous les composants React doivent être vérifiés
Recommandation: NE PAS mettre à jour maintenant - rester en React 18.x
Alternative: Tester React 19 dans une branche séparée
```

**Vite 7 - REFONTE ARCHITECTURE**
```
vite: 5.4.19 → 7.1.11 (MAJOR x2)
@vitejs/plugin-react: 4.3.3 → 5.0.4 (MAJOR)

Breaking Changes:
- Nouvelle architecture de build
- Changements configuration
- Breaking dans les plugins
- Environnement Node.js requis: >=18.20.0

Impact: TRÈS ÉLEVÉ - Configuration Vite + tous les plugins
Recommandation: NE PAS mettre à jour maintenant
Alternative: Rester en Vite 5.x (mettre à jour 5.4.19 → 5.4.21 seulement)
```

**Tailwind 4 - NOUVELLE ARCHITECTURE CSS**
```
tailwindcss: 3.4.17 → 4.1.14 (MAJOR)

Breaking Changes:
- Nouvelle configuration (CSS-first au lieu de JS)
- Changements dans les plugins
- Nouvelles conventions de nommage
- Migration manuelle requise

Impact: ÉLEVÉ - Toute la configuration Tailwind + styles
Recommandation: NE PAS mettre à jour maintenant
Alternative: Rester en Tailwind 3.x (mettre à jour 3.4.17 → 3.4.18)
```

**Zod 4 - API CHANGES**
```
zod: 3.25.76 → 4.1.12 (MAJOR)
zod-validation-error: 3.5.3 → 4.0.2 (MAJOR)

Breaking Changes:
- Nouvelles méthodes de validation
- Changements dans les erreurs
- Modifications API .parse()/.safeParse()

Impact: ÉLEVÉ - Tous les schémas Zod (70+ fichiers)
Recommandation: Tester en branche séparée
Alternative: Rester en Zod 3.x
```

#### **Backend Core**

**Express 5 - MIDDLEWARE CHANGES**
```
express: 4.21.2 → 5.1.0 (MAJOR)
@types/express: 4.17.21 → 5.0.3 (MAJOR)

Breaking Changes:
- Changements dans les middlewares
- Nouvelles signatures de callbacks
- Path routing changes
- Promesses natives supportées

Impact: MOYEN-ÉLEVÉ - Tous les middlewares Express
Recommandation: Tester en branche séparée
Documentation: https://expressjs.com/en/guide/migrating-5.html
```

**Node Types 24** - NOUVEAU LTS
```
@types/node: 20.16.11 → 24.8.1 (MAJOR)

Impact: MOYEN - Types mis à jour pour Node 24
Note: Replit utilise Node 20 actuellement
Recommandation: Attendre migration Node 24 sur Replit
```

#### **SDKs Externes**

**Anthropic SDK - BREAKING CHANGES**
```
@anthropic-ai/sdk: 0.37.0 → 0.67.0 (MAJOR - 30 versions)

Breaking Changes potentiels:
- Nouvelles méthodes API
- Changements dans les types
- Nouvelle structure de réponses

Impact: ÉLEVÉ - Tous les appels Claude (chatbot, OCR)
Recommandation: Lire changelog 0.37 → 0.67
Action requise: Tester tous les workflows AI
```

**OpenAI SDK v6 - MAJOR REFACTOR**
```
openai: 5.22.0 → 6.5.0 (MAJOR)

Breaking Changes:
- Nouvelle API client
- Changements dans les types
- Nouvelles méthodes streaming

Impact: ÉLEVÉ - Embeddings, chat completion
Recommandation: Lire migration guide OpenAI v5→v6
```

**Neon Database - v1.0 STABLE**
```
@neondatabase/serverless: 0.10.4 → 1.0.2 (MAJOR)

Breaking Changes:
- API stabilisée
- Nouvelles méthodes de connexion
- Changements dans les transactions

Impact: CRITIQUE - Toutes les requêtes DB
Recommandation: Tester exhaustivement
```

**React Hook Form Resolvers**
```
@hookform/resolvers: 3.10.0 → 5.2.2 (MAJOR x2)

Breaking Changes:
- Nouvelle API avec Zod 4
- Changements dans la validation

Impact: ÉLEVÉ si mise à jour Zod 4
Recommandation: Synchroniser avec décision Zod
```

#### **UI Libraries avec Breaking Changes**

**Framer Motion 12**
```
framer-motion: 11.13.1 → 12.23.24 (MAJOR)

Breaking Changes:
- Nouvelle API d'animations
- Changements dans les variants
- Layout animations modifiées

Impact: MOYEN - Animations UI
Recommandation: Vérifier animations existantes
```

**Date-fns 4**
```
date-fns: 3.6.0 → 4.1.0 (MAJOR)

Breaking Changes:
- Nouvelle API de formatage
- Changements dans les locales
- Timezone handling modifié

Impact: MOYEN - Formatage dates partout
Recommandation: Tester tous les formatages
```

**React Day Picker 9**
```
react-day-picker: 8.10.1 → 9.11.1 (MAJOR)

Breaking Changes:
- Nouvelle API composant
- Changements dans les props
- Nouvelle structure CSS

Impact: MOYEN - Sélecteurs de dates
Recommandation: Vérifier tous les date pickers
```

**Recharts 3**
```
recharts: 2.15.2 → 3.3.0 (MAJOR)

Breaking Changes:
- Nouvelle API graphiques
- Changements dans les props
- Responsive behavior modifié

Impact: MOYEN - Graphiques analytics
Recommandation: Tester tous les graphiques
```

**React Resizable Panels 3**
```
react-resizable-panels: 2.1.7 → 3.0.6 (MAJOR)

Breaking Changes:
- Nouvelle API panels
- Changements dans les callbacks

Impact: FAIBLE - Peu utilisé
```

#### **Document Processing**

**PDF Parse 2**
```
pdf-parse: 1.1.1 → 2.4.4 (MAJOR)

Breaking Changes:
- Nouvelle API parsing
- Changements dans les options

Impact: MOYEN - OCR PDF fournisseurs
Recommandation: Tester extraction PDF
```

**MS SQL 12**
```
mssql: 11.0.1 → 12.0.0 (MAJOR)

Breaking Changes:
- Nouvelle API connexion
- Changements dans les types

Impact: FAIBLE si non utilisé activement
```

**Happy DOM 20 & jsdom 27**
```
happy-dom: 18.0.1 → 20.0.7 (MAJOR)
jsdom: 26.1.0 → 27.0.1 (MAJOR)

Impact: FAIBLE - Tests uniquement
```

---

## 🎯 Stratégie de Mise à Jour Recommandée

### Option 1 : CONSERVATIVE (Recommandé)

**Phase 1 - Sûre** (2-3h)
```bash
# Radix UI (31 packages) + utilities
npm install @radix-ui/react-accordion@latest @radix-ui/react-alert-dialog@latest \
  @radix-ui/react-aspect-ratio@latest @radix-ui/react-avatar@latest \
  # ... (tous les 31 packages Radix)
  lucide-react@latest autoprefixer@latest bufferutil@latest sharp@latest \
  @testing-library/jest-dom@latest esbuild@latest postcss@latest tsx@latest
```
Tests: Vérification visuelle composants UI

**Phase 2 - Moyennement sûre** (4-6h)
```bash
# React Query, Playwright, Drizzle (minor)
npm install @tanstack/react-query@5.90.5 @playwright/test@1.56.1 \
  playwright@1.56.1 react-hook-form@latest wouter@latest \
  drizzle-orm@0.39.3 drizzle-kit@0.30.6 drizzle-zod@0.7.1
```
Tests: Suite Playwright complète + tests API

**Phase 3 - Vite 5.x seulement** (1-2h)
```bash
# Mise à jour Vite 5.4.21 (PATCH)
npm install vite@5.4.21
```
Tests: Build + hot reload

**Phase 4 - SDKs** (6-8h + tests)
```bash
# Anthropic, OpenAI, Neon (ATTENTION: MAJOR)
npm install @anthropic-ai/sdk@latest openai@latest @neondatabase/serverless@latest
```
Tests: Workflows AI complets + database queries

**Total: 13-19h de travail**

### Option 2 : AGGRESSIVE (Risque élevé)

Inclut React 19, Vite 7, Tailwind 4, Zod 4 - **NON RECOMMANDÉ**
- Risque de casser l'application complètement
- Temps de migration: 40-60h
- Tests exhaustifs requis

---

## 📝 Breaking Changes à Surveiller

### React 19 (si migration future)
- Remplacer `forwardRef` par `ref` props directement
- Mettre à jour hooks customs
- Vérifier Server Components compatibility
- Tester Form Actions

### Vite 7 (si migration future)
- Migrer configuration vite.config.ts
- Mettre à jour tous les plugins
- Vérifier environment variables
- Tester build production

### Tailwind 4 (si migration future)
- Migrer tailwind.config.ts vers CSS
- Mettre à jour plugins
- Vérifier toutes les classes custom
- Tester responsive

### Express 5 (si migration)
- Mettre à jour middlewares
- Vérifier error handlers
- Tester toutes les routes

### Zod 4 (si migration)
- Migrer tous les schémas
- Mettre à jour error handling
- Vérifier drizzle-zod compatibility

---

## 🔗 Documentation Utile

- React 19: https://react.dev/blog/2024/12/05/react-19
- Vite 7: https://vitejs.dev/guide/migration.html
- Tailwind 4: https://tailwindcss.com/docs/upgrade-guide
- Express 5: https://expressjs.com/en/guide/migrating-5.html
- Zod 4: https://github.com/colinhacks/zod/releases
- Anthropic SDK: https://github.com/anthropics/anthropic-sdk-typescript/releases
- OpenAI SDK: https://github.com/openai/openai-node/releases

---

## ✅ Décision Finale

**Recommandation:** Commencer par l'**Option 1 (CONSERVATIVE)** - Phases 1-3 uniquement.

**Raison:** 
- Minimise les risques de régression
- Apporte des améliorations de performance et bug fixes
- Évite les breaking changes majeurs
- Permet de tester progressivement

**Report pour plus tard:**
- React 19 (attendre stabilisation + ecosystem)
- Vite 7 (attendre plugins compatibles)
- Tailwind 4 (migration complexe)
- Zod 4 (dépendance critique)

**Prochaine étape:** Exécuter Phase 1 (Radix UI + utilities)
