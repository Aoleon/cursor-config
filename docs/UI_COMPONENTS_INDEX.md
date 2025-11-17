# Index des Composants UI Standardisés

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

Guide de référence rapide pour tous les composants UI standardisés créés pour l'optimisation des workflows.

## 📋 Composants par Catégorie

### 1. États Standardisés

#### LoadingState
**Fichier:** `client/src/components/ui/loading-states.tsx`

**Types disponibles:**
- `spinner` - Spinner classique (par défaut)
- `skeleton-list` - Squelette pour listes
- `skeleton-detail` - Squelette pour pages de détail

**Usage:**
```tsx
<LoadingState 
  type="skeleton-list" 
  message="Chargement..."
  count={5}
/>
```

#### ErrorState
**Fichier:** `client/src/components/ui/loading-states.tsx`

**Props:**
- `title` - Titre de l'erreur
- `message` - Message d'erreur
- `onRetry` - Fonction de retry (optionnel)
- `retryLabel` - Label du bouton retry (optionnel)

**Usage:**
```tsx
<ErrorState
  title="Erreur lors du chargement"
  message={error.message}
  onRetry={() => refetch()}
/>
```

#### EmptyState
**Fichier:** `client/src/components/ui/loading-states.tsx`

**Props:**
- `title` - Titre de l'état vide
- `description` - Description (optionnel)
- `icon` - Icône React (optionnel)
- `action` - Action avec `label` et `onClick` (optionnel)

**Usage:**
```tsx
<EmptyState
  title="Aucun élément"
  description="Les éléments apparaîtront ici"
  icon={<FileText className="h-12 w-12" />}
  action={{
    label: "Créer un élément",
    onClick: () => setLocation("/create")
  }}
/>
```

### 2. Navigation

#### ContextualLinks
**Fichier:** `client/src/components/navigation/ContextualLinks.tsx`

**Props:**
- `entityType` - Type d'entité: `"ao" | "offer" | "project"`
- `entityId` - ID de l'entité
- `aoId` - ID de l'AO (optionnel)
- `offerId` - ID de l'offre (optionnel)
- `projectId` - ID du projet (optionnel)
- `className` - Classes CSS additionnelles (optionnel)

**Usage:**
```tsx
<ContextualLinks
  entityType="offer"
  entityId={offer.id}
  aoId={offer.aoId}
  projectId={offer.projectId}
  className="mb-4"
/>
```

#### QuickActions
**Fichier:** `client/src/components/navigation/QuickActions.tsx`

**Props:**
- `maxVisible` - Nombre maximum d'actions visibles (défaut: 6)
- `showLabels` - Afficher les labels (défaut: false)

**Usage:**
```tsx
<QuickActions maxVisible={6} showLabels={true} />
```

#### CommandPalette
**Fichier:** `client/src/components/commands/CommandPalette.tsx`

**Raccourci:** `⌘K` (Mac) ou `Ctrl+K` (Windows/Linux)

**Intégration:** Déjà intégré dans `header.tsx`

### 3. Performance Perçue

#### SkeletonList
**Fichier:** `client/src/components/ui/skeleton-list.tsx`

**Props:**
- `count` - Nombre d'éléments (défaut: 5)
- `showHeader` - Afficher l'en-tête (défaut: false)

**Usage:**
```tsx
<SkeletonList count={5} showHeader={false} />
```

#### SkeletonDetail
**Fichier:** `client/src/components/ui/skeleton-list.tsx`

**Props:**
- `showSidebar` - Afficher la sidebar (défaut: false)
- `showTabs` - Afficher les onglets (défaut: false)

**Usage:**
```tsx
<SkeletonDetail showSidebar={true} showTabs={true} />
```

### 4. Résumés Actionnables

#### ActionableSummary
**Fichier:** `client/src/components/navigation/ActionableSummary.tsx`

**Props:**
- `tasks` - Tableau de tâches urgentes
- `milestones` - Tableau de jalons
- `risks` - Tableau de risques
- `className` - Classes CSS additionnelles (optionnel)

**Usage:**
```tsx
<ActionableSummary
  tasks={urgentTasks}
  milestones={upcomingMilestones}
  risks={identifiedRisks}
/>
```

### 5. Formulaires

#### FormWizard
**Fichier:** `client/src/components/forms/FormWizard.tsx`

**Props:**
- `steps` - Tableau d'étapes
- `onComplete` - Callback de complétion
- `onStepChange` - Callback de changement d'étape

