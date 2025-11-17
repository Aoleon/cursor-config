# Guide de Migration UI - Composants Standardisés

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

Ce guide explique comment migrer les pages existantes vers les nouveaux composants UI standardisés.

## 📋 Vue d'Ensemble

### Composants Disponibles

1. **LoadingState** - États de chargement standardisés
2. **ErrorState** - États d'erreur standardisés
3. **EmptyState** - États vides standardisés
4. **ContextualLinks** - Navigation contextuelle entre entités
5. **SkeletonDetail** / **SkeletonList** - Squelettes de chargement
6. **QuickActions** - Actions rapides
7. **CommandPalette** - Palette de commandes globale
8. **ActionableSummary** - Résumés actionnables

## 🔄 Migration des États

### Avant : États Manuels

```tsx
// ❌ AVANT - État de chargement manuel
if (isLoading) {
  return (
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span className="ml-2">Chargement...</span>
    </div>
  );
}

// ❌ AVANT - État d'erreur manuel
if (error) {
  return (
    <div className="text-center py-8">
      <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-red-500" />
      <p className="font-semibold">Erreur</p>
      <p className="text-sm text-gray-600">{error.message}</p>
    </div>
  );
}

// ❌ AVANT - État vide manuel
if (items.length === 0) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      Aucun élément trouvé
    </div>
  );
}
```

### Après : Composants Standardisés

```tsx
// ✅ APRÈS - États standardisés
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/loading-states";

// Chargement
if (isLoading) {
  return (
    <LoadingState 
      type="skeleton-list" 
      message="Chargement des données..."
      count={5}
    />
  );
}

// Erreur
if (error) {
  return (
    <ErrorState
      title="Erreur lors du chargement"
      message={error instanceof Error ? error.message : "Erreur inconnue"}
      onRetry={() => queryClient.invalidateQueries({ queryKey: ["/api/items"] })}
    />
  );
}

// Vide
if (items.length === 0) {
  return (
    <EmptyState
      title="Aucun élément trouvé"
      description="Les éléments apparaîtront ici une fois créés"
      icon={<FileText className="h-12 w-12 mx-auto opacity-50" />}
      action={{
        label: "Créer un élément",
        onClick: () => setLocation("/create-item")
      }}
    />
  );
}
```

## 🧭 Navigation Contextuelle

### Avant : Navigation Manuelle

```tsx
// ❌ AVANT - Liens manuels
<div className="flex gap-2 mb-4">
  {offer.aoId && (
    <Button variant="outline" onClick={() => setLocation(`/aos/${offer.aoId}`)}>
      Voir l'AO
    </Button>
  )}
  {offer.projectId && (
    <Button variant="outline" onClick={() => setLocation(`/projects/${offer.projectId}`)}>
      Voir le Projet
    </Button>
  )}
</div>
```

### Après : ContextualLinks

```tsx
// ✅ APRÈS - Navigation contextuelle
import { ContextualLinks } from "@/components/navigation/ContextualLinks";

<ContextualLinks
  entityType="offer"
  entityId={offer.id}
  aoId={offer.aoId}
  projectId={offer.projectId}
  className="mb-4"
/>
```

## ⚡ Actions Rapides

### Intégration QuickActions

```tsx
// ✅ Intégration dans dashboard ou pages principales
import { QuickActions } from "@/components/navigation/QuickActions";

<Card>
  <CardHeader>
    <CardTitle>Actions Rapides</CardTitle>
  </CardHeader>
  <CardContent>
    <QuickActions maxVisible={6} showLabels={true} />
  </CardContent>
</Card>
```

## 📊 Squelettes de Chargement

### Avant : Squelettes Manuels

```tsx
// ❌ AVANT - Squelettes manuels
{isLoading ? (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <Card key={i}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    ))}
  </div>
) : (
  // Contenu
)}
```

### Après : SkeletonList / SkeletonDetail

```tsx
// ✅ APRÈS - Squelettes standardisés
import { SkeletonList, SkeletonDetail } from "@/components/ui/skeleton-list";

// Pour les listes
{isLoading ? (
  <SkeletonList count={5} />
) : (
  // Contenu
)}

// Pour les détails
{isLoading ? (
  <SkeletonDetail />
) : (
  // Contenu
)}
```

## 🎯 Checklist de Migration

### Pour Chaque Page

