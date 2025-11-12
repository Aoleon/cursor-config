# Technical Context - Saxium

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

---

## 🛠️ Technologies Utilisées

### Frontend

#### Core
- **React 19.2.0** : Bibliothèque UI
- **TypeScript 5.9.3** : Typage statique
- **Vite 7.1.11** : Build tool et dev server
- **Wouter 3.7.1** : Routing léger

#### State Management & Data Fetching
- **TanStack Query 5.90.5** : Gestion état serveur et cache
- **React Hook Form 7.65.0** : Gestion formulaires
- **Zod 4.1.12** : Validation schémas

#### UI Components
- **Radix UI** : Composants accessibles (50+ composants)
  - Accordion, Alert Dialog, Avatar, Checkbox, Dialog, Dropdown, etc.
- **Tailwind CSS 4.1.15** : Framework CSS utilitaire
- **Lucide React 0.546.0** : Icônes
- **Recharts 3.3.0** : Graphiques

#### Utilitaires
- **date-fns 4.1.0** : Manipulation dates
- **clsx 2.1.1** : Gestion classes CSS conditionnelles
- **nanoid 5.1.6** : Génération IDs uniques

### Backend

#### Core
- **Node.js** : Runtime JavaScript
- **Express 5.1.0** : Framework web
- **TypeScript 5.9.3** : Typage statique
- **tsx 4.20.6** : Exécution TypeScript

#### Base de Données
- **PostgreSQL** : Base de données relationnelle
- **Drizzle ORM 0.44.6** : ORM type-safe
- **Drizzle Kit 0.31.5** : Migrations
- **@neondatabase/serverless 1.0.2** : Driver Neon

#### IA et ML
- **@anthropic-ai/sdk 0.67.0** : Claude Sonnet 4
- **openai 6.5.0** : GPT-5
- **tesseract.js 6.0.1** : OCR

#### Sécurité et Auth
- **passport 0.7.0** : Authentification
- **passport-azure-ad 4.3.5** : Microsoft OAuth
- **passport-local 1.0.0** : Auth locale (dev)
- **openid-client 6.8.1** : OIDC
- **bcrypt 6.0.0** : Hash passwords
- **express-rate-limit 8.1.0** : Rate limiting

#### Utilitaires
- **zod 4.1.12** : Validation
- **multer 2.0.2** : Upload fichiers
- **compression 1.8.1** : Compression gzip/brotli
- **express-session 1.18.2** : Sessions
- **ws 8.18.0** : WebSocket

#### Intégrations
- **@microsoft/microsoft-graph-client 3.0.7** : Microsoft Graph
- **@azure/msal-node 3.8.1** : Azure AD
- **node-fetch 3.3.2** : HTTP client
- **mssql 12.0.0** : SQL Server (Batigest)

#### Documents
- **pdf-parse 2.4.4** : Parsing PDF
- **pdf2pic 3.2.0** : PDF → Images
- **jspdf 3.0.3** : Génération PDF
- **exceljs 4.4.0** : Excel
- **xlsx 0.18.5** : Excel (alternatif)
- **sharp 0.34.4** : Images

### Tests

- **Vitest 3.2.4** : Framework tests
- **@vitest/coverage-v8 3.2.4** : Couverture code
- **@playwright/test 1.56.1** : Tests E2E
- **@testing-library/react 16.3.0** : Tests React
- **@testing-library/jest-dom 6.9.1** : Matchers DOM
- **supertest 7.1.4** : Tests API

### Dev Tools

- **drizzle-kit 0.31.5** : Migrations DB
- **esbuild 0.25.11** : Build rapide
- **autoprefixer 10.4.21** : CSS prefixes
- **postcss 8.5.6** : Traitement CSS

---

## 🚀 Configuration de Développement

### Prérequis

```bash
# Node.js
node >= 18.0.0

# PostgreSQL
postgres >= 14.0

# Variables d'environnement
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-... (optionnel)
SESSION_SECRET=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
```

### Installation

```bash
# Installer dépendances
npm install

# Configurer base de données
npm run db:push

# Démarrer en développement
npm run dev
```

### Scripts Disponibles

