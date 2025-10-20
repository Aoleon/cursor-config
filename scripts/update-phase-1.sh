#!/bin/bash

# Script de mise à jour des dépendances - Phase 1 (RISQUE FAIBLE)
# Saxium - Mise à jour Radix UI + Utilities
# Temps estimé: 3-5 minutes

set -e  # Arrêter si erreur

echo "======================================"
echo "PHASE 1 : Mise à jour UI & Utilities"
echo "======================================"
echo ""
echo "Packages à mettre à jour:"
echo "  - 27 composants Radix UI"
echo "  - 10 utilities (lucide-react, sharp, etc.)"
echo ""
echo "Risque: FAIBLE - Pas de breaking changes"
echo ""

# Confirmation
read -p "Continuer? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Annulé."
    exit 1
fi

echo ""
echo "📦 Installation des mises à jour Radix UI..."
echo ""

npm install \
  @radix-ui/react-accordion@1.2.12 \
  @radix-ui/react-alert-dialog@1.1.15 \
  @radix-ui/react-aspect-ratio@1.1.7 \
  @radix-ui/react-avatar@1.1.10 \
  @radix-ui/react-checkbox@1.3.3 \
  @radix-ui/react-collapsible@1.1.12 \
  @radix-ui/react-context-menu@2.2.16 \
  @radix-ui/react-dialog@1.1.15 \
  @radix-ui/react-dropdown-menu@2.1.16 \
  @radix-ui/react-hover-card@1.1.15 \
  @radix-ui/react-label@2.1.7 \
  @radix-ui/react-menubar@1.1.16 \
  @radix-ui/react-navigation-menu@1.2.14 \
  @radix-ui/react-popover@1.1.15 \
  @radix-ui/react-progress@1.1.7 \
  @radix-ui/react-radio-group@1.3.8 \
  @radix-ui/react-scroll-area@1.2.10 \
  @radix-ui/react-select@2.2.6 \
  @radix-ui/react-separator@1.1.7 \
  @radix-ui/react-slider@1.3.6 \
  @radix-ui/react-slot@1.2.3 \
  @radix-ui/react-switch@1.2.6 \
  @radix-ui/react-tabs@1.1.13 \
  @radix-ui/react-toast@1.2.15 \
  @radix-ui/react-toggle@1.1.10 \
  @radix-ui/react-toggle-group@1.1.11 \
  @radix-ui/react-tooltip@1.2.8

echo ""
echo "✅ Radix UI mis à jour!"
echo ""
echo "📦 Installation des utilities..."
echo ""

npm install \
  lucide-react@0.546.0 \
  autoprefixer@10.4.21 \
  bufferutil@4.0.9 \
  sharp@0.34.4 \
  @testing-library/jest-dom@6.9.1 \
  esbuild@0.25.11 \
  postcss@8.5.6 \
  tsx@4.20.6 \
  @types/express-session@1.18.2 \
  @types/ws@8.18.1

echo ""
echo "✅ Utilities mis à jour!"
echo ""
echo "======================================"
echo "✅ PHASE 1 TERMINÉE"
echo "======================================"
echo ""
echo "Prochaines étapes:"
echo "1. Vérifier compilation: npm run check"
echo "2. Tester l'application: npm run dev"
echo "3. Vérifier visuellement:"
echo "   - /projects (liste, pagination)"
echo "   - /offers (affichage)"
echo "   - /dashboard (KPIs, graphiques)"
echo "   - Tester un formulaire"
echo ""
echo "Si tout fonctionne, vous pouvez passer à la Phase 2."
echo "Voir DEPENDENCY_UPDATE_GUIDE.md pour les détails."
echo ""
