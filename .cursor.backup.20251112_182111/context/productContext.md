# Product Context - Saxium

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

---

## 🎯 Pourquoi ce projet existe

### Problématique Initiale

JLM Menuiserie est une entreprise avec une **forte expertise métier** et des équipes dédiées, mais son organisation était freinée par :

1. **Processus manuels** : Double saisie entre différents outils
2. **Déconnexion des outils** : Manque d'intégration entre systèmes
3. **Manque de vision consolidée** : Absence d'indicateurs pour piloter l'activité
4. **Circulation de l'information** : Difficultés entre BE et terrain
5. **Absence de jalons formels** : Notamment en fin d'études

### Problèmes Résolus

#### 1. Double Saisie
- ✅ **Récupération assistée** des données AO depuis fiches existantes
- ✅ **Synchronisation** avec Monday.com pour éviter la ressaisie
- ✅ **Import OCR** de documents PDF pour extraction automatique

#### 2. Circulation de l'Information
- ✅ **EventBus temps réel** : Notifications instantanées entre équipes
- ✅ **WebSocket** : Mises à jour en direct des dashboards
- ✅ **Alertes automatiques** : Détection et notification des problèmes

#### 3. Visibilité et Pilotage
- ✅ **KPIs consolidés** : Conversion, revenus, charge équipe
- ✅ **Dashboards exécutifs** : Vue d'ensemble de la performance
- ✅ **Prédictions** : Prévisions de revenus et risques projets

#### 4. Jalons de Validation
- ✅ **Workflow structuré** : Étapes claires avec jalons obligatoires
- ✅ **Validation BE** : Contrôle technique formalisé
- ✅ **VISA Architecte** : Jalon entre Étude et Planification

## 🚀 Comment ça devrait fonctionner

### Expérience Utilisateur Globale

#### 1. Chef de Projet
**Workflow typique:**
1. Création d'offre depuis AO (récupération automatique des données)
2. Étude technique avec assistance IA
3. Chiffrage avec génération DPGF automatique
4. Suivi des fournisseurs et demandes de prix
5. Validation BE et transformation en projet
6. Planification avec Gantt interactif
7. Suivi chantier et livraison

**Outils disponibles:**
- Dashboard personnel avec projets en cours
- Chatbot IA pour requêtes métier
- Planning Gantt pour visualisation temporelle
- Alertes automatiques sur les dates critiques

#### 2. Bureau d'Études (BE)
**Workflow typique:**
1. Visualisation de la charge de travail
2. Validation technique des offres
3. Contrôle de conformité (DTU, technique, chiffrages)
4. Alertes techniques automatiques
5. Dashboard BE avec indicateurs de charge

**Outils disponibles:**
- Dashboard BE avec charge par utilisateur
- Système d'alertes techniques
- Validation avec checklist
- Historique des validations

#### 3. Direction/Admin
**Workflow typique:**
1. Vue exécutive consolidée
2. Analyse de rentabilité par projet/type
3. Prévisions de revenus
4. Détection de risques projets
5. Pilotage stratégique

**Outils disponibles:**
- Dashboard exécutif avec KPIs
- Analytics avancées
- Prédictions et recommandations
- Rapports personnalisables

#### 4. Commercial
**Workflow typique:**
1. Suivi des opportunités (AO)
2. Conversion AO → Offres
3. Performance commerciale par région
4. Relances clients

**Outils disponibles:**
- Pipeline commercial
- Métriques de conversion
- Tableaux de bord régionaux

### Fonctionnalités Clés par Catégorie

#### 🤖 Intelligence Artificielle

**Chatbot IA:**
- Requêtes en langage naturel → SQL sécurisé
- Contexte métier enrichi (menuiserie française)
- Actions sécurisées (création/modification)
- Suggestions intelligentes par rôle

**OCR Contextuel:**
- Extraction automatique de documents PDF
- Création d'AO depuis PDF
- Analyse intelligente avec contexte métier
- Détection de matériaux, couleurs, quantités

