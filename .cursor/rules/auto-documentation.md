<!-- 
Context: documentation, code-quality, maintenance, onboarding, auto-documentation, jsdoc, tsdoc, readme
Priority: P1
Auto-load: when creating or modifying code, when documentation is missing or outdated
Dependencies: core.md, quality-principles.md, code-quality.md, similar-code-detection.md
Description: "Auto-documentation intelligente du code avec génération automatique JSDoc/TSDoc et README"
Tags: documentation, auto-doc, jsdoc, tsdoc, maintenance
Score: 70
-->

# Auto-Documentation Intelligente - Saxium

**Objectif:** Documenter automatiquement le code généré ou modifié pour améliorer la maintenabilité et faciliter l'onboarding.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT documenter automatiquement le code généré ou modifié pour garantir une documentation à jour et complète.

**Bénéfices:**
- ✅ Documentation toujours à jour
- ✅ Amélioration de la maintenabilité
- ✅ Facilitation de l'onboarding
- ✅ Réduction du temps de compréhension du code
- ✅ Amélioration de la qualité globale

**Référence:** `@.cursor/rules/code-quality.md` - Standards qualité code  
**Référence:** `@.cursor/rules/similar-code-detection.md` - Détection de code similaire

## 📋 Règles d'Auto-Documentation

### 1. Documentation Automatique des Fonctions

**TOUJOURS:**
- ✅ Générer JSDoc/TSDoc pour toutes les fonctions publiques
- ✅ Documenter paramètres, valeurs de retour, exceptions
- ✅ Inclure exemples d'utilisation si complexe
- ✅ Documenter complexité algorithmique si pertinente
- ✅ Synchroniser documentation avec code

**Pattern:**
```typescript
// Avant: Fonction non documentée
export async function createOffer(data: InsertOffer): Promise<Offer> {
  // ...
}

// Après: Fonction documentée automatiquement
/**
 * Crée une nouvelle offre pour un appel d'offres.
 * 
 * @param data - Données de l'offre à créer (InsertOffer)
 * @returns Promise résolue avec l'offre créée (Offer)
 * @throws {ValidationError} Si les données sont invalides
 * @throws {NotFoundError} Si l'appel d'offres n'existe pas
 * 
 * @example
 * ```typescript
 * const offer = await createOffer({
 *   aoId: '123',
 *   amount: 50000,
 *   // ...
 * });
 * ```
 * 
 * @complexity O(1) - Insertion simple en base de données
 */
export async function createOffer(data: InsertOffer): Promise<Offer> {
  // ...
}
```

### 2. Documentation Automatique des Types et Interfaces

**TOUJOURS:**
- ✅ Documenter toutes les interfaces et types exportés
- ✅ Documenter propriétés complexes ou non évidentes
- ✅ Inclure exemples d'utilisation
- ✅ Documenter contraintes et validations

**Pattern:**
```typescript
// Avant: Interface non documentée
export interface Offer {
  id: string;
  aoId: string;
  amount: number;
  status: OfferStatus;
  // ...
}

// Après: Interface documentée automatiquement
/**
 * Représente une offre pour un appel d'offres.
 * 
 * @property id - Identifiant unique de l'offre (UUID)
 * @property aoId - Identifiant de l'appel d'offres associé
 * @property amount - Montant de l'offre en euros (doit être > 0)
 * @property status - Statut actuel de l'offre (draft, submitted, accepted, rejected)
 * 
 * @example
 * ```typescript
 * const offer: Offer = {
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   aoId: 'ao-123',
 *   amount: 50000,
 *   status: 'submitted',
 *   // ...
 * };
 * ```
 */
export interface Offer {
  id: string;
  aoId: string;
  amount: number;
  status: OfferStatus;
  // ...
}
```

### 3. Documentation Automatique des Modules

**TOUJOURS:**
- ✅ Générer README.md pour nouveaux modules
- ✅ Documenter objectif et responsabilités du module
- ✅ Documenter API publique du module
- ✅ Inclure exemples d'utilisation
- ✅ Documenter dépendances et prérequis

**Pattern:**
```markdown
# Module Auth - Saxium

## 🎯 Objectif

Gestion de l'authentification et de l'autorisation pour l'application Saxium.

## 📋 Responsabilités

- Authentification OAuth (Microsoft)
- Gestion des sessions utilisateur
- Autorisation basée sur les rôles (RBAC)
- Gestion des tokens JWT

## 🔌 API Publique

### Fonctions Principales

- `authenticateUser(credentials)` - Authentifie un utilisateur
- `refreshToken(token)` - Rafraîchit un token expiré
- `checkPermission(user, resource, action)` - Vérifie une permission

### Exemples d'Utilisation

```typescript
import { authenticateUser } from './modules/auth';

const user = await authenticateUser({
  email: 'user@example.com',
  password: 'password'
});
```

## 📦 Dépendances

- `server/services/RBACService.ts` - Service de gestion des rôles
- `server/utils/jwt.ts` - Utilitaires JWT
```

