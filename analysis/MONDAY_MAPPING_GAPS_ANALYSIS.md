# Monday.com → Saxium - Analyse des Gaps de Mapping

**Date** : 25 octobre 2025  
**Contexte** : Audit complet de l'intégration Monday → Saxium pour identifier les champs non mappés  
**Board analysé** : AO Planning 🖥️ (ID: 3946257560, 41 colonnes, 828 items)

---

## 📊 Situation Actuelle

- **Champs Saxium totaux** : 54 dans table `aos` (51 mappables - 3 système : id/createdAt/updatedAt)
- **Champs mappés** : 39/51 (76.5%) ✅
- **Champs non mappés** : 12/51 (23.5%) ⚠️

### Catégories de Champs Non Mappés

| Catégorie | Nombre | Description |
|-----------|--------|-------------|
| **Business critiques** | 3 | aoCategory, clientRecurrency, selectionComment |
| **Relations entités** | 2 | maitreOuvrageId, maitreOeuvreId |
| **Export Saxium→Monday** | 5 | mondayId, lastExportedAt, syncStatus, etc. (système) |
| **Alias/Doublons** | 2 | dueDate, amountEstimate (doublons historiques) |

---

## 🚨 Gaps Critiques Identifiés

### 1. aoCategory ⚠️ BUG FRONTEND DÉTECTÉ

**Statut** : ❌ Colonne Monday inexistante  
**Impact** : 🔴 CRITIQUE - Frontend affiche déjà ce champ mais obtient NULL !

**Détails** :
- **Champ Saxium** : `aoCategory` (enum: MEXT, MINT, HALL, SERRURERIE, BARDAGE, AUTRE)
- **Usage frontend** : Affiché dans `monday-migration-dashboard.tsx` ligne 570
- **Colonne Monday suggérée** : "Catégorie AO" (dropdown) → **N'EXISTE PAS** dans board
- **Colonne candidate** : `statut_1` "Chiffrage" (status) - peu utilisé (majorité NULL)

**Problème** : Le dashboard essaie d'afficher `ao.aoCategory` mais comme le champ n'est pas mappé depuis Monday, toutes les valeurs sont NULL → UX cassée.

**Solutions possibles** :
1. ✅ **Option A** : Créer colonne "Catégorie AO" (dropdown) dans Monday avec valeurs (MEXT, MINT, HALL, SERRURERIE, BARDAGE, AUTRE)
2. 🔄 **Option B** : Remapper `statut_1` "Chiffrage" → `aoCategory` (vérifier si les valeurs correspondent)
3. 🛠️ **Option C** : Retirer l'affichage frontend en attendant le mapping backend

---

### 2. clientRecurrency

**Statut** : ❌ Colonne Monday inexistante  
**Impact** : 🟡 MOYEN - Segmentation client non disponible

**Détails** :
- **Champ Saxium** : `clientRecurrency` (enum: "Nouveau client", "Client récurrent", "Client premium")
- **Colonne Monday suggérée** : "Type client" (dropdown) → **N'EXISTE PAS** dans board
- **Colonne candidate** : Aucune évidente

**Solutions possibles** :
1. ✅ **Option A** : Créer colonne "Type Client" (dropdown) dans Monday avec valeurs ("Nouveau client", "Client récurrent", "Client premium")
2. 📊 **Option B** : Calculer automatiquement dans Saxium basé sur historique (client existant = récurrent, sinon nouveau)

---

### 3. selectionComment

**Statut** : ❌ Colonne Monday inexistante  
**Impact** : 🟡 MOYEN - Commentaires de sélection non disponibles

**Détails** :
- **Champ Saxium** : `selectionComment` (text - commentaire libre)
- **Colonne Monday suggérée** : "Commentaire sélection" (long_text) → **N'EXISTE PAS** dans board
- **Colonne candidate** : `text_mksnx1hc` "Texte" (text) - peu utilisé (majorité NULL)

**Solutions possibles** :
1. ✅ **Option A** : Créer colonne "Commentaire Sélection" (long_text) dans Monday
2. 🔄 **Option B** : Remapper `text_mksnx1hc` "Texte" → `selectionComment`
3. ⏸️ **Option C** : Laisser non mappé (champ optionnel, faible priorité)

---

### 4. maitreOuvrageId / maitreOeuvreId

**Statut** : 🟡 Colonnes texte existent, résolution ID manquante  
**Impact** : 🟢 FAIBLE - Relations texte disponibles, IDs optionnels

**Détails** :
- **Champs Saxium** :
  - `maitreOuvrageId` (varchar, FK → `maitres_ouvrage.id`)
  - `maitreOeuvreId` (varchar, FK → `maitres_oeuvre.id`)
- **Colonnes Monday existantes** :
  - `text7` "MOA" (text) → actuellement mappé vers `client`
  - `text9` "MOE" (text) → actuellement mappé vers `maitreOeuvre` (champ texte)
- **Problème** : Les colonnes Monday contiennent des **noms texte**, pas des IDs. Il faut résoudre ces noms vers les IDs des tables Saxium.

**Solutions possibles** :
1. ✅ **Option A (RECOMMANDÉE)** : Implémenter `MasterEntityResolver` :
   - Lors de l'import Monday, chercher dans `maitres_ouvrage` si nom existe (case-insensitive)
   - Si trouvé : lier `maitreOuvrageId`, sinon créer nouvelle entrée
   - Même logique pour `maitres_oeuvre`
