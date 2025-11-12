#!/bin/bash
# setup-git-hooks.sh
# Configure les hooks Git pour synchronisation automatique
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
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GIT_HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

if [ ! -d "$PROJECT_ROOT/.git" ]; then
    error "Ce n'est pas un dépôt Git"
    exit 1
fi

info "Configuration des hooks Git pour Cursor..."

# Créer post-merge hook (sync depuis dépôt)
cat > "$GIT_HOOKS_DIR/post-merge" << 'HOOK_EOF'
#!/bin/bash
# Hook Git: Mise à jour automatique config Cursor après merge

set -e

# Vérifier si .cursor-version a changé OU si config manquante
CONFIG_CHANGED=false
if git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD 2>/dev/null | grep -q ".cursor-version"; then
    CONFIG_CHANGED=true
fi

# Vérifier aussi si .cursor ou .cursorrules manquent après merge
if [ ! -d ".cursor" ] || [ ! -f ".cursorrules" ]; then
    if [ -f ".cursor-version" ]; then
        CONFIG_CHANGED=true
    fi
fi

if [ "$CONFIG_CHANGED" = "true" ]; then
    echo "🔄 Mise à jour configuration Cursor détectée..."

    if [ -f "scripts/update-cursor-config.sh" ]; then
        # Mode silencieux pour hook
        CURSOR_CONFIG_AUTO_UPDATE=1 bash scripts/update-cursor-config.sh >/dev/null 2>&1 || true
    else
        echo "⚠️  Script update-cursor-config.sh non trouvé"
    fi
fi
HOOK_EOF

chmod +x "$GIT_HOOKS_DIR/post-merge"
success "Hook post-merge configuré"

# Créer post-checkout hook (pour branches/tags)
cat > "$GIT_HOOKS_DIR/post-checkout" << 'HOOK_EOF'
#!/bin/bash
# Hook Git: Vérification config Cursor après checkout

set -e

# Vérifier si .cursor-version existe et est à jour
if [ -f ".cursor-version" ]; then
    CURRENT_VERSION=$(cat .cursor-version 2>/dev/null || echo "unknown")

    # Vérifier si config existe
    if [ ! -d ".cursor" ] || [ ! -f ".cursorrules" ]; then
        echo "⚠️  Configuration Cursor manquante (version: $CURRENT_VERSION)"
        echo "   Exécutez: bash scripts/update-cursor-config.sh"
    fi
fi
HOOK_EOF

chmod +x "$GIT_HOOKS_DIR/post-checkout"
success "Hook post-checkout configuré"

echo ""
success "Hooks Git configurés:"
info "  - post-merge: Mise à jour auto après merge"
info "  - post-checkout: Vérification après checkout"
echo ""
info "Les hooks seront exécutés automatiquement lors des opérations Git"

