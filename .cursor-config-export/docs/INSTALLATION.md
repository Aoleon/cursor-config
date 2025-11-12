
# Guide d'Installation - Configuration Cursor

## 📋 Prérequis

- Git installé
- Accès au dépôt `cursor-config` (GitHub/GitLab/etc.)

## 🚀 Installation Initiale

### Option 1: Installation Automatique (Recommandé)

```bash
# Dans votre projet
git clone git@github.com:votre-org/cursor-config.git .cursor-config
cd .cursor-config
bash scripts/install.sh latest "Nom du Projet" "Description du projet"
cd ..
rm -rf .cursor-config  # Optionnel: supprimer après installation
```

### Option 2: Installation Manuelle

```bash
# 1. Cloner le dépôt
git clone git@github.com:votre-org/cursor-config.git .cursor-config

# 2. Installer la configuration
cd .cursor-config
bash scripts/install.sh

# 3. Copier dans votre projet
cd ..
cp -r .cursor-config/.cursor .
cp .cursor-config/.cursorrules .

# 4. Créer fichier version
echo "3.0.0" > .cursor-version

# 5. Nettoyer (optionnel)
rm -rf .cursor-config
```

### Option 3: Via Submodule Git

```bash
# Ajouter comme submodule
git submodule add git@github.com:votre-org/cursor-config.git .cursor-config

# Créer liens symboliques
ln -s .cursor-config/.cursor .cursor
ln -s .cursor-config/.cursorrules .cursorrules

# Initialiser
git submodule update --init --recursive
```

## 🔄 Mise à Jour

### Mise à jour automatique

```bash
# Si script installé
bash scripts/update-cursor-config.sh
```

### Mise à jour manuelle

```bash
# Si submodule
cd .cursor-config
git pull origin main
git checkout v3.0.0  # ou dernière version
cd ..

# Si installation directe
git clone git@github.com:votre-org/cursor-config.git .cursor-config-temp
cp -r .cursor-config-temp/.cursor .cursor
cp .cursor-config-temp/.cursorrules .cursorrules
rm -rf .cursor-config-temp
```

## ⚙️ Configuration

### Variables d'environnement

```bash
# Définir dépôt personnalisé
export CURSOR_CONFIG_REPO="git@github.com:votre-org/cursor-config.git"
```

### Personnalisation par projet

1. **Adapter `.cursorrules`** :
   - Modifier le nom du projet
   - Adapter la description
   - Ajouter règles spécifiques

2. **Adapter `.cursor/context/`** :
   - Modifier `projectbrief.md`
   - Adapter `techContext.md`
   - Personnaliser `activeContext.md`

3. **Ajouter règles spécifiques** :
   - Créer `.cursor/rules/project-specific/`
   - Ajouter vos règles personnalisées

## 🔍 Vérification

```bash
# Vérifier version installée
cat .cursor-version

# Vérifier structure
ls -la .cursor/
ls -la .cursorrules
```

## ❓ Dépannage

### Problème: Configuration non chargée

- Vérifier que `.cursorrules` est à la racine du projet
- Vérifier que `.cursor/` existe
- Redémarrer Cursor

### Problème: Conflits Git

```bash
# Résoudre conflits
git checkout --theirs .cursorrules
git add .cursorrules
```

### Problème: Version incorrecte

```bash
# Forcer version spécifique
echo "3.0.0" > .cursor-version
```
