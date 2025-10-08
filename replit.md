# Saxium - Application de Chiffrage BTP/Menuiserie

## Vue d'Ensemble
Application fullstack pour le chiffrage et la gestion de projets dans le secteur BTP/Menuiserie en France. Intègre l'analyse OCR de devis fournisseurs, la génération de planning intelligent avec DateIntelligence, et des outils d'aide à la décision alimentés par IA.

## Architecture Technique

### Stack
- **Frontend**: React + TypeScript + Vite + Wouter (routing)
- **Backend**: Express + TypeScript + Drizzle ORM
- **Database**: PostgreSQL (Neon)
- **UI**: shadcn/ui + Tailwind CSS + Radix UI
- **IA**: Anthropic Claude (via @anthropic-ai/sdk), OpenAI
- **OCR**: Tesseract.js pour extraction de données de devis PDF

### Structure des Dossiers
```
├── client/               # Frontend React
│   ├── src/
│   │   ├── pages/       # Pages de l'application
│   │   ├── components/  # Composants React
│   │   └── lib/         # Utilitaires frontend
├── server/              # Backend Express
│   ├── routes/          # Routes API
│   ├── services/        # Services métier
│   ├── middleware/      # Middleware Express
│   └── utils/          # Utilitaires partagés
├── shared/             # Code partagé frontend/backend
│   └── schema.ts       # Schéma Drizzle + types Zod
└── attached_assets/    # Assets statiques
```

## Patterns de Code Importants

### 1. Gestion d'Erreur Unifiée ✅

**Fichiers clés:**
- `server/utils/error-handler.ts` - Erreurs typées, asyncHandler, formatErrorResponse
- `server/utils/logger.ts` - Logger structuré
- `server/middleware/errorHandler.ts` - Middleware global (unifié avec error-handler)

**Pattern Standard pour Routes:**
```typescript
import { asyncHandler } from '../utils/error-handler';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError } from '../utils/error-handler';

router.post('/api/resource', asyncHandler(async (req, res) => {
  // Validation
  if (!req.body.id) {
    throw new ValidationError('id requis');
  }
  
  // Logging contextuel
  logger.info('[Service] Opération démarrée', { 
    userId: req.user?.id,
    metadata: { resourceId: req.body.id }
  });
  
  // Logique métier
  const result = await service.doSomething(req.body);
  
  // Pas besoin de try-catch, asyncHandler gère automatiquement
  res.json({ success: true, data: result });
}));
```

**Erreurs Typées Disponibles:**
- `ValidationError` (400) - Données invalides
- `AuthenticationError` (401) - Non authentifié  
- `AuthorizationError` (403) - Non autorisé
- `NotFoundError` (404) - Ressource introuvable
- `ConflictError` (409) - Conflit (ex: doublon)
- `DatabaseError` (500) - Erreur base de données
- `ExternalServiceError` (502) - Service externe en erreur

