# 🔍 SUITE DE TESTS RÉFÉRENCE NON-RÉGRESSION - SAXIUM
## Phase 3.1.1 - État de référence avant Dashboard Analytics

**Date d'audit** : 20 septembre 2025  
**Version auditée** : État actuel pré-Analytics  
**Objectif** : Garantir zéro régression lors de l'ajout du Dashboard Analytics

---

## 🎯 TESTS FONCTIONNELS CRITIQUES

### **1. WORKFLOW AO (APPELS D'OFFRES)**

```bash
# Test 1.1 - Création AO avec OCR
curl -X POST "http://localhost:5000/api/aos" \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "TEST-AO-001",
    "client": "Client Test",
    "menuiserieType": "Fenêtre",
    "montantEstime": "50000"
  }'
# ✅ ATTENDU: Status 201, AO créé avec ID généré

# Test 1.2 - Upload PDF OCR
curl -X POST "http://localhost:5000/api/ocr/process-pdf" \
  -F "file=@test-ao.pdf"
# ✅ ATTENDU: Données OCR extraites (35+ champs)

# Test 1.3 - Gestion lots multiples
curl -X GET "http://localhost:5000/api/aos/{aoId}/lots"
# ✅ ATTENDU: Lots structurés avec numéros/désignations

# Test 1.4 - Contacts réutilisables
curl -X GET "http://localhost:5000/api/maitres-ouvrage"
curl -X GET "http://localhost:5000/api/maitres-oeuvre"
# ✅ ATTENDU: Listes contacts disponibles
```

### **2. WORKFLOW CHIFFRAGE**

```bash
# Test 2.1 - Transformation AO → Offre
curl -X POST "http://localhost:5000/api/offers/create-with-structure" \
  -d '{"aoId": "{aoId}", "structure": "detailed"}'
# ✅ ATTENDU: Offre créée avec référence auto

# Test 2.2 - Éléments de chiffrage
curl -X POST "http://localhost:5000/api/offers/{offerId}/chiffrage-elements" \
  -d '{
    "designation": "Menuiserie RDC",
    "quantite": 10,
    "prixUnitaire": 500,
    "unite": "ml"
  }'
# ✅ ATTENDU: Élément ajouté, calcul automatique

# Test 2.3 - Génération DPGF avec PDF
curl -X POST "http://localhost:5000/api/offers/{offerId}/dpgf/generate" \
  -d '{"includeOptional": false, "tvaPercentage": 20}'
# ✅ ATTENDU: DPGF généré + PDF créé

# Test 2.4 - Demandes prix fournisseurs
curl -X POST "http://localhost:5000/api/offers/{offerId}/supplier-requests" \
  -d '{"elements": ["elem1"], "deadline": "2025-10-01"}'
# ✅ ATTENDU: Demande créée, statut 'sent'
```

### **3. WORKFLOW PROJETS**

```bash
# Test 3.1 - Transformation Offre → Projet
curl -X POST "http://localhost:5000/api/offers/{offerId}/convert-to-project"
# ✅ ATTENDU: Projet créé, statut 'etude'

# Test 3.2 - Planning et phases
curl -X GET "http://localhost:5000/api/projects?status=planification"
# ✅ ATTENDU: Projets avec 5 phases (étude, planif, appro, chantier, sav)

# Test 3.3 - Gantt et ressources
curl -X GET "http://localhost:5000/api/projects/{projectId}/timeline"
# ✅ ATTENDU: Timeline avec jalons, équipes assignées

# Test 3.4 - Visa architecte (nouveau workflow)
curl -X POST "http://localhost:5000/api/projects/{projectId}/visa-architecte" \
  -d '{"visaType": "PC", "architectId": "arch1"}'
# ✅ ATTENDU: Visa créé, dates calculées
```

### **4. INTELLIGENCE TEMPORELLE**

```bash
# Test 4.1 - Calculs automatiques (31 règles)
curl -X POST "http://localhost:5000/api/projects/{projectId}/calculate-timeline"
# ✅ ATTENDU: Dates calculées selon règles métier

# Test 4.2 - Détection proactive alertes
curl -X GET "http://localhost:5000/api/date-intelligence/alerts"
# ✅ ATTENDU: Alertes générées si retards détectés

# Test 4.3 - Dashboard intelligence
curl -X GET "http://localhost:5000/api/date-intelligence/dashboard"
# ✅ ATTENDU: Métriques temps réel, recommandations

# Test 4.4 - EventBus temps réel
# WebSocket: ws://localhost:5000/ws
# ✅ ATTENDU: Events 'date_intelligence' reçus
```

---

## 🔧 TESTS TECHNIQUES CRITIQUES

### **1. BASE DE DONNÉES**

