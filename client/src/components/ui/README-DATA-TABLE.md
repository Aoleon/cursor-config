# Système de Tableaux Personnalisables

Guide d'utilisation et d'extension du système DataTable avec tri, filtrage et personnalisation des colonnes.

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Utilisation Rapide](#utilisation-rapide)
4. [Patterns Critiques](#patterns-critiques)
5. [Extension à de Nouvelles Entités](#extension-à-de-nouvelles-entités)
6. [Problèmes Courants et Solutions](#problèmes-courants-et-solutions)

## 🎯 Vue d'ensemble

Le système DataTable fournit :
- **Tableaux réactifs** avec tri, filtrage et personnalisation
- **Persistance localStorage** des préférences utilisateur
- **Réutilisabilité** pour tous types d'entités (AOs, Offers, Projects, etc.)
- **Performance optimisée** avec mémorisation et calculs incrémentaux

### Fonctionnalités

✅ **Colonnes personnalisables** : Afficher/masquer, réorganiser  
✅ **Tri multicritères** : Ascendant/descendant sur toutes colonnes  
✅ **Filtrage avancé** : Texte, sélection, date  
✅ **Persistance** : Préférences sauvegardées par tableau  
✅ **Responsive** : Optimisé mobile/desktop  
✅ **Accessible** : data-testid pour tests E2E

## 🏗 Architecture

### Composants Principaux

```
client/src/
├── components/ui/
│   ├── data-table.tsx          # Composant DataTable réutilisable
│   └── README-DATA-TABLE.md    # Ce fichier
├── hooks/
│   └── useTablePreferences.ts  # Hook de gestion des préférences
└── pages/
    └── offers.tsx              # Exemple d'utilisation (AOs/Offers)
```

### Flux de Données

```
DataTable (UI)
    ↓
useTablePreferences (Logic)
    ↓
localStorage (Persistence)
```

## 🚀 Utilisation Rapide

### 1. Définir les Colonnes

```typescript
import { DataTableColumn } from '@/components/ui/data-table';

const columns: DataTableColumn<MyEntity>[] = [
  {
    id: 'reference',
    label: 'Référence',
    accessor: 'reference',           // Clé dans l'objet
    sortable: true,
    filterable: true,
    filterType: 'text',
    width: '150px'
  },
  {
    id: 'status',
    label: 'Statut',
    accessor: 'status',
    sortable: true,
    filterable: true,
    filterType: 'select',           // Filtre dropdown
    filterOptions: [
      { label: 'Nouveau', value: 'nouveau' },
      { label: 'En cours', value: 'en_cours' }
    ],
    render: (value) => <Badge>{value}</Badge>  // Rendu personnalisé
  },
  {
    id: 'montant',
    label: 'Montant',
    accessor: (row) => row.montantFinal?.toNumber() || 0,  // Fonction accessor
    sortable: true,
    render: (value) => `${value.toFixed(2)} €`
  }
];
```

### 2. Utiliser le DataTable

```typescript
import { DataTable } from '@/components/ui/data-table';

function MyPage() {
  const { data, isLoading } = useQuery({ queryKey: ['/api/my-entities'] });

  if (isLoading) return <div>Chargement...</div>;

  return (
    <DataTable
      tableId="my-entities-table"  // ID unique pour localStorage
      columns={columns}
      data={data || []}
      onRowClick={(row) => console.log(row)}
      emptyMessage="Aucune donnée"
    />
  );
}
```

## ⚠️ Patterns Critiques

### 🔴 OBLIGATOIRE : Mémoriser les Colonnes

**Problème** : Si `columns` est recréé à chaque rendu, les préférences sont réinitialisées.

**❌ Mauvais** :
```typescript
function MyPage() {
  // Recréé à chaque rendu !
  const columns = [
    { id: 'ref', label: 'Ref', accessor: 'reference' }
  ];
  
  return <DataTable columns={columns} ... />;
}
```

**✅ Bon** :
```typescript
function MyPage() {
  // Mémorisé : référence stable
  const columns = useMemo(() => [
    { id: 'ref', label: 'Ref', accessor: 'reference' }
  ], []); // Dépendances vides si colonnes statiques
  
  return <DataTable columns={columns} ... />;
}
```

**Ou encore mieux** : Déclarer en dehors du composant si statique :
```typescript
const COLUMNS: DataTableColumn[] = [
  { id: 'ref', label: 'Ref', accessor: 'reference' }
];

function MyPage() {
  return <DataTable columns={COLUMNS} ... />;
}
```

### 🔴 OBLIGATOIRE : tableId Unique

Chaque DataTable doit avoir un `tableId` unique pour éviter les collisions de préférences :

```typescript
<DataTable tableId="aos-table" ... />      // AOs
<DataTable tableId="offers-table" ... />   // Offers
<DataTable tableId="projects-table" ... /> // Projects
```

### 🟡 Recommandé : data-testid pour Tests E2E

Pour faciliter les tests Playwright, ajoutez des `data-testid` descriptifs :

```typescript
{
  id: 'reference',
  label: 'Référence',
  // Les data-testid sont automatiquement générés :
  // - header-reference
  // - filter-reference
  // - sort-reference
  // - toggle-column-reference
}
```

## 🔧 Extension à de Nouvelles Entités

### Exemple : Ajouter un Tableau Projects

#### 1. Créer le fichier de colonnes

```typescript
// client/src/components/projects/projects-columns.tsx
import { DataTableColumn } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import type { ProjectSelect } from '@shared/schema';

export const projectsColumns: DataTableColumn<ProjectSelect>[] = [
  {
    id: 'reference',
    label: 'Référence',
    accessor: 'reference',
    sortable: true,
    filterable: true,
    width: '150px'
  },
  {
    id: 'nom',
    label: 'Nom du projet',
    accessor: 'nom',
    sortable: true,
    filterable: true
  },
  {
    id: 'status',
    label: 'Statut',
    accessor: 'status',
    sortable: true,
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { label: 'Préparation', value: 'preparation' },
      { label: 'Chantier', value: 'chantier' },
      { label: 'Terminé', value: 'termine' }
    ],
    render: (value) => {
      const variants = {
        preparation: 'secondary',
        chantier: 'default',
        termine: 'success'
      };
      return <Badge variant={variants[value] || 'default'}>{value}</Badge>;
    }
  },
  {
    id: 'dateDebut',
    label: 'Date début',
    accessor: 'dateDebut',
    sortable: true,
    render: (value) => value ? new Date(value).toLocaleDateString('fr-FR') : '-'
  },
  {
    id: 'budget',
    label: 'Budget',
    accessor: (row) => row.budget?.toNumber() || 0,
    sortable: true,
    render: (value) => `${value.toLocaleString('fr-FR')} €`
  }
];
```

#### 2. Créer la page Projects

```typescript
// client/src/pages/projects.tsx
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/ui/data-table';
import { projectsColumns } from '@/components/projects/projects-columns';

export default function ProjectsPage() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['/api/projects']
  });

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Projets</h1>
      
      <DataTable
        tableId="projects-table"
        columns={projectsColumns}
        data={projects || []}
        onRowClick={(project) => {
          // Navigation vers le détail du projet
          window.location.href = `/projects/${project.id}`;
        }}
        emptyMessage="Aucun projet trouvé"
      />
    </div>
  );
}
```

#### 3. Enregistrer la route

```typescript
// client/src/App.tsx
import ProjectsPage from './pages/projects';

function App() {
  return (
    <Routes>
      {/* ... autres routes ... */}
      <Route path="/projects" component={ProjectsPage} />
    </Routes>
  );
}
```

#### 4. Ajouter des index DB (si recherche nécessaire)

```sql
-- Exécuter en SQL pour optimiser les recherches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_projects_reference_trgm 
  ON projects USING gin (reference gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_projects_nom_trgm 
  ON projects USING gin (nom gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_projects_reference_btree 
  ON projects (reference);
```

**Note** : Les index GIN trigram doivent être créés manuellement car Drizzle ne supporte pas `gin_trgm_ops`.

## 🐛 Problèmes Courants et Solutions

### Problème 1 : Colonnes ne se réaffichent pas après masquage

**Cause** : `defaultColumns` recréé à chaque rendu  
**Solution** : Mémoriser avec `useMemo` (voir [Patterns Critiques](#patterns-critiques))

### Problème 2 : Reset ne restaure pas les colonnes

**Cause** : `resetPreferences` lit localStorage avant de le supprimer  
**Solution** : Déjà corrigé dans `useTablePreferences.ts` (v1.1+)

### Problème 3 : Préférences de tableaux se mélangent

**Cause** : Même `tableId` pour plusieurs tableaux  
**Solution** : Utiliser des `tableId` uniques et descriptifs

### Problème 4 : Tri/Filtre ne fonctionne pas

**Cause** : `accessor` mal configuré ou type incompatible  
**Solution** : Vérifier que l'accessor retourne une valeur comparable :

```typescript
// ✅ Bon
accessor: (row) => row.montant?.toNumber() || 0

// ❌ Mauvais
accessor: (row) => row.montant  // Decimal non comparable
```

### Problème 5 : Performance dégradée avec beaucoup de données

**Solution** : Ajouter pagination côté backend :

```typescript
const { data, total } = useQuery({
  queryKey: ['/api/entities', { page, limit: 50 }]
});

// Ajouter pagination UI
<Pagination currentPage={page} total={total} onPageChange={setPage} />
```

## 📊 Statistiques d'Utilisation

### Tables Actuelles (Oct 2025)
- ✅ **Offres/AOs** : 10 colonnes, ~833 items, fonctionnel
- 🔄 **Projects** : Non implémenté (utiliser ce guide)
- 🔄 **Suppliers** : Non implémenté
- 🔄 **Analytics** : Non implémenté

### Performance
- **Rendu initial** : ~100ms pour 100 items
- **Tri** : ~20ms pour 100 items
- **Filtrage** : ~15ms par critère
- **Toggle colonne** : ~5ms

## 🔐 Accessibilité et Tests

### Test IDs Automatiques

Le DataTable génère automatiquement des `data-testid` :

```typescript
// Pour colonne "reference":
data-testid="header-reference"         // En-tête
data-testid="filter-reference"         // Filtre
data-testid="sort-reference"           // Bouton tri
data-testid="toggle-column-reference"  // Toggle visibilité
data-testid="cell-{index}-reference"   // Cellule ligne {index}
```

### Exemple Test Playwright

```typescript
// tests/data-table.spec.ts
test('should toggle column visibility', async ({ page }) => {
  await page.goto('/offers');
  
  // Ouvrir panneau colonnes
  await page.click('[data-testid="button-column-settings"]');
  
  // Masquer colonne
  await page.click('[data-testid="toggle-column-reference"]');
  await expect(page.locator('[data-testid="header-reference"]'))
    .not.toBeVisible();
  
  // Réafficher colonne
  await page.click('[data-testid="toggle-column-reference"]');
  await expect(page.locator('[data-testid="header-reference"]'))
    .toBeVisible();
});
```

## 🚦 Checklist Extension

Avant d'ajouter un nouveau tableau :

- [ ] Définir colonnes avec types TypeScript stricts
- [ ] Mémoriser tableau de colonnes (useMemo ou const externe)
- [ ] Utiliser tableId unique et descriptif
- [ ] Ajouter render personnalisé pour colonnes complexes
- [ ] Configurer filterType approprié (text/select/date)
- [ ] Tester toggle visibilité, tri, filtrage
- [ ] Ajouter index DB si recherche globale nécessaire
- [ ] Écrire test E2E Playwright

## 📚 Ressources Additionnelles

- **shadcn/ui Table** : https://ui.shadcn.com/docs/components/table
- **React Query** : https://tanstack.com/query/latest
- **Playwright Testing** : https://playwright.dev/

## 🎓 Contributeurs

- **v1.0** (Oct 2025) : Système initial pour Offers/AOs
- **v1.1** (Oct 2025) : Corrections bugs visibilité + reset
- **v1.2** (Oct 2025) : Documentation patterns réutilisables

---

**Dernière mise à jour** : 28 octobre 2025  
**Statut** : Production-ready ✅
