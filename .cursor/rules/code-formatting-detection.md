# Détection et Correction Formatage Code - Saxium

**Objectif:** Détecter et corriger automatiquement les problèmes de formatage récurrents identifiés dans les scripts de correction.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT détecter et corriger automatiquement les problèmes de formatage récurrents avant qu'ils ne causent des erreurs TypeScript.

**Bénéfices:**
- ✅ Réduction erreurs TypeScript (formatage)
- ✅ Code cohérent et lisible
- ✅ Détection proactive problèmes
- ✅ Correction automatique

## 📊 Patterns Récurrents Identifiés

### 1. Indentation Excessive (14+ espaces)

**Détection:**
```typescript
// Pattern à détecter
              }  // 14+ espaces (incorrect)
```

**Correction Automatique:**
```typescript
// ✅ Corrigé automatiquement
        }  // 8 espaces (correct pour metadata)
```

**Règles:**
- ✅ Détecter lignes avec 14+ espaces d'indentation
- ✅ Vérifier contexte (metadata, logger)
- ✅ Corriger selon indentation de base
- ✅ Préserver structure

### 2. Metadata Logger Mal Fermé

**Détection:**
```typescript
// Pattern à détecter
logger.info('Message', {
  metadata: {
    // contenu
}  // Fermeture incorrecte
```

**Correction Automatique:**
```typescript
// ✅ Corrigé automatiquement
logger.info('Message', {
  metadata: {
    // contenu
  }
});
```

**Règles:**
- ✅ Détecter metadata mal fermé
- ✅ Vérifier structure logger
- ✅ Corriger fermeture
- ✅ Préserver contenu

### 3. Duplications dans Context

**Détection:**
```typescript
// Pattern à détecter
context: {
  issue: 'ao_not_found'
context: {
  issue: 'ao_not_found'  // Duplication
```

**Correction Automatique:**
```typescript
// ✅ Corrigé automatiquement
context: {
  issue: 'ao_not_found'
}
```

**Règles:**
- ✅ Détecter propriétés dupliquées
- ✅ Détecter context dupliqué
- ✅ Supprimer duplications
- ✅ Préserver structure

### 4. withErrorHandling Mal Fermé

**Détection:**
```typescript
// Pattern à détecter
return withErrorHandling(
  async () => {
    // code
  }, {  // Fermeture incorrecte
```

**Correction Automatique:**
```typescript
// ✅ Corrigé automatiquement
return withErrorHandling(
  async () => {
    // code
  },
  {
    // options
  }
);
```

**Règles:**
- ✅ Détecter withErrorHandling mal fermé
- ✅ Vérifier structure complète
- ✅ Corriger fermeture
- ✅ Préserver fonctionnalité

### 5. Lignes Vides Excessives

**Détection:**
```typescript
// Pattern à détecter
const x = 1;


const y = 2;  // 2+ lignes vides
```

**Correction Automatique:**
```typescript
// ✅ Corrigé automatiquement
const x = 1;

const y = 2;  // 1 ligne vide max
```

**Règles:**
- ✅ Détecter 2+ lignes vides consécutives
- ✅ Réduire à 1 ligne vide max
- ✅ Préserver séparation logique

### 6. Metadata Logger Vides

**Détection:**
```typescript
// Pattern à détecter
logger.info('Message', {
  metadata: {}
});

logger.info('Message', {
  metadata: {       }  // Avec espaces
});
```

**Correction Automatique:**
```typescript
// ✅ Corrigé automatiquement
logger.info('Message', {
  metadata: {
    service: 'ServiceName',
    operation: 'methodName',
    context: { /* contexte pertinent */ }
  }
});
```

**Règles:**
- ✅ Détecter `metadata: {}` ou `metadata: {       }`
- ✅ Enrichir avec service, operation, contexte
- ✅ Préserver structure logger

**Référence:** `@.cursor/rules/metadata-empty-detection.md` - Détection metadata vides détaillée

### 7. withErrorHandling Mal Formé

**Détection:**
```typescript
// Pattern à détecter
return withErrorHandling(
  async () => {
    // code
  },
  {
    operation: 'method',
    service: 'Service',
    metadata: {       }  // Vide ou mal fermé
   });  // Fermeture incorrecte
```

**Correction Automatique:**
```typescript
// ✅ Corrigé automatiquement
return withErrorHandling(
  async () => {
    // code
  },
  {
    operation: 'method',
    service: 'Service',
    metadata: {
      // contexte pertinent
    }
  }
);
```

**Règles:**
- ✅ Détecter withErrorHandling mal fermé
- ✅ Vérifier structure complète
- ✅ Corriger fermeture
- ✅ Enrichir metadata si vide

## 🔧 Correction Automatique

### Workflow de Correction

**TOUJOURS:**
- ✅ Détecter problèmes avant modification
- ✅ Corriger automatiquement si possible
- ✅ Valider après correction
- ✅ Documenter corrections

**Pattern:**
```typescript
// Avant modification
async function prepareCodeForModification(filePath: string): Promise<string> {
  const code = await read_file(filePath);
  
  // 1. Détecter problèmes formatage
  const formattingIssues = await detectFormattingIssues(code);
  
  // 2. Corriger automatiquement
  let fixedCode = code;
  for (const issue of formattingIssues) {
    if (issue.canAutoFix) {
      fixedCode = await autoFixFormatting(fixedCode, issue);
    }
  }
  
  // 3. Valider
  const validation = await validateFormatting(fixedCode);
  if (!validation.success) {
    return await prepareCodeForModification(filePath); // Re-corriger
  }
  
  return fixedCode;
}
```

## 📈 Validation

### Vérification Formatage

**TOUJOURS:**
- ✅ Vérifier indentation cohérente
- ✅ Vérifier fermetures correctes
- ✅ Vérifier pas de duplications
- ✅ Vérifier structure valide

**Pattern:**
```typescript
// Validation formatage
function validateFormatting(code: string): ValidationResult {
  const issues = [];
  
  // Vérifier indentation
  const indentationIssues = detectIndentationIssues(code);
  issues.push(...indentationIssues);
  
  // Vérifier fermetures
  const closureIssues = detectClosureIssues(code);
  issues.push(...closureIssues);
  
  // Vérifier duplications
  const duplicationIssues = detectDuplications(code);
  issues.push(...duplicationIssues);
  
  return {
    success: issues.length === 0,
    issues
  };
}
```

## 🔗 Intégration

### Règles Associées

- `auto-detection.md` - Détection anti-patterns
- `code-quality.md` - Standards qualité code
- `preventive-validation.md` - Validation préventive

### Documentation

- `docs/MAINTAINABILITY_AUTOMATED_FIXES.md` - Corrections automatiques

## ✅ Checklist

**Avant modification:**
- [ ] Détecter problèmes formatage
- [ ] Identifier patterns récurrents
- [ ] Planifier corrections

**Pendant modification:**
- [ ] Corriger formatage automatiquement
- [ ] Vérifier indentation cohérente
- [ ] Vérifier fermetures correctes

**Après modification:**
- [ ] Valider formatage
- [ ] Vérifier pas de régressions
- [ ] Documenter corrections si nécessaire

---

**Référence:** Scripts de correction récents (`fix-context-builder-service.ts`, `fix-storage-facade-final-indentation.ts`)

