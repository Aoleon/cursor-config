# Documentation - Prompts SQL Optimisés et Adaptatifs

## Vue d'ensemble

Le système de génération SQL a été amélioré avec des prompts adaptatifs qui s'ajustent automatiquement selon le type de requête détecté. Cette approche améliore significativement la qualité et la performance des requêtes SQL générées.

## Architecture des Améliorations

### 1. Types de Requêtes Identifiés

Le système reconnaît maintenant 5 types distincts de requêtes :

- **KPI_METRICS** : Requêtes d'indicateurs de performance et métriques
- **LIST_DETAILS** : Requêtes de listes et détails d'enregistrements
- **COMPARISONS** : Requêtes de comparaison entre périodes ou entités
- **ANALYTICS** : Requêtes d'analyse avancée avec fonctions analytiques
- **SEARCH** : Requêtes de recherche textuelle

### 2. Templates de Prompts Spécialisés

Chaque type de requête dispose d'un template optimisé contenant :

#### KPI/Métriques
```sql
-- Focus : COUNT, SUM, AVG, GROUP BY, HAVING
-- Guardrails :
  - GROUP BY obligatoire pour les dimensions
  - Limite à 100 lignes pour résultats agrégés
  - Utilisation de DATE_TRUNC pour groupement temporel
  - Inclusion de COUNT(*) pour contexte volumétrique
```

#### Listes/Détails
```sql
-- Focus : WHERE, ORDER BY, LIMIT, OFFSET, JOIN
-- Guardrails :
  - ORDER BY obligatoire
  - LIMIT/OFFSET pour pagination (max 50 lignes/page)
  - JOIN uniquement des tables nécessaires
```

#### Comparaisons
```sql
-- Focus : CTE, CASE WHEN, LAG, LEAD, JOIN
-- Guardrails :
  - Utilisation de CTEs pour lisibilité
  - Timeframe maximum de 24 mois
  - Calculs de delta et pourcentages
  - Gestion des valeurs NULL
```

#### Analyses
```sql
-- Focus : CTE, WINDOW, RANK, DENSE_RANK, PERCENTILE
-- Guardrails :
  - Préférence CTEs vs sous-requêtes imbriquées
  - Limite à 3 fonctions window
  - Hints d'index appropriés
```

#### Recherche
```sql
-- Focus : LIKE, ILIKE, SIMILAR TO, GIN INDEX
-- Guardrails :
  - ILIKE pour recherche case-insensitive
  - Ajout automatique de wildcards (%)
  - Utilisation des index GIN
  - Limite à 100 résultats
```

## 3. Méthode analyzeQueryType()

Analyse automatique de la requête utilisateur pour déterminer le type :

```typescript
analyzeQueryType(query: string): string {
  // Analyse des patterns linguistiques
  // KPI: "combien", "taux", "moyenne", "total"
  // Comparaison: "comparer", "versus", "évolution"
  // Analyse: "top", "meilleur", "classement"
  // Recherche: "chercher", "trouver", "contient"
  // Par défaut: LIST_DETAILS
}
```

## 4. Guardrails Adaptatifs

Les guardrails sont construits dynamiquement selon :
- Le type de requête détecté
- Le rôle de l'utilisateur (admin, chef_projet, etc.)
- Les contraintes de performance

### Exemples de Guardrails

**Pour KPIs:**
- GROUP BY obligatoire sur toutes les colonnes non-agrégées
- LIMIT 100 pour résultats agrégés
- Groupement temporel approprié (DATE_TRUNC)

**Pour Listes:**
- ORDER BY obligatoire
- LIMIT maximum 50 avec support OFFSET
- JOIN uniquement des tables nécessaires

**Pour Comparaisons:**
- CTEs pour structure claire
- Timeframe maximum 24 mois
- Gestion des NULL dans les calculs

## 5. Hints de Performance Contextuels

Le système génère automatiquement des hints selon le contexte :

