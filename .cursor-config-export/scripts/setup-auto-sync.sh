#!/bin/bash
# setup-auto-sync.sh
# Configure la synchronisation automatique bidirectionnelle
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

info "Configuration synchronisation automatique bidirectionnelle"
echo ""

# 1. Créer pre-commit hook pour sync vers dépôt
info "Configuration pre-commit hook (sync vers dépôt)..."
cat > "$GIT_HOOKS_DIR/pre-commit" << 'PRE_COMMIT_EOF'
#!/bin/bash
# Hook Git: Synchronisation config Cursor vers dépôt avant commit

set -e

# Vérifier si .cursor ou .cursorrules sont modifiés
if git diff --cached --name-only | grep -qE "\.(cursor|cursorrules)$|^\.cursor/"; then
    echo "🔄 Changements configuration Cursor détectés..."

    if [ -f "scripts/sync-to-repo.sh" ]; then
        # Mode silencieux pour hook
        CURSOR_CONFIG_AUTO_SYNC=1 bash scripts/sync-to-repo.sh >/dev/null 2>&1 || {
            echo "⚠️  Échec synchronisation vers dépôt (non bloquant)"
        }
    else
        echo "⚠️  Script sync-to-repo.sh non trouvé"
    fi
fi
PRE_COMMIT_EOF

chmod +x "$GIT_HOOKS_DIR/pre-commit"
success "Hook pre-commit configuré (sync vers dépôt)"

# 2. Améliorer post-merge pour sync depuis dépôt
info "Vérification post-merge hook (sync depuis dépôt)..."
if [ -f "$GIT_HOOKS_DIR/post-merge" ]; then
    if ! grep -q "update-cursor-config.sh" "$GIT_HOOKS_DIR/post-merge"; then
        warning "post-merge hook existe mais ne contient pas update-cursor-config.sh"
        info "Exécutez: bash scripts/setup-git-hooks.sh"
    else
        success "Hook post-merge déjà configuré"
    fi
else
    warning "post-merge hook non trouvé"
    info "Exécutez: bash scripts/setup-git-hooks.sh"
fi

# 3. Créer hook post-commit pour notification
info "Configuration post-commit hook (notification)..."
cat > "$GIT_HOOKS_DIR/post-commit" << 'POST_COMMIT_EOF'
#!/bin/bash
# Hook Git: Notification après commit config Cursor

set -e

# Vérifier si .cursor ou .cursorrules étaient dans le commit
if git diff-tree --no-commit-id --name-only -r HEAD | grep -qE "\.(cursor|cursorrules)$|^\.cursor/"; then
    echo "ℹ️  Configuration Cursor modifiée dans ce commit"
    echo "   Pour synchroniser vers dépôt: bash scripts/sync-to-repo.sh"
fi
POST_COMMIT_EOF

chmod +x "$GIT_HOOKS_DIR/post-commit"
success "Hook post-commit configuré (notification)"

# 4. Créer script de watch (optionnel, pour développement)
info "Création script watch (optionnel)..."
cat > "$SCRIPT_DIR/watch-cursor-config.sh" << 'WATCH_EOF'
#!/bin/bash
# watch-cursor-config.sh
# Surveille les changements .cursor/.cursorrules et sync automatiquement
# Version: 3.0.0

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if ! command -v fswatch &> /dev/null; then
    echo "⚠️  fswatch non installé (optionnel)"
    echo "   Installation: brew install fswatch (macOS)"
    exit 0
fi

echo "👀 Surveillance .cursor/ et .cursorrules..."
echo "   Appuyez sur Ctrl+C pour arrêter"
echo ""

fswatch -o "$PROJECT_ROOT/.cursor" "$PROJECT_ROOT/.cursorrules" | while read; do
    echo "🔄 Changement détecté, synchronisation..."
    CURSOR_CONFIG_AUTO_SYNC=1 bash "$SCRIPT_DIR/sync-to-repo.sh" || true
done
WATCH_EOF

chmod +x "$SCRIPT_DIR/watch-cursor-config.sh"
success "Script watch-cursor-config.sh créé (optionnel)"

echo ""
success "✅ Synchronisation automatique configurée!"
echo ""
info "Hooks configurés:"
info "  - pre-commit: Sync vers dépôt avant commit"
info "  - post-merge: Sync depuis dépôt après merge"
info "  - post-commit: Notification changements"
echo ""
info "Utilisation:"
info "  1. Modifications .cursor/.cursorrules → commit → sync auto vers dépôt"
info "  2. git pull → sync auto depuis dépôt"
info "  3. Watch mode: bash scripts/watch-cursor-config.sh (optionnel)"

