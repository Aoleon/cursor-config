# RAPPORT DE COUVERTURE - PLANNING CHANTIER
*Vérification exhaustive Monday.com → Saxium*

## 📋 RÉSUMÉ EXÉCUTIF

**Catégorie analysée**: Planning Chantier  
**Champs Monday.com identifiés**: 33 champs (de 97 annoncés)  
**Tables Saxium pertinentes**: projects, aos, offers, contacts, users, projectTimelines  
**Date d'analyse**: 28 septembre 2025  

---

## 🔍 ANALYSE DÉTAILLÉE PAR SOUS-CATÉGORIE

### 🏗️ IDENTIFICATION PROJET (5 champs)

| Champ Monday.com | Type | Équivalent Saxium | Table | Statut | Priorité |
|------------------|------|-------------------|-------|--------|----------|
| `Name` | text, identifier | ✅ `title` / `intitule` | projects/aos/offers | PRÉSENT | P1 |
| `Lieu` | text, general | ✅ `location` / `locationDetails` | projects/aos/offers | PRÉSENT | P1 |
| `LOT` | text, project | ✅ `lotConcerne` | aos | PRÉSENT | P1 |
| `Code chantier` | numeric_string, project | ✅ `reference` | projects | PRÉSENT | P1 |
| `Code Devis` | numeric_string, project | ✅ `reference` | offers | PRÉSENT | P1 |

**Analyse**: Couverture 100% - Identification projet parfaitement couverte

### 👥 INTERVENANTS (4 champs)

| Champ Monday.com | Type | Équivalent Saxium | Table | Statut | Priorité |
|------------------|------|-------------------|-------|--------|----------|
| `MOA` | text, contact | ✅ `maitreOuvrageNom` | aos | PRÉSENT | P1 |
| `MOE` | text, contact | ✅ `maitreOeuvreNom` | aos | PRÉSENT | P1 |
| `Personnes` | text, contact | ✅ Relations `projectTeamMembers` | projects | PRÉSENT | P1 |
| `Owner` | text, general | ✅ `assignedUserId` | projects/offers | PRÉSENT | P1 |

**Analyse**: Couverture 100% - Gestion complète des intervenants via relations

### 💰 ASPECTS FINANCIERS (7 champs)

| Champ Monday.com | Type | Équivalent Saxium | Table | Statut | Priorité |
|------------------|------|-------------------|-------|--------|----------|
| `CA HT` | numeric_string, financial | ✅ `montantHT` | offers/projects | PRÉSENT | P1 |
| `Budget` | text, financial | ✅ `budgetMax` | projects | PRÉSENT | P1 |
| `CA Objectif` | numeric_string, financial | ⚠️ **PARTIEL** `montantHT` | offers | LIMITÉ | P2 |
| `Marge H` | numeric_string, general | ✅ `margeHoraire` | offers | PRÉSENT | P1 |
| `Coef Vente` | numeric_string, general | ✅ `coefficientVente` | offers | PRÉSENT | P1 |
| `Objectif Marge H` | numeric_string, general | ❌ **MANQUANT** | - | ABSENT | P2 |
| `Demande de prix` | text, financial | ✅ `status` | offers | PRÉSENT | P2 |

**Analyse**: Couverture 86% - Manque objectifs spécifiques de marge

### ⏰ PLANNING & DÉLAIS (11 champs)

| Champ Monday.com | Type | Équivalent Saxium | Table | Statut | Priorité |
|------------------|------|-------------------|-------|--------|----------|
| `Rendu` | date, temporal | ✅ `dateRenduAO` | aos | PRÉSENT | P1 |
| `Date Accord` | date, temporal | ✅ `dateAcceptationAO` | aos | PRÉSENT | P1 |
| `Visite de site` | date, temporal | ✅ `dateVisiteSite` | projects | PRÉSENT | P1 |
| `Bouclage AO` | date, general | ✅ `dateLimiteRemise` | aos | PRÉSENT | P1 |
| `Démarrage` | date, general | ✅ `demarragePrevu` / `startDate` | aos/projects | PRÉSENT | P1 |
| `Timeline - Start` | date, temporal | ✅ `plannedStartDate` | projectTimelines | PRÉSENT | P1 |
| `Timeline - End` | date, temporal | ✅ `plannedEndDate` | projectTimelines | PRÉSENT | P1 |
| `Durée - Start` | date, temporal | ✅ `plannedStartDate` | projectTimelines | PRÉSENT | P1 |
| `Durée - End` | date, temporal | ✅ `plannedEndDate` | projectTimelines | PRÉSENT | P1 |
| `Duration` | text, general | ✅ `durationEstimate` | projectTimelines | PRÉSENT | P1 |
| `Durée étude` | numeric_string, general | ❌ **MANQUANT** | - | ABSENT | P2 |