```bash
# Développement
npm run dev          # Serveur dev (port 4000)

# Build
npm run build        # Build production
npm run start        # Serveur production

# Tests
npm run test         # Tests unitaires
npm run test:coverage # Tests avec couverture
npm run test:e2e     # Tests E2E Playwright

# Base de données
npm run db:push      # Push schéma vers DB

# Type checking
npm run check        # Vérification TypeScript
```

### Structure de Développement

```
jlm-app/
├── client/              # Frontend React
│   ├── src/
│   │   ├── pages/       # Pages principales
│   │   ├── components/  # Composants réutilisables
│   │   ├── hooks/       # Hooks React
│   │   ├── lib/         # Utilitaires
│   │   └── types/       # Types frontend
│   └── index.html
├── server/              # Backend Express
│   ├── modules/         # Modules métier
│   ├── services/        # Services métier
│   ├── middleware/      # Middleware Express
│   ├── storage/         # Couche données
│   ├── routes/          # Routes (legacy)
│   └── index.ts         # Point d'entrée
├── shared/              # Code partagé
│   └── schema.ts        # Schéma DB + types
├── tests/               # Tests
│   ├── backend/         # Tests backend
│   ├── frontend/        # Tests frontend
│   └── e2e/             # Tests E2E
└── docs/                 # Documentation
```

---

## 🔧 Contraintes Techniques

### Performance

#### Frontend
- **Bundle size:** < 500KB gzipped (objectif)
- **First load:** < 2s (objectif)
- **Code splitting:** Par vendor (React, Radix, Charts, etc.)

#### Backend
- **Latence API:** < 100ms (objectif)
- **Latence chatbot:** < 3s (objectif, actuel ~2.5s ✅)
- **Timeout requêtes:** 45s max
- **Rate limiting:** 100 req/h par utilisateur

#### Base de Données
- **Pool connections:** Configuré pour performance
- **Index:** Sur colonnes fréquemment requêtées
- **Queries:** Optimisation N+1 en cours

### Sécurité

#### Authentification
- **Production:** Microsoft OAuth (Azure AD)
- **Développement:** Basic auth (local)
- **Sessions:** Express-session avec store PostgreSQL

#### Autorisation
- **RBAC:** Contrôle d'accès par rôle strict
- **SQL:** Protection anti-injection (AST validation)
- **Input:** Validation Zod sur toutes les entrées
- **Rate limiting:** Global + par route

#### Données
- **Sensibles:** Hash bcrypt pour passwords
- **Logging:** Pas de données sensibles dans logs
- **HTTPS:** Requis en production

### Scalabilité