- [ ] Remplacer les états de chargement manuels par `LoadingState`
- [ ] Remplacer les états d'erreur manuels par `ErrorState`
- [ ] Remplacer les états vides manuels par `EmptyState`
- [ ] Ajouter `ContextualLinks` si la page affiche des entités liées (AO/Offer/Project)
- [ ] Remplacer les squelettes manuels par `SkeletonList` ou `SkeletonDetail`
- [ ] Vérifier que tous les imports sont corrects
- [ ] Tester les états de chargement, erreur et vide
- [ ] Vérifier la cohérence visuelle avec les autres pages

### Vérifications Finales

- [ ] Aucune erreur de linting
- [ ] Tous les types TypeScript sont corrects
- [ ] Les composants sont accessibles (ARIA labels)
- [ ] Les états sont testés manuellement
- [ ] La documentation est à jour

## 📚 Exemples Complets

### Exemple 1 : Page de Liste

```tsx
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/loading-states";
import { FileText } from "lucide-react";

export default function ItemsList() {
  const { data: items, isLoading, error } = useQuery({
    queryKey: ["/api/items"],
  });

  if (isLoading) {
    return (
      <LoadingState 
        type="skeleton-list" 
        message="Chargement des éléments..."
        count={6}
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Erreur lors du chargement"
        message={error instanceof Error ? error.message : "Erreur inconnue"}
        onRetry={() => queryClient.invalidateQueries({ queryKey: ["/api/items"] })}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Aucun élément"
        description="Les éléments apparaîtront ici"
        icon={<FileText className="h-12 w-12 mx-auto opacity-50" />}
      />
    );
  }

  return (
    <div>
      {items.map(item => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
```

### Exemple 2 : Page de Détail

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
        title="Erreur lors du chargement"
        message={error instanceof Error ? error.message : "Erreur inconnue"}
        onRetry={() => queryClient.invalidateQueries({ queryKey: ["/api/items", id] })}
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
          relatedEntityId={item.relatedId}
          className="mb-4"
        />
        {/* Contenu détaillé */}
      </div>
    </>
  );
}
```

## 🔍 Détection Automatique

### Patterns à Rechercher

Pour identifier les pages à migrer, recherchez :

```bash
# États de chargement manuels
grep -r "animate-spin" client/src/pages/
grep -r "Chargement\.\.\." client/src/pages/
grep -r "Loader2.*animate-spin" client/src/pages/

# États d'erreur manuels
grep -r "AlertTriangle.*h-12" client/src/pages/
grep -r "text-red-500" client/src/pages/

# États vides manuels
grep -r "Aucun.*trouvé" client/src/pages/
grep -r "length === 0.*text-center" client/src/pages/
```

## 📖 Références

- **Composants UI** : `client/src/components/ui/loading-states.tsx`
- **Navigation** : `client/src/components/navigation/ContextualLinks.tsx`
- **Actions** : `client/src/components/navigation/QuickActions.tsx`
- **Squelettes** : `client/src/components/ui/skeleton-list.tsx`

## 📚 Documentation Complémentaire

- **Guide de Démarrage Rapide** : `docs/UI_QUICK_START.md`
- **Index des Composants** : `docs/UI_COMPONENTS_INDEX.md`
- **Résumé Exécutif** : `docs/UI_OPTIMIZATIONS_SUMMARY.md`
- **Détails Techniques** : `docs/UI_OPTIMIZATIONS_IMPLEMENTED.md`

## ✅ Statut de Migration

**45 pages migrées** sur les pages principales de l'application.

### Pages Migrées par Catégorie

- **Pages de Détail** : 3 (offer-detail, project-detail, ao-detail)
- **Workspaces** : 4 (project-manager, be, travaux-sav, logistics)
- **Workflows** : 6 (chiffrage, etude-technique, envoi-devis, chantier, planification, suppliers-pending)
- **Validation** : 2 (validation-be, offers/validation-list)
- **Projets** : 4 (projects, study, supply, support, planning)
- **Spécialisées** : 1 (comparaison-devis)
- **Fournisseurs** : 3 (suppliers, supplier-requests, supplier-portal)
- **Transformation** : 1 (offers/transform-list)
- **Administration** : 2 (teams, batigest)
- **Monitoring/Système** : 5 (monitoring, SystemStatusPage, OneDriveManager, be-dashboard, technical-alerts)
- **Dashboard** : 1 (dashboard)
- **Intelligence/Configuration** : 4 (DateIntelligenceDashboard, pricing, settings-scoring, sav)
- **Portail/Batigest** : 3 (batigest/purchase-order-generator, batigest/client-quote-generator, projects/planning)

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

