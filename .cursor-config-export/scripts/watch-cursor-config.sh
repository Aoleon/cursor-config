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
