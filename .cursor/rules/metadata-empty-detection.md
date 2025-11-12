# Détection et Correction Metadata Vides - Saxium

**Objectif:** Détecter et corriger automatiquement les metadata vides (`metadata: {}` ou `metadata: {       }`) pour améliorer la qualité du logging.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT détecter et corriger automatiquement les metadata vides dans les appels logger pour améliorer la traçabilité.

**Bénéfices:**
- ✅ Amélioration traçabilité (metadata utiles)
- ✅ Réduction metadata vides (37+ occurrences détectées)
- ✅ Code plus informatif
- ✅ Debugging facilité

## 📊 Détection Metadata Vides

### 1. Pattern Metadata Vide

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
- ✅ Analyser contexte (service, méthode, opération)
- ✅ Générer metadata pertinents automatiquement
- ✅ Préserver structure logger

### 2. Pattern Metadata avec Contexte Disponible

**TOUJOURS:**
- ✅ Utiliser service name depuis classe
- ✅ Utiliser méthode name depuis contexte
- ✅ Utiliser paramètres pertinents
- ✅ Ajouter contexte métier si disponible

**Pattern:**
```typescript
// Avant (metadata vide)
async detectDelayRisks(projectId?: string): Promise<InsertDateAlert[]> {
  return withErrorHandling(
    async () => {
      // ...
      logger.info('Détection retards', {
        metadata: {}  // Vide
      });
    },
    {
      operation: 'detectDelayRisks',
      service: 'DateAlertDetectionService',
      metadata: {}  // Vide aussi
    }
  );
}

// Après (metadata enrichis)
async detectDelayRisks(projectId?: string): Promise<InsertDateAlert[]> {
  return withErrorHandling(
    async () => {
      // ...
      logger.info('Détection retards', {
        metadata: {
          service: 'DateAlertDetectionService',
          operation: 'detectDelayRisks',
          projectId: projectId || 'all',
          context: { detectionType: 'delay_risks' }
        }
      });
    },
    {
      operation: 'detectDelayRisks',
      service: 'DateAlertDetectionService',
      metadata: {
        projectId: projectId || 'all'
      }
    }
  );
}
```

## 🔧 Correction Automatique

### 1. Enrichissement Metadata Logger

**TOUJOURS:**
- ✅ Extraire service name depuis classe
- ✅ Extraire méthode name depuis contexte
- ✅ Extraire paramètres pertinents
- ✅ Ajouter contexte métier

**Pattern:**
```typescript
// Détecter et enrichir metadata
function enrichMetadata(
  code: string,
  serviceName: string,
  methodName: string,
  params: string[]
): string {
  // Remplacer metadata: {} par metadata enrichi
  const enrichedMetadata = {
    service: serviceName,
    operation: methodName,
    ...(params.length > 0 && { params: params.join(', ') })
  };
  
  return code.replace(
    /metadata:\s*\{\s*\}/g,
    `metadata: ${JSON.stringify(enrichedMetadata, null, 2)}`
  );
}
```

### 2. Enrichissement Metadata withErrorHandling

**TOUJOURS:**
- ✅ Utiliser operation/service déjà présents
- ✅ Ajouter paramètres pertinents
- ✅ Ajouter contexte métier

**Pattern:**
```typescript
// Avant
return withErrorHandling(
  async () => { /* ... */ },
  {
    operation: 'detectDelayRisks',
    service: 'DateAlertDetectionService',
    metadata: {}  // Vide
  }
);

// Après
return withErrorHandling(
  async () => { /* ... */ },
  {
    operation: 'detectDelayRisks',
    service: 'DateAlertDetectionService',
    metadata: {
      projectId: projectId || 'all',
      context: { detectionType: 'delay_risks' }
    }
  }
);
```

## 📈 Validation

### Vérification Metadata

**TOUJOURS:**
- ✅ Vérifier metadata non vides
- ✅ Vérifier service/operation présents
- ✅ Vérifier contexte pertinent
- ✅ Valider structure

**Pattern:**
```typescript
// Validation metadata
function validateMetadata(metadata: any): boolean {
  if (!metadata || Object.keys(metadata).length === 0) {
    return false; // Metadata vide
  }
  
  // Vérifier présence service ou operation
  if (!metadata.service && !metadata.operation) {
    return false; // Pas assez d'info
  }
  
  return true; // Metadata valide
}
```

## 🎯 Règles Spécifiques

### Logger avec Metadata Vide

**TOUJOURS:**
- ✅ Détecter `logger.info/error/warn/debug` avec `metadata: {}`
- ✅ Enrichir avec service, operation, contexte
- ✅ Préserver message original
- ✅ Ajouter paramètres pertinents

### withErrorHandling avec Metadata Vide

**TOUJOURS:**
- ✅ Détecter `withErrorHandling` avec `metadata: {}`
- ✅ Utiliser operation/service déjà présents
- ✅ Ajouter paramètres de la méthode
- ✅ Ajouter contexte métier

### Metadata avec Espaces

**TOUJOURS:**
- ✅ Détecter `metadata: {       }` (espaces)
- ✅ Traiter comme metadata vide
- ✅ Enrichir de la même manière

## 🔗 Intégration

### Règles Associées

- `code-formatting-detection.md` - Détection formatage
- `auto-detection.md` - Détection anti-patterns
- `code-quality.md` - Standards qualité code

### Documentation

- `docs/MAINTAINABILITY_AUTOMATED_FIXES.md` - Corrections automatiques

## ✅ Checklist

**Avant modification:**
- [ ] Détecter metadata vides
- [ ] Identifier contexte (service, méthode, paramètres)
- [ ] Planifier enrichissement

**Pendant modification:**
- [ ] Enrichir metadata logger
- [ ] Enrichir metadata withErrorHandling
- [ ] Ajouter contexte pertinent
- [ ] Préserver structure

**Après modification:**
- [ ] Vérifier metadata non vides
- [ ] Valider structure
- [ ] Documenter si nécessaire

---

**Référence:** 37+ occurrences détectées dans DateAlertDetectionService, PredictiveEngineService, etc.

