# Structure du Projet Saxium

**Date:** 2025-01-29  
**Statut:** ✅ **STRUCTURE CLARIFIÉE**  
**Objectif:** Organisation claire et précise du projet

---

## 📁 Structure Racine

```
jlm-app/
├── client/              # Application React frontend
├── server/              # Application Express backend
├── shared/              # Code partagé (types, schémas)
├── tests/               # Tests organisés
├── docs/                # Documentation organisée
├── scripts/             # Scripts utilitaires
├── e2e/                 # Tests E2E Playwright
├── migrations/          # Migrations base de données
├── examples/            # Exemples de code
├── analysis/            # Analyses et rapports
├── coverage/            # Couverture de code
├── test-results/        # Résultats de tests
├── playwright-report/   # Rapports Playwright
│
├── README.md            # Documentation principale
├── AGENTS.md            # Instructions pour Cursor AI
├── projectbrief.md      # Brief du projet
├── productContext.md   # Contexte produit
├── activeContext.md    # Contexte actif
├── systemPatterns.md   # Patterns système
├── techContext.md      # Contexte technique
├── progress.md         # Progression du projet
│
├── package.json        # Dépendances et scripts
├── tsconfig.json       # Configuration TypeScript
├── vite.config.ts      # Configuration Vite
├── vitest.config.ts    # Configuration Vitest
├── playwright.config.ts # Configuration Playwright
├── drizzle.config.ts   # Configuration Drizzle ORM
├── tailwind.config.ts  # Configuration Tailwind
├── postcss.config.js   # Configuration PostCSS
├── components.json     # Configuration composants UI
│
├── docker-compose.yml   # Configuration Docker
├── .env.local.example  # Exemple variables d'environnement
└── .gitignore          # Fichiers ignorés par Git
```

---

## 📚 Documentation (`docs/`)

### Structure

```
docs/
├── project/             # Documentation du projet
│   ├── projectbrief.md
│   ├── productContext.md
│   ├── activeContext.md
│   ├── systemPatterns.md
│   ├── techContext.md
│   └── progress.md
│
├── optimization/        # Documentation d'optimisation
│   ├── OPTIMIZATION_*.md
│   ├── MAINTAINABILITY_*.md
│   ├── ROBUSTNESS_*.md
│   ├── TECHNICAL_DEBT_*.md
│   └── PHASE2_*.md
│
├── migration/           # Documentation de migration
│   ├── MONDAY_*.md
│   ├── NHOST_*.md
│   └── ONEDRIVE-*.md
│
├── architecture/        # Documentation d'architecture
│   ├── ARCHITECTURE_*.md
│   └── SERVICES_*.md
│
├── testing/             # Documentation de test
│   ├── AUTO_TEST_DEBUG_*.md
│   ├── TEST_DEBUG_*.md
│   └── BUSINESS_CONTEXT_*.md
│
├── guides/              # Guides techniques
│   ├── sql-engine-*.md
│   └── ...
│
└── other/               # Autres fichiers de documentation
    └── ...
```

### Fichiers à la Racine (Conservés)

- `README.md` - Documentation principale
- `AGENTS.md` - Instructions pour Cursor AI
- `projectbrief.md` - Brief du projet
- `productContext.md` - Contexte produit
- `activeContext.md` - Contexte actif
- `systemPatterns.md` - Patterns système
- `techContext.md` - Contexte technique
- `progress.md` - Progression du projet

---

## 🧪 Tests (`tests/`)

### Structure

```
tests/
├── unit/                # Tests unitaires
│   ├── backend/
│   ├── frontend/
│   └── shared/
│
├── integration/         # Tests d'intégration
│   ├── auth/
│   ├── api/
│   └── services/
│
├── e2e/                 # Tests E2E
│   ├── workflows/
│   ├── journeys/
│   └── fixtures/
│
└── root/                # Tests à la racine (temporaires)
    └── ...
```

### Tests dans `server/`