**Prédictions:**
- Prévisions de revenus (3-12 mois)
- Détection de risques projets
- Recommandations business actionnables
- Analyse de tendances

#### 📅 Intelligence Temporelle

**DateIntelligence:**
- Calcul automatique des durées de phases
- Règles métier adaptatives (menuiserie)
- Prise en compte saisonnalité BTP
- Alertes automatiques sur dates critiques

**Planning:**
- Gantt interactif avec drag & drop
- Cascade automatique des dates
- Détection de conflits de ressources
- Optimisation automatique

#### 📊 Analytics et Reporting

**KPIs Consolidés:**
- Taux de conversion AO → Offres
- Revenus prévus vs réels
- Charge équipe (BE, chantier)
- Délais moyens par phase
- Marge attendue

**Dashboards:**
- Dashboard exécutif (direction)
- Dashboard BE (charge, validations)
- Dashboard commercial (pipeline)
- Dashboard projets (planning)

#### 🔗 Intégrations

**Monday.com:**
- Import/export bidirectionnel
- Synchronisation automatique
- Migration de données historiques

**OneDrive:**
- Synchronisation de documents
- Stockage centralisé
- Accès sécurisé

**Batigest:**
- Génération de documents comptables
- Export vers ERP
- Traçabilité financière

## 🎨 Objectifs d'Expérience Utilisateur

### Performance
- ⚡ **Latence chatbot** : < 3 secondes
- ⚡ **Temps de chargement** : < 2 secondes
- ⚡ **Réactivité** : Mises à jour temps réel via WebSocket

### Simplicité
- 🎯 **Interface intuitive** : Navigation claire par rôle
- 🎯 **Workflow guidé** : Étapes claires avec validation
- 🎯 **Assistance IA** : Chatbot pour questions métier

### Fiabilité
- ✅ **Disponibilité** : Graceful shutdown, gestion d'erreurs
- ✅ **Sécurité** : RBAC strict, validation complète
- ✅ **Traçabilité** : Logging structuré, audit complet

### Personnalisation
- 🎨 **Dashboards adaptatifs** : Par rôle et préférences
- 🎨 **Suggestions intelligentes** : Basées sur l'historique
- 🎨 **Vues personnalisables** : Colonnes, filtres, tris

## 🔄 Flux Utilisateur Principaux

### Flux 1: Création d'Offre depuis AO
```
1. Utilisateur sélectionne un AO
2. Clic "Créer offre" → Récupération automatique des données
3. Formulaire pré-rempli avec validation
4. Enregistrement → Workflow d'offre démarré
```

### Flux 2: Chiffrage avec IA
```
1. Utilisateur ouvre un dossier d'offre
2. Clic "Chiffrer" → Assistant IA activé
3. Analyse automatique des lots et matériaux
4. Génération DPGF avec calculs automatiques
5. Validation et export
```

### Flux 3: Chatbot IA pour Requête Métier
```
1. Utilisateur ouvre le chatbot
2. Tape une question en langage naturel
3. Système génère SQL sécurisé avec RBAC
4. Exécution et affichage des résultats
5. Suggestions d'actions si pertinentes
```

### Flux 4: Détection d'Alerte Automatique
```
1. Système DateIntelligence calcule les dates
2. Détection d'un risque (retard, conflit)
3. Génération d'alerte automatique
4. Notification temps réel via WebSocket
5. Affichage dans dashboard + toast
```

## 📱 Responsive et Accessibilité

### Responsive Design
- ✅ **Desktop** : Interface complète avec sidebar
- ✅ **Tablet** : Adaptation des tableaux et formulaires
- ✅ **Mobile** : Navigation simplifiée, formulaires optimisés

### Accessibilité
- ✅ **ARIA labels** : Navigation au clavier
- ✅ **Contraste** : Respect des standards WCAG
- ✅ **Focus visible** : Indicateurs clairs

---

**Note:** Ce document décrit l'expérience utilisateur cible et les objectifs de design. Il guide les décisions UX/UI.




