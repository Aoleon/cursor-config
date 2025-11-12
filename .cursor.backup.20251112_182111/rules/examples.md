# Exemples Concrets - Saxium

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 2.0.0  
**Dernière mise à jour:** 2025-01-29

Exemples de code réels du projet Saxium organisés par type de tâche pour référence rapide.

## 🎯 Organisation par Type de Tâche

### Créer une Route API
### Créer un Composant React
### Modifier un Service
### Modifier le Schéma DB
### Ajouter une Fonctionnalité IA

## 🚫 Exemples à Éviter

**Référence:** `@.cursor/rules/anti-patterns.md` - Anti-patterns consolidés par domaine

Pour voir les exemples de code à éviter avec corrections, consultez le fichier anti-patterns consolidé.

## 🏗️ Exemples Backend

### Route Modulaire (Exemple Réel: auth/routes.ts)

```typescript
// server/modules/auth/routes.ts
import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { validateBody } from '../../middleware/validation';
import { rateLimits } from '../../middleware/rate-limiter';
import { AuthenticationError, AuthorizationError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { basicLoginSchema } from '../../validation-schemas';

export function createAuthRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();

  // Middleware helper
  const requireAdminForHealth = asyncHandler(async (req: any, res: any, next: any) => {
    const user = req.user;
    if (!user) {
      throw new AuthenticationError('Authentification requise');
    }

    const userRole = user.role;
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    
    if (!isAdmin) {
      throw new AuthorizationError('Permissions administrateur requises');
    }

    next();
  });

  // Route avec validation, rate limiting, logging
  router.post('/api/login/basic', 
    rateLimits.auth, // 5 attempts per 15 minutes
    validateBody(basicLoginSchema),
    asyncHandler(async (req: Request, res: Response) => {
    
    // Security check
    if (process.env.NODE_ENV !== 'development') {
      logger.warn('[Auth] Tentative accès route basic en production bloquée', {
        metadata: {
          route: '/api/login/basic',
          method: 'POST',
          ip: req.ip
        }
      });
      return res.status(404).json({ message: 'Not found' });
    }
    
    const { username, password, role } = req.body;

    // Validation rôle
    const allowedRoles = ['admin', 'ca', 'chef_equipe', 'technicien_be', 'technicien_terrain', 'client'];
    const validatedRole = role && allowedRoles.includes(role) ? role : 'admin';
    
    logger.info('[Auth] Tentative connexion basic', {
      metadata: {
        username,
        role: validatedRole,
        ip: req.ip
      }
    });

    // Logique authentification...
    const user = await storage.getUserByUsername(username);
    
    if (!user) {
      throw new AuthenticationError('Identifiants invalides');
    }

    // Créer session
    req.session.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: validatedRole
    };

    logger.info('[Auth] Connexion réussie', {
      metadata: {
        userId: user.id,
        username,
        role: validatedRole
      }
    });

    res.json({ 
      success: true, 
      data: { 
        user: req.session.user 
      } 
    });
  }));

  return router;
}
```

### Service IA (Exemple Réel: AIService.ts)

