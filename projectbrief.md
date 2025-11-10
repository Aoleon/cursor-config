# Project Brief - Saxium

**Version:** 1.0.0  
**Date de création:** 2025-01-29  
**Dernière mise à jour:** 2025-01-29  
**Statut:** Production

---

## 🎯 Objectif Principal

Saxium est une application web full-stack de gestion de projets pour **JLM Menuiserie**, une entreprise française de pose de menuiseries (fenêtres, portes, volets, cloisons, verrières). L'application digitalise et optimise la gestion complète du cycle de vie des projets, de l'appel d'offres à la livraison et au SAV.

## 📋 Périmètre du Projet

### Domaine Métier
- **Secteur:** BTP/Menuiserie (pose de menuiseries)
- **Contexte:** Entreprise française avec forte expertise métier
- **Problématique:** Processus manuels, double saisie, manque de visibilité consolidée

### Workflow Complet

#### 1. Avant-Vente (Appels d'Offres → Offres)
- **Appels d'Offres (AO):** Création, suivi, lots
- **Étude Technique:** Analyse technique des besoins
- **Chiffrage:** Calcul des prix avec DPGF (Document Provisoire de Gestion Financière)
- **Validation BE:** Contrôle technique et validation
- **Transformation:** Conversion d'offre en projet

#### 2. Projets (6 Phases)
1. **Passation:** Envoi dossier et obtention VIS (1 mois)
2. **Étude:** Phase d'étude technique
3. **VISA Architecte:** Validation architecturale
4. **Planification:** Organisation des ressources
5. **Approvisionnement:** Gestion des commandes fournisseurs
6. **Chantier:** Phase de pose
7. **SAV:** Service après-vente

### Fonctionnalités Clés

#### Gestion Opérationnelle
- ✅ Gestion des Appels d'Offres (AO) et lots
- ✅ Workflow d'offres avec jalons de validation
- ✅ Chiffrage et génération DPGF
- ✅ Gestion des fournisseurs et demandes de prix
- ✅ Planning Gantt interactif
- ✅ Gestion des tâches et ressources

#### Intelligence Métier
- ✅ **DateIntelligence:** Calcul automatique des durées de phases
- ✅ Détection d'alertes de dates avec règles métier adaptatives
- ✅ Prise en compte de la saisonnalité BTP française
- ✅ Prédictions de revenus et risques projets

#### IA et Automatisation
- ✅ **Chatbot IA:** Requêtes en langage naturel → SQL sécurisé
- ✅ **OCR Contextuel:** Extraction intelligente de documents PDF
- ✅ **Contexte Métier Enrichi:** Base de connaissances menuiserie française
- ✅ Actions sécurisées (création/modification via chatbot)

#### Analytics et Reporting
- ✅ KPIs consolidés (conversion, revenus, charge équipe)
- ✅ Dashboard exécutif avec prévisions
- ✅ Détection de risques projets
- ✅ Métriques de performance

#### Intégrations
- ✅ **Monday.com:** Import/export de données
- ✅ **OneDrive:** Synchronisation de documents
- ✅ **Batigest:** Génération de documents comptables
- ✅ **Microsoft OAuth:** Authentification SSO

## 🎯 Objectifs Business

### Problèmes Résolus
1. **Double saisie:** Élimination via récupération assistée des données AO
2. **Circulation de l'information:** Amélioration entre BE et terrain
3. **Jalons de validation:** Formalisation (notamment fin d'études)
4. **Indicateurs de pilotage:** KPIs consolidés pour décision
5. **Visibilité:** Vision consolidée de la performance

### Résultats Attendus
- 📈 Réduction du temps de traitement des dossiers
- 📊 Amélioration de la traçabilité des processus
- 🎯 Meilleure visibilité sur la charge BE et les projets
- 💰 Optimisation de la rentabilité via analytics
- ⚡ Automatisation des tâches répétitives

## 🏗️ Architecture Technique

### Stack Principal
- **Frontend:** React 19, TypeScript, Vite, Wouter, TanStack Query, Radix UI, Tailwind CSS
- **Backend:** Express 5, TypeScript, Node.js
- **Base de données:** PostgreSQL avec Drizzle ORM
- **IA:** Anthropic Claude Sonnet 4 + OpenAI GPT-5
- **Tests:** Vitest (unitaires) + Playwright (E2E)

### Principes Architecturaux
- **Modularité:** Migration progressive vers architecture modulaire (`server/modules/*`)
- **Type Safety:** Types TypeScript partagés (`shared/schema.ts`)
- **Sécurité:** RBAC, validation Zod, protection anti-injection SQL
- **Performance:** Cache intelligent, circuit breakers, preloading
- **Robustesse:** Rate limiting, graceful shutdown, logging structuré

## 📊 Métriques de Succès

### Techniques
- ✅ Couverture de tests: 85% backend, 80% frontend
- ✅ Performance: Latence chatbot < 3s
- ✅ Disponibilité: Graceful shutdown, gestion d'erreurs centralisée

### Métier
- 📈 Taux de conversion AO → Offres
- 📊 Temps moyen de traitement des dossiers
- 🎯 Précision des prévisions de revenus
- ⚡ Réduction de la double saisie

## 🔒 Contraintes et Exigences

### Sécurité
- Authentification Microsoft OAuth (production)
- RBAC strict par rôle utilisateur
- Protection anti-injection SQL
- Rate limiting sur toutes les routes API
- Logging structuré avec correlation IDs

### Performance
- Cache intelligent (24h pour requêtes IA)
- Circuit breakers pour appels externes
- Compression gzip/brotli
- Preloading background pour prédictions

### Conformité
- Respect des normes BTP françaises (RT2012, PMR, BBC)
- Gestion des calendriers BTP (congés, saisonnalité)
- Traçabilité complète des actions

## 📝 Notes Importantes

### État Actuel
- ✅ Application en production
- 🔄 Migration modulaire en cours (routes-poc.ts → modules)
- 📈 Optimisations performance en cours
- 🧪 Infrastructure de tests complète

### Évolutions Futures
- Amélioration continue de l'IA contextuelle
- Extension des intégrations (ERP, autres outils)
- Mobile-first (responsive actuellement)
- Notifications temps réel avancées

---

**Source de vérité:** Ce document définit le périmètre et les objectifs du projet. Toute modification doit être validée et documentée ici.

