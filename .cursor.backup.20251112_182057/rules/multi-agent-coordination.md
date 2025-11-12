<!-- 
Context: multi-agent, coordination, orchestration, collaboration, task-distribution
Priority: P2
Auto-load: when task is very complex requiring multiple specialized agents
Dependencies: core.md, quality-principles.md, senior-architect-oversight.md, task-decomposition.md
Score: 50
-->

# Coordination Multi-Agents - Saxium

**Objectif:** Coordonner plusieurs agents spécialisés pour résoudre des tâches très complexes de manière collaborative.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** Pour des tâches très complexes, l'agent DOIT orchestrer plusieurs agents spécialisés pour résoudre la tâche de manière collaborative.

**Bénéfices:**
- ✅ Résolution de tâches très complexes
- ✅ Expertise spécialisée par agent
- ✅ Collaboration efficace
- ✅ Partage de contexte

**Référence:** `@.cursor/rules/senior-architect-oversight.md` - Supervision architecte sénior  
**Référence:** `@.cursor/rules/task-decomposition.md` - Décomposition des tâches

## 📋 Règles de Coordination

### 1. Identification des Agents Nécessaires

**TOUJOURS:**
- ✅ Analyser tâche pour identifier agents nécessaires
- ✅ Assigner sous-tâches à agents spécialisés
- ✅ Coordonner exécution
- ✅ Partager contexte entre agents

### 2. Orchestration des Agents

**TOUJOURS:**
- ✅ Orchestrer exécution séquentielle/parallèle
- ✅ Gérer dépendances entre agents
- ✅ Partager résultats entre agents
- ✅ Valider résultats de chaque agent

### 3. Communication Inter-Agents

**TOUJOURS:**
- ✅ Partager contexte essentiel
- ✅ Communiquer résultats intermédiaires
- ✅ Résoudre conflits entre agents
- ✅ Consolider résultats finaux

## 🔄 Workflow de Coordination

1. Analyser tâche complexe
2. Identifier agents spécialisés nécessaires
3. Décomposer tâche en sous-tâches
4. Assigner sous-tâches aux agents
5. Orchestrer exécution
6. Consolider résultats

## ⚠️ Règles

**TOUJOURS:**
- ✅ Identifier agents nécessaires
- ✅ Coordonner exécution
- ✅ Partager contexte
- ✅ Consolider résultats

**NE JAMAIS:**
- ❌ Ignorer coordination nécessaire
- ❌ Ne pas partager contexte
- ❌ Ignorer dépendances entre agents

## 🔗 Références

- `@.cursor/rules/senior-architect-oversight.md` - Supervision architecte
- `@.cursor/rules/task-decomposition.md` - Décomposition des tâches

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

