# Seeds E2E pour Tests Saxium

Ce répertoire contient les données de test (seeds) pour les tests E2E end-to-end du système Saxium.

## 📋 Structure des Seeds

Les seeds E2E sont organisés par parcours utilisateur (journeys) :

### Journey 1 : AO → Offer → Projet → Chantier
- **`testAOComplete`** : Appel d'Offre complet (ID: `e2e-ao-complete-001`)
- **`testOfferFromAO`** : Offre générée depuis AO (ID: `e2e-offer-from-ao-001`)
- **`testProjectFromAO`** : Projet créé depuis Offre/AO (ID: `e2e-project-from-ao-001`)

### Journey 2 : Offer Standalone → Projet
- **`testOfferStandalone`** : Offre créée directement (ID: `e2e-offer-standalone-001`)
- **`testProjectFromOffer`** : Projet créé depuis Offre (ID: `e2e-project-from-offer-001`)

### Journey 3 : Project Lifecycle
- **`testProjectLifecycle`** : Projet pour test cycle de vie complet (ID: `e2e-project-lifecycle-001`)

## 🔑 Convention de Nommage des IDs

Tous les seeds E2E suivent le pattern strict :

```
e2e-{type}-{name}-001
```

**Exemples :**
- `e2e-ao-complete-001` - Appel d'Offre
- `e2e-offer-from-ao-001` - Offre
- `e2e-project-from-ao-001` - Projet

## ⚠️ LIMITATION CRITIQUE : API et IDs Personnalisés

### Problème Identifié

**Les APIs de création (`POST /api/aos`, `POST /api/offers`, `POST /api/projects`) NE PEUVENT PAS accepter des IDs personnalisés** en raison de la validation Zod.

**Cause :**
- Les schémas Zod (`insertAoSchema`, `insertOfferSchema`, `insertProjectSchema`) **omettent explicitement** le champ `id` :
  ```typescript
  export const insertOfferSchema = createInsertSchema(offers).omit({
    id: true,  // ❌ Le champ id est omis de la validation
    createdAt: true,
    updatedAt: true,
  });
  ```
- Toute requête contenant un champ `id` sera **rejetée par la validation**
- Le backend génère automatiquement des UUIDs via PostgreSQL

**Conséquences :**
1. `seedE2EData()` **échoue** lors de la tentative d'insertion avec IDs personnalisés
2. `resetE2EState()` **ne peut jamais supprimer** les seeds car les IDs ne correspondent pas aux UUIDs générés
3. Les références `aoId`/`offerId`/`projectId` pointent vers des entités **inexistantes**
4. Les tests E2E basés sur ces liens **échoueront systématiquement**

## ✅ Solutions Alternatives

### Solution 1 : Modification de l'API (Recommandée pour Tests)

**Créer des routes de test spéciales qui acceptent les IDs personnalisés :**

```typescript
// Dans server/routes-poc.ts ou server/routes-test.ts

// Route de test pour créer un AO avec ID personnalisé
app.post("/api/test/seed/ao", 
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const aoData = req.body;
    
    // Validation : Accepter les IDs e2e-* uniquement
    if (aoData.id && !aoData.id.startsWith('e2e-')) {
      throw new ValidationError("Seuls les IDs e2e-* sont autorisés pour les tests");
    }
    
    // Insertion directe en SQL pour bypasser la validation Zod
    const [ao] = await db.insert(aos).values(aoData).returning();
    sendSuccess(res, ao, 201);
  })
);

// Routes similaires pour /api/test/seed/offer et /api/test/seed/project
```

**Avantages :**
- Séparation claire entre routes de production et routes de test
- Sécurité : Seuls les IDs avec pattern `e2e-*` sont acceptés
- Pas de modification des routes de production

**Utilisation :**
```typescript
// Dans seedE2EData()
for (const offer of seeds.offers) {
  createPromises.push(
    page.request.post('/api/test/seed/offer', { data: offer })
  );
}
```

### Solution 2 : Seeding via SQL Direct

**Utiliser des migrations SQL ou des scripts de seeding directs :**