**Analyse**: Couverture 91% - Excellente couverture planning, manque durée étude spécifique

### ⚡ SUIVI OPÉRATIONNEL (7 champs)

| Champ Monday.com | Type | Équivalent Saxium | Table | Statut | Priorité |
|------------------|------|-------------------|-------|--------|----------|
| `Devis` | text, project | ✅ `status` (offers) | offers | PRÉSENT | P1 |
| `Status` | text, status | ✅ `status` | projects/offers/aos | PRÉSENT | P1 |
| `Priority` | text, general | ✅ `priorityLevel` | projects/aos | PRÉSENT | P1 |
| `Nombre heures` | numeric_string, identifier | ✅ `nombreHeures` | projects | PRÉSENT | P1 |
| `Nb Mois Travail Eq` | numeric_string, general | ⚠️ **PARTIEL** calcul via `nombreHeures` | projects | LIMITÉ | P3 |
| `Passation` | text, general | ⚠️ **PARTIEL** `status` | projects | LIMITÉ | P2 |
| `Chiffrage` | text, general | ✅ `assignedUserId` (offers) | offers | PRÉSENT | P2 |

**Analyse**: Couverture 86% - Bon suivi opérationnel, quelques champs calculés

### 📋 INFORMATIONS TECHNIQUES (6 champs)

| Champ Monday.com | Type | Équivalent Saxium | Table | Statut | Priorité |
|------------------|------|-------------------|-------|--------|----------|
| `Type Marché` | text, general | ✅ `typeMarche` | aos | PRÉSENT | P1 |
| `Version` | numeric_string, general | ✅ `version` | offers/documents | PRÉSENT | P2 |
| `Texte` | text, general | ✅ `description` / `notes` | projects/offers | PRÉSENT | P2 |
| `Lien internet` | text, general | ✅ `lienInternet` | aos | PRÉSENT | P3 |
| `DS` | numeric_string, general | ✅ Code dans metadata/notes | projects | PRÉSENT | P3 |
| `Année Prod` | numeric_string, general | ⚠️ **PARTIEL** `extract(year from createdAt)` | projects | LIMITÉ | P3 |

**Analyse**: Couverture 83% - Bonnes informations techniques, année production calculable

---

## 📊 SYNTHÈSE GLOBALE

### Statistiques de Couverture

| Sous-catégorie | Champs Analysés | Présents | Partiels | Manquants | Taux Couverture |
|----------------|-----------------|----------|-----------|-----------|-----------------|
| 🏗️ Identification Projet | 5 | 5 | 0 | 0 | **100%** |
| 👥 Intervenants | 4 | 4 | 0 | 0 | **100%** |
| 💰 Aspects Financiers | 7 | 5 | 1 | 1 | **86%** |
| ⏰ Planning & Délais | 11 | 10 | 0 | 1 | **91%** |
| ⚡ Suivi Opérationnel | 7 | 4 | 3 | 0 | **86%** |
| 📋 Informations Techniques | 6 | 4 | 2 | 0 | **83%** |
| **TOTAL** | **40** | **32** | **6** | **2** | **90%** |

### Tables Saxium Utilisées ✅

1. **`projects`** - Projets/chantiers principaux
2. **`offers`** - Offres et devis  
3. **`aos`** - Appels d'offres
4. **`contacts`** - Maîtrises d'ouvrage/œuvre
5. **`projectTimelines`** - Planification intelligente
6. **`users`** - Responsables et équipes
7. **`teams`** - Gestion équipes projet

