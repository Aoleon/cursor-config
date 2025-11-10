#!/bin/bash
# Script pour appliquer le schéma Drizzle automatiquement
# Répond automatiquement aux prompts interactifs

cd "$(dirname "$0")/.."

# Exécuter drizzle-kit push et répondre automatiquement aux prompts
# Pour l'enum audit_result, on sélectionne la première option (créer enum)
echo "" | npm run db:push


