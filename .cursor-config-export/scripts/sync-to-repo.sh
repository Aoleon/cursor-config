#!/bin/bash
# sync-to-repo.sh
# Synchronise automatiquement les changements de configuration Cursor vers le dépôt centralisé
# Version: 3.0.0
#
# Usage:
#   bash scripts/sync-to-repo.sh
#   CURSOR_CONFIG_AUTO_SYNC=1 bash scripts/sync-to-repo.sh  # Mode non-interactif

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
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_REPO="${CURSOR_CONFIG_REPO:-git@github.com:votre-org/cursor-config.git}"
REPO_DIR="${CURSOR_CONFIG_REPO_DIR:-$PROJECT_ROOT/.cursor-config-repo}"

# Vérifier prérequis
if ! command -v git &> /dev/null; then
    error "Git n'est pas installé"
    exit 1
fi

# Vérifier que .cursor ou .cursorrules existe
if [ ! -d "$PROJECT_ROOT/.cursor" ] && [ ! -f "$PROJECT_ROOT/.cursorrules" ]; then
    error "Aucune configuration Cursor trouvée dans ce projet"
    exit 1
fi

info "🔄 Synchronisation configuration Cursor vers dépôt centralisé"
info "Dépôt: $CONFIG_REPO"
echo ""

# Cloner/Mettre à jour dépôt si nécessaire
if [ ! -d "$REPO_DIR" ]; then
    info "Clonage du dépôt..."
    if ! git clone "$CONFIG_REPO" "$REPO_DIR" 2>/dev/null; then
        error "Impossible de cloner le dépôt: $CONFIG_REPO"
        error "Vérifiez votre accès Git et l'URL du dépôt"
        exit 1
    fi
else
    info "Mise à jour du dépôt..."
    cd "$REPO_DIR"
    if ! git pull origin main 2>/dev/null; then
        warning "Échec du pull, tentative de fetch..."
        git fetch origin main 2>/dev/null || true
    fi
    cd "$PROJECT_ROOT"
fi

# Exporter configuration actuelle
info "Export de la configuration actuelle..."
TEMP_EXPORT="$PROJECT_ROOT/.cursor-sync-temp"
rm -rf "$TEMP_EXPORT" 2>/dev/null || true

# Utiliser export-cursor-config.sh si disponible
if [ -f "$SCRIPT_DIR/export-cursor-config.sh" ]; then
    bash "$SCRIPT_DIR/export-cursor-config.sh" >/dev/null 2>&1 || {
        error "Échec de l'export"
        exit 1
    }
    EXPORT_SOURCE="$PROJECT_ROOT/.cursor-config-export"
else
    # Export manuel
    mkdir -p "$TEMP_EXPORT"
    if [ -d "$PROJECT_ROOT/.cursor" ]; then
        cp -r "$PROJECT_ROOT/.cursor" "$TEMP_EXPORT/"
    fi
    if [ -f "$PROJECT_ROOT/.cursorrules" ]; then
        cp "$PROJECT_ROOT/.cursorrules" "$TEMP_EXPORT/"
    fi
    EXPORT_SOURCE="$TEMP_EXPORT"
fi

# Copier vers dépôt
info "Copie vers dépôt..."
cd "$REPO_DIR"

# Backup avant modification
BACKUP_SUFFIX=$(date +%Y%m%d_%H%M%S)
if [ -d ".cursor" ]; then
    cp -r .cursor ".cursor.backup.$BACKUP_SUFFIX" 2>/dev/null || true
fi
if [ -f ".cursorrules" ]; then
    cp .cursorrules ".cursorrules.backup.$BACKUP_SUFFIX" 2>/dev/null || true
fi

# Copier nouvelle configuration
if [ -d "$EXPORT_SOURCE/.cursor" ]; then
    rm -rf .cursor
    cp -r "$EXPORT_SOURCE/.cursor" .
fi
if [ -f "$EXPORT_SOURCE/.cursorrules" ]; then
    cp "$EXPORT_SOURCE/.cursorrules" .
fi

# Mettre à jour VERSION et CHANGELOG si nécessaire
if [ -f "$EXPORT_SOURCE/VERSION" ]; then
    NEW_VERSION=$(cat "$EXPORT_SOURCE/VERSION")
    CURRENT_VERSION=$(cat VERSION 2>/dev/null || echo "0.0.0")

    if [ "$NEW_VERSION" != "$CURRENT_VERSION" ]; then
        echo "$NEW_VERSION" > VERSION
        info "Version mise à jour: $CURRENT_VERSION → $NEW_VERSION"

        # Mettre à jour CHANGELOG.md si disponible
        if [ -f "$EXPORT_SOURCE/CHANGELOG.md" ]; then
            cp "$EXPORT_SOURCE/CHANGELOG.md" CHANGELOG.md 2>/dev/null || true
        fi
    fi
fi

# Vérifier changements
if git diff --quiet .cursor .cursorrules VERSION 2>/dev/null; then
    info "Aucun changement détecté"
    cd "$PROJECT_ROOT"
    rm -rf "$TEMP_EXPORT" 2>/dev/null || true
    exit 0
fi

# Commit et push
info "Changements détectés, commit et push..."

# Mode non-interactif si variable définie
if [ "${CURSOR_CONFIG_AUTO_SYNC:-}" = "1" ]; then
    COMMIT_MSG="Auto-sync: Configuration Cursor mise à jour"
else
    read -p "Message de commit (ou Enter pour message par défaut): " COMMIT_MSG
    COMMIT_MSG="${COMMIT_MSG:-Auto-sync: Configuration Cursor mise à jour}"
fi

git add .cursor .cursorrules VERSION CHANGELOG.md 2>/dev/null || true

# Vérifier si nouveau tag nécessaire
if [ -f "VERSION" ]; then
    VERSION=$(cat VERSION)
    if ! git rev-parse "v$VERSION" >/dev/null 2>&1; then
        info "Création tag v$VERSION..."
        git tag "v$VERSION" 2>/dev/null || true
        TAG_CMD="--tags"
    else
        TAG_CMD=""
    fi
fi

if git commit -m "$COMMIT_MSG" 2>/dev/null; then
    success "Commit créé"

    if git push origin main $TAG_CMD 2>/dev/null; then
        success "Push vers dépôt réussi"
        if [ -n "$TAG_CMD" ]; then
            success "Tag v$VERSION créé et poussé"
        fi
    else
        error "Échec du push vers dépôt"
        warning "Commande manuelle: cd $REPO_DIR && git push origin main $TAG_CMD"
        cd "$PROJECT_ROOT"
        exit 1
    fi
else
    warning "Aucun changement à commiter (peut être normal)"
fi

cd "$PROJECT_ROOT"
rm -rf "$TEMP_EXPORT" 2>/dev/null || true

echo ""
success "✅ Synchronisation terminée!"

