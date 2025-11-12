#!/bin/bash
# export-cursor-config.sh
# Exporte la configuration Cursor actuelle pour créer le dépôt centralisé
# Version: 3.0.0

set -euo pipefail  # Mode strict: erreurs, variables non définies, pipe failures

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions utilitaires
error() { echo -e "${RED}❌ $1${NC}" >&2; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Vérifier prérequis
check_prerequisites() {
    local missing=0
    
    if ! command -v git &> /dev/null; then
        error "Git n'est pas installé"
        missing=1
    fi
    
    if [ $missing -eq 1 ]; then
        error "Prérequis manquants. Veuillez les installer."
        exit 1
    fi
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EXPORT_DIR="$PROJECT_ROOT/.cursor-config-export"
VERSION="3.0.0"

# Vérifier qu'on est dans un projet valide
if [ ! -f "$PROJECT_ROOT/package.json" ] && [ ! -d "$PROJECT_ROOT/.cursor" ]; then
    error "Ce script doit être exécuté depuis la racine d'un projet"
    exit 1
fi

check_prerequisites

info "Export de la configuration Cursor v$VERSION..."

# Créer dossier d'export avec vérification
if [ -d "$EXPORT_DIR" ]; then
    warning "Dossier d'export existe déjà, suppression..."
    rm -rf "$EXPORT_DIR"
fi

if ! mkdir -p "$EXPORT_DIR"; then
    error "Impossible de créer le dossier d'export: $EXPORT_DIR"
    exit 1
fi

# Copier .cursor/ avec vérification
if [ -d "$PROJECT_ROOT/.cursor" ]; then
    info "Copie de .cursor/"
    if ! cp -r "$PROJECT_ROOT/.cursor" "$EXPORT_DIR/"; then
        error "Échec de la copie de .cursor/"
        exit 1
    fi
    
    # Nettoyer fichiers temporaires (optimisé: une seule passe find)
    if [ -d "$EXPORT_DIR/.cursor/checkpoints" ]; then
        rm -rf "$EXPORT_DIR/.cursor/checkpoints" 2>/dev/null || true
    fi
    # Supprimer tous les fichiers temporaires en une seule passe
    find "$EXPORT_DIR/.cursor" -type f \( -name "*.tmp" -o -name "*.bak" -o -name ".DS_Store" \) -delete 2>/dev/null || true
    
    success ".cursor/ copié"
else
    warning ".cursor/ non trouvé - export incomplet"
fi

# Copier .cursorrules avec vérification
if [ -f "$PROJECT_ROOT/.cursorrules" ]; then
    info "Copie de .cursorrules"
    if ! cp "$PROJECT_ROOT/.cursorrules" "$EXPORT_DIR/"; then
        error "Échec de la copie de .cursorrules"
        exit 1
    fi
    success ".cursorrules copié"
else
    warning ".cursorrules non trouvé - export incomplet"
fi

# Vérifier qu'on a au moins un des deux
if [ ! -d "$EXPORT_DIR/.cursor" ] && [ ! -f "$EXPORT_DIR/.cursorrules" ]; then
    error "Aucune configuration Cursor trouvée. Export impossible."
    exit 1
fi

# Créer structure du dépôt avec vérification
REQUIRED_DIRS=("docs" "scripts" "server/services" "server/utils")
for dir in "${REQUIRED_DIRS[@]}"; do
    if ! mkdir -p "$EXPORT_DIR/$dir"; then
        error "Impossible de créer $dir/"
        exit 1
    fi
    success "Dossier $dir/ créé"
done

# Copier services agents
if [ -d "$PROJECT_ROOT/server/services" ]; then
    info "Copie des services agents..."
    AGENT_FILES=$(find "$PROJECT_ROOT/server/services" -name "Agent*.ts" -type f 2>/dev/null | wc -l | tr -d ' ')
    if [ "$AGENT_FILES" -gt 0 ]; then
        if ! cp "$PROJECT_ROOT/server/services"/Agent*.ts "$EXPORT_DIR/server/services/" 2>/dev/null; then
            warning "Certains services agents n'ont pas pu être copiés"
        else
            success "$AGENT_FILES services agents copiés"
        fi
    fi
fi

# Copier utilitaires agents
if [ -d "$PROJECT_ROOT/server/utils" ]; then
    info "Copie des utilitaires agents..."
    UTIL_FILES=(
        "agent-checkpoint.ts"
        "agent-parallel-executor.ts"
        "agent-context-optimizer.ts"
        "agent-stop-detector.ts"
    )
    for util in "${UTIL_FILES[@]}"; do
        if [ -f "$PROJECT_ROOT/server/utils/$util" ]; then
            cp "$PROJECT_ROOT/server/utils/$util" "$EXPORT_DIR/server/utils/" 2>/dev/null || true
        fi
    done
    success "Utilitaires agents copiés"
fi

# Copier scripts agents
if [ -d "$PROJECT_ROOT/scripts" ]; then
    info "Copie des scripts agents..."
    AGENT_SCRIPTS=(
        "sync-to-repo.sh"
        "setup-auto-sync.sh"
        "setup-git-hooks.sh"
        "watch-cursor-config.sh"
    )
    for script in "${AGENT_SCRIPTS[@]}"; do
        if [ -f "$PROJECT_ROOT/scripts/$script" ]; then
            cp "$PROJECT_ROOT/scripts/$script" "$EXPORT_DIR/scripts/" 2>/dev/null || true
            chmod +x "$EXPORT_DIR/scripts/$script" 2>/dev/null || true
        fi
    done
    success "Scripts agents copiés"
fi

# Copier documentation agents
if [ -d "$PROJECT_ROOT/docs" ]; then
    info "Copie de la documentation agents..."
    if ! cp "$PROJECT_ROOT/docs"/AGENT*.md "$EXPORT_DIR/docs/" 2>/dev/null; then
        warning "Aucune documentation agent trouvée"
    else
        DOC_COUNT=$(ls -1 "$EXPORT_DIR/docs"/AGENT*.md 2>/dev/null | wc -l | tr -d ' ')
        success "$DOC_COUNT fichiers de documentation copiés"
    fi
    # Copier aussi docs AUTO et SYNC
    cp "$PROJECT_ROOT/docs"/AUTO*.md "$EXPORT_DIR/docs/" 2>/dev/null || true
    cp "$PROJECT_ROOT/docs"/SYNC*.md "$EXPORT_DIR/docs/" 2>/dev/null || true
    cp "$PROJECT_ROOT/docs"/GIT*.md "$EXPORT_DIR/docs/" 2>/dev/null || true
fi

# Créer VERSION
echo "$VERSION" > "$EXPORT_DIR/VERSION"

# Créer CHANGELOG.md
cat > "$EXPORT_DIR/CHANGELOG.md" << 'EOF'
# Changelog Configuration Cursor

## 3.0.0 - 2025-01-29

### Nouvelles fonctionnalités
- ✅ AgentQualityValidator - Validation centralisée et robuste
- ✅ AgentCacheOptimizer - Optimisation utilisation cache
- ✅ AgentToolUsageOptimizer - Optimisation utilisation outils
- ✅ AgentPerformanceValidator - Validation performance en temps réel
- ✅ AgentCodeQualityEnforcer - Enforcement automatique qualité

### Améliorations
- Validation entrées dans services agent
- Optimisation cache avec analyse patterns
- Optimisation utilisation outils
- Validation performance en temps réel
- Enforcement automatique qualité

### Structure
- 96+ règles dans `.cursor/rules/`
- Configuration centralisée dans `.cursorrules`
- Documentation complète dans `docs/`

EOF

# Créer README.md
cat > "$EXPORT_DIR/README.md" << 'EOF'
# Configuration Cursor - Partagée

Configuration Cursor optimisée pour développement avec IA.

## 📋 Contenu

- `.cursor/` - Règles et contexte Cursor
- `.cursorrules` - Fichier principal de règles
- `scripts/` - Scripts d'installation et mise à jour
- `VERSION` - Version actuelle
- `CHANGELOG.md` - Historique des changements

## 🚀 Installation

Voir `docs/INSTALLATION.md` pour les instructions complètes.

### Installation rapide

```bash
# Dans votre projet
bash <(curl -s https://raw.githubusercontent.com/votre-org/cursor-config/main/scripts/install.sh)
```

### Installation manuelle

```bash
git clone git@github.com:votre-org/cursor-config.git .cursor-config
cp -r .cursor-config/.cursor .
cp .cursor-config/.cursorrules .
echo "3.0.0" > .cursor-version
```

## 🔄 Mise à jour

```bash
# Mise à jour automatique
bash scripts/update-cursor-config.sh

# Ou manuellement
cd .cursor-config && git pull && cd ..
cp -r .cursor-config/.cursor .
cp .cursor-config/.cursorrules .
```

## 📚 Documentation

- `docs/INSTALLATION.md` - Guide d'installation
- `docs/USAGE.md` - Guide d'utilisation
- `docs/CUSTOMIZATION.md` - Personnalisation par projet

## 🔗 Liens

- [Documentation Cursor Rules](https://docs.cursor.com/context/rules)
- [Repository](https://github.com/votre-org/cursor-config)

EOF

# Créer .gitignore
cat > "$EXPORT_DIR/.gitignore" << 'EOF'
# Fichiers temporaires
*.tmp
*.bak
*.swp
*~

# Logs
*.log

# OS
.DS_Store
Thumbs.db

# IDE
.idea/
.vscode/
*.code-workspace
EOF

# Créer scripts/install.sh
cat > "$EXPORT_DIR/scripts/install.sh" << 'INSTALL_EOF'
#!/bin/bash
# install.sh - Installe la configuration Cursor dans un projet
# Version: 3.0.0

set -euo pipefail

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

error() { echo -e "${RED}❌ $1${NC}" >&2; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$CONFIG_DIR/.." && pwd)"

VERSION=${1:-"latest"}
PROJECT_NAME=${2:-"Mon Projet"}
PROJECT_DESCRIPTION=${3:-"Description du projet"}

# Vérifier qu'on est dans un projet valide
if [ ! -f "$PROJECT_ROOT/package.json" ] && [ ! -d "$PROJECT_ROOT/.git" ]; then
    warning "Ce script devrait être exécuté depuis la racine d'un projet"
    read -p "Continuer quand même? (o/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[OoYy]$ ]]; then
        exit 1
    fi
fi

info "Installation configuration Cursor..."

# Si VERSION est "latest", utiliser la dernière version
if [ "$VERSION" = "latest" ]; then
    if [ -f "$CONFIG_DIR/VERSION" ]; then
        VERSION=$(cat "$CONFIG_DIR/VERSION")
    else
        error "Fichier VERSION non trouvé dans $CONFIG_DIR"
        exit 1
    fi
fi

info "Version: $VERSION"
info "Projet: $PROJECT_NAME"

# Vérifier que la config existe
if [ ! -d "$CONFIG_DIR/.cursor" ] && [ ! -f "$CONFIG_DIR/.cursorrules" ]; then
    error "Configuration Cursor non trouvée dans $CONFIG_DIR"
    exit 1
fi

# Backup ancienne config si existe
BACKUP_SUFFIX=$(date +%Y%m%d_%H%M%S 2>/dev/null || date +%s)

if [ -d "$PROJECT_ROOT/.cursor" ]; then
    BACKUP_DIR="$PROJECT_ROOT/.cursor.backup.$BACKUP_SUFFIX"
    info "Backup ancienne config vers $BACKUP_DIR"
    if ! mv "$PROJECT_ROOT/.cursor" "$BACKUP_DIR"; then
        error "Échec du backup de .cursor/"
        exit 1
    fi
fi

if [ -f "$PROJECT_ROOT/.cursorrules" ]; then
    BACKUP_FILE="$PROJECT_ROOT/.cursorrules.backup.$BACKUP_SUFFIX"
    info "Backup ancien .cursorrules vers $BACKUP_FILE"
    if ! cp "$PROJECT_ROOT/.cursorrules" "$BACKUP_FILE"; then
        error "Échec du backup de .cursorrules"
        exit 1
    fi
fi

# Copier configuration avec vérification
info "Copie de la configuration..."

if [ -d "$CONFIG_DIR/.cursor" ]; then
    if ! cp -r "$CONFIG_DIR/.cursor" "$PROJECT_ROOT/"; then
        error "Échec de la copie de .cursor/"
        exit 1
    fi
    success ".cursor/ installé"
fi

if [ -f "$CONFIG_DIR/.cursorrules" ]; then
    if ! cp "$CONFIG_DIR/.cursorrules" "$PROJECT_ROOT/"; then
        error "Échec de la copie de .cursorrules"
        exit 1
    fi
    success ".cursorrules installé"
fi

# Personnaliser .cursorrules si nécessaire
if [ "$PROJECT_NAME" != "Mon Projet" ]; then
    info "Personnalisation pour $PROJECT_NAME..."
    
    # Utiliser sed compatible (macOS et Linux)
    # Échapper les caractères spéciaux pour sed
    ESCAPED_PROJECT_NAME=$(printf '%s\n' "$PROJECT_NAME" | sed 's/[[\.*^$()+?{|]/\\&/g')
    ESCAPED_DESCRIPTION=$(printf '%s\n' "$PROJECT_DESCRIPTION" | sed 's/[[\.*^$()+?{|]/\\&/g')
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i.bak \
            -e "s/Saxium/${ESCAPED_PROJECT_NAME}/g" \
            -e "s/application full-stack de gestion de projets/${ESCAPED_DESCRIPTION}/g" \
            "$PROJECT_ROOT/.cursorrules"
        rm -f "$PROJECT_ROOT/.cursorrules.bak"
    else
        sed -i \
            -e "s/Saxium/${ESCAPED_PROJECT_NAME}/g" \
            -e "s/application full-stack de gestion de projets/${ESCAPED_DESCRIPTION}/g" \
            "$PROJECT_ROOT/.cursorrules"
    fi
    success ".cursorrules personnalisé"
fi

# Créer fichier version
if ! echo "$VERSION" > "$PROJECT_ROOT/.cursor-version"; then
    error "Échec de la création de .cursor-version"
    exit 1
fi
success "Version enregistrée: $VERSION"

# Créer script de mise à jour si n'existe pas
if [ ! -f "$PROJECT_ROOT/scripts/update-cursor-config.sh" ]; then
    mkdir -p "$PROJECT_ROOT/scripts"
    if [ -f "$CONFIG_DIR/scripts/update-cursor-config.sh" ]; then
        cp "$CONFIG_DIR/scripts/update-cursor-config.sh" "$PROJECT_ROOT/scripts/"
        chmod +x "$PROJECT_ROOT/scripts/update-cursor-config.sh"
        success "Script de mise à jour installé"
    else
        warning "Script de mise à jour non trouvé dans la config"
    fi
fi

echo ""
success "Configuration installée avec succès!"
echo ""
info "Prochaines étapes:"
echo "  1. Vérifier .cursorrules et adapter si nécessaire"
echo "  2. Adapter .cursor/context/ pour votre projet"
echo "  3. Commit: git add .cursor .cursorrules .cursor-version"
INSTALL_EOF

chmod +x "$EXPORT_DIR/scripts/install.sh"

# Créer scripts/update-cursor-config.sh
cat > "$EXPORT_DIR/scripts/update-cursor-config.sh" << 'UPDATE_EOF'
#!/bin/bash
# update-cursor-config.sh
# Met à jour la configuration Cursor depuis le dépôt centralisé
# Version: 3.0.0

set -euo pipefail

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

error() { echo -e "${RED}❌ $1${NC}" >&2; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Vérifier prérequis
if ! command -v git &> /dev/null; then
    error "Git n'est pas installé"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_REPO="${CURSOR_CONFIG_REPO:-git@github.com:votre-org/cursor-config.git}"
CONFIG_DIR="$PROJECT_ROOT/.cursor-config"
VERSION_FILE="$PROJECT_ROOT/.cursor-version"

# Lire version actuelle
CURRENT_VERSION=$(cat "$VERSION_FILE" 2>/dev/null || echo "0.0.0")
info "Version actuelle: $CURRENT_VERSION"

# Cloner/Mettre à jour config
if [ -d "$CONFIG_DIR" ]; then
    info "Mise à jour du dépôt..."
    cd "$CONFIG_DIR"
    
    if ! git fetch --tags origin 2>/dev/null; then
        warning "Échec du fetch, tentative de pull direct..."
        git pull origin main || {
            error "Impossible de mettre à jour le dépôt"
            cd "$PROJECT_ROOT"
            exit 1
        }
    fi
    
    LATEST_VERSION=$(git describe --tags --abbrev=0 2>/dev/null || cat VERSION 2>/dev/null || echo "unknown")
    cd "$PROJECT_ROOT"
else
    info "Clonage du dépôt..."
    if ! git clone "$CONFIG_REPO" "$CONFIG_DIR" 2>/dev/null; then
        error "Impossible de cloner le dépôt: $CONFIG_REPO"
        error "Vérifiez votre accès Git et l'URL du dépôt"
        exit 1
    fi
    cd "$CONFIG_DIR"
    LATEST_VERSION=$(git describe --tags --abbrev=0 2>/dev/null || cat VERSION 2>/dev/null || echo "unknown")
    cd "$PROJECT_ROOT"
fi

if [ "$LATEST_VERSION" = "unknown" ]; then
    error "Impossible de déterminer la version"
    exit 1
fi

info "Dernière version disponible: $LATEST_VERSION"

# Vérifier si mise à jour nécessaire
if [ "$CURRENT_VERSION" = "$LATEST_VERSION" ]; then
    success "Configuration déjà à jour ($CURRENT_VERSION)"
    exit 0
fi

echo ""
info "Mise à jour disponible: $CURRENT_VERSION → $LATEST_VERSION"

# Mode non-interactif si variable définie
if [ "${CURSOR_CONFIG_AUTO_UPDATE:-}" = "1" ]; then
    info "Mode auto-update activé, continuation automatique..."
else
    read -p "Continuer? (o/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[OoYy]$ ]]; then
        warning "Mise à jour annulée"
        exit 0
    fi
fi

# Checkout version spécifique
cd "$CONFIG_DIR"
if git rev-parse --verify "v$LATEST_VERSION" >/dev/null 2>&1; then
    git checkout "v$LATEST_VERSION"
else
    git checkout "$(git rev-parse origin/main)"
fi
cd "$PROJECT_ROOT"

# Backup ancienne config
BACKUP_SUFFIX=$(date +%Y%m%d_%H%M%S 2>/dev/null || date +%s)

if [ -d ".cursor" ]; then
    BACKUP_DIR=".cursor.backup.$BACKUP_SUFFIX"
    info "Backup vers $BACKUP_DIR"
    if ! mv .cursor "$BACKUP_DIR"; then
        error "Échec du backup de .cursor/"
        exit 1
    fi
fi

if [ -f ".cursorrules" ]; then
    BACKUP_FILE=".cursorrules.backup.$BACKUP_SUFFIX"
    info "Backup vers $BACKUP_FILE"
    if ! cp .cursorrules "$BACKUP_FILE"; then
        error "Échec du backup de .cursorrules"
        exit 1
    fi
fi

# Copier nouvelle config avec vérification
info "Installation nouvelle configuration..."

if [ -d "$CONFIG_DIR/.cursor" ]; then
    if ! cp -r "$CONFIG_DIR/.cursor" .; then
        error "Échec de la copie de .cursor/"
        exit 1
    fi
    success ".cursor/ mis à jour"
fi

if [ -f "$CONFIG_DIR/.cursorrules" ]; then
    if ! cp "$CONFIG_DIR/.cursorrules" .; then
        error "Échec de la copie de .cursorrules"
        exit 1
    fi
    success ".cursorrules mis à jour"
fi

# Mettre à jour version
if ! echo "$LATEST_VERSION" > "$VERSION_FILE"; then
    error "Échec de la mise à jour de .cursor-version"
    exit 1
fi

echo ""
success "Configuration mise à jour vers $LATEST_VERSION"
echo ""
info "Vérifiez les changements:"
echo "   diff -r $BACKUP_DIR .cursor"
echo "   diff $BACKUP_FILE .cursorrules"
echo ""
info "Pour restaurer l'ancienne version:"
echo "   mv $BACKUP_DIR .cursor"
echo "   cp $BACKUP_FILE .cursorrules"
UPDATE_EOF

chmod +x "$EXPORT_DIR/scripts/update-cursor-config.sh"

# Créer docs/INSTALLATION.md
mkdir -p "$EXPORT_DIR/docs"
cat > "$EXPORT_DIR/docs/INSTALLATION.md" << 'EOF'
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

EOF

# Créer docs/USAGE.md
cat > "$EXPORT_DIR/docs/USAGE.md" << 'EOF'
# Guide d'Utilisation - Configuration Cursor

## 📚 Structure

```
.cursor/
├── rules/          # Règles Cursor (96+ fichiers)
├── context/        # Contexte du projet
└── checkpoints/    # Checkpoints (générés)

.cursorrules        # Fichier principal de règles
.cursor-version     # Version installée
```

## 🎯 Utilisation

### Règles par Priorité

- **P0 - Critiques** : Toujours chargées
- **P1 - Importantes** : Chargées selon contexte
- **P2 - Optimisation** : Sur demande

### Référencer une règle

Dans vos messages Cursor, utilisez `@` pour référencer :

```
@.cursor/rules/core.md
@.cursor/rules/backend.md
@AGENTS.md
```

### Personnalisation

1. **Règles spécifiques** : Créer `.cursor/rules/project-specific/`
2. **Contexte** : Modifier `.cursor/context/*.md`
3. **Règles principales** : Modifier `.cursorrules`

## 🔄 Workflow

1. **Nouveau projet** : Installer configuration
2. **Personnaliser** : Adapter contexte et règles
3. **Développer** : Utiliser règles automatiquement
4. **Mettre à jour** : Exécuter `update-cursor-config.sh`

## 📝 Bonnes Pratiques

- ✅ Ne pas modifier règles partagées directement
- ✅ Créer règles spécifiques dans `project-specific/`
- ✅ Documenter personnalisations
- ✅ Mettre à jour régulièrement
EOF

# Créer docs/CUSTOMIZATION.md
cat > "$EXPORT_DIR/docs/CUSTOMIZATION.md" << 'EOF'
# Guide de Personnalisation

## 🎨 Personnalisation par Projet

### 1. Contexte du Projet

Modifier `.cursor/context/` :

- `projectbrief.md` - Objectifs et périmètre
- `techContext.md` - Stack technique
- `activeContext.md` - Focus actuel
- `systemPatterns.md` - Patterns architecturaux

### 2. Règles Spécifiques

Créer `.cursor/rules/project-specific/` :

```bash
mkdir -p .cursor/rules/project-specific
```

Exemple `project-specific/custom-rules.md` :

```markdown
# Règles Spécifiques - Mon Projet

## Règles Métier

- Utiliser API spécifique X
- Patterns de validation Y
- ...

## Règles Techniques

- Framework Z obligatoire
- ...
```

### 3. Fichier Principal

Adapter `.cursorrules` :

```markdown
# Règles Cursor - Mon Projet

## Contexte du Projet

Mon projet est une application...

## Règles Spécifiques

@.cursor/rules/project-specific/custom-rules.md
```

## 🔄 Synchronisation

### Garder personnalisations lors de mise à jour

1. **Backup personnalisations** :
```bash
cp -r .cursor/rules/project-specific .cursor-personal-backup/
cp .cursorrules .cursorrules.personal
```

2. **Mettre à jour** :
```bash
bash scripts/update-cursor-config.sh
```

3. **Restaurer personnalisations** :
```bash
cp -r .cursor-personal-backup/project-specific .cursor/rules/
# Fusionner .cursorrules manuellement
```

## 📋 Checklist Personnalisation

- [ ] Adapter `projectbrief.md`
- [ ] Adapter `techContext.md`
- [ ] Créer règles spécifiques
- [ ] Documenter personnalisations
- [ ] Tester avec Cursor
EOF

# Optimisation automatique
if [ -f "$SCRIPT_DIR/optimize-cursor-config.sh" ]; then
    info "Optimisation automatique..."
    if bash "$SCRIPT_DIR/optimize-cursor-config.sh" "$EXPORT_DIR" >/dev/null 2>&1; then
        success "Optimisation réussie"
    else
        warning "Optimisation a rencontré des problèmes (non bloquant)"
    fi
fi

# Validation automatique
if command -v bash &> /dev/null; then
    info "Validation automatique..."
    if [ -f "$SCRIPT_DIR/validate-cursor-config.sh" ]; then
        if bash "$SCRIPT_DIR/validate-cursor-config.sh" "$EXPORT_DIR" >/dev/null 2>&1; then
            success "Validation réussie"
        else
            warning "Validation a détecté des problèmes"
            info "Exécutez manuellement: bash scripts/validate-cursor-config.sh"
        fi
    fi
fi

echo ""
success "Export terminé!"
echo ""
info "📁 Configuration exportée dans: $EXPORT_DIR"

# Statistiques finales (optimisé)
EXPORT_SIZE=$(du -sh "$EXPORT_DIR" 2>/dev/null | cut -f1 || echo "inconnue")
FILE_COUNT=$(find "$EXPORT_DIR" -type f 2>/dev/null | wc -l | awk '{print $1}' || echo "0")
DIR_COUNT=$(find "$EXPORT_DIR" -type d 2>/dev/null | wc -l | awk '{print $1}' || echo "0")
info "Taille: $EXPORT_SIZE | Fichiers: $FILE_COUNT | Dossiers: $DIR_COUNT"
echo ""

# Vérifier contenu essentiel
MISSING_FILES=0
ESSENTIAL_FILES=(
    ".cursorrules"
    "VERSION"
    "CHANGELOG.md"
    "README.md"
    "scripts/install.sh"
    "scripts/update-cursor-config.sh"
)

for file in "${ESSENTIAL_FILES[@]}"; do
    if [ ! -f "$EXPORT_DIR/$file" ] && [ ! -d "$EXPORT_DIR/$file" ]; then
        warning "Fichier manquant: $file"
        MISSING_FILES=1
    fi
done

if [ $MISSING_FILES -eq 1 ]; then
    warning "Certains fichiers essentiels semblent manquer. Vérifiez l'export."
    warning "L'export peut être incomplet."
else
    success "Tous les fichiers essentiels sont présents"
fi

echo ""
info "📝 Prochaines étapes:"
echo "  1. Vérifier le contenu: ls -la $EXPORT_DIR"
echo "  2. Initialiser dépôt Git:"
echo "     cd $EXPORT_DIR"
echo "     git init"
echo "     git add ."
echo "     git commit -m 'v$VERSION - Configuration Cursor optimisée'"
echo "     git tag v$VERSION"
echo "     git remote add origin git@github.com:votre-org/cursor-config.git"
echo "     git push -u origin main --tags"
echo ""
echo "  3. Dans chaque projet, installer:"
echo "     git clone git@github.com:votre-org/cursor-config.git .cursor-config"
echo "     cd .cursor-config && bash scripts/install.sh"
echo ""
echo "  4. Configurer synchronisation automatique bidirectionnelle:"
echo "     bash scripts/setup-auto-sync.sh"
echo "     (sync auto: projet → dépôt ET dépôt → projets)"
echo ""
success "Prêt pour le partage!"

