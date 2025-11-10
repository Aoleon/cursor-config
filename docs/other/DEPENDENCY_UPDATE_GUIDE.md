# Guide de Mise à Jour des Dépendances - Saxium

**Status:** Le packager_tool Replit Agent rencontre des limitations techniques. Ce guide fournit les commandes pour mettre à jour manuellement les packages.

---

## 🚀 Installation Manuelle

### Méthode 1 : Via le Shell Replit

Exécutez les commandes suivantes dans le Shell Replit pour chaque phase :

---

### **Phase 1 : UI Components & Utilities (RISQUE FAIBLE)**

**Temps estimé:** 3-5 minutes  
**Impact:** Améliorations UI, bug fixes, pas de breaking changes

#### Radix UI Components (31 packages)

```bash
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
```

#### Utilities & Icons

```bash
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
```

**Tests Phase 1 :**
```bash
# Vérifier la compilation TypeScript
npm run check

# Tester l'application
npm run dev
# Ouvrir l'app et vérifier visuellement :
# - /projects (liste, pagination, filtres)
# - /offers (affichage, formulaires)
# - /dashboard (KPIs, graphiques)
# - Tester un formulaire (création AO, projet)
```

---

### **Phase 2 : React Query & Dev Tools (RISQUE MOYEN)**

**Temps estimé:** 5-10 minutes  
**Impact:** Nouvelles features React Query, tests Playwright

```bash
npm install \
  @tanstack/react-query@5.90.5 \
  @playwright/test@1.56.1 \
  playwright@1.56.1 \
  react-hook-form@7.65.0 \
  wouter@3.7.1 \
  react-icons@5.5.0 \
  msw@2.11.6 \
  @replit/vite-plugin-cartographer@0.3.2 \
  @tailwindcss/typography@0.5.19 \
  @tailwindcss/vite@4.1.14 \
  tw-animate-css@1.4.0 \
  jspdf@3.0.3 \
  puppeteer@24.25.0 \
  node-sql-parser@5.3.13
```

**Tests Phase 2 :**
```bash
# Suite Playwright complète
npx playwright test tests/e2e/ao-complete.spec.ts
npx playwright test tests/e2e/fournisseur-quote-complete.spec.ts
npx playwright test tests/e2e/monday-sync-bidirectional.spec.ts

# Vérifier hot reload (modifier un fichier, vérifier auto-reload)
# Vérifier cache React Query (naviguer entre pages, vérifier pas de rechargement inutile)
```

---

### **Phase 3 : Drizzle, Backend & Vite (RISQUE MOYEN)**

**Temps estimé:** 10-15 minutes  
**Impact:** Améliorations Drizzle ORM, Vite, middlewares

#### Option 3A : SÛRE (Drizzle PATCH seulement)

```bash
npm install \
  drizzle-orm@0.39.3 \
  drizzle-kit@0.30.6 \
  drizzle-zod@0.7.1 \
  vite@5.4.21 \
  express-session@1.18.2 \
  openid-client@6.8.1
```

#### Option 3B : RISQUÉE (Drizzle 0.44 - beaucoup de changements)

```bash
npm install \
  drizzle-orm@0.44.6 \
  drizzle-kit@0.31.5 \
  drizzle-zod@0.8.3 \
  vite@5.4.21 \
  express-session@1.18.2 \
  openid-client@6.8.1
```

**IMPORTANT :** Si vous choisissez Option 3B, lisez d'abord :
```bash
# Vérifier breaking changes Drizzle 0.39 → 0.44
curl https://github.com/drizzle-team/drizzle-orm/releases
```

**Tests Phase 3 :**
```bash
# Vérifier connexion database
npm run db:push  # Doit réussir sans erreur

# Tester endpoints API critiques via curl ou Postman
curl http://localhost:5000/api/projects?page=1&limit=10
curl http://localhost:5000/api/aos?status=nouveau
curl http://localhost:5000/api/offers

# Tester authentification OIDC
# 1. Se déconnecter
# 2. Se reconnecter
# 3. Vérifier accès aux pages protégées

# Tester webhook Monday (si configuré)
# Vérifier logs serveur (aucune erreur démarrage)

# Build production
npm run build
# Doit réussir sans erreur TypeScript
```

---

### **Phase 4 : SDKs Externes (RISQUE ÉLEVÉ - OPTIONNEL)**

**⚠️ ATTENTION :** Mises à jour MAJOR avec breaking changes potentiels

**Temps estimé:** 20-30 minutes + tests exhaustifs  
**Recommandation:** Tester en branche séparée d'abord

#### Anthropic SDK (0.37 → 0.67)

```bash
# Lire changelog d'abord
curl https://github.com/anthropics/anthropic-sdk-typescript/releases

npm install @anthropic-ai/sdk@0.67.0
```

**Changements potentiels à vérifier :**
- `server/services/AIService.ts` (analyse OCR, extraction lots)
- `server/services/chatbot-orchestration.ts` (chatbot)

**Tests :**
```bash
# Tester workflow AI complet
# 1. Uploader PDF devis fournisseur
# 2. Lancer OCR extraction
# 3. Vérifier extraction lots et données
# 4. Tester chatbot (poser questions)
```

#### OpenAI SDK (5.22 → 6.5)

```bash
# Lire migration guide
curl https://github.com/openai/openai-node/releases

npm install openai@6.5.0
```

**Changements potentiels à vérifier :**
- `server/services/chatbot-orchestration.ts` (embeddings, chat)

**Tests :**
```bash
# Tester embeddings
# Tester chat completion
# Vérifier rate limiting
# Vérifier error handling
```

#### Neon Database (0.10 → 1.0)

