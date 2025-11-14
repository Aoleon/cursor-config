# Guide d'Utilisation - Système de Sub-Agents

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 📋 Vue d'Ensemble

Le système de sub-agents permet l'exécution autonome de maxi runs en orchestrant 5 rôles spécialisés :
- **Architect** - Supervision, validation, priorisation
- **Developer** - Développement, implémentation
- **Tester** - Tests, validation, debugging
- **Analyst** - Analyse, optimisation, cause racine
- **Coordinator** - Coordination transversale

## 🚀 Démarrage Rapide

### 1. Utilisation Automatique

Le système s'active automatiquement pour les tâches complexes (> 3 todos, > 200 lignes estimées).

### 2. Utilisation Manuelle

Pour forcer l'utilisation des sub-agents, référencer :
```
@.cursor/rules/sub-agents-orchestration.md
```

## 📚 Exemples d'Utilisation

### Exemple 1: Développement Complet

**Scénario:** Créer une nouvelle fonctionnalité complète.

**Workflow:**
1. Coordinator analyse la tâche
2. Architect valide l'architecture
3. Developer implémente
4. Tester valide et teste
5. Analyst analyse et optimise
6. Architect review final
7. Coordinator consolide résultats

### Exemple 2: Correction Rapide

**Scénario:** Corriger un bug simple.

**Workflow:**
1. Developer corrige directement
2. Tester valide rapidement

### Exemple 3: Refactoring Complexe

**Scénario:** Refactorer un module complexe.

**Workflow:**
1. Architect analyse et planifie
2. Analyst analyse code existant
3. Developer refactore
4. Tester tests de régression
5. Architect valide architecture finale

## 🔧 Troubleshooting

### Problème: Rôles non identifiés automatiquement

**Solution:** Vérifier que la tâche est suffisamment complexe (> 3 todos) ou référencer explicitement `@.cursor/rules/sub-agents-orchestration.md`.

### Problème: Communication entre rôles échoue

**Solution:** Vérifier les fichiers JSON de coordination (`docs/AGENT_COORDINATION_STATE.json`, `docs/AGENT_TASKS_QUEUE.json`).

### Problème: Timeout de messages

**Solution:** Vérifier la configuration des timeouts dans `@.cursor/rules/sub-agents-communication.md`.

## 🔗 Références

- `@.cursor/rules/sub-agents-roles.md` - Rôles des sub-agents
- `@.cursor/rules/sub-agents-orchestration.md` - Orchestration principale
- `@.cursor/rules/sub-agents-communication.md` - Communication inter-agents
- `@docs/AGENT_ROLES_CONFIG.json` - Configuration des rôles

---

**Note:** Pour plus de détails, consultez `@docs/SUB_AGENTS_TESTING.md` pour les tests et validation.