```typescript
generatePerformanceHints(query: string, queryType: string): string[] {
  // Si jointure projects+offers → Hint sur index project_id
  // Si filtre date → Hint sur colonnes indexées date_*
  // Si agrégation montants → Hint sur parallel aggregation
  // Si recherche texte → Hint sur GIN indexes
  // Si CTEs complexes → Hint sur matérialisation
}
```

## 6. Validation Post-Génération

Validation automatique du SQL généré avec :

### Vérifications Obligatoires
- ✅ Présence LIMIT (sauf aggregations)
- ✅ Timeframe raisonnable (< 5 ans)
- ✅ Nombre de jointures (max 4)
- ✅ Rejet de SELECT *
- ✅ Terminaison par point-virgule

### Vérifications Spécifiques par Type
- **LIST_DETAILS** : ORDER BY obligatoire
- **KPI_METRICS** : Warning si pas de GROUP BY
- **COMPARISONS** : Warning si pas de CTEs
- **ANALYTICS** : Limite fonctions window

## 7. Structure du Prompt Optimisé

Format standardisé pour Claude/GPT :

```
=== CONTEXT ===
[Contexte utilisateur et type de requête]

=== SCHEMA & BUSINESS CONTEXT ===
[Schéma enrichi par BusinessContextService]

=== SQL EXAMPLES ===
[3 exemples maximum pertinents au type]

=== GUARDRAILS ===
[Règles obligatoires + spécifiques au type]
[Hints de performance contextuels]

=== QUERY ===
[Instructions finales de génération]
```

## 8. Métriques de Qualité

Tracking automatique via EventBus :

```typescript
{
  queryType: string,        // Type détecté
  generationTime: number,   // Temps en ms
  success: boolean,         // Succès/échec
  retryCount: number,      // Nombre de tentatives
  timestamp: Date          // Horodatage
}
```

## Utilisation

### Exemple d'Appel

```typescript
const request: SQLQueryRequest = {
  userId: "user123",
  userRole: "chef_projet",
  naturalLanguageQuery: "Combien de projets actifs ce mois?",
  context: "Dashboard mensuel"
};

const result = await sqlEngine.executeNaturalLanguageQuery(request);
// Le système détecte automatiquement : type = KPI_METRICS
// Applique le template et les guardrails appropriés
// Génère un SQL optimisé avec GROUP BY et agrégations
```

### Résultat Attendu

```sql
SELECT 
  DATE_TRUNC('month', date_created) as month,
  status,
  COUNT(*) as project_count,
  SUM(montant_total) as total_amount
FROM projects
WHERE date_created >= NOW() - INTERVAL '1 month'
  AND status = 'active'
GROUP BY 1, 2
ORDER BY 1 DESC
LIMIT 100;
```

## Avantages

1. **Performance** : Requêtes optimisées selon le type (objectif < 3s)
2. **Sécurité** : Validation stricte et guardrails adaptatifs
3. **Qualité** : Exemples pertinents et hints contextuels
4. **Évolutivité** : Nouveaux types facilement ajoutables
5. **Traçabilité** : Métriques détaillées pour amélioration continue

## Compatibilité

- ✅ Compatible avec BusinessContextService existant
- ✅ Compatible avec ChatbotOrchestrationService
- ✅ Compatible avec système RBAC existant
- ✅ Logging complet via logger unifié

## Tests

Un fichier de test complet est disponible :
`server/tests/sql-engine-adaptive-prompts.test.ts`

Couvre :
- Détection de types de requêtes
- Génération de guardrails
- Hints de performance
- Validation post-génération
- Sélection d'exemples
- Métriques de qualité

## Évolutions Futures

1. **Machine Learning** : Apprentissage des patterns de succès/échec
2. **Templates Personnalisés** : Par domaine métier spécifique
3. **Cache Intelligent** : Réutilisation de requêtes similaires
4. **Multi-Langue** : Support requêtes en anglais
5. **Optimiseur de Coût** : Estimation du coût d'exécution