```sql
-- scripts/seed-e2e-data.sql
INSERT INTO aos (id, reference, client, intitule_operation, status, montant_estime)
VALUES 
  ('e2e-ao-complete-001', 'AO-E2E-COMPLETE-001', 'Client E2E Test AO', 'Parcours E2E Complet', 'reception', 50000);

INSERT INTO offers (id, reference, titre, montant_estime, status)
VALUES
  ('e2e-offer-from-ao-001', 'OFF-E2E-FROM-AO-001', 'Offre E2E depuis AO', 48000, 'en_attente_fournisseurs'),
  ('e2e-offer-standalone-001', 'OFF-E2E-STANDALONE-001', 'Offre E2E Standalone', 35000, 'en_cours_chiffrage');

-- etc.
```

**Avantages :**
- Contrôle total sur les IDs
- Pas besoin de modifier l'API
- Rapide et direct

**Inconvénients :**
- Nécessite maintenance des scripts SQL séparés
- Moins flexible que l'API

### Solution 3 : Approche Dynamique (Workaround)

**Accepter les IDs générés dynamiquement et les stocker :**

```typescript
// Modifier seedE2EData() pour capturer les IDs générés
export async function seedE2EDataDynamic(page: Page): Promise<{
  aoIds: Record<string, string>;
  offerIds: Record<string, string>;
  projectIds: Record<string, string>;
}> {
  const aoIds: Record<string, string> = {};
  const offerIds: Record<string, string> = {};
  const projectIds: Record<string, string> = {};
  
  // Créer AO et capturer l'ID
  const aoResponse = await page.request.post('/api/aos', { 
    data: { ...testAOComplete, id: undefined } 
  });
  const aoResult = await aoResponse.json();
  aoIds['complete'] = aoResult.data?.id || aoResult.id;
  
  // Utiliser l'ID capturé pour créer l'offre
  const offerResponse = await page.request.post('/api/offers', {
    data: { 
      ...testOfferFromAO, 
      id: undefined,
      aoId: aoIds['complete'] 
    }
  });
  // ...
  
  return { aoIds, offerIds, projectIds };
}
```

**Inconvénients :**
- Complexité accrue
- IDs non déterministes (changent à chaque exécution)
- Difficile de nettoyer avec `resetE2EState()`

## 🚀 Utilisation Recommandée

**En attendant l'implémentation de la Solution 1 :**

1. **Pour les tests E2E** : Utiliser l'approche dynamique (Solution 3)
2. **Pour le développement** : Implémenter les routes `/api/test/seed/*` (Solution 1)
3. **Pour la CI/CD** : Utiliser le seeding SQL direct (Solution 2)

## 📝 Helpers Disponibles

### Reset et Seeding

```typescript
import { resetE2EState, seedE2EData, e2eSeeds } from './test-data';

// Nettoyer toutes les données E2E
await resetE2EState(page);

// Créer les seeds E2E (⚠️ Nécessite routes de test ou SQL)
await seedE2EData(page, e2eSeeds);
```

### Création Individuelle

```typescript
import { createAOViaAPI, createOfferViaAPI, createProjectViaAPI } from './test-data';

// Créer une entité et récupérer son ID généré
const aoId = await createAOViaAPI(page, testAOComplete);
const offerId = await createOfferViaAPI(page, testOfferFromAO);
const projectId = await createProjectViaAPI(page, testProjectFromAO);
```

## 🔍 Vérification de Cohérence

Les seeds respectent les règles suivantes :

✅ Tous les seeds ont un `id` explicite et unique  
✅ Pattern de nommage cohérent : `e2e-{type}-{name}-001`  
✅ Toutes les références (`aoId`, `offerId`, `projectId`) correspondent aux IDs des seeds  
✅ Aucune référence "orpheline"  
✅ Types `as const` utilisés pour `status` et `phases` (évite erreurs TypeScript)  

## 📌 TODO

- [ ] Implémenter les routes `/api/test/seed/*` pour accepter les IDs personnalisés
- [ ] Créer un script SQL de seeding pour CI/CD
- [ ] Ajouter des tests de validation pour vérifier la cohérence des seeds
- [ ] Documenter les workflows de cleanup pour éviter les données orphelines