### 4. Mise à Jour Automatique de la Documentation

**TOUJOURS:**
- ✅ Détecter documentation obsolète
- ✅ Mettre à jour documentation si code modifié
- ✅ Synchroniser documentation avec signatures
- ✅ Valider cohérence documentation/code

**Pattern:**
```typescript
// Détecter et mettre à jour documentation obsolète
async function updateDocumentationIfNeeded(
  filePath: string,
  code: string,
  context: Context
): Promise<void> {
  // 1. Analyser code pour identifier fonctions/types
  const codeElements = analyzeCodeElements(code);
  
  // 2. Extraire documentation existante
  const existingDocs = extractDocumentation(code);
  
  // 3. Comparer avec code actuel
  const outdatedDocs = identifyOutdatedDocumentation(
    codeElements,
    existingDocs
  );
  
  // 4. Générer documentation mise à jour
  const updatedDocs = await generateUpdatedDocumentation(
    codeElements,
    outdatedDocs,
    context
  );
  
  // 5. Remplacer documentation obsolète
  const updatedCode = replaceDocumentation(code, updatedDocs);
  
  // 6. Valider cohérence
  await validateDocumentationConsistency(updatedCode);
  
  return updatedCode;
}
```

### 5. Documentation des Patterns et Conventions

**TOUJOURS:**
- ✅ Documenter patterns utilisés
- ✅ Documenter conventions du projet
- ✅ Inclure références aux règles Cursor
- ✅ Documenter décisions architecturales

**Pattern:**
```typescript
/**
 * Route pour créer une offre.
 * 
 * @pattern Route Express avec asyncHandler
 * @convention Utilise asyncHandler pour gestion d'erreurs automatique
 * @validation Valide données avec Zod avant traitement
 * @reference @.cursor/rules/backend.md - Patterns backend
 * 
 * @route POST /api/offers
 * @access Authentifié (rôle: user)
 */
router.post(
  '/api/offers',
  authenticate,
  asyncHandler(async (req, res) => {
    // ...
  })
);
```

## 🔄 Workflow d'Auto-Documentation

### Workflow: Documenter Automatiquement le Code

**Étapes:**
1. Analyser code généré/modifié
2. Identifier éléments à documenter (fonctions, types, modules)
3. Générer documentation appropriée
4. Vérifier documentation existante pour mise à jour
5. Synchroniser documentation avec code
6. Valider cohérence documentation/code

**Pattern:**
```typescript
async function autoDocumentCode(
  filePath: string,
  code: string,
  context: Context
): Promise<string> {
  // 1. Analyser code
  const analysis = await analyzeCode(code, filePath);
  
  // 2. Identifier éléments à documenter
  const elementsToDocument = identifyElementsToDocument(analysis);
  
  // 3. Générer documentation
  const documentation = await generateDocumentation(
    elementsToDocument,
    context
  );
  
  // 4. Intégrer documentation dans code
  const documentedCode = integrateDocumentation(code, documentation);
  
  // 5. Valider cohérence
  await validateDocumentation(documentedCode);
  
  // 6. Mettre à jour README si module
  if (isModule(filePath)) {
    await updateModuleReadme(filePath, documentedCode, context);
  }
  
  return documentedCode;
}
```

## ⚠️ Règles d'Auto-Documentation

### Ne Jamais:

**BLOQUANT:**
- ❌ Générer code sans documentation
- ❌ Laisser documentation obsolète
- ❌ Documenter code privé/internes (sauf si complexe)
- ❌ Ignorer synchronisation documentation/code

**TOUJOURS:**
- ✅ Documenter toutes fonctions/types publics
- ✅ Mettre à jour documentation si code modifié
- ✅ Synchroniser documentation avec signatures
- ✅ Valider cohérence documentation/code
- ✅ Générer README pour nouveaux modules

## 📊 Checklist Auto-Documentation

### Avant Génération de Code

- [ ] Identifier éléments à documenter
- [ ] Préparer templates de documentation
- [ ] Vérifier conventions de documentation du projet

### Pendant Génération de Code

- [ ] Générer JSDoc/TSDoc pour fonctions publiques
- [ ] Documenter types et interfaces exportés
- [ ] Inclure exemples si complexe
- [ ] Documenter patterns et conventions utilisés

### Après Génération de Code

- [ ] Vérifier documentation générée
- [ ] Valider cohérence documentation/code
- [ ] Générer/mettre à jour README si module
- [ ] Synchroniser documentation avec code

## 🔗 Références

- `@.cursor/rules/code-quality.md` - Standards qualité code
- `@.cursor/rules/similar-code-detection.md` - Détection de code similaire
- `@.cursor/rules/quality-principles.md` - Principes de qualité

---

**Note:** Cette règle garantit que le code est toujours documenté et que la documentation reste synchronisée avec le code.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

