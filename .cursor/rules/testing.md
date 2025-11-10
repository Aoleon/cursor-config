# Règles Tests - Saxium

## 🧪 Infrastructure de Tests

### Frameworks

- **Backend:** Vitest (`vitest.backend.config.ts`)
- **Frontend:** Vitest + React Testing Library (`vitest.frontend.config.ts`)
- **E2E:** Playwright (`playwright.config.ts`)

### Objectifs de Couverture

- **Backend:** 85% (actuel ~82%)
- **Frontend:** 80% (actuel ~78%)
- **E2E:** 100% des workflows critiques

## 📋 Patterns de Test Backend

### Test de Route

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { storage } from '../storage-poc';

describe('POST /api/offers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should create offer successfully', async () => {
    const mockOffer = {
      name: 'Test Offer',
      status: 'brouillon'
    };
    
    vi.spyOn(storage, 'createOffer').mockResolvedValue({
      id: '123',
      ...mockOffer,
      createdAt: new Date()
    } as any);
    
    const response = await request(app)
      .post('/api/offers')
      .send(mockOffer)
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Test Offer');
  });
  
  it('should return 400 on invalid input', async () => {
    const response = await request(app)
      .post('/api/offers')
      .send({}) // Données invalides
      .expect(400);
    
    expect(response.body.success).toBe(false);
    expect(response.body.error.type).toBe('validation');
  });
});
```

### Test de Service

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService } from '../services/AIService';
import { ValidationError } from '../utils/error-handler';

describe('AIService', () => {
  let aiService: AIService;
  let mockStorage: any;
  
  beforeEach(() => {
    mockStorage = {
      // Mocks nécessaires
    };
    aiService = new AIService(mockStorage);
  });
  
  it('should generate SQL successfully', async () => {
    const result = await aiService.generateSQL({
      query: 'Liste des projets',
      context: 'Test',
      userRole: 'user'
    });
    
    expect(result.success).toBe(true);
    expect(result.data.sql).toBeDefined();
  });
  
  it('should throw ValidationError on invalid input', async () => {
    await expect(
      aiService.generateSQL({
        query: '', // Vide
        context: 'Test',
        userRole: 'user'
      })
    ).rejects.toThrow(ValidationError);
  });
});
```

### Test avec Mocks

```typescript
import { vi } from 'vitest';

// Mock service externe
vi.mock('../services/AIService', () => ({
  getAIService: () => ({
    generateSQL: vi.fn().mockResolvedValue({
      success: true,
      data: { sql: 'SELECT * FROM projects' }
    })
  })
}));

// Mock storage
const mockStorage = {
  getOffers: vi.fn().mockResolvedValue([]),
  createOffer: vi.fn().mockResolvedValue({ id: '123' })
};
```

## 📋 Patterns de Test Frontend

### Test de Composant

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OfferCard } from './OfferCard';

describe('OfferCard', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  
  it('should render offer correctly', async () => {
    const mockOffer = {
      id: '123',
      name: 'Test Offer',
      status: 'brouillon'
    };
    
    render(
      <QueryClientProvider client={queryClient}>
        <OfferCard offer={mockOffer} />
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Test Offer')).toBeInTheDocument();
    });
  });
});
```

### Test de Hook

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOffer } from './useOffer';

describe('useOffer', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  
  it('should fetch offer', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
    
    const { result } = renderHook(() => useOffer('123'), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    
    expect(result.current.data?.id).toBe('123');
  });
});
```

### Test avec MSW (Mock Service Worker)

```typescript
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('/api/offers', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: [{ id: '123', name: 'Test Offer' }]
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## 📋 Patterns de Test E2E

### Test Playwright

```typescript
import { test, expect } from '@playwright/test';

test('should create offer', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[name="email"]', 'user@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Navigate to offers
  await page.goto('/offers');
  await expect(page.locator('h1')).toContainText('Offres');
  
  // Create offer
  await page.click('button:has-text("Nouvelle offre")');
  await page.fill('input[name="name"]', 'Test Offer');
  await page.click('button:has-text("Créer")');
  
  // Verify
  await expect(page.locator('text=Test Offer')).toBeVisible();
});
```

## ✅ Bonnes Pratiques Tests

### Structure

**TOUJOURS:**
- ✅ Organiser tests par fonctionnalité
- ✅ Utiliser `describe` pour grouper tests liés
- ✅ Utiliser `beforeEach`/`afterEach` pour setup/cleanup
- ✅ Nommer tests de manière descriptive

### Isolation

**TOUJOURS:**
- ✅ Tests indépendants (pas de dépendances entre tests)
- ✅ Nettoyer données/mocks entre tests
- ✅ Utiliser mocks pour dépendances externes

### Assertions

**TOUJOURS:**
- ✅ Assertions claires et spécifiques
- ✅ Tester comportement, pas implémentation
- ✅ Vérifier cas d'erreur aussi

### Coverage

**TOUJOURS:**
- ✅ Vérifier couverture après modifications
- ✅ Objectif: 85% backend, 80% frontend
- ✅ Focus sur code critique (services, routes)

## 🚫 Anti-Patterns Tests

### ❌ Éviter

```typescript
// ❌ Test trop large
it('should work', async () => {
  // Teste tout
});

// ❌ Dépendances entre tests
let sharedState;
it('test 1', () => { sharedState = 'value'; });
it('test 2', () => { expect(sharedState).toBe('value'); });

// ❌ Mocks trop complexes
vi.mock('everything', () => ({ /* ... */ }));

// ❌ Tests qui dépendent de l'ordre
// Tests doivent être indépendants
```

## 📝 Conventions Tests

### Naming
- **Fichiers:** `[name].test.ts` ou `[name].spec.ts`
- **Describe:** Nom de la fonctionnalité/component
- **It:** Comportement attendu ("should ...")

### Organisation
```
tests/
├── backend/
│   ├── services/
│   ├── routes/
│   └── storage/
├── frontend/
│   ├── components/
│   ├── hooks/
│   └── pages/
└── e2e/
    └── workflows/
```