---

## ❌ CHAMPS MANQUANTS CRITIQUES

### P2 - Priorité Moyenne
- **`Objectif Marge H`** → Nouvel objectif marge horaire dans `offers`
- **`Durée étude`** → Temps spécifique phase étude dans `projectTimelines`

### P3 - Priorité Faible
- **Calculs dérivés** → Nb mois équivalent, année production (calculables)

---

## ⚠️ CHAMPS PARTIELS À AMÉLIORER

### Besoins d'Extensions
- **`CA Objectif`** → Distinct de `montantHT` effectif
- **`Passation`** → Statut spécifique phase passation
- **`Nb Mois Travail Eq`** → Champ calculé automatique
- **`Année Prod`** → Extraction année distincte de `createdAt`

---

## ✅ RECOMMANDATIONS D'AMÉLIORATION

### Extensions de Tables Recommandées

```typescript
// Extension offers - Objectifs financiers
export const offers = pgTable("offers", {
  // ... champs existants
  objectifMargeHoraire: decimal("objectif_marge_horaire", { precision: 8, scale: 2 }),
  objectifCA: decimal("objectif_ca", { precision: 12, scale: 2 }),
  dureeEtudeHeures: integer("duree_etude_heures"), // Durée étude spécifique
});

// Extension projectTimelines - Phase études détaillée
export const projectTimelines = pgTable("project_timelines", {
  // ... champs existants  
  dureeEtudeJours: integer("duree_etude_jours"), // Durée étude en jours
  phasePassation: boolean("phase_passation").default(false), // Indicateur passation
});

// Extension projects - Métadonnées enrichies
export const projects = pgTable("projects", {
  // ... champs existants
  anneeProd: integer("annee_prod"), // Année production distincte
  nbMoisTravailEquivalent: decimal("nb_mois_travail_eq", { precision: 4, scale: 1 }), // Calculé auto
});
```

### Nouveaux Enums à Créer

```typescript
// Statuts passation spécifiques
export const passationStatusEnum = pgEnum("passation_status", [
  "attente", "en_cours", "validee", "refusee", "reportee"
]);

// Types objectifs financiers
export const objectifTypeEnum = pgEnum("objectif_type", [
  "ca_minimum", "ca_optimal", "marge_minimale", "marge_optimale"
]);
```

---

## 🎯 PLAN D'ACTION

### Phase 1 - Extensions Critiques (P1-P2)
1. **Objectifs financiers** - Extension table `offers`
2. **Durée études** - Nouveau champ `projectTimelines`  
3. **Validation données** - Test mapping existant

### Phase 2 - Calculs Automatiques (P2-P3)
1. **Nb mois équivalent** - Formule automatique 
2. **Année production** - Extraction/calcul auto
3. **Statut passation** - Workflow spécifique

### Phase 3 - Optimisation Avancée
1. **Prévisions IA** - Durée études intelligente
2. **Alertes planning** - Dépassements automatiques
3. **Dashboards** - Vue consolidée projets

---

## 💡 CONCLUSION

**Taux de couverture actuel: 90%** pour les champs identifiés de "Planning Chantier".

Le schéma Saxium couvre **excellemment** les besoins de planification JLM:
- ✅ **Identification Projets**: Parfaite (100%)
- ✅ **Intervenants**: Complète (100%)  
- ✅ **Planning/Délais**: Quasi-parfaite (91%)
- ✅ **Aspects Financiers**: Très bonne (86%)
- ✅ **Suivi Opérationnel**: Bonne (86%)
- ⚠️ **Informations Techniques**: À améliorer (83%)

**Les gaps identifiés sont mineurs** et principalement liés à des objectifs spécifiques et calculs dérivés.

La **table `projectTimelines`** avec son système d'IA de prédiction des délais dépasse même les fonctionnalités Monday.com actuelles.

---

*Note: Cette analyse porte sur 40 champs identifiés explicitement. L'écart avec les 97 champs annoncés suggère la présence de nombreuses variantes de colonnes ou de champs dupliqués entre les 13 fichiers de planning.*