# Règles Frontend - Saxium

## 🎨 Architecture Frontend

### Structure

```
client/src/
├── pages/           # Pages principales
├── components/      # Composants réutilisables
│   ├── ui/         # Composants UI (Radix + shadcn)
│   ├── dashboard/  # Composants dashboard
│   └── ...
├── hooks/          # Hooks React personnalisés
├── lib/            # Utilitaires et helpers
├── types/          # Types frontend
└── providers/      # Context providers
```

### Pattern de Composant

```typescript
// client/src/components/[Component].tsx
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-helpers';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface ComponentProps {
  id: string;
  onSuccess?: () => void;
}

export function Component({ id, onSuccess }: ComponentProps) {
  const { toast } = useToast();
  
  const { data, isLoading } = useQuery({
    queryKey: ['entity', id],
    queryFn: () => apiRequest(`/api/entities/${id}`)
  });
  
  const mutation = useMutation({
    mutationFn: (data: UpdateData) => 
      apiRequest(`/api/entities/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Modification réussie' });
      onSuccess?.();
    },
    onError: (error) => {
      toast({ 
        title: 'Erreur', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  if (isLoading) return <div>Chargement...</div>;
  if (!data) return <div>Aucune donnée</div>;
  
  return (
    <div>
      {/* Contenu */}
    </div>
  );
}
```

### TanStack Query Pattern

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-helpers';

// Query avec cache
const { data, isLoading, error } = useQuery({
  queryKey: ['offers', filters],
  queryFn: () => apiRequest('/api/offers', { params: filters }),
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000 // 10 minutes
});

// Mutation avec invalidation
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: (data) => apiRequest('/api/offers', {
    method: 'POST',
    body: data
  }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['offers'] });
  }
});
```

### Formulaires avec React Hook Form

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';

const schema = z.object({
  name: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide')
});

export function FormComponent() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: ''
    }
  });
  
  const onSubmit = async (data: z.infer<typeof schema>) => {
    await mutation.mutateAsync(data);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit">Envoyer</Button>
      </form>
    </Form>
  );
}
```

### Lazy Loading

```typescript
// App.tsx
import { lazy, Suspense } from 'react';
import PageLoader from '@/components/PageLoader';

const Dashboard = lazy(() => import('@/pages/dashboard'));
const Offers = lazy(() => import('@/pages/offers'));

function App() {
  return (
    <Suspense fallback={<PageLoader message="Chargement..." />}>
      <Router>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/offers" component={Offers} />
      </Router>
    </Suspense>
  );
}
```

### Hooks Personnalisés

```typescript
// client/src/hooks/use[Entity].ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-helpers';

export function useOffer(id: string) {
  return useQuery({
    queryKey: ['offer', id],
    queryFn: () => apiRequest(`/api/offers/${id}`),
    enabled: !!id
  });
}

export function useUpdateOffer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateData }) =>
      apiRequest(`/api/offers/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['offer', id] });
    }
  });
}
```

## 🎨 UI Components

### Utilisation Radix UI + shadcn

```typescript
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Toujours utiliser les composants UI depuis @/components/ui/
// Ne pas créer de composants UI custom si équivalent existe
```

### Styling avec Tailwind

```typescript
// ✅ CORRECT - Utiliser classes Tailwind
<div className="flex items-center gap-4 p-4 bg-card rounded-lg">
  <Button variant="default" size="sm">Action</Button>
</div>

// ❌ INCORRECT - Styles inline ou CSS modules
<div style={{ display: 'flex' }}>
  <button className={styles.button}>Action</button>
</div>
```

### Responsive Design

```typescript
// Utiliser breakpoints Tailwind
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Mobile: 1 colonne, Tablet: 2, Desktop: 3 */}
</div>

// Hook mobile
import { useMobile } from '@/hooks/use-mobile';

function Component() {
  const isMobile = useMobile();
  
  return isMobile ? <MobileView /> : <DesktopView />;
}
```

## 🔄 State Management

### TanStack Query (Server State)

```typescript
// ✅ CORRECT - Server state avec TanStack Query
const { data } = useQuery({ queryKey: ['offers'], queryFn: fetchOffers });

// ❌ INCORRECT - Server state dans Context/useState
const [offers, setOffers] = useState([]);
useEffect(() => { fetchOffers().then(setOffers); }, []);
```

### Context API (Client State)

```typescript
// ✅ CORRECT - Client state uniquement (UI, préférences)
const ThemeContext = createContext();

// ❌ INCORRECT - Server state dans Context
const OffersContext = createContext(); // Utiliser TanStack Query à la place
```

## 🚀 Performance Frontend

### Code Splitting

```typescript
// ✅ CORRECT - Lazy loading des pages
const Dashboard = lazy(() => import('@/pages/dashboard'));

// ✅ CORRECT - Dynamic imports pour gros composants
const HeavyChart = lazy(() => import('@/components/charts/HeavyChart'));
```

### Memoization

```typescript
import { useMemo, useCallback } from 'react';

// ✅ CORRECT - Memoization pour calculs coûteux
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// ✅ CORRECT - Callback stable
const handleClick = useCallback(() => {
  onAction(id);
}, [id, onAction]);
```

### Optimisation Listes

```typescript
// ✅ CORRECT - Utiliser OptimizedList pour grandes listes
import { OptimizedList } from '@/components/optimized/OptimizedList';

<OptimizedList
  items={items}
  renderItem={(item) => <ItemComponent item={item} />}
/>
```

## 🧪 Tests Frontend

### Pattern de Test

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Component } from './Component';

describe('Component', () => {
  it('should render correctly', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    
    render(
      <QueryClientProvider client={queryClient}>
        <Component id="123" />
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Expected Text')).toBeInTheDocument();
    });
  });
});
```

## 📝 Conventions Frontend

### Naming
- **Composants:** `PascalCase` (ex: `OfferCard`)
- **Hooks:** `camelCase` avec préfixe `use` (ex: `useOffer`)
- **Fichiers:** `PascalCase` pour composants (ex: `OfferCard.tsx`)
- **Types:** `PascalCase` (ex: `Offer`, `OfferProps`)

### Imports
```typescript
// 1. Imports React
import { useState, useEffect } from 'react';

// 2. Imports externes
import { useQuery } from '@tanstack/react-query';

// 3. Imports UI
import { Button } from '@/components/ui/button';

// 4. Imports internes
import { useOffer } from '@/hooks/useOffer';
import { apiRequest } from '@/lib/api-helpers';

// 5. Types
import type { Offer } from '@shared/schema';
```

### Fichiers
- **Pages:** `[page-name].tsx` dans `pages/`
- **Composants:** `[ComponentName].tsx` dans `components/`
- **Hooks:** `use-[hook-name].ts` dans `hooks/`
- **Types:** `[types].ts` dans `types/`

