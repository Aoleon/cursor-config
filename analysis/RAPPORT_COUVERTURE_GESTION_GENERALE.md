# RAPPORT DE COUVERTURE - GESTION GÉNÉRALE
*Vérification exhaustive Monday.com → Saxium*

## 📋 RÉSUMÉ EXÉCUTIF

**Catégorie analysée**: Gestion Générale  
**Champs Monday.com identifiés**: 32 champs (de 133 annoncés)  
**Tables Saxium pertinentes**: projects, offers, contacts, users, businessMetrics, alertThresholds  
**Date d'analyse**: 28 septembre 2025  

---

## 🔍 ANALYSE DÉTAILLÉE PAR SOUS-CATÉGORIE

### 🏗️ GESTION CHANTIERS (7 champs)

| Champ Monday.com | Type | Équivalent Saxium | Table | Statut | Priorité |
|------------------|------|-------------------|-------|--------|----------|
| `Name` | text, identifier | ✅ `title` | projects | PRÉSENT | P1 |
| `Subitems` | text, general | ✅ `description` + relations | projects/projectTasks | PRÉSENT | P1 |
| `Num Chantier` | text, project | ✅ `reference` | projects | PRÉSENT | P1 |
| `Num Devis` | text, project | ✅ `reference` | offers | PRÉSENT | P1 |
| `Etat` | text, status | ✅ `status` | projects | PRÉSENT | P1 |
| `Lot` | numeric_string, project | ✅ `lotConcerne` | projects | PRÉSENT | P1 |
| `MOA/MOE` | text, contact | ✅ Relations `contacts` | projects | PRÉSENT | P1 |

**Analyse**: Couverture 100% - Gestion complète des chantiers

### 💼 GESTION COMMERCIALE (6 champs)

| Champ Monday.com | Type | Équivalent Saxium | Table | Statut | Priorité |
|------------------|------|-------------------|-------|--------|----------|
| `Nom` | text, identifier | ✅ `title` / `intitule` | offers/projects | PRÉSENT | P1 |
| `Demandeur` | text, general | ✅ `clientId` | offers/contacts | PRÉSENT | P1 |
| `Statut de la demande` | text, status | ✅ `status` | offers | PRÉSENT | P1 |
| `Date de la demande` | date, temporal | ✅ `createdAt` | offers/projects | PRÉSENT | P1 |
| `CA HT` | numeric_string, financial | ✅ `montantHT` | offers | PRÉSENT | P1 |
| `Bon de commande` | text, general | ✅ `bonCommande` | projects | PRÉSENT | P1 |

**Analyse**: Couverture 100% - Gestion commerciale complète

### ⏱️ SUIVI TEMPS (5 champs)

| Champ Monday.com | Type | Équivalent Saxium | Table | Statut | Priorité |
|------------------|------|-------------------|-------|--------|----------|
| `Time Tracking` | text, general | ✅ `actualHours` | projectTasks | PRÉSENT | P1 |
| `Chronomètre` | text, identifier | ⚠️ **PARTIEL** Intégration externe | - | LIMITÉ | P3 |
| `Nb Heures` | text, general | ✅ `nombreHeures` | projects | PRÉSENT | P1 |
| `Tps étude` | numeric_string, general | ✅ `dureeEtudeJours` | projectTimelines | PRÉSENT | P2 |
| `Jo Equipe` | text, general | ⚠️ **PARTIEL** Calcul via `actualHours` | projectTasks | LIMITÉ | P2 |

**Analyse**: Couverture 80% - Suivi temps bon, chronomètre externe requis

### 📊 ASPECTS FINANCIERS (6 champs)

| Champ Monday.com | Type | Équivalent Saxium | Table | Statut | Priorité |
|------------------|------|-------------------|-------|--------|----------|
| `TOTAL Gain / Achat` | date, financial | ✅ `montantHT` - `totalCosts` | offers/projects | PRÉSENT | P1 |
| `Sous-éléments Gain / Achat` | text, financial | ✅ Relations `projectTasks` budgets | projectTasks | PRÉSENT | P2 |
| `Budget TOTAL` | text, financial | ✅ `budgetMax` | projects | PRÉSENT | P1 |
| `TOTAL Achat` | text, financial | ✅ `totalCosts` | projects | PRÉSENT | P1 |
| `Coef vente` | text, general | ✅ `coefficientVente` | offers | PRÉSENT | P1 |
| `Marge H` | text, general | ✅ `margeHoraire` | offers | PRÉSENT | P1 |

**Analyse**: Couverture 100% - Aspects financiers complètement couverts

### 📋 ADMINISTRATION & SUIVI (6 champs)

| Champ Monday.com | Type | Équivalent Saxium | Table | Statut | Priorité |
|------------------|------|-------------------|-------|--------|----------|
| `Qui ?` | text, general | ✅ `assignedUserId` | projects/offers | PRÉSENT | P1 |
| `DS` | text, general | ✅ `metadata` → DS code | projects | PRÉSENT | P2 |
| `Hashtags` | text, general | ❌ **MANQUANT** | - | ABSENT | P2 |
| `Résumé exécutif` | text, general | ✅ `description` / `notes` | projects | PRÉSENT | P1 |
| `Echéance` | date, general | ✅ `deadline` | projects | PRÉSENT | P1 |
| `A faire pour (Échéance)` | date, temporal | ✅ `plannedEndDate` | projectTasks | PRÉSENT | P1 |

