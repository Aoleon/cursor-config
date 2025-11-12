# Synchronisation Automatique Bidirectionnelle - Configuration Cursor

**Date:** 2025-01-29  
**Version:** 3.0.0

## 🔄 Vue d'Ensemble

Système de synchronisation automatique bidirectionnelle pour la configuration Cursor :
- **Projet → Dépôt** : Changements dans projet poussés vers dépôt centralisé
- **Dépôt → Projets** : Mises à jour depuis dépôt appliquées aux projets

## ✅ Fonctionnalités Implémentées

### 1. Synchronisation Projet → Dépôt

#### ✅ `sync-to-repo.sh`
- **Fonction:** Synchronise changements vers dépôt centralisé
- **Déclenchement:**
  - Automatique via `pre-commit` hook
  - Manuel: `bash scripts/sync-to-repo.sh`
- **Actions:**
  - Export configuration actuelle
  - Clone/Mise à jour dépôt
  - Copie configuration vers dépôt
  - Commit et push automatique
  - Création tag si nouvelle version

#### ✅ Hook `pre-commit`
- **Fonction:** Détecte changements `.cursor/` ou `.cursorrules`
- **Action:** Exécute `sync-to-repo.sh` automatiquement
- **Mode:** Non-bloquant (continue même si échec)

### 2. Synchronisation Dépôt → Projets

#### ✅ `update-cursor-config.sh`
- **Fonction:** Met à jour depuis dépôt centralisé
- **Déclenchement:**
  - Automatique via `post-merge` hook
  - Manuel: `bash scripts/update-cursor-config.sh`
- **Actions:**
  - Fetch tags depuis dépôt
  - Détection dernière version
  - Checkout version spécifique
  - Backup ancienne config
  - Copie nouvelle config
  - Mise à jour `.cursor-version`

#### ✅ Hook `post-merge`
- **Fonction:** Détecte changements `.cursor-version` ou config manquante
- **Action:** Exécute `update-cursor-config.sh` automatiquement
- **Mode:** Non-interactif (CURSOR_CONFIG_AUTO_UPDATE=1)

### 3. Configuration Automatique

#### ✅ `setup-auto-sync.sh`
- **Fonction:** Configure synchronisation bidirectionnelle complète
- **Hooks créés:**
  - `pre-commit` - Sync vers dépôt
  - `post-merge` - Sync depuis dépôt (amélioré)
  - `post-commit` - Notification changements
- **Scripts créés:**
  - `watch-cursor-config.sh` - Surveillance continue (optionnel)

## 🚀 Utilisation

### Configuration Initiale

```bash
# 1. Configurer hooks Git de base
bash scripts/setup-git-hooks.sh

# 2. Configurer synchronisation bidirectionnelle
bash scripts/setup-auto-sync.sh
```

### Workflow Automatique

#### Scénario 1: Modification dans Projet

1. **Modifier** `.cursor/` ou `.cursorrules`
2. **Commit** : `git commit -m "..."`
3. **Hook pre-commit** détecte changements
4. **Sync automatique** vers dépôt centralisé
5. **Push** vers dépôt (si commit réussi)

#### Scénario 2: Mise à Jour depuis Dépôt

1. **Dans dépôt centralisé:**
   ```bash
   # Modifier config
   # Commit et push
   git commit -m "v3.1.0 - Nouvelles règles"
   git tag v3.1.0
   git push origin main --tags
   ```

2. **Dans projets:**
   ```bash
   git pull
   # Hook post-merge détecte changement
   # Sync automatique depuis dépôt
   ```

### Synchronisation Manuelle

#### Vers Dépôt
```bash
bash scripts/sync-to-repo.sh
```

#### Depuis Dépôt
```bash
bash scripts/update-cursor-config.sh
```

### Mode Watch (Optionnel)

```bash
# Surveille changements et sync automatiquement
bash scripts/watch-cursor-config.sh
```

