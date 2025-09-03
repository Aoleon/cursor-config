# JLM ERP - Menuiserie Management System

## Overview
JLM ERP POC est une application de digitalisation spécialisée pour JLM Menuiserie, entreprise de POSE de menuiseries. L'application POC a pour objectif de digitaliser et d'optimiser la gestion des dossiers d'offre, le chiffrage et le suivi de projet/planning. Elle vise à fluidifier la circulation de l'information, réduire la double saisie et améliorer la visibilité et la traçabilité des processus clés. Le périmètre est volontairement limité au POC pour valider les flux d'information critiques entre le Bureau d'Études et le terrain, avec un focus sur l'élimination de la double saisie et la mise en place de jalons de validation formels.

## User Preferences
<instructions>
You are an expert autonomous programmer specialized in French carpentry ERP systems, working on JLM Menuiserie's comprehensive business management platform.

**Core Role**: 
- TypeScript full-stack developer with French carpentry domain expertise
- Autonomous problem solver for menuiserie workflow optimization
- Quality-focused developer with proactive error prevention

**Communication Directives**:
- Use simple, everyday language avoiding technical jargon
- Maintain French interface and terminology for carpentry industry
- Provide autonomous work sessions with comprehensive solutions
- Minimize user interruptions unless genuinely blocked

**Technical Standards**:
- Proactive TypeScript error resolution with LSP diagnostics
- Robust data validation using Zod schemas
- Immediate compilation checking after code changes
- Test-driven development with 85%+ backend, 80%+ frontend coverage
</instructions>

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query v5
- **UI Library**: Radix UI primitives + shadcn/ui
- **Styling**: Tailwind CSS with custom design tokens for carpentry industry
- **Form Management**: React Hook Form + Zod
- **Build System**: Vite

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit OpenID Connect (OIDC) with Passport.js
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **OCR Engine**: Tesseract.js + pdf-parse for intelligent PDF processing

### Critical Design Principles
- **Full-Stack Type Safety**: Shared TypeScript schemas ensure type consistency.
- **Database-First Architecture**: PostgreSQL and Drizzle ORM are the single source of truth.
- **French Carpentry Domain Modeling**: Business entities directly model carpentry workflows.
- **Session-Based Authentication**: Secure, scalable user management.
- **Optimistic UI Updates**: TanStack Query provides immediate UI feedback.
- **ARCHITECTURAL RULE - Single Form Evolution**: The original AO form is the ONLY form that evolves through all workflow stages. No data re-entry, no form duplication. Progressive field addition with validation locking prevents modification of previously validated data.

### Périmètre POC Strict (Cahier des Charges)
**RÈGLE FONDAMENTALE**: Le développement doit STRICTEMENT respecter le périmètre défini dans `Cahier des charges POC.txt`. Ne pas s'en éloigner. Le document `Audit process et fonctionnement JLM.txt` sert UNIQUEMENT pour récupérer des éléments de contexte et d'organisation, pas pour étendre le périmètre.

**Fonctionnalités POC autorisées uniquement :**
- **Gestion Utilisateurs**: Authentification simple BE/terrain avec indicateurs charge.
- **Fiches AO**: Base pour récupération assistée et éviter la double saisie.
- **Dossiers d'Offre & Chiffrage**: 
  - Récupération assistée données AO (pré-remplissage automatique)
  - Module chiffrage simple ou connexion simulée Batigest
  - Édition DPGF basé sur éléments chiffrés
  - Suivi statuts BE avec marquage priorité
- **Demandes Prix Fournisseurs**: Demandes rattachées aux projets (simplifiées, lecture seule POC).
- **Gestion Projets**: 5 étapes clés - Étude, Planification, Approvisionnement (simple), Chantier, SAV (simple).
- **Planning Partagé**: Gantt simplifié, jalons avec alertes visuelles, glisser-déposer tâches utilisateur.
- **Gestion Équipes**: Visualisation ressources internes/sous-traitants, charge simplifiée.

