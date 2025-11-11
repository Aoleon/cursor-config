#!/bin/bash
# Script pour corriger automatiquement toutes les erreurs de syntaxe logger

echo "🔧 Correction automatique des erreurs de syntaxe logger..."

# Pattern 1: logger.info/warn/error/debug avec metadata mal fermé
find server -name "*.ts" -type f -exec sed -i '' 's/} } );/}\n      });/g' {} \;

# Pattern 2: res.json avec objet mal fermé
find server -name "*.ts" -type f -exec sed -i '' 's/});$/}\n      });/g' {} \;

# Pattern 3: asyncHandler avec fermeture mal formée
find server -name "*.ts" -type f -exec sed -i '' 's/})$/}\n    })\n  );/g' {} \;

echo "✅ Corrections appliquées"