**Prérequis:** `fswatch` (macOS: `brew install fswatch`)

## ⚙️ Variables d'Environnement

### `CURSOR_CONFIG_AUTO_SYNC`
- **Valeur:** `1` pour mode non-interactif
- **Usage:** Sync automatique sans confirmation
- **Exemple:** `CURSOR_CONFIG_AUTO_SYNC=1 bash scripts/sync-to-repo.sh`

### `CURSOR_CONFIG_AUTO_UPDATE`
- **Valeur:** `1` pour mode non-interactif
- **Usage:** Update automatique sans confirmation
- **Exemple:** `CURSOR_CONFIG_AUTO_UPDATE=1 bash scripts/update-cursor-config.sh`

### `CURSOR_CONFIG_REPO`
- **Valeur:** URL dépôt Git
- **Usage:** Définir dépôt personnalisé
- **Exemple:** `export CURSOR_CONFIG_REPO="git@github.com:mon-org/cursor-config.git"`

### `CURSOR_CONFIG_REPO_DIR`
- **Valeur:** Chemin dépôt local
- **Usage:** Définir emplacement dépôt cloné
- **Exemple:** `export CURSOR_CONFIG_REPO_DIR="/path/to/repo"`

## 🔍 Détection Changements

### Vers Dépôt (pre-commit)
- Détecte modifications `.cursor/` ou `.cursorrules`
- Vérifie via `git diff --cached`
- Sync uniquement si changements détectés

### Depuis Dépôt (post-merge)
- Détecte changement `.cursor-version`
- Détecte config manquante (`.cursor/` ou `.cursorrules`)
- Sync uniquement si nécessaire

## 📊 Workflow Complet

### Évolution Configuration

1. **Modifier** dans projet A
   ```bash
   # Éditer .cursorrules ou .cursor/rules/...
   git add .cursorrules
   git commit -m "Nouvelles règles"
   # → Sync auto vers dépôt
   ```

2. **Dépôt mis à jour**
   ```bash
   # Automatique via pre-commit hook
   # Ou manuel: bash scripts/sync-to-repo.sh
   ```

3. **Projets B, C, D mis à jour**
   ```bash
   # Dans chaque projet
   git pull
   # → Sync auto depuis dépôt
   ```

### Gestion Versions

1. **Nouvelle version dans projet**
   ```bash
   echo "3.1.0" > VERSION
   git commit -m "v3.1.0"
   # → Tag créé automatiquement lors sync
   ```

2. **Tag dans dépôt**
   ```bash
   # Automatique si VERSION changé
   # Ou manuel: git tag v3.1.0
   ```

3. **Utilisation version spécifique**
   ```bash
   # Dans projets
   bash scripts/update-cursor-config.sh
   # → Checkout dernière version automatiquement
   ```

## ✅ Checklist Configuration

### Dans Projet Source (jlm-app)

- [x] `sync-to-repo.sh` créé
- [x] `setup-auto-sync.sh` créé
- [x] `pre-commit` hook configuré
- [x] `post-commit` hook configuré
- [x] Variables d'environnement supportées

### Dans Dépôt Centralisé

- [x] Dépôt Git initialisé
- [x] Remote configuré
- [x] Tags pour versions
- [x] Structure complète

### Dans Projets Destinataires

- [x] `update-cursor-config.sh` installé
- [x] `post-merge` hook configuré
- [x] `post-checkout` hook configuré
- [x] `.cursor-version` pour tracking

## 🎯 Résultat

**Synchronisation automatique bidirectionnelle complète !**

- ✅ **Projet → Dépôt** : Automatique via `pre-commit`
- ✅ **Dépôt → Projets** : Automatique via `post-merge`
- ✅ **Manuel** : Scripts disponibles
- ✅ **Watch** : Surveillance continue (optionnel)

---

**Auteur:** Agent Cursor  
**Date:** 2025-01-29  
**Statut:** ✅ Synchronisation Bidirectionnelle Complète
