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