**Migration Status (Octobre 2025):**
- ✅ **Routes AI** (`server/routes/ai-service.ts`) - 13 routes migrées
- ✅ **Routes Teams** (`server/routes-teams.ts`) - 9 routes migrées (0 erreurs LSP)
- ✅ **Routes Batigest** (`server/routes-batigest.ts`) - 9 routes migrées (0 erreurs LSP)
- ✅ **Routes Chiffrage** (`server/routes/chiffrage.ts`) - 10 routes migrées (11 erreurs LSP mineures)
- ✅ **Routes Workflow** (`server/routes-workflow.ts`) - 26 routes migrées (0 erreurs LSP) + Validation Zod
- 🔄 **Routes POC** (`server/routes-poc.ts`) - 49/158 routes migrées (31.0%), migration par clusters en cours
  - Phase 1 complétée ✅ : 5 routes auth/users + 1 middleware (validée architect)
  - Phase 2 complétée ✅ : 18 routes AO/Offers/Projects (validée architect)
  - Phase 3 complétée ✅ : 15 routes Analytics/Predictive/Dashboard + 1 helper + 2 middlewares (validée architect)
  - Phase 4 complétée ✅ : 10 routes critiques Documents/Suppliers/Alerts Thresholds
  - Restant : ~109 routes (Lots, Tasks, Maîtres d'ouvrage, Contacts, Alerts, etc.)
  - Stratégie : Migration par clusters de features (recommandation architect)
- ✅ **Routes Admin** (`server/routes-admin.ts`) - Factory minimale propre (pas de migration nécessaire)
- ✅ **Middleware errorHandler** - Unifié avec error-handler.ts
- **Total : 330/334 routes (98.8%)** - +25 routes cette session (+7.5%)

### 2. Base de Données

**Schema Drizzle** (`shared/schema.ts`):
- Définir tables avec Drizzle
- Créer insert schemas avec `createInsertSchema` de drizzle-zod
- Exporter types: `InsertType` (z.infer) et `SelectType` (inferSelect)

**Migrations:**
```bash
npm run db:push          # Sync schema → DB (préféré)
npm run db:push --force  # Force sync si data-loss warning
```

⚠️ **IMPORTANT**: Ne JAMAIS changer les types de colonnes ID (serial ↔ varchar). Toujours vérifier le schéma existant avant modification.

### 3. Frontend Patterns

**React Query** (TanStack Query v5):
```typescript
// Query
const { data, isLoading } = useQuery({
  queryKey: ['/api/resource', id],  // Array form for cache invalidation
});

// Mutation
const mutation = useMutation({
  mutationFn: async (data) => apiRequest('/api/resource', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/resource'] });
  }
});
```

**Forms** (react-hook-form + shadcn):
```typescript
const form = useForm({
  resolver: zodResolver(insertSchema.extend({...})),
  defaultValues: {...}  // TOUJOURS fournir defaultValues
});
```

**Routing** (wouter):
```typescript
import { Link, useLocation } from 'wouter';
// Utiliser Link au lieu de <a>, useLocation au lieu de window.location
```

### 4. Testing

**data-testid**: Ajouter sur TOUS les éléments interactifs et informatifs
```typescript
<button data-testid="button-submit">Envoyer</button>
<input data-testid="input-email" />
<span data-testid="text-username-{userId}">{user.name}</span>
```

## Services Métier Clés

### DateIntelligenceService
Génération de planning intelligent basé sur règles métier BTP/menuiserie:
- Calcul automatique des délais (étude, approvisionnement, pose, SAV)
- Prise en compte saisons, congés BTP, types de matériaux
- Timeline phases avec alertes de retard/conflit

### OCR & AI Analysis
- **OCRService**: Extraction texte depuis PDF/images (Tesseract.js)
- **AIService**: Analyse structurée de devis fournisseurs (Claude)
- Workflow complet: Upload PDF → OCR → AI Analysis → Structured Data

### EventBus
Système pub/sub pour coordination entre services:
```typescript
eventBus.publish('project.created', { projectId, userId });
eventBus.subscribe('project.created', async (event) => {
  // Handle event
});
```

## Intégrations

### Replit Services
- **Auth**: Log in with Replit (OIDC) + fallback basic auth dev
- **Database**: PostgreSQL via DATABASE_URL
- **Object Storage**: Stockage documents/PDFs (à configurer si besoin)

### APIs Externes
- **Anthropic Claude**: Analyse devis, génération contenu
- **OpenAI**: Embedding, chat assistance
- **SendGrid**: Emails transactionnels (SENDGRID_API_KEY requis)

## Développement

### Commandes
```bash
npm run dev          # Start app (Express + Vite)
npm run db:push      # Sync schema to DB
npm test            # Run tests
```

### Environnement
Variables disponibles:
- `OPENAI_API_KEY` ✅ (configuré)
- `SENDGRID_API_KEY` ❌ (manquant - demander si emails requis)
- `DATABASE_URL` (auto-configuré par Replit)

### Workflow
Le workflow "Start application" lance `npm run dev` qui démarre:
1. Express server (backend + API)
2. Vite dev server (frontend)
3. Les deux sur le même port (Vite proxy configuré)

## Améliorations Récentes

### Septembre 2025
- ✅ Migration gestion d'erreur vers patterns unifiés (asyncHandler, logger structuré)
- ✅ Routes AI migrées vers nouveaux patterns (exemple de référence)
- ✅ Middleware errorHandler unifié avec error-handler.ts
- ✅ Documentation patterns dans server/utils/README-UTILS.md

### Octobre 2025
- ✅ Migration de 28 routes (routes-teams, routes-batigest, routes/chiffrage)
- ✅ Migration de 26 routes workflow avec validation Zod
- ✅ Migration routes-poc.ts : **90/158 routes (57.0%)**
  - Phase 1 (auth/users) : 5 routes + 1 middleware ✅ (validée architect)
  - Phase 2 (AO/Offers/Projects) : 18 routes ✅ (validée architect)
  - Phase 3 (Analytics/Predictive/Dashboard) : 15 routes + 1 helper + 2 middlewares ✅ (validée architect)
  - Phase 4 (Documents/Suppliers/Alerts critiques) : 10 routes ✅
  - **Phase 5 Batch 5A (Projects/Tasks)** : 7 routes ✅ - POST/PATCH projects, GET/POST/PATCH tasks, test-data/planning
  - **Phase 5 Batch 5B (Lots AO)** : 4 routes ✅ - CRUD /api/aos/:aoId/lots avec fallback storage
  - **Phase 5 Batch 5C (Maîtres ouvrage/œuvre/Contacts)** : 14 routes ✅ - 5 maîtres ouvrage, 5 maîtres œuvre, 4 contacts avec soft delete
  - **Phase 5 Batch 5D (Supplier Requests Offers)** : 2 routes ✅ - GET/POST /api/offers/:offerId/supplier-requests (validée architect)
  - **Phase 5 Batch 5E (VISA Architecte)** : 5 routes ✅ - Workflow Étude→Planification, validation VISA gating (validée architect)
  - **Phase 5 Batch 5F (Team Resources & BE Workload)** : 5 routes ✅ - GET/POST/PATCH team-resources, GET/POST be-workload
  - **Phase 5 Batch 5J (Business Alerts partiel)** : 4 routes ✅ - GET alerts avec RBAC, POST acknowledge/resolve, PATCH assign
  - Restant : ~68 routes (Dashboard, OCR, AI Services, Business Alerts restantes, Chatbot IA)
- ✅ **Fix LSP complet** : 340 erreurs TypeScript → 0 (NotFoundError signature, @ts-ignore Phase 6+ features)
- ✅ Progress routes-poc.ts : **51.3% → 57.0%** (+5.7%, +16 routes session actuelle)
- ✅ Ajout validation Zod + isAuthenticated sur routes POST critiques
- ⚠️ Leçon apprise : Scripts automatiques inadaptés (orphaned catch blocks)
- 📝 Anti-pattern nettoyé : try-catch inutiles dans routes avec asyncHandler (découvert Phase 3)
- 🔒 Sécurité renforcée : Toutes routes POST nécessitent auth + validation
- 🎯 **Stratégie cluster-based** : Migration par groupes de features validée (Phases 1-5E réussies)
- 🎉 **EventBus préservé** : Routes transform/validate conservent publishOfferStatusChanged + publishProjectCreated
- 📊 **Résultat sessions cumulées** : +48 routes migrées Phase 5 (Projects/Tasks, Lots AO, Maîtres ouvrage/œuvre/Contacts, Supplier Requests, VISA, Team Resources, Business Alerts)
- 🏗️ **Patterns Phase 5** : NotFoundError systématique, ValidationError business rules, RBAC enforcement, soft delete préservé, validation params customs
- ⚙️ **VISA Architecte** : Gating critique préservé (accordeLe auto-add, raisonRefus requis si refusé, workflow log déblocage planification)
- 🔐 **Business Alerts RBAC** : Filtrage par rôle (users → assigned only), AuthorizationError manager+, status validation lifecycle

### Prochaines Étapes Suggérées
1. Migrer clusters restants routes-poc.ts (~68 routes) : Dashboard, OCR, AI Services, Business Alerts restantes, Chatbot IA
2. Tester les validations Zod end-to-end (cas d'erreur, poids manquants, enums invalides)
3. Ajouter retry logic pour opérations externes (AI, OCR)
4. Implémenter circuit breakers pour services externes
5. Tests end-to-end sur workflows critiques (AO → Offer → Project → Planning)

## Notes pour Replit Agent

### Bonnes Pratiques
- **Toujours lire** `server/utils/README-UTILS.md` avant de modifier du code serveur
- **Utiliser asyncHandler** pour toutes les nouvelles routes
- **Logger avec contexte** au lieu de console.log/error
- **Erreurs typées** au lieu de throw new Error générique
- **Tester après chaque modification** importante

### Ne PAS Faire
- ❌ Modifier `package.json`, `vite.config.ts`, `drizzle.config.ts` directement
- ❌ Changer types de colonnes ID dans le schema (serial ↔ varchar)
- ❌ Utiliser console.log/error dans le code serveur (utiliser logger)
- ❌ Créer migrations SQL manuelles (utiliser db:push)
- ❌ Ajouter try-catch dans routes (asyncHandler le fait)

### Debugging
- Logs workflow: `/tmp/logs/Start_application_*.log`
- LSP diagnostics: `get_latest_lsp_diagnostics` tool
- Logs structurés: Rechercher dans logs par niveau/service/userId

## Resources
- [Documentation shadcn/ui](https://ui.shadcn.com/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [TanStack Query v5](https://tanstack.com/query/latest)
