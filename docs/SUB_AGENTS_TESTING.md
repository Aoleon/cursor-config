# Tests et Validation - Système de Sub-Agents

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 📋 Scénarios de Test

### Scénario 1: Test Workflow Standard

**Objectif:** Valider le workflow standard avec tous les rôles.

**Étapes:**
1. Créer tâche complexe (> 3 todos)
2. Vérifier identification automatique des rôles
3. Vérifier exécution séquentielle
4. Vérifier communication entre rôles
5. Vérifier consolidation des résultats

**Critères de Succès:**
- ✅ Tous les rôles identifiés
- ✅ Exécution séquentielle respectée
- ✅ Communication réussie
- ✅ Résultats consolidés

### Scénario 2: Test Workflow Quick Fix

**Objectif:** Valider le workflow quick fix.

**Étapes:**
1. Créer tâche simple (< 3 todos)
2. Vérifier identification Developer + Tester uniquement
3. Vérifier exécution rapide
4. Vérifier validation

**Critères de Succès:**
- ✅ Seulement Developer + Tester identifiés
- ✅ Exécution rapide (< 5 minutes)
- ✅ Validation réussie

### Scénario 3: Test Gestion Erreurs

**Objectif:** Valider la gestion d'erreurs et récupération.

**Étapes:**
1. Créer tâche avec erreur simulée
2. Vérifier détection d'erreur
3. Vérifier tentative de récupération
4. Vérifier notification aux rôles concernés

**Critères de Succès:**
- ✅ Erreur détectée
- ✅ Récupération tentée
- ✅ Rôles notifiés

## 🔍 Validation des Workflows

### Validation Workflow Standard

**Checklist:**
- [ ] Coordinator analyse tâche
- [ ] Architect valide architecture
- [ ] Developer implémente
- [ ] Tester valide et teste
- [ ] Analyst analyse et optimise
- [ ] Architect review final
- [ ] Coordinator consolide résultats

### Validation Workflow Quick Fix

**Checklist:**
- [ ] Developer corrige directement
- [ ] Tester valide rapidement
- [ ] Résultat consolidé

## 🧪 Tests d'Intégration

### Test Intégration Communication

**Objectif:** Valider la communication entre rôles.

**Étapes:**
1. Envoyer message entre rôles
2. Vérifier réception
3. Vérifier traitement
4. Vérifier réponse

**Critères de Succès:**
- ✅ Message envoyé
- ✅ Message reçu
- ✅ Message traité
- ✅ Réponse envoyée

### Test Intégration Orchestration

**Objectif:** Valider l'orchestration complète.

**Étapes:**
1. Créer plan d'exécution
2. Exécuter orchestration
3. Vérifier coordination
4. Vérifier résultats

**Critères de Succès:**
- ✅ Plan créé
- ✅ Orchestration exécutée
- ✅ Coordination réussie
- ✅ Résultats consolidés

## 🔗 Références

- `@.cursor/rules/sub-agents-workflows.md` - Workflows standards
- `@.cursor/rules/sub-agents-communication.md` - Communication inter-agents
- `@.cursor/rules/sub-agents-orchestration.md` - Orchestration principale

---

**Note:** Pour plus de détails sur l'utilisation, consultez `@docs/SUB_AGENTS_GUIDE.md`.

