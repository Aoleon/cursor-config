# Intégration Sage Batigest Connect - JLM ERP

## Vue d'ensemble

L'intégration avec Sage Batigest Connect permet à JLM Menuiserie de :

- **Récupérer automatiquement les devis clients** existants dans Batigest
- **Analyser les coefficients de marges** par famille de produits
- **Contrôler le cycle de facturation** en temps réel
- **Générer des analytics de Business Intelligence** pour optimiser la rentabilité

## Architecture Technique

### Base de données
- **Connexion**: Microsoft SQL Server (Express ou Full selon la version Batigest)
- **Tables principales**: DEVIS, OUVRAGES, FACTURES, CLIENTS
- **Sécurité**: Connexion cryptée avec authentification SQL

### Services développés

#### BatigestService (`server/batigestService.ts`)
Service principal pour l'interaction avec la base Sage Batigest :

- `getDevisClients()` - Récupération des devis avec filtres
- `getOuvragesEtCoefficients()` - Analyse des coefficients de marge
- `getFacturationsEnCours()` - Suivi des facturations
- `syncDevisWithBatigest()` - Synchronisation d'un dossier JLM
- `generateAnalytics()` - Analytics de Business Intelligence

#### Routes API (`server/routes-batigest.ts`)
Endpoints REST pour l'intégration :

```
GET  /api/batigest/connection-test
POST /api/batigest/sync-offer
GET  /api/batigest/devis-clients
GET  /api/batigest/coefficients-marges
GET  /api/batigest/facturations-en-cours
POST /api/batigest/generate-analytics
GET  /api/batigest/analytics-history
GET  /api/batigest/integrations
GET  /api/batigest/dashboard
```

## Configuration

### Variables d'environnement requises

```bash
BATIGEST_SQL_SERVER=localhost
BATIGEST_DATABASE=BATIGEST_CONNECT
BATIGEST_SQL_USER=jlm_user
BATIGEST_SQL_PASSWORD=secure_password
BATIGEST_SQL_PORT=1433
```

### Base de données JLM

Nouvelles tables créées :
- `batigest_integrations` - Suivi des synchronisations
- `batigest_analytics` - Historique des analyses BI

## Fonctionnalités Business

### 1. Synchronisation des devis
- Récupération automatique des devis Batigest par référence
- Mise à jour des montants et marges dans JLM ERP
- Traçabilité complète des synchronisations

### 2. Analyse des marges
- Calcul des coefficients moyens par famille de produits
- Identification des écarts entre marges prévues et réelles
- Optimisation des prix de vente

### 3. Suivi facturation
- Monitoring des factures en cours
- Alertes sur les retards de paiement
- Calcul des montants en attente

### 4. Business Intelligence
- Taux de conversion devis/factures
- Évolution du chiffre d'affaires
- Indicateurs de performance par période
- Tableaux de bord interactifs

## Utilisation

### Test de connexion
```javascript
const result = await fetch('/api/batigest/connection-test');
const status = await result.json();
console.log(status.connected); // true/false
```

### Synchronisation d'une offre
```javascript
const sync = await fetch('/api/batigest/sync-offer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    offerId: 'uuid-de-loffre',
    batigestRef: 'DEVIS-2024-001'
  })
});
```

### Génération d'analytics
```javascript
const analytics = await fetch('/api/batigest/generate-analytics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    periode: 'annuel'
  })
});
```

## Bénéfices pour JLM

### Élimination de la double saisie
- Plus de re-saisie des données entre Batigest et JLM ERP
- Synchronisation automatique des montants et statuts
- Cohérence garantie entre les deux systèmes

### Optimisation des marges
- Visibilité en temps réel sur les coefficients appliqués
- Analyse comparative par type de menuiserie
- Ajustement automatique des prix selon la rentabilité

### Contrôle financier renforcé
- Suivi précis du cycle de facturation
- Alertes automatiques sur les retards
- Prévisions de trésorerie améliorées

### Aide à la décision
- Indicateurs clés de performance
- Tendances d'évolution du marché
- Identification des opportunités d'amélioration

## Évolutions futures

- **Synchronisation bidirectionnelle** : Mise à jour de Batigest depuis JLM ERP
- **Alertes automatiques** : Notifications sur écarts de marge importants
- **API temps réel** : Webhook pour synchronisation instantanée
- **Tableaux de bord avancés** : Visualisations interactives avec graphiques

## Support technique

L'intégration utilise les standards de l'industrie :
- Connexions SQL Server sécurisées
- Validation TypeScript complète
- Gestion d'erreurs robuste
- Logging détaillé pour le débogage