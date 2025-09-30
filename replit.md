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

**Migration Status:**
- ✅ **Routes AI** (`server/routes/ai-service.ts`) - 13 routes migrées
- ✅ **Middleware errorHandler** - Unifié avec error-handler.ts
- 🔄 **20+ autres fichiers routes** - À migrer progressivement

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

### Prochaines Étapes Suggérées
1. Migrer autres routes vers asyncHandler + erreurs typées
2. Ajouter validation Zod manquante dans routes sensibles
3. Implémenter retry logic pour opérations externes (AI, OCR)
4. Tester les nouveaux patterns end-to-end

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