#### Actuel
- **Monolithique:** Application monolithique
- **Base de données:** PostgreSQL single instance
- **Cache:** Mémoire + DB (pas de Redis pour l'instant)

#### Évolutions Possibles
- **Cache distribué:** Redis pour cache partagé
- **Load balancing:** Plusieurs instances Express
- **Base de données:** Read replicas si nécessaire

---

## 📦 Dépendances Clés

### Dépendances Critiques

#### Frontend
- **React 19** : Core UI (breaking changes possibles)
- **TanStack Query 5** : Cache et state management
- **Radix UI** : Composants (50+ dépendances)

#### Backend
- **Express 5** : Framework web (récent, stable)
- **Drizzle ORM** : ORM type-safe (écosystème en croissance)
- **Anthropic SDK** : IA Claude (mises à jour fréquentes)

### Gestion des Versions

#### Stratégie
- **Major:** Mises à jour majeures testées avant déploiement
- **Minor:** Mises à jour automatiques (tests CI)
- **Patch:** Mises à jour automatiques

#### Dépendances Sensibles
- **@anthropic-ai/sdk** : Mises à jour fréquentes (IA)
- **openai** : Mises à jour fréquentes (IA)
- **drizzle-orm** : Écosystème actif
- **react** : Breaking changes possibles

### Compatibilité

#### Navigateurs
- **Chrome/Edge:** >= 90 (support complet)
- **Firefox:** >= 88 (support complet)
- **Safari:** >= 14 (support complet)
- **Mobile:** iOS Safari, Chrome Android

#### Node.js
- **Version minimale:** 18.0.0
- **Version recommandée:** 20.x LTS
- **ES Modules:** Utilisation native (type: "module")

---

## 🔌 Intégrations Externes

### APIs Tierces

#### Anthropic (Claude)
- **Usage:** Génération SQL, analyse documents
- **Rate limits:** Gérés par circuit breakers
- **Coûts:** ~3€/1M tokens input, ~15€/1M tokens output

#### OpenAI (GPT-5)
- **Usage:** Requêtes complexes, fallback Claude
- **Rate limits:** Gérés par circuit breakers
- **Coûts:** ~5€/1M tokens input, ~20€/1M tokens output

#### Microsoft Graph
- **Usage:** Authentification OAuth, OneDrive
- **Rate limits:** Gérés par retry logic
- **Auth:** OAuth 2.0 avec Azure AD

#### Monday.com API
- **Usage:** Import/export données
- **Rate limits:** Gérés par retry logic
- **Auth:** API token

### Services Externes

#### PostgreSQL (Neon)
- **Type:** Serverless PostgreSQL
- **Usage:** Base de données principale
- **Backup:** Automatique (Neon)

#### OneDrive
- **Usage:** Stockage documents
- **Auth:** Microsoft OAuth
- **Sync:** Service dédié

#### Batigest
- **Usage:** Export documents comptables
- **Type:** SQL Server
- **Auth:** Credentials spécifiques

---

## 🧪 Infrastructure de Tests

### Tests Unitaires

#### Backend
- **Framework:** Vitest
- **Coverage:** ~82% (objectif 85%)
- **Location:** `tests/backend/`
- **Mock:** Services et storage

#### Frontend
- **Framework:** Vitest + React Testing Library
- **Coverage:** ~78% (objectif 80%)
- **Location:** `tests/frontend/`
- **Mock:** API calls (MSW)

### Tests E2E

- **Framework:** Playwright
- **Navigateurs:** Chrome, Firefox, Safari
- **Location:** `e2e/`
- **Coverage:** Workflows critiques

### Configuration Tests

```typescript
// vitest.backend.config.ts
export default defineConfig({
  test: {
    environment: 'node',
    // ...
  }
});

// vitest.frontend.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    // ...
  }
});
```

---

## 📊 Monitoring et Observabilité

### Logging

#### Structure
- **Format:** JSON structuré
- **Levels:** info, warn, error
- **Metadata:** Correlation IDs, user IDs, etc.

#### Outils
- **Logger:** Service dédié (`server/utils/logger.ts`)
- **Correlation:** Middleware correlation IDs
- **Audit:** Service d'audit complet

### Métriques

#### Performance
- **Latence API:** Mesurée par middleware
- **Latence chatbot:** Loggée dans métriques
- **Cache hit rate:** Suivi dans services

#### Business
- **KPIs:** Calculés et stockés
- **Usage:** Traçé dans analytics
- **Erreurs:** Collectées et analysées

### Alertes

#### Techniques
- **Circuit breakers:** Alertes automatiques
- **Rate limiting:** Logs d'alertes
- **Erreurs DB:** Gestion centralisée

#### Métier
- **Alertes dates:** Détection automatique
- **Alertes techniques:** Scoring automatique
- **Alertes business:** Seuils configurables

---

## 🔄 CI/CD (À Compléter)

### Pipeline Actuel
- **Tests:** Exécution automatique
- **Build:** Vérification compilation
- **Deploy:** Manuel (à automatiser)

### Améliorations Futures
- **GitHub Actions:** Pipeline complet
- **Docker:** Containerisation
- **Kubernetes:** Orchestration (optionnel)

---

## 🚨 Limitations Connues

### Techniques

1. **Requêtes SQL Lentes**
   - Quelques requêtes > 20s
   - Action: Optimisation en cours

2. **Cache Invalidation**
   - Parfois données obsolètes
   - Action: Amélioration logique

3. **Tests Flaky E2E**
   - Échecs aléatoires
   - Action: Investigation continue

### Contraintes

1. **Monolithique**
   - Pas de microservices (acceptable actuellement)

2. **Cache Local**
   - Pas de Redis (acceptable actuellement)

3. **Single Instance**
   - Pas de load balancing (acceptable actuellement)

---

**Note:** Ce document décrit le contexte technique actuel. Il doit être mis à jour lors de changements majeurs de stack ou d'infrastructure.