```typescript
// server/services/AIService.ts
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from "openai";
import type { IStorage } from "../storage-poc";
import { logger } from '../utils/logger';
import { CircuitBreakerManager } from '../utils/circuit-breaker';

const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_GPT_MODEL = "gpt-5";
const CACHE_EXPIRY_HOURS = 24;
const MAX_RETRY_ATTEMPTS = 2;
const REQUEST_TIMEOUT_MS = 15000;

export class AIService {
  private anthropic: Anthropic;
  private openai: OpenAI | null;
  private storage: IStorage;
  private circuitBreakerManager: CircuitBreakerManager;
  private claudeBreaker: CircuitBreaker;
  private gptBreaker: CircuitBreaker;

  constructor(storage: IStorage) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY 
      });
    } else {
      this.openai = null;
    }

    this.storage = storage;
    
    // Circuit breakers
    this.circuitBreakerManager = CircuitBreakerManager.getInstance();
    
    this.claudeBreaker = this.circuitBreakerManager.getBreaker('claude', {
      threshold: 5,
      timeout: 60000,
      onOpen: (name) => {
        logger.warn('Circuit breaker ouvert pour Claude', {
          metadata: {
            service: 'AIService',
            operation: 'circuit_breaker',
            provider: name
          }
        });
      }
    });
  }

  async generateSQL(request: AiQueryRequest): Promise<AiQueryResponse> {
    const startTime = Date.now();
    const correlationId = getCorrelationId();

    try {
      logger.info('[AIService] Génération SQL', {
        metadata: {
          query: request.query.substring(0, 100),
          userRole: request.userRole,
          correlationId
        }
      });

      // Vérification cache
      const cacheKey = this.generateCacheKey(request);
      const cached = await this.getCachedResponse(cacheKey);
      if (cached) {
        logger.info('[AIService] Cache hit', {
          metadata: { cacheKey, correlationId }
        });
        return cached;
      }

      // Sélection modèle
      const modelSelection = this.selectModel(request);
      
      // Génération SQL via circuit breaker
      const result = await this.claudeBreaker.execute(async () => {
        return await this.anthropic.messages.create({
          model: DEFAULT_CLAUDE_MODEL,
          max_tokens: 2048,
          messages: [{
            role: 'user',
            content: `Génère du SQL sécurisé pour: ${request.query}`
          }]
        });
      });

      const sql = result.content[0].text;
      
      // Validation SQL
      const validatedSQL = this.validateSQL(sql);

      const response: AiQueryResponse = {
        success: true,
        data: {
          sqlGenerated: validatedSQL,
          modelUsed: modelSelection.model,
          tokensUsed: result.usage.total_tokens,
          responseTimeMs: Date.now() - startTime,
          fromCache: false,
          confidence: modelSelection.confidence
        }
      };

      // Mise en cache
      await this.cacheResponse(cacheKey, response);

      logger.info('[AIService] SQL généré avec succès', {
        metadata: {
          modelUsed: modelSelection.model,
          tokensUsed: result.usage.total_tokens,
          responseTimeMs: Date.now() - startTime,
          correlationId
        }
      });

      return response;
    } catch (error) {
      logger.error('[AIService] Erreur génération SQL', error, {
        metadata: {
          query: request.query.substring(0, 100),
          userRole: request.userRole,
          correlationId
        }
      });
      throw error;
    }
  }
}
```

### Storage avec Transaction

```typescript
// server/storage-poc.ts
import { db } from './db';
import { eq, and, desc } from 'drizzle-orm';
import { offers, projects } from '@shared/schema';
import type { DrizzleTransaction } from './storage-poc';
import { withTransaction } from './utils/database-helpers';

async createOffer(offer: InsertOffer, tx?: DrizzleTransaction): Promise<Offer> {
  const dbInstance = tx || db;
  const [created] = await dbInstance.insert(offers).values(offer).returning();
  return created;
}

async createOfferWithProject(
  offerData: InsertOffer,
  projectData: InsertProject
): Promise<{ offer: Offer; project: Project }> {
  return await withTransaction(async (tx) => {
    const offer = await this.createOffer(offerData, tx);
    const project = await this.createProject({
      ...projectData,
      offerId: offer.id
    }, tx);
    
    return { offer, project };
  });
}
```

## 🎨 Exemples Frontend

### Composant UI (Exemple Réel: button.tsx)

```typescript
// client/src/components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-on-primary hover:bg-primary/90",
        destructive: "bg-destructive text-on-destructive hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-on-accent",
        secondary: "bg-secondary text-on-secondary hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-on-accent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

### Hook avec TanStack Query

```typescript
// client/src/hooks/useOffer.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-helpers';
import { useToast } from '@/hooks/use-toast';
import type { Offer, InsertOffer } from '@shared/schema';

