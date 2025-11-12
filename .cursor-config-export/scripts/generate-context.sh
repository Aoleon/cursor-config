#!/bin/bash
# generate-context.sh
# Génère automatiquement le contexte du projet pour Cursor
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
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CURSOR_DIR="$PROJECT_ROOT/.cursor"
CONTEXT_DIR="$CURSOR_DIR/context"

# Vérifier que Cursor est disponible
if ! command -v cursor &> /dev/null && [ -z "${CURSOR_API_KEY:-}" ]; then
    warning "Cursor CLI non trouvé et CURSOR_API_KEY non défini"
    warning "Génération manuelle du contexte"
    return 0
fi

info "Génération automatique du contexte projet..."

# Créer structure si nécessaire
mkdir -p "$CONTEXT_DIR"

# Fonction pour générer un fichier de contexte
generate_context_file() {
    local file_name="$1"
    local title="$2"
    local prompt="$3"
    local template="$4"
    
    local file_path="$CONTEXT_DIR/$file_name"
    
    # Si le fichier existe déjà et n'est pas vide, ne pas le regénérer
    if [ -f "$file_path" ] && [ -s "$file_path" ]; then
        info "  $file_name existe déjà, ignoré"
        return 0
    fi
    
    info "  Génération $file_name..."
    
    # Créer le fichier avec le template
    cat > "$file_path" << EOF
# $title

$template

EOF

    # Si Cursor CLI est disponible, essayer de compléter automatiquement
    if command -v cursor &> /dev/null; then
        info "    Demande à l'agent Cursor de compléter..."
        # Note: Cette partie nécessiterait une intégration avec l'API Cursor
        # Pour l'instant, on crée le template et l'utilisateur peut le compléter
    fi
    
    success "  $file_name créé"
}

# Détecter le type de projet
detect_project_type() {
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        if grep -q "react" "$PROJECT_ROOT/package.json" 2>/dev/null; then
            echo "react"
        elif grep -q "vue" "$PROJECT_ROOT/package.json" 2>/dev/null; then
            echo "vue"
        elif grep -q "angular" "$PROJECT_ROOT/package.json" 2>/dev/null; then
            echo "angular"
        else
            echo "node"
        fi
    elif [ -f "$PROJECT_ROOT/Pipfile" ] || [ -f "$PROJECT_ROOT/requirements.txt" ]; then
        echo "python"
    elif [ -f "$PROJECT_ROOT/Cargo.toml" ]; then
        echo "rust"
    elif [ -f "$PROJECT_ROOT/go.mod" ]; then
        echo "go"
    else
        echo "unknown"
    fi
}

# Lire informations du projet
PROJECT_NAME="${1:-$(basename "$PROJECT_ROOT")}"
PROJECT_DESCRIPTION="${2:-Application}"
PROJECT_TYPE=$(detect_project_type)

info "Projet: $PROJECT_NAME"
info "Type: $PROJECT_TYPE"

# Générer projectbrief.md
generate_context_file "projectbrief.md" "Brief Projet" \
    "## Objectifs et Périmètre

**Nom du projet:** $PROJECT_NAME
**Description:** $PROJECT_DESCRIPTION
**Type:** $PROJECT_TYPE

### Objectifs Principaux
- [À compléter]

### Périmètre
- [À compléter]

### Contraintes
- [À compléter]" \
    "## Objectifs et Périmètre

**Nom du projet:** $PROJECT_NAME
**Description:** $PROJECT_DESCRIPTION
**Type:** $PROJECT_TYPE

### Objectifs Principaux
- [À compléter]

### Périmètre
- [À compléter]

### Contraintes
- [À compléter]"

# Générer techContext.md
generate_context_file "techContext.md" "Contexte Technique" \
    "## Stack Technique

**Type de projet:** $PROJECT_TYPE

### Technologies
- [À compléter]

### Dépendances principales
- [À compléter]

### Architecture
- [À compléter]" \
    "## Stack Technique

**Type de projet:** $PROJECT_TYPE

### Technologies
- [À compléter selon le projet]

### Dépendances principales
- [À compléter]

### Architecture
- [À compléter]"

# Générer activeContext.md
generate_context_file "activeContext.md" "Contexte Actif" \
    "## Focus Actuel

**Date:** $(date +%Y-%m-%d)

### Priorités
- [À compléter]

### Prochaines étapes
- [À compléter]

### Blocages
- [À compléter]" \
    "## Focus Actuel

**Date:** $(date +%Y-%m-%d)

### Priorités
- [À compléter]

### Prochaines étapes
- [À compléter]

### Blocages
- [À compléter]"

# Générer systemPatterns.md
generate_context_file "systemPatterns.md" "Patterns Architecturaux" \
    "## Patterns du Système

### Architecture
- [À compléter]

### Patterns de code
- [À compléter]

### Conventions
- [À compléter]" \
    "## Patterns du Système

### Architecture
- [À compléter selon l'architecture du projet]

### Patterns de code
- [À compléter]

### Conventions
- [À compléter]"

# Générer productContext.md
generate_context_file "productContext.md" "Contexte Produit" \
    "## Expérience Utilisateur

### Personas
- [À compléter]

### Cas d'usage principaux
- [À compléter]

### Métriques de succès
- [À compléter]" \
    "## Expérience Utilisateur

### Personas
- [À compléter]

### Cas d'usage principaux
- [À compléter]

### Métriques de succès
- [À compléter]"

# Générer progress.md
generate_context_file "progress.md" "Progrès" \
    "## État du Projet

**Dernière mise à jour:** $(date +%Y-%m-%d)

### Réalisations récentes
- [À compléter]

### En cours
- [À compléter]

### À venir
- [À compléter]" \
    "## État du Projet

**Dernière mise à jour:** $(date +%Y-%m-%d)

### Réalisations récentes
- [À compléter]

### En cours
- [À compléter]

### À venir
- [À compléter]"

echo ""
success "✅ Contexte projet généré dans $CONTEXT_DIR"
info "📝 Vous pouvez maintenant compléter les fichiers ou demander à l'agent Cursor de les compléter"
info "💡 Dans Cursor, vous pouvez utiliser: @.cursor/context/projectbrief.md pour référencer le contexte"