2. 🔄 **Option B** : Laisser champs texte actuels (`client`, `maitreOeuvre`) et ignorer les IDs
3. 📝 **Option C** : Mapping manuel post-import via UI Saxium

---

## 🔍 Colonnes Monday Disponibles Non Utilisées

Parmi les 41 colonnes du board, certaines sont **peu ou pas utilisées** et pourraient être remappées :

| Colonne ID | Titre | Type | Valeurs observées | Candidat pour |
|------------|-------|------|-------------------|---------------|
| `statut_1` | Chiffrage | status | Majorité NULL, quelques "A faire" | **aoCategory** ? |
| `statut_1__1` | Demande de prix | status | Quelques "A faire" | — |
| `text_mksnx1hc` | Texte | text | Majorité NULL | **selectionComment** ? |
| `link_mktescn5` | Lien internet | link | Non utilisé | — |
| `date__1` | Date Accord | date | Peu utilisé | — |

**Recommandation** : Vérifier avec l'équipe JLM si ces colonnes sont utilisées dans d'autres contextes avant de les remapper.

---

## 📊 Champs Système (Non Mappables)

Ces 5 champs concernent l'**export Saxium → Monday** (sens inverse) et sont gérés automatiquement par `MondayExportService`. Ils ne peuvent PAS être mappés depuis Monday :

| Champ | Description |
|-------|-------------|
| `mondayId` | ID item Monday créé lors export Saxium→Monday |
| `lastExportedAt` | Date dernier export vers Monday |
| `mondaySyncStatus` | Status sync: synced/error/conflict |
| `mondayConflictReason` | Raison conflit si status=conflict |
| `mondayLastSyncedAt` | Date dernier changement status |

**Note** : Ces champs sont correctement gérés, pas d'action requise.

---

## 🎯 Plan d'Action Recommandé

### Priorité 1 : Corriger Bug Frontend aoCategory

**Actions** :
1. ✅ **Court terme** : Retirer l'affichage de `aoCategory` du dashboard (ligne 570) car le champ renvoie NULL
2. 📝 **Moyen terme** : Créer colonne "Catégorie AO" (dropdown) dans Monday avec valeurs MEXT/MINT/HALL/etc.
3. 🔄 **Configuration** : Ajouter mapping dans `ao-planning-3946257560.json` une fois colonne créée

### Priorité 2 : Implémenter Résolution IDs Maîtres

**Actions** :
1. 🛠️ Créer service `MasterEntityResolver` dans `server/services/monday/extractors/`
2. Logique : Lookup nom → ID depuis tables `maitres_ouvrage` / `maitres_oeuvre`
3. Fallback : Si non trouvé, créer nouvelle entrée (avec log warning)
4. Intégrer dans pipeline d'import Monday

### Priorité 3 : Colonnes Optional (clientRecurrency, selectionComment)

**Actions** :
1. 📋 Documenter clairement dans UI que ces champs ne sont pas mappés (raison : colonnes Monday absentes)
2. 💬 Demander à l'équipe JLM si ces champs sont importants
3. 🔄 Si oui : créer colonnes correspondantes dans Monday
4. ⏸️ Si non : laisser non mappés et documenter

---

## 📈 Impact sur Couverture Mapping

### Scénario 1 : Actions Priorité 1+2 (Rapide)
- **maitreOuvrageId** ✅ (résolution automatique)
- **maitreOeuvreId** ✅ (résolution automatique)
- **Couverture** : 41/51 = **80.4%** (+3.9%)

### Scénario 2 : + Création colonnes Monday (Moyen terme)
- **aoCategory** ✅ (nouvelle colonne Monday)
- **clientRecurrency** ✅ (nouvelle colonne Monday)
- **selectionComment** ✅ (nouvelle colonne Monday)
- **Couverture** : 44/51 = **86.3%** (+9.8%)

### Scénario 3 : Maximum (avec alias)
- + **dueDate** ✅ (alias dateLimiteRemise)
- + **amountEstimate** ✅ (alias montantEstime)
- **Couverture** : 46/51 = **90.2%** (+13.7%)

---

## 🔗 Références

- **Configuration actuelle** : `server/services/monday/boardConfigs/ao-planning-3946257560.json`
- **Schéma Saxium** : `shared/schema.ts` (lignes 1145-1245 - table `aos`)
- **Frontend dashboard** : `client/src/pages/monday-migration-dashboard.tsx`
- **Matrice de mapping** : `analysis/MONDAY_TO_SAXIUM_MAPPING_MATRIX.md`

---

## ✅ Conclusion

**L'audit révèle** que les 5 champs prioritaires **existent dans Saxium** mais les colonnes Monday correspondantes **n'existent pas** dans le board actuel. La solution implique :

1. **Correction bug frontend** (aoCategory affiché mais NULL)
2. **Implémentation résolution IDs** (maitres d'ouvrage/oeuvre)
3. **Création colonnes Monday** (aoCategory, clientRecurrency, selectionComment) OU remapping colonnes existantes peu utilisées
4. **Documentation claire** dans l'UI des champs non mappés

**Prochaines étapes** : Discuter avec l'équipe JLM pour décider si les colonnes Monday doivent être créées ou si les champs Saxium restent non mappés.
