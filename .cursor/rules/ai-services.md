# Règles Services IA - Saxium

## 🤖 Services IA du Projet

### AIService (Multi-Modèles)

**Fichier:** `server/services/AIService.ts`

**Fonctionnalités:**
- Sélection automatique Claude Sonnet 4 vs GPT-5
- Cache intelligent (24h TTL)
- Circuit breakers
- Retry logic avec backoff exponentiel

**Pattern d'utilisation:**
```typescript
import { getAIService } from '../services/AIService';

const aiService = getAIService(storage);

const result = await aiService.generateSQL({
  query: 'Requête en langage naturel',
  context: 'Contexte métier',
  userRole: 'chef_projet',
  complexity: 'simple' // ou 'complex' pour forcer GPT-5
});
```

**Règles:**
- ✅ Utiliser `getAIService()` pour obtenir l'instance (singleton)
- ✅ Toujours fournir `userRole` pour RBAC
- ✅ Utiliser `complexity` pour forcer un modèle si nécessaire
- ✅ Ne pas créer de nouvelles instances

### ChatbotOrchestrationService

**Fichier:** `server/services/ChatbotOrchestrationService.ts`

**Fonctionnalités:**
- Pipeline chatbot complet (requête → SQL → résultats)
- Contexte métier enrichi automatique
- Actions sécurisées (création/modification)
- Suggestions intelligentes par rôle

**Pattern d'utilisation:**
```typescript
const chatbotService = new ChatbotOrchestrationService(
  aiService,
  rbacService,
  sqlEngineService,
  businessContextService,
  actionExecutionService,
  eventBus,
  storage
);

const response = await chatbotService.processChatbotQuery({
  query: 'Quels sont mes projets en retard ?',
  userId: user.id,
  user_role: user.role,
  sessionId: sessionId
});
```

**Règles:**
- ✅ Toujours fournir `userId` et `user_role`
- ✅ Utiliser `sessionId` pour conversations multi-tours
- ✅ Gérer les `action_proposal` si présents dans la réponse

### SQLEngineService

**Fichier:** `server/services/SQLEngineService.ts`

**Fonctionnalités:**
- Génération SQL sécurisée depuis langage naturel
- RBAC automatique sur toutes les requêtes
- Validation AST SQL (protection injection)
- Whitelist tables/colonnes

**Pattern d'utilisation:**
```typescript
const sqlEngine = new SQLEngineService(
  aiService,
  rbacService,
  businessContextService,
  eventBus,
  storage
);

const result = await sqlEngine.executeNaturalLanguageQuery({
  naturalLanguageQuery: 'Liste des projets en retard',
  userId: user.id,
  userRole: user.role
});
```

**Règles:**
- ✅ Toujours fournir `userId` et `userRole` pour RBAC
- ✅ Ne jamais exécuter SQL brut (toujours via SQLEngineService)
- ✅ Utiliser `dryRun: true` pour validation uniquement

### BusinessContextService

**Fichier:** `server/services/BusinessContextService.ts`

**Fonctionnalités:**
- Génération contexte métier enrichi (menuiserie française)
- Cache intelligent avec TTL
- Base de connaissances menuiserie
- Adaptation par rôle utilisateur

**Pattern d'utilisation:**
```typescript
const contextService = new BusinessContextService(
  storage,
  rbacService,
  eventBus
);

const context = await contextService.generateBusinessContext({
  userId: user.id,
  user_role: user.role,
  query_type: 'text_to_sql',
  include_examples: true
});
```

**Règles:**
- ✅ Utiliser pour enrichir contexte chatbot
- ✅ Cache automatique (ne pas recréer si déjà en cache)
- ✅ Toujours fournir `user_role` pour adaptation

### DateIntelligenceService

**Fichier:** `server/services/DateIntelligenceService.ts`

**Fonctionnalités:**
- Calcul automatique durées de phases projets
- Règles métier adaptatives (menuiserie)
- Prise en compte saisonnalité BTP
- Cascade automatique des dates

**Pattern d'utilisation:**
```typescript
const dateService = new DateIntelligenceService(storage);

const duration = await dateService.calculatePhaseDuration(
  phase: 'etude',
  projectContext: {
    projectType: 'neuf',
    complexity: 'normale',
    surface: 150,
    // ...
  }
);
```

**Règles:**
- ✅ Toujours fournir `projectContext` complet
- ✅ Utiliser pour calculs de planning
- ✅ Respecter règles métier menuiserie

## 🔒 Sécurité IA

### RBAC Automatique

**TOUJOURS:**
- ✅ Vérifier permissions avant exécution SQL
- ✅ Filtrer résultats par rôle utilisateur
- ✅ Bloquer accès aux données sensibles

### Protection Injection SQL

**TOUJOURS:**
- ✅ Utiliser SQLEngineService (validation AST automatique)
- ✅ Ne jamais exécuter SQL brut
- ✅ Whitelist tables/colonnes autorisées

### Rate Limiting

**Déjà configuré:**
- ✅ 100 requêtes/heure par utilisateur (AIService)
- ✅ Circuit breakers pour services externes
- ✅ Timeout 45s maximum

## 📊 Performance IA

### Cache Intelligent

**Pattern:**
```typescript
// Cache automatique dans AIService (24h TTL)
// Cache automatique dans BusinessContextService (1h TTL)
// Ne pas créer de cache manuel si service le gère déjà
```

### Optimisation Coûts

**Règles:**
- ✅ Utiliser Claude Sonnet 4 pour requêtes simples (moins cher)
- ✅ Utiliser GPT-5 uniquement pour requêtes complexes
- ✅ Laisser la sélection automatique sauf cas spécifique
- ✅ Utiliser cache pour éviter requêtes répétitives

### Latence

**Objectifs:**
- ✅ Chatbot: < 3s (actuel ~2.5s ✅)
- ✅ Génération SQL: < 2s
- ✅ Contexte métier: < 500ms

**Optimisations:**
- ✅ Dispatch parallèle (contexte + modèle simultané)
- ✅ Preloading background (PredictiveEngine)
- ✅ Cache hit rate objectif: 70%

## 🧪 Tests Services IA

### Pattern de Test

```typescript
import { describe, it, expect, vi } from 'vitest';
import { AIService } from '../services/AIService';

describe('AIService', () => {
  it('should select Claude for simple queries', async () => {
    const result = await aiService.generateSQL({
      query: 'Simple query',
      context: 'Test',
      userRole: 'user'
    });
    
    expect(result.modelUsed).toBe('claude-sonnet-4');
  });
  
  it('should use cache for repeated queries', async () => {
    const query = { query: 'Test', context: 'Test', userRole: 'user' };
    
    const result1 = await aiService.generateSQL(query);
    const result2 = await aiService.generateSQL(query);
    
    expect(result2.fromCache).toBe(true);
  });
});
```

## 📝 Conventions IA

### Naming
- **Services:** `[Name]Service` (ex: `AIService`)
- **Méthodes:** `camelCase` (ex: `generateSQL`)
- **Types:** `PascalCase` (ex: `AiQueryRequest`)

### Erreurs
- ✅ Utiliser erreurs typées (`ValidationError`, `ExternalServiceError`)
- ✅ Logger toutes les erreurs avec contexte
- ✅ Gérer timeouts et circuit breakers

### Logging
```typescript
logger.info('[AIService] Requête traitée', {
  metadata: {
    modelUsed: result.modelUsed,
    tokensUsed: result.tokensUsed,
    fromCache: result.fromCache,
    userId: userId
  }
});
```

