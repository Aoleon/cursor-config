#!/bin/bash
# optimize-cursor-config.sh
# Optimise la configuration Cursor exportée
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

EXPORT_DIR="${1:-.cursor-config-export}"

if [ ! -d "$EXPORT_DIR" ]; then
    error "Répertoire d'export introuvable: $EXPORT_DIR"
    exit 1
fi

info "Optimisation de la configuration Cursor..."

# 1. Nettoyer fichiers temporaires (optimisé: single pass)
TEMP_PATTERNS=("*.tmp" "*.bak" "*.swp" "*~" ".DS_Store" "Thumbs.db")
TEMP_COUNT=0

for pattern in "${TEMP_PATTERNS[@]}"; do
    COUNT=$(find "$EXPORT_DIR" -name "$pattern" -type f 2>/dev/null | wc -l | awk '{print $1}')
    if [ "$COUNT" -gt 0 ]; then
        find "$EXPORT_DIR" -name "$pattern" -type f -print0 2>/dev/null | xargs -0 rm -f 2>/dev/null || true
        TEMP_COUNT=$((TEMP_COUNT + COUNT))
    fi
done

if [ "$TEMP_COUNT" -gt 0 ]; then
    success "$TEMP_COUNT fichiers temporaires supprimés"
fi

# 2. Optimiser scripts (supprimer trailing whitespace)
SCRIPT_COUNT=0
while IFS= read -r -d '' script; do
    if [ -f "$script" ] && [ -x "$script" ]; then
        # Supprimer trailing whitespace (compatible macOS/Linux)
        if command -v sed &> /dev/null; then
            sed -i.bak 's/[[:space:]]*$//' "$script" 2>/dev/null || sed -i '' 's/[[:space:]]*$//' "$script" 2>/dev/null || true
            rm -f "${script}.bak" 2>/dev/null || true
        fi
        SCRIPT_COUNT=$((SCRIPT_COUNT + 1))
    fi
done < <(find "$EXPORT_DIR/scripts" -type f -name "*.sh" -print0 2>/dev/null || true)

if [ "$SCRIPT_COUNT" -gt 0 ]; then
    success "$SCRIPT_COUNT scripts optimisés"
fi

# 3. Optimiser documentation (supprimer lignes vides multiples)
DOC_COUNT=0
while IFS= read -r -d '' doc; do
    if [ -f "$doc" ]; then
        # Supprimer lignes vides multiples (compatible macOS/Linux)
        if command -v sed &> /dev/null; then
            sed -i.bak '/^$/N;/^\n$/d' "$doc" 2>/dev/null || sed -i '' '/^$/N;/^\n$/d' "$doc" 2>/dev/null || true
            rm -f "${doc}.bak" 2>/dev/null || true
        fi
        DOC_COUNT=$((DOC_COUNT + 1))
    fi
done < <(find "$EXPORT_DIR/docs" -type f -name "*.md" -print0 2>/dev/null || true)

if [ "$DOC_COUNT" -gt 0 ]; then
    success "$DOC_COUNT fichiers de documentation optimisés"
fi

# 4. Statistiques finales (optimisé avec awk)
TOTAL_SIZE=$(du -sh "$EXPORT_DIR" 2>/dev/null | cut -f1 || echo "inconnue")
FILE_COUNT=$(find "$EXPORT_DIR" -type f 2>/dev/null | wc -l | awk '{print $1}' || echo "0")
DIR_COUNT=$(find "$EXPORT_DIR" -type d 2>/dev/null | wc -l | awk '{print $1}' || echo "0")

info "Statistiques: Taille=$TOTAL_SIZE | Fichiers=$FILE_COUNT | Dossiers=$DIR_COUNT"

# 5. Validation automatique si disponible
if [ -f "$(dirname "$0")/validate-cursor-config.sh" ]; then
    info "Validation automatique..."
    if bash "$(dirname "$0")/validate-cursor-config.sh" "$EXPORT_DIR" >/dev/null 2>&1; then
        success "Validation réussie"
    else
        warning "Validation a détecté des problèmes (non bloquant)"
    fi
fi

success "Optimisation terminée"