**Usage:**
```tsx
<FormWizard
  steps={formSteps}
  onComplete={handleSubmit}
  onStepChange={handleStepChange}
/>
```

### 6. Listes Améliorées

#### EnhancedList
**Fichier:** `client/src/components/lists/EnhancedList.tsx`

**Props:**
- `title` - Titre de la liste
- `items` - Tableau d'éléments
- `isLoading` - État de chargement
- `renderItem` - Fonction de rendu d'élément
- `searchPlaceholder` - Placeholder de recherche
- `searchKeys` - Clés de recherche
- `filters` - Filtres disponibles
- `onFilterChange` - Callback de changement de filtre
- `emptyMessage` - Message d'état vide
- `actions` - Actions disponibles
- `showSearch` - Afficher la recherche (défaut: true)
- `showFilters` - Afficher les filtres (défaut: true)

**Usage:**
```tsx
<EnhancedList
  title="Liste des éléments"
  items={items}
  isLoading={isLoading}
  renderItem={(item) => <ItemCard item={item} />}
  searchKeys={['name', 'description']}
  filters={filterOptions}
/>
```

## 🎯 Patterns d'Utilisation

### Pattern Standard pour Pages de Liste

```tsx
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/loading-states";
import { FileText } from "lucide-react";

export default function ItemsList() {
  const { data: items, isLoading, error } = useQuery({
    queryKey: ["/api/items"],
  });

  if (isLoading) {
    return <LoadingState type="skeleton-list" count={6} />;
  }

  if (error) {
    return (
      <ErrorState
        title="Erreur"
        message={error.message}
        onRetry={() => queryClient.invalidateQueries({ queryKey: ["/api/items"] })}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Aucun élément"
        icon={<FileText className="h-12 w-12" />}
      />
    );
  }

  return <div>{/* Liste des éléments */}</div>;
}
```

### Pattern Standard pour Pages de Détail

```tsx
import { LoadingState, ErrorState } from "@/components/ui/loading-states";
import { SkeletonDetail } from "@/components/ui/skeleton-list";
import { ContextualLinks } from "@/components/navigation/ContextualLinks";

export default function ItemDetail() {
  const { id } = useParams();
  const { data: item, isLoading, error } = useQuery({
    queryKey: ["/api/items", id],
  });

  if (isLoading) {
    return <SkeletonDetail />;
  }

  if (error) {
    return (
      <ErrorState
        title="Erreur"
        message={error.message}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <>
      <Header title={item.name} />
      <div className="px-6 py-6">
        <ContextualLinks
          entityType="item"
          entityId={item.id}
          className="mb-4"
        />
        {/* Contenu détaillé */}
      </div>
    </>
  );
}
```

## 📚 Références

### Fichiers Principaux

- **États:** `client/src/components/ui/loading-states.tsx`
- **Navigation:** `client/src/components/navigation/`
- **Squelettes:** `client/src/components/ui/skeleton-list.tsx`
- **Formulaires:** `client/src/components/forms/FormWizard.tsx`
- **Listes:** `client/src/components/lists/EnhancedList.tsx`

### Documentation Complémentaire

- **Guide de Démarrage Rapide:** `docs/UI_QUICK_START.md`
- **Guide de Migration:** `docs/UI_MIGRATION_GUIDE.md`
- **Résumé des Optimisations:** `docs/UI_OPTIMIZATIONS_SUMMARY.md`
- **Détails d'Implémentation:** `docs/UI_OPTIMIZATIONS_IMPLEMENTED.md`

## ✅ Checklist d'Utilisation

### Pour Nouveaux Composants

- [ ] Utiliser `LoadingState` pour les états de chargement
- [ ] Utiliser `ErrorState` pour les erreurs
- [ ] Utiliser `EmptyState` pour les états vides
- [ ] Ajouter `ContextualLinks` si navigation entre entités
- [ ] Utiliser `SkeletonList` ou `SkeletonDetail` pour performance perçue
- [ ] Vérifier la cohérence avec les autres pages

### Pour Composants Réutilisables

- [ ] Exporter les composants depuis un fichier centralisé
- [ ] Documenter les props avec TypeScript
- [ ] Ajouter des exemples d'utilisation
- [ ] Tester avec différents états (loading, error, empty)
- [ ] Vérifier l'accessibilité (ARIA labels)

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

