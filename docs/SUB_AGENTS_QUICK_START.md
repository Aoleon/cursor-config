# Guide de Démarrage Rapide - Sub-Agents

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🚀 Activation Automatique

Les sub-agents s'activent **automatiquement** pour les tâches complexes :

### Seuils d'Activation

Les sub-agents s'activent si :
- ✅ > 3 todos OU
- ✅ > 5 dépendances OU
- ✅ > 200 lignes estimées OU
- ✅ > 5 fichiers à modifier OU
- ✅ > 3 validations distinctes OU
- ✅ Tâche de migration/refactoring OU
- ✅ Tâche avec risques élevés

### Processus Automatique

1. **Détection Immédiate** → L'agent analyse la complexité (première action)
2. **Vérification Seuils** → Si seuils dépassés, activation automatique
3. **Identification Rôles** → Identification rapide des rôles nécessaires
4. **Activation Orchestration** → Orchestration activée immédiatement
5. **Exécution** → Exécution selon plan d'orchestration

**Temps d'activation cible:** < 10 secondes

## 📋 Utilisation Manuelle

Si vous voulez forcer l'activation des sub-agents, référencer :

```
@.cursor/rules/sub-agents-quick-activation.md
```

Ou pour une orchestration spécifique :

```
@.cursor/rules/sub-agents-orchestration.md
```

## 🎯 Rôles Disponibles

### Architect (Architecte Sénior)
- **Rôle:** Supervision, validation, priorisation
- **Activation:** Tâches complexes, refactoring, migrations
- **Mode:** `architect-mode`

### Developer (Développeur)
- **Rôle:** Développement, implémentation
- **Activation:** Tâches de développement, modifications
- **Mode:** `developer-mode`

### Tester (Testeur)
- **Rôle:** Tests, validation, debugging
- **Activation:** Tâches de test, validation
- **Mode:** `tester-mode`

### Analyst (Analyste)
- **Rôle:** Analyse, optimisation, cause racine
- **Activation:** Tâches d'analyse, optimisation
- **Mode:** `analyst-mode`

### Coordinator (Coordinateur)
- **Rôle:** Coordination transversale
- **Activation:** Tâches complexes nécessitant coordination
- **Mode:** `coordinator-mode`

## 🔄 Workflows Standards

### Workflow Standard (Développement Complet)

1. **Coordinator** → Analyse tâche et identification rôles
2. **Architect** → Validation architecture et priorisation
3. **Developer** → Implémentation
4. **Tester** → Validation et tests
5. **Analyst** → Analyse et optimisation
6. **Architect** → Review final
7. **Coordinator** → Consolidation résultats

### Workflow Quick Fix (Correction Rapide)

1. **Developer** → Correction directe
2. **Tester** → Validation rapide

### Workflow Refactoring

1. **Architect** → Analyse architecture et planification
2. **Analyst** → Analyse code existant
3. **Developer** → Refactoring
4. **Tester** → Tests de régression
5. **Architect** → Validation architecture finale

## ⚡ Optimisations

### Activation Rapide

- **Détection:** < 1s
- **Identification rôles:** < 1s
- **Activation orchestration:** < 2s
- **Chargement règles:** < 3s
- **Planification:** < 2s
- **Total:** < 10s

### Chargement Intelligent

- **Règles P0:** Chargées immédiatement (core, qualité)
- **Règles P1:** Chargées selon rôle actif
- **Règles P2:** Chargées sur demande

## 🔗 Références

### Règles Principales

- `@.cursor/rules/sub-agents-quick-activation.md` - Activation rapide (P0 - IMPÉRATIF)
- `@.cursor/rules/sub-agents-orchestration.md` - Orchestration principale (P1)
- `@.cursor/rules/sub-agents-roles.md` - Rôles des sub-agents (P1)
- `@.cursor/rules/sub-agents-communication.md` - Communication inter-agents (P1)
- `@.cursor/rules/sub-agents-modes.md` - Modes personnalisés (P1)

### Configuration

- `@docs/AGENT_ROLES_CONFIG.json` - Configuration complète des rôles
- `@docs/AGENT_COORDINATION_STATE.json` - État de coordination
- `@docs/AGENT_TASKS_QUEUE.json` - File d'attente des tâches

### Documentation

- `@docs/SUB_AGENTS_GUIDE.md` - Guide complet d'utilisation
- `@docs/SUB_AGENTS_TESTING.md` - Tests et validation
- `@docs/SUB_AGENTS_RULES_ENRICHMENT.md` - Enrichissement avec règles Cursor

## ❓ FAQ

### Q: Les sub-agents s'activent-ils automatiquement ?

**R:** Oui, pour les tâches complexes (> 3 todos, > 200 lignes estimées, etc.), l'activation est automatique et immédiate.

### Q: Comment forcer l'activation manuelle ?

**R:** Référencer `@.cursor/rules/sub-agents-quick-activation.md` dans votre demande.

### Q: Comment savoir quels rôles sont actifs ?

**R:** Consulter `@docs/AGENT_COORDINATION_STATE.json` pour l'état actuel de coordination.

### Q: Les sub-agents ralentissent-ils l'exécution ?

**R:** Non, l'activation est rapide (< 10s) et l'orchestration optimise l'exécution en parallélisant quand possible.

### Q: Puis-je désactiver les sub-agents ?

**R:** Pour les tâches simples, les sub-agents ne s'activent pas automatiquement. Pour forcer la désactivation, utiliser un mode simple sans référence aux règles sub-agents.

---

**Note:** Pour plus de détails, consultez `@docs/SUB_AGENTS_GUIDE.md` pour le guide complet.

