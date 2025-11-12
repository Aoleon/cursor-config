#!/bin/bash
# validate-cursor-config.sh
# Valide l'intégrité et la structure de la configuration Cursor exportée
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
ERRORS=0
WARNINGS=0

validate() {
    local type="$1"
    local target="$2"
    local check="$3"
    
    if [ "$type" = "file" ]; then
        if [ ! -f "$target" ]; then
            error "Fichier manquant: $target"
            ERRORS=$((ERRORS + 1))
            return 1
        fi
    elif [ "$type" = "dir" ]; then
        if [ ! -d "$target" ]; then
            error "Dossier manquant: $target"
            ERRORS=$((ERRORS + 1))
            return 1
        fi
    elif [ "$type" = "executable" ]; then
        if [ ! -x "$target" ]; then
            warning "Script non exécutable: $target"
            WARNINGS=$((WARNINGS + 1))
            return 1
        fi
    elif [ "$type" = "shebang" ]; then
        if [ -f "$target" ]; then
            if ! head -1 "$target" 2>/dev/null | grep -q "^#!"; then
                warning "Script sans shebang: $target"
                WARNINGS=$((WARNINGS + 1))
                return 1
            fi
        fi
    elif [ "$type" = "content" ]; then
        if [ -f "$target" ]; then
            if ! grep -q "$check" "$target" 2>/dev/null; then
                error "Contenu invalide dans $target: '$check' non trouvé"
                ERRORS=$((ERRORS + 1))
                return 1
            fi
        fi
    fi
    return 0
}

if [ ! -d "$EXPORT_DIR" ]; then
    error "Répertoire d'export introuvable: $EXPORT_DIR"
    exit 1
fi

info "Validation de la configuration Cursor..."

# 1. Structure de base
info "Vérification structure de base..."
validate "dir" "$EXPORT_DIR/.cursor" || true
validate "dir" "$EXPORT_DIR/scripts" || true
validate "dir" "$EXPORT_DIR/docs" || true

# 2. Fichiers essentiels
info "Vérification fichiers essentiels..."
ESSENTIAL_FILES=(
    "$EXPORT_DIR/.cursorrules"
    "$EXPORT_DIR/VERSION"
    "$EXPORT_DIR/CHANGELOG.md"
    "$EXPORT_DIR/README.md"
    "$EXPORT_DIR/scripts/install.sh"
    "$EXPORT_DIR/scripts/update-cursor-config.sh"
)

for file in "${ESSENTIAL_FILES[@]}"; do
    validate "file" "$file" || true
done

# 3. Scripts exécutables
info "Vérification scripts exécutables..."
while IFS= read -r -d '' script; do
    validate "executable" "$script" || true
    validate "shebang" "$script" || true
done < <(find "$EXPORT_DIR/scripts" -type f -name "*.sh" -print0 2>/dev/null || true)

# 4. Validation contenu VERSION
if [ -f "$EXPORT_DIR/VERSION" ]; then
    info "Vérification format VERSION..."
    VERSION_CONTENT=$(cat "$EXPORT_DIR/VERSION" 2>/dev/null || echo "")
    if ! echo "$VERSION_CONTENT" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
        warning "Format VERSION invalide: $VERSION_CONTENT (attendu: X.Y.Z)"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# 5. Validation structure .cursor
if [ -d "$EXPORT_DIR/.cursor" ]; then
    info "Vérification structure .cursor..."
    validate "dir" "$EXPORT_DIR/.cursor/rules" || true
    
    RULES_COUNT=$(find "$EXPORT_DIR/.cursor/rules" -name "*.md" -type f 2>/dev/null | wc -l | awk '{print $1}' || echo "0")
    if [ "$RULES_COUNT" -eq 0 ]; then
        warning "Aucune règle trouvée dans .cursor/rules/"
        WARNINGS=$((WARNINGS + 1))
    else
        success "$RULES_COUNT règles trouvées"
    fi
fi

# 6. Résumé
echo ""
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    success "Validation complète: Aucune erreur, aucun avertissement"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    warning "Validation complète: Aucune erreur, $WARNINGS avertissement(s)"
    exit 0
else
    error "Validation échouée: $ERRORS erreur(s), $WARNINGS avertissement(s)"
    exit 1
fi