export function useOffer(id: string) {
  return useQuery({
    queryKey: ['offer', id],
    queryFn: () => apiRequest<Offer>(`/api/offers/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });
}

export function useOffers(filters?: { search?: string; status?: string }) {
  return useQuery({
    queryKey: ['offers', filters],
    queryFn: () => apiRequest<Offer[]>(`/api/offers`, { params: filters }),
    staleTime: 2 * 60 * 1000 // 2 minutes
  });
}

export function useCreateOffer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (data: InsertOffer) =>
      apiRequest<Offer>('/api/offers', {
        method: 'POST',
        body: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      toast({
        title: 'Succès',
        description: 'Offre créée avec succès'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

export function useUpdateOffer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertOffer> }) =>
      apiRequest<Offer>(`/api/offers/${id}`, {
        method: 'PATCH',
        body: data
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['offer', id] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      toast({
        title: 'Succès',
        description: 'Offre modifiée avec succès'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}
```

### Composant avec Form

```typescript
// client/src/components/offers/CreateOfferModal.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreateOffer } from '@/hooks/useOffer';

const offerSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  description: z.string().optional(),
  status: z.enum(['brouillon', 'etude_technique', 'en_attente_fournisseurs']).default('brouillon')
});

type OfferFormData = z.infer<typeof offerSchema>;

export function CreateOfferModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createOffer = useCreateOffer();
  
  const form = useForm<OfferFormData>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'brouillon'
    }
  });

  const onSubmit = async (data: OfferFormData) => {
    await createOffer.mutateAsync(data);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer une offre</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={createOffer.isPending}>
                {createOffer.isPending ? 'Création...' : 'Créer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

## 🔗 Références par Type de Tâche

### Créer une Route API

**Exemples:**
- `@server/modules/auth/routes.ts` - Exemple route modulaire complet
- `@server/modules/documents/coreRoutes.ts` - Exemple routes documents

**Règles à charger:**
- `@.cursor/rules/core.md` - Règles fondamentales
- `@.cursor/rules/backend.md` - Patterns backend
- `@.cursor/rules/workflows.md` - Workflow création route

**Référence:** `@.cursor/rules/workflows.md` - Workflow création route détaillé

### Créer un Composant React

**Exemples:**
- `@client/src/components/ui/button.tsx` - Exemple composant UI
- `@client/src/components/offers/CreateOfferModal.tsx` - Exemple composant avec form

**Règles à charger:**
- `@.cursor/rules/core.md` - Règles fondamentales
- `@.cursor/rules/frontend.md` - Patterns frontend
- `@.cursor/rules/workflows.md` - Workflow création composant

**Référence:** `@.cursor/rules/workflows.md` - Workflow création composant détaillé

### Modifier un Service

**Exemples:**
- `@server/services/AIService.ts` - Exemple service IA complet
- `@server/storage-poc.ts` - Exemple storage avec transaction

**Règles à charger:**
- `@.cursor/rules/core.md` - Règles fondamentales
- `@.cursor/rules/backend.md` - Patterns backend
- `@.cursor/rules/workflows.md` - Workflow modification service

**Référence:** `@.cursor/rules/workflows.md` - Workflow modification service détaillé

### Modifier le Schéma DB

**Exemples:**
- `@shared/schema.ts` - Schéma base de données
- `@server/storage-poc.ts` - Exemple storage avec transaction

**Règles à charger:**
- `@.cursor/rules/core.md` - Règles fondamentales
- `@.cursor/rules/database.md` - Règles base de données
- `@.cursor/rules/workflows.md` - Workflow modification schéma

**Référence:** `@.cursor/rules/workflows.md` - Workflow modification schéma détaillé

### Ajouter une Fonctionnalité IA

**Exemples:**
- `@server/services/AIService.ts` - Exemple service IA complet
- `@server/services/SQLEngineService.ts` - Exemple SQL sécurisé

**Règles à charger:**
- `@.cursor/rules/core.md` - Règles fondamentales
- `@.cursor/rules/ai-services.md` - Services IA
- `@.cursor/rules/workflows.md` - Workflow modification service IA

**Référence:** `@.cursor/rules/workflows.md` - Workflow modification service IA détaillé

## 🔗 Références Générales

### Fichiers d'Exemples

- `@server/modules/auth/routes.ts` - Exemple route modulaire complet
- `@server/services/AIService.ts` - Exemple service IA complet
- `@client/src/components/ui/button.tsx` - Exemple composant UI
- `@client/src/hooks/useOffer.ts` - Exemple hook personnalisé
- `@client/src/components/offers/CreateOfferModal.tsx` - Exemple composant avec form

### Règles et Guides

- `@.cursor/rules/workflows.md` - Workflows détaillés avec patterns
- `@.cursor/rules/anti-patterns.md` - Anti-patterns consolidés
- `@.cursor/rules/quick-start.md` - Guide de démarrage rapide
- `@.cursor/rules/examples.md` - Ce fichier

---

**Note:** Ces exemples sont basés sur le code réel du projet. Utiliser comme référence pour maintenir la cohérence. Pour les exemples de code à éviter, consultez `@.cursor/rules/anti-patterns.md`.

**Version:** 2.0.0  
**Dernière mise à jour:** 2025-01-29