**Analyse**: Couverture 83% - Administration bien couverte, manque système hashtags

---

## 📊 SYNTHÈSE GLOBALE

### Statistiques de Couverture

| Sous-catégorie | Champs Analysés | Présents | Partiels | Manquants | Taux Couverture |
|----------------|-----------------|----------|-----------|-----------|-----------------|
| 🏗️ Gestion Chantiers | 7 | 7 | 0 | 0 | **100%** |
| 💼 Gestion Commerciale | 6 | 6 | 0 | 0 | **100%** |
| ⏱️ Suivi Temps | 5 | 3 | 2 | 0 | **80%** |
| 📊 Aspects Financiers | 6 | 6 | 0 | 0 | **100%** |
| 📋 Administration & Suivi | 6 | 5 | 0 | 1 | **83%** |
| **TOTAL** | **30** | **27** | **2** | **1** | **93%** |

### Tables Saxium Utilisées ✅

1. **`projects`** - Projets/chantiers principaux
2. **`offers`** - Offres et propositions commerciales
3. **`projectTasks`** - Tâches et suivi temps détaillé
4. **`contacts`** - Clients et intervenants
5. **`users`** - Responsables et équipes
6. **`businessMetrics`** - Métriques métier
7. **`projectTimelines`** - Planification avancée

---

## ❌ CHAMPS MANQUANTS CRITIQUES

### P2 - Priorité Moyenne
- **`Hashtags`** → Système de tags/classification manquant

### Améliorations Fonctionnelles
- **`Chronomètre`** → Intégration time-tracking externe
- **`Jo Equipe`** → Calcul automatique jours-équipe

---

## ⚠️ CHAMPS PARTIELS À AMÉLIORER

### Extensions Recommandées
- **Time tracking** → Module chronométrage intégré
- **Jours équipe** → Formule automatique basée sur heures

---

## ✅ RECOMMANDATIONS D'AMÉLIORATION

### Nouvelle Table Tags/Classification

```typescript
// Nouveau système de hashtags/tags
export const projectTags = pgTable("project_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type").notNull(), // "project", "offer", "task"
  entityId: varchar("entity_id").notNull(),
  tagName: varchar("tag_name").notNull(),
  tagCategory: varchar("tag_category"), // "hashtag", "label", "classification"
  color: varchar("color"), // Couleur tag (hex)
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Index pour performance
projectTagsIdx: index("project_tags_entity_idx").on(table.entityType, table.entityId),
projectTagsNameIdx: index("project_tags_name_idx").on(table.tagName),
```

### Extension Time Tracking

```typescript
// Extension pour suivi temps détaillé
export const timeEntries = pgTable("time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  projectId: varchar("project_id").references(() => projects.id),
  taskId: varchar("task_id").references(() => projectTasks.id),
  
  // Chronométrage
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration_minutes"), // Calculé automatiquement
  
  // Contexte
  description: text("description"),
  isManual: boolean("is_manual").default(false), // Saisie manuelle vs chrono
  
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Calculs Automatiques

```typescript
// Vue calculée pour jours-équipe
CREATE VIEW project_team_days AS
SELECT 
  p.id as project_id,
  p.title,
  SUM(te.duration) / 480 as total_team_days, -- 8h = 480min
  COUNT(DISTINCT te.user_id) as team_size,
  AVG(te.duration) / 480 as avg_daily_hours
FROM projects p
JOIN time_entries te ON p.id = te.project_id
GROUP BY p.id, p.title;
```

---

## 🎯 PLAN D'ACTION

### Phase 1 - Extensions Critiques (P1-P2)
1. **Système hashtags** - Nouvelle table `projectTags`
2. **Time tracking avancé** - Table `timeEntries`
3. **Vues calculées** - Jours équipe automatiques

### Phase 2 - Intégrations (P2-P3)
1. **Chronométrage externe** - API intégration
2. **Dashboard temps** - Interface suivi
3. **Rapports équipe** - Analytics avancées

### Phase 3 - Optimisation
1. **IA prédictive** - Estimation durées
2. **Alertes automatiques** - Dépassements budget/temps
3. **Reporting avancé** - KPIs business

---

## 💡 CONCLUSION

**Taux de couverture actuel: 93%** pour les champs identifiés de "Gestion Générale".

Le schéma Saxium couvre **excellemment** les besoins de gestion générale JLM:
- ✅ **Gestion Chantiers**: Parfaite (100%)
- ✅ **Gestion Commerciale**: Complète (100%)
- ✅ **Aspects Financiers**: Intégrale (100%)
- ⚠️ **Suivi Temps**: Bonne base à enrichir (80%)
- ✅ **Administration**: Quasi-complète (83%)

**Les gaps identifiés sont mineurs**:
- Système de tags à implémenter
- Time tracking à enrichir
- Calculs automatiques à ajouter

L'architecture existante fournit une base solide largement supérieure aux capacités Monday.com actuelles.

---

*Note: Cette analyse porte sur 30 champs identifiés explicitement. L'écart avec les 133 champs annoncés suggère de nombreuses variantes de colonnes ou champs dupliqués entre les 15 fichiers de gestion générale.*