```sql
-- Test 1.1 - Intégrité schéma
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';
-- ✅ ATTENDU: 40+ tables

-- Test 1.2 - Relations critiques
SELECT COUNT(*) FROM pg_constraint 
WHERE contype = 'f';
-- ✅ ATTENDU: Contraintes FK intactes

-- Test 1.3 - Colonnes deadline_history
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name LIKE '%deadline%';
-- ⚠️ CONNU: Erreur deadline_history documentée
```

### **2. APIS & SÉCURITÉ**

```bash
# Test 2.1 - Authentification
curl -X POST "http://localhost:5000/api/login/basic" \
  -d '{"username": "admin", "password": "admin"}'
# ✅ ATTENDU: Login success, session créée

# Test 2.2 - Rate limiting
for i in {1..10}; do
  curl -X GET "http://localhost:5000/api/offers"
done
# ✅ ATTENDU: 429 après limite dépassée

# Test 2.3 - Validation Zod
curl -X POST "http://localhost:5000/api/aos" \
  -d '{"invalid": "data"}'
# ✅ ATTENDU: 400 avec erreurs validation
```

### **3. SERVICES BACKEND**

```bash
# Test 3.1 - EventBus publish/subscribe
# Simuler événement via WebSocket
# ✅ ATTENDU: Événements propagés aux abonnés

# Test 3.2 - Scheduler périodique
# Vérifier logs du PeriodicDetectionScheduler
# ✅ ATTENDU: Détections horaires/quotidiennes actives

# Test 3.3 - WebSocket authentication
# Connexion WS avec cookies session
# ✅ ATTENDU: Auth réussie, filtres actifs
```

---

## 📊 MÉTRIQUES DE RÉFÉRENCE

### **Performance Baseline**
- **Login** : < 1000ms
- **APIs GET** : < 100ms
- **DPGF génération** : < 5000ms
- **OCR processing** : < 10000ms

### **Données de Référence**
- **AOs en base** : 1 (minimum test)
- **Offres en base** : 1 (minimum test)  
- **Projets en base** : 1 (minimum test)
- **Tables DB** : 40+ tables actives

### **Sécurité Active**
- **Rate limiting** : 5 niveaux configurés
- **Validation Zod** : Toutes routes protégées
- **Auth required** : 401 sur endpoints non-auth
- **Session management** : PostgreSQL store

---

## ⚠️ POINTS D'ATTENTION CRITIQUES

### **Zones Sensibles - NE PAS MODIFIER**
1. **Tables critiques** : `aos`, `offers`, `projects`, `project_timelines`
2. **Colonnes ID** : Tous les UUID, références automatiques
3. **Relations FK** : Contraintes aos↔offers↔projects
4. **Middleware auth** : `isAuthenticated`, rate limiting

### **Erreurs Connues à Préserver**
1. **`deadline_history`** : Colonne avec erreur documentée (ne pas corriger)
2. **Test protection** : Triple protection scheduler (NODE_ENV, DISABLE_SCHEDULER, CI)

### **Services à ne pas Interrompre**
1. **EventBus** : System publish/subscribe critique
2. **WebSocket server** : Connexions temps réel actives  
3. **Periodic scheduler** : Surveillance continue projets
4. **DateIntelligence** : Calculs automatiques essentiels

---

## 🎯 VALIDATION POST-ANALYTICS

### **Checklist Obligatoire après Implémentation Dashboard**

- [ ] **Tous les tests ci-dessus passent** sans régression
- [ ] **Métriques performance** maintenues (dans les seuils)
- [ ] **Auth & sécurité** inchangées (401 sur non-auth)
- [ ] **EventBus fonctionnel** (events propagés)
- [ ] **WebSocket opérationnel** (connexions actives)
- [ ] **Intelligence Temporelle** active (calculs fonctionnent)
- [ ] **Workflows complets** (AO→Offre→Projet)
- [ ] **Données intègres** (pas de corruption)

### **Tests Spécifiques Dashboard Analytics**

```bash
# Après ajout Dashboard - Tests additionnels
curl -X GET "http://localhost:5000/api/analytics/dashboard"
# ✅ ATTENDU: Nouvelles métriques SANS casser l'existant

curl -X GET "http://localhost:5000/api/analytics/kpis"
# ✅ ATTENDU: KPIs calculés SANS impacter performance

# CRITIQUE: Vérifier que les workflows existants fonctionnent toujours
curl -X POST "http://localhost:5000/api/offers/{offerId}/dpgf/generate"
# ✅ ATTENDU: DPGF génération TOUJOURS fonctionnelle
```

---

**🚨 RÈGLE D'OR : Si un seul de ces tests échoue après l'ajout du Dashboard Analytics, l'implémentation doit être revue avant déploiement.**

**✅ État de référence établi - Prêt pour implémentation Dashboard sans régression**