```
server/
├── test/                # Tests unitaires serveur
│   ├── businessContextService.test.ts
│   └── dateIntelligenceIntegration.test.ts
│
├── tests/               # Tests d'intégration serveur
│   ├── mondayMigration.test.ts
│   ├── productionMigration.test.ts
│   └── services/
│
└── storage/
    └── __tests__/       # Tests storage
        ├── ao-repository.test.ts
        ├── offer-repository.test.ts
        └── storage-facade-*.test.ts
```

---

## 🗑️ Fichiers à Supprimer

### Fichiers Temporaires

- `cookies.txt` - Fichier temporaire
- `uv.lock` - Lock file Python (non utilisé)
- `pyproject.toml` - Configuration Python (non utilisé)
- `*.traineddata` - Fichiers OCR (déplacer vers `server/`)
- `sync_missing_tables.sql` - Script SQL temporaire

### Fichiers de Test à la Racine

- `test-*.ts` - Déplacer vers `tests/root/`
- `test-*.js` - Déplacer vers `tests/root/`
- `performance_test.js` - Déplacer vers `tests/performance/`

### Documentation Dupliquée

- `docs/OPTIMIZATION_COMPLETE.md` et `docs/OPTIMIZATION_COMPLETE_FINAL.md` - Consolider
- `docs/PHASE2_PROGRESS_*.md` (multiple) - Consolider en un seul fichier
- `docs/TEST_DEBUG_SUMMARY.md` et `docs/AUTO_TEST_DEBUG_SUMMARY.md` - Consolider

---

## 📋 Plan de Réorganisation

### Phase 1: Documentation ✅

1. **Créer structure `docs/`**
   - `docs/project/` - Documentation du projet
   - `docs/optimization/` - Documentation d'optimisation
   - `docs/migration/` - Documentation de migration
   - `docs/architecture/` - Documentation d'architecture
   - `docs/testing/` - Documentation de test
   - `docs/guides/` - Guides techniques
   - `docs/other/` - Autres fichiers

2. **Déplacer fichiers de documentation**
   - Déplacer fichiers `*.md` de la racine vers `docs/`
   - Conserver fichiers de projet à la racine
   - Organiser par catégorie

3. **Consolider doublons**
   - Identifier et supprimer les doublons
   - Consolider les fichiers similaires

### Phase 2: Tests ✅

1. **Créer structure `tests/`**
   - `tests/unit/` - Tests unitaires
   - `tests/integration/` - Tests d'intégration
   - `tests/e2e/` - Tests E2E
   - `tests/root/` - Tests à la racine (temporaires)

2. **Déplacer fichiers de test**
   - Déplacer `test-*.ts` de la racine vers `tests/root/`
   - Organiser tests existants dans `tests/`

3. **Nettoyer tests dupliqués**
   - Identifier et supprimer les tests dupliqués
   - Consolider les tests similaires

### Phase 3: Nettoyage ✅

1. **Supprimer fichiers temporaires**
   - Fichiers temporaires identifiés
   - Fichiers non nécessaires

2. **Nettoyer la racine**
   - Garder uniquement les fichiers essentiels
   - Déplacer les autres fichiers vers leurs emplacements appropriés

---

## 🎯 Résultat Attendu

### Structure Finale

```
jlm-app/
├── client/              # Frontend React
├── server/              # Backend Express
├── shared/              # Code partagé
├── tests/               # Tests organisés
├── docs/                # Documentation organisée
├── scripts/             # Scripts utilitaires
├── e2e/                 # Tests E2E
├── migrations/          # Migrations DB
├── examples/            # Exemples
│
├── README.md            # Documentation principale
├── AGENTS.md            # Instructions Cursor AI
├── projectbrief.md      # Brief projet
├── productContext.md    # Contexte produit
├── activeContext.md     # Contexte actif
├── systemPatterns.md    # Patterns système
├── techContext.md       # Contexte technique
├── progress.md          # Progression
│
└── [fichiers config]    # Configuration uniquement
```

---

## 🔗 Références

- **Script de réorganisation:** `scripts/reorganize-project.ts`
- **Commande:** `npm run reorganize`
- **Rapport:** `docs/PROJECT_REORGANIZATION_REPORT.md`

---

**Note:** Cette structure est conçue pour être claire, précise et maintenable.