```bash
npm install @neondatabase/serverless@1.0.2
```

**⚠️ CRITIQUE :** Tester TOUTES les requêtes DB

**Tests :**
```bash
# Tester requêtes DB
# 1. SELECT (projets, AOs, offers)
# 2. INSERT (créer nouveau projet)
# 3. UPDATE (modifier projet)
# 4. DELETE (supprimer item test)
# 5. Transactions (vérifier atomicité)

# Vérifier migrations
npm run db:push
```

---

### **Phase 5 : Document Processing (RISQUE ÉLEVÉ - OPTIONNEL)**

**Temps estimé:** 15-20 minutes  
**Impact:** Génération PDF, extraction OCR, exports

```bash
npm install \
  pdf-parse@2.4.4
```

**Tests :**
```bash
# OCR extraction devis fournisseurs
# 1. Uploader PDF devis
# 2. Vérifier extraction texte
# 3. Vérifier extraction tableaux

# Génération PDF Batigest
# 1. Créer bon commande fournisseur
# 2. Générer PDF
# 3. Vérifier rendu (images, tableaux, mise en page)

# Exports Excel/CSV
# 1. Exporter liste projets
# 2. Vérifier données exportées
```

---

## 🚫 Mises à Jour NON RECOMMANDÉES

### Ne PAS mettre à jour maintenant :

**React 19** (breaking changes massifs)
```bash
# NE PAS EXÉCUTER
# npm install react@19.2.0 react-dom@19.2.0
```
Raison : Nouveau compilateur, API changes, requiert refactoring complet

**Vite 7** (refonte architecture)
```bash
# NE PAS EXÉCUTER
# npm install vite@7.1.11
```
Raison : Breaking changes configuration, plugins incompatibles

**Tailwind 4** (nouvelle architecture CSS)
```bash
# NE PAS EXÉCUTER
# npm install tailwindcss@4.1.14
```
Raison : Migration manuelle requise, configuration CSS-first

**Zod 4** (API changes)
```bash
# NE PAS EXÉCUTER
# npm install zod@4.1.12
```
Raison : Breaking changes validation, impact 70+ fichiers

**Express 5** (middleware changes)
```bash
# NE PAS EXÉCUTER
# npm install express@5.1.0
```
Raison : Breaking changes middlewares, nécessite migration

---

## 📝 Après Chaque Phase

### Checklist Systématique

1. **Vérifier compilation**
   ```bash
   npm run check  # Doit réussir sans erreur TypeScript
   ```

2. **Redémarrer workflow**
   - Le workflow "Start application" doit redémarrer automatiquement
   - Vérifier aucune erreur dans les logs

3. **Tests visuels**
   - Ouvrir l'application
   - Naviguer dans les pages principales
   - Tester les interactions (formulaires, boutons, etc.)

4. **Tests E2E** (Phases 2+)
   ```bash
   npx playwright test
   ```

5. **Documenter**
   - Noter les packages mis à jour
   - Noter les problèmes rencontrés
   - Noter les adaptations code nécessaires

---

## 🐛 Troubleshooting

### Erreur "Cannot find module..."

```bash
# Nettoyer et réinstaller
rm -rf node_modules package-lock.json
npm install
```

### Erreur TypeScript après mise à jour

```bash
# Vérifier erreurs LSP
npm run check

# Lire messages d'erreur
# Adapter le code selon breaking changes
```

### Workflow ne démarre pas

```bash
# Vérifier logs
# Corriger erreurs de démarrage
# Redémarrer manuellement
```

### Tests Playwright échouent

```bash
# Installer browsers Playwright
npx playwright install

# Relancer tests avec UI
npx playwright test --ui
```

---

## 📊 Documentation à Créer Après

Après avoir complété les mises à jour, créez `MIGRATION_LOG.md` avec :

```markdown
# Migration Log - [Date]

## Packages Mis à Jour

### Phase 1
- @radix-ui/* : 1.x.x → 1.y.y ✅
- lucide-react : 0.453.0 → 0.546.0 ✅
- ... (liste complète)

### Phase 2
- @tanstack/react-query : 5.60.5 → 5.90.5 ✅
- ... (liste complète)

## Breaking Changes Rencontrés

### [Package Name]
- **Changement:** Description
- **Fichier affecté:** path/to/file.ts
- **Solution:** Ce qui a été modifié
- **Commit:** hash

## Tests Effectués

✅ Compilation TypeScript  
✅ Pages principales fonctionnelles  
✅ Formulaires validés  
✅ Tests E2E passent  
✅ Build production réussit  
✅ Performance acceptable  

## Problèmes Connus

- Aucun

## Prochaines Étapes

- [ ] Décider si mise à jour React 19
- [ ] Décider si mise à jour Vite 7
- [ ] Mettre à jour replit.md
```

---

## ✅ Stratégie Recommandée

**Pour commencer :**

1. **Jour 1 :** Phase 1 uniquement (UI - 30 min)
   - Faible risque
   - Impact immédiat visible

2. **Jour 2 :** Phase 2 (React Query, Playwright - 1h)
   - Tests E2E pour valider
   - Vérifier aucune régression

3. **Jour 3 :** Phase 3 Option A (Drizzle PATCH - 1h)
   - Tester exhaustivement DB
   - Build production

4. **Décision :** Reporter Phases 4-5 sauf besoin urgent

**Total temps : 2-3h pour phases sûres**

---

## 🔗 Ressources

- Audit complet : `DEPENDENCY_AUDIT.md`
- Documentation Replit : https://docs.replit.com/replit-workspace/dependency-management
- npm documentation : https://docs.npmjs.com/cli/v10/commands/npm-install
