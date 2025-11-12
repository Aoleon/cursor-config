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