**Documents de référence :**
- `Cahier des charges POC.txt` : PÉRIMÈTRE FONCTIONNEL (obligatoire, ne pas s'en éloigner)
- `Audit process et fonctionnement JLM.txt` : CONTEXTE ORGANISATIONNEL (référence seulement)

**Instructions développement :**
- Toute nouvelle fonctionnalité doit être validée contre le Cahier des charges POC.txt
- L'audit JLM sert uniquement à comprendre le contexte métier et les points de friction actuels
- Ne pas développer de fonctionnalités qui ne sont pas explicitement mentionnées dans le POC
- Respecter la simplicité volontaire du périmètre POC pour validation des flux critiques

### Flux d'Information POC (Formulaire Unique Évolutif)
- **Import OCR Intelligent**: Nouveau point d'entrée avec analyse automatique des PDF d'appels d'offres françaises. Reconnaissance de 35+ champs avec pré-remplissage automatique.
- **AO → Chiffrage**: Le même dossier AO évolue vers l'étape chiffrage. Données AO pré-remplies et verrouillées, nouveaux champs de chiffrage ajoutés.
- **Validation Fin d'Études**: Jalon "Fin d'études" validé numériquement dans l'application (plus de validation manuelle). Verrouillage définitif des données de chiffrage.
- **Chiffrage → Planning**: Le même dossier évolue vers "Projet" avec planning initialisé. Données AO+Chiffrage verrouillées, champs planning ajoutés.
- **Planning → Équipes**: Le même projet évolue avec affectation équipes. Données précédentes verrouillées, champs équipes ajoutés.
- **Équipes → Livraison**: Finalisation sur le même dossier original avec données de livraison.

### Principes POC Fondamentaux
- **PRINCIPE CENTRAL - Formulaire Unique Évolutif**: L'AO créé initialement est LE formulaire qui évolue à travers TOUTES les étapes (AO → Chiffrage → Planning → Équipes → Livraison). Jamais de re-création, jamais de duplication. Les champs s'ajoutent progressivement à chaque étape mais les données validées des étapes précédentes se verrouillent pour empêcher toute modification.
- **Zéro Double Saisie Automatisé**: Réutilisation systématique des données existantes et reconnaissance OCR pour import automatique. Une donnée saisie une seule fois, utilisée partout.
- **Verrouillage Progressif**: 
  - Étape AO : Données de base modifiables
  - Étape Chiffrage : Données AO verrouillées, données chiffrage modifiables
  - Étape Planning : Données AO + Chiffrage verrouillées, données planning modifiables
  - Etc.
- **Workflow Visible et Auditable**: Statuts dossiers/projets clairement visibles avec traçabilité changements.
- **Interface Intuitive**: Simplicité d'usage pour utilisateurs moins habitués aux outils numériques.
- **Priorité Flux Information**: Circulation fluide des données entre étapes du processus POC.

### Gestion du Workflow et Actions Contextuelles

#### Structure des Vues Contextuelles
Chaque étape du workflow dispose désormais d'une vue dédiée avec des actions spécifiques selon l'état d'avancement:

1. **Étude Technique** (`/workflow/etude-technique`)
   - Actions: Modifier détails techniques, Analyser CCTP/Plans
   - Transition: Validation vers Chiffrage
   - Conditions: CCTP analysé, détails techniques complets, lots validés

2. **Chiffrage** (`/workflow/chiffrage`)
   - Actions: Module chiffrage, Génération DPGF, Voir/Télécharger DPGF
   - Transition: Envoi du devis
   - Conditions: Montants calculés, DPGF généré, marge validée

3. **Envoi Devis** (`/workflow/envoi-devis`)
   - Actions: Envoi devis (email/plateforme), Relances clients, Suivi réponses
   - Transition: Transformation en projet si accepté
   - Indicateurs: Taux conversion, délais réponse

4. **Planification** (`/workflow/planification`)
   - Actions: Éditer planning, Affecter équipes, Valider approvisionnement
   - Transition: Démarrage chantier
   - Conditions: Tâches créées, équipes affectées, dates validées

5. **Chantier** (`/workflow/chantier`)
   - Actions: Suivi photo, Rapport avancement, Gestion problèmes
   - Transition: Passage en SAV
   - Indicateurs: Progression, respect délais, problèmes en cours

#### Import OCR Intégré
- L'import PDF avec OCR est maintenant intégré directement dans "Création dossier"
- Interface à deux onglets: Import PDF et Création manuelle
- Extraction automatique de 35+ champs avec pré-remplissage automatique
- Détection et création automatique des lots menuiserie
- Mode POC avec simulation OCR pour les PDFs scannés

### Architecture de Tests & Qualité Logicielle

#### Test Infrastructure
- **Backend Testing**: Vitest + Supertest pour les tests unitaires et d'intégration API
- **Frontend Testing**: Testing Library React + Vitest pour les composants et hooks
- **E2E Testing**: Playwright pour les tests end-to-end complets
- **API Mocking**: MSW (Mock Service Worker) pour les tests isolés

#### Politique de Tests Complète par Fonctionnalité
**RÈGLE FONDAMENTALE**: Chaque fonctionnalité implémentée ou modifiée doit être testée sur ses 4 composantes :

1. **Backend Layer** (Couche Serveur)
   - Tests unitaires des opérations CRUD dans `server/storage.ts`
   - Tests d'intégration des routes API avec Supertest
   - Validation des schémas Zod et types TypeScript
   - Tests des relations de base de données

2. **Routes Layer** (Couche API)
   - Tests des endpoints REST avec différents codes de statut
   - Validation des paramètres d'entrée et réponses
   - Tests d'authentification et autorisation
   - Gestion des erreurs et cas limites

3. **Frontend Layer** (Couche Logique)
   - Tests unitaires des hooks personnalisés
   - Tests des services et fonctions utilitaires
   - Tests des mutations et queries TanStack Query
   - Validation du state management

4. **UI Layer** (Couche Interface)
   - Tests des composants avec interactions utilisateur
   - Tests d'accessibilité et responsive design
   - Tests des formulaires et validations
   - Tests E2E des workflows complets

#### Standards de Couverture
- **Backend**: 85% minimum de couverture de code
- **Frontend**: 80% minimum de couverture de code
- **Critical Paths**: 100% de couverture pour les workflows d'audit JLM
- **E2E Tests**: Couverture des parcours utilisateur principaux

#### Structure des Tests par Module
```
tests/
├── backend/
│   ├── storage/
│   │   ├── suppliers.test.ts
│   │   ├── purchases.test.ts
│   │   └── invoices.test.ts
│   └── routes/
│       ├── api-suppliers.test.ts
│       └── api-purchases.test.ts
├── frontend/
│   ├── components/
│   │   ├── supplier-form.test.tsx
│   │   └── purchase-list.test.tsx
│   └── hooks/
│       └── use-suppliers.test.ts
└── e2e/
    ├── supplier-management.spec.ts
    └── purchase-workflow.spec.ts
```

#### Processus de Validation
- **Pre-commit**: Linting TypeScript + tests unitaires
- **CI Pipeline**: Tests complets + couverture + E2E
- **Deployment**: Validation complète des 4 couches avant production

## External Dependencies

- **Database**: Neon serverless PostgreSQL
- **Frontend Libraries**: `@tanstack/react-query`, `@radix-ui/*`, `react-hook-form`, `wouter`
- **Authentication**: `passport`, `openid-client`, `express-session`, `connect-pg-simple`
- **Testing Tools**: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@playwright/test`, `supertest`, `msw`, `jsdom`, `happy-dom`
- **Build & Language Tools**: `vite`, `typescript`, `tailwindcss`, `drizzle-kit`, `tsx`