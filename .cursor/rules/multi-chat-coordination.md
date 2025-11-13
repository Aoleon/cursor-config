# Coordination Multi-Chats Cursor - Saxium

**Objectif:** Coordonner automatiquement les travaux entre différents chats Cursor pour éviter les conflits et assurer la stabilité de l'application.

## 🎯 Principe Fondamental

**IMPÉRATIF:** Avant toute modification de fichier, l'agent DOIT vérifier automatiquement les conflits potentiels avec les autres chats Cursor en cours.

**Bénéfices:**
- ✅ Évite les conflits entre chats
- ✅ Améliore la coordination des travaux
- ✅ Réduit les régressions
- ✅ Améliore la stabilité de l'application
- ✅ Accélère le développement

## 📋 Règles de Coordination Multi-Chats

### 1. Vérification Automatique Avant Modification

**TOUJOURS:**
- ✅ Exécuter `scripts/detect-chat-conflicts.ts` avant modification
- ✅ Vérifier si fichier dans une zone de travail assignée
- ✅ Vérifier si fichier déjà modifié dans git
- ✅ Vérifier les dépendances du fichier
- ✅ Détecter erreurs de syntaxe bloquantes

**Pattern:**
```typescript
// Avant modification, vérifier conflits automatiquement
async function checkConflictsBeforeModification(
  filepath: string
): Promise<ConflictCheckResult> {
  // 1. Exécuter script de détection
  const result = await execScript('detect-chat-conflicts.ts', ['--file', filepath]);
  
  // 2. Analyser résultats
  if (result.hasConflicts) {
    // 3. Si conflits critiques, bloquer modification
    if (result.conflicts.some(c => c.severity === 'critical')) {
      throw new Error('Conflits critiques détectés - modification bloquée');
    }
    
    // 4. Si conflits haute priorité, avertir
    if (result.conflicts.some(c => c.severity === 'high')) {
      logger.warn('Conflits haute priorité détectés', {
        metadata: {
          filepath,
          conflicts: result.conflicts
        }
      });
    }
  }
  
  return result;
}
```

### 2. Respect des Zones de Travail

**TOUJOURS:**
- ✅ Vérifier zone de travail avant modification
- ✅ Respecter les zones assignées à d'autres chats
- ✅ S'assigner dans zone si libre
- ✅ Mettre à jour document de coordination

**Zones de Travail Critiques:**
- `cache-services`: CacheService.ts, RedisCacheAdapter.ts (🔴 CRITIQUE)
- `chatbot-service`: ChatbotOrchestrationService.ts (🔴 CRITIQUE)
- `suppliers-routes`: suppliers/routes.ts (🟡 HAUTE)
- `monday-service`: MondayService.ts (🟡 MOYENNE)
- `batigest-routes`: batigest/routes.ts (🟢 BASSE)
- `database-utils`: database-helpers.ts, safe-query.ts (🟡 MOYENNE)

**Pattern:**
```typescript
// Vérifier zone de travail avant modification
async function checkWorkZone(
  filepath: string
): Promise<WorkZoneCheckResult> {
  // 1. Identifier zone
  const zone = findZoneForFile(filepath);
  
  if (!zone) {
    // 2. Si pas de zone, fichier libre
    return { canModify: true, reason: 'No zone assigned' };
  }
  
  // 3. Vérifier statut zone
  if (zone.status === 'in_progress' && zone.assignedChat) {
    // 4. Si zone assignée, bloquer
    return {
      canModify: false,
      reason: `Zone "${zone.zone}" assigned to ${zone.assignedChat}`,
      suggestion: 'Contact assigned chat before modification'
    };
  }
  
  // 5. Si zone libre, s'assigner
  zone.status = 'in_progress';
  zone.assignedChat = 'current-chat';
  await updateCoordinationDoc(zone);
  
  return { canModify: true, reason: 'Zone assigned to current chat' };
}
```

### 3. Détection Automatique des Conflits

**TOUJOURS:**
- ✅ Détecter fichiers modifiés dans git
- ✅ Détecter conflits de dépendances
- ✅ Détecter erreurs de syntaxe
- ✅ Détecter chevauchements de zones

**Pattern:**
```typescript
// Détecter conflits automatiquement
async function detectChatConflicts(
  filepath: string
): Promise<Conflict[]> {
  // 1. Vérifier modifications git
  const gitConflicts = await checkGitModifications(filepath);
  
  // 2. Vérifier dépendances
  const dependencyConflicts = await checkDependencies(filepath);
  
  // 3. Vérifier syntaxe
  const syntaxConflicts = await checkSyntaxErrors(filepath);
  
  // 4. Vérifier zones
  const zoneConflicts = await checkWorkZones(filepath);
  
  // 5. Combiner conflits
  return [
    ...gitConflicts,
    ...dependencyConflicts,
    ...syntaxConflicts,
    ...zoneConflicts
  ];
}
```

### 4. Communication Entre Chats

**TOUJOURS:**
- ✅ Mettre à jour document de coordination après modification
- ✅ Documenter modifications importantes
- ✅ Signaler conflits détectés
- ✅ Proposer résolutions

**Document de Coordination:**
- `docs/COORDINATION_CHATS_CURSOR.md` - Document principal
- Mettre à jour après chaque modification importante
- Inclure statut, assignations, conflits

**Pattern:**
```typescript
// Mettre à jour coordination après modification
async function updateCoordination(
  filepath: string,
  modification: Modification
): Promise<void> {
  // 1. Identifier zone
  const zone = findZoneForFile(filepath);
  
  if (zone) {
    // 2. Mettre à jour statut zone
    zone.status = 'in_progress';
    zone.lastModified = new Date();
    
    // 3. Documenter modification
    await updateCoordinationDoc({
      zone: zone.zone,
      filepath,
      modification,
      timestamp: new Date()
    });
  }
}
```

## 🔄 Workflow de Coordination

### Workflow: Vérifier Conflits Avant Modification

**Étapes:**
1. Exécuter script de détection (`detect-chat-conflicts.ts`)
2. Analyser résultats
3. Si conflits critiques, bloquer modification
4. Si conflits haute priorité, avertir et demander confirmation
5. Si zone assignée, contacter chat assigné
6. Si zone libre, s'assigner
7. Procéder à modification
8. Mettre à jour coordination après modification

**Pattern:**
```typescript
async function modifyFileWithCoordination(
  filepath: string,
  modification: Modification
): Promise<ModificationResult> {
  // 1. Vérifier conflits
  const conflicts = await detectChatConflicts(filepath);
  
  // 2. Si conflits critiques, bloquer
  if (conflicts.some(c => c.severity === 'critical')) {
    throw new Error('Critical conflicts detected - modification blocked');
  }
  
  // 3. Vérifier zone de travail
  const zoneCheck = await checkWorkZone(filepath);
  if (!zoneCheck.canModify) {
    throw new Error(`Cannot modify: ${zoneCheck.reason}`);
  }
  
  // 4. Si conflits haute priorité, avertir
  if (conflicts.some(c => c.severity === 'high')) {
    logger.warn('High priority conflicts detected', {
      metadata: { filepath, conflicts }
    });
    // Demander confirmation si nécessaire
  }
  
  // 5. Procéder à modification
  const result = await applyModification(filepath, modification);
  
  // 6. Mettre à jour coordination
  await updateCoordination(filepath, modification);
  
  return result;
}
```

## ⚠️ Règles de Coordination

### Ne Jamais:

**BLOQUANT:**
- ❌ Modifier fichier sans vérifier conflits
- ❌ Modifier fichier dans zone assignée à autre chat
- ❌ Ignorer conflits critiques
- ❌ Ne pas mettre à jour coordination

**TOUJOURS:**
- ✅ Vérifier conflits avant modification
- ✅ Respecter zones de travail
- ✅ Mettre à jour coordination
- ✅ Documenter modifications importantes

## 📊 Checklist Coordination Multi-Chats

### Avant Modification

- [ ] Exécuter `scripts/detect-chat-conflicts.ts --file <filepath>`
- [ ] Vérifier si fichier dans zone de travail
- [ ] Vérifier si zone assignée à autre chat
- [ ] Vérifier conflits critiques
- [ ] Vérifier conflits haute priorité
- [ ] S'assigner dans zone si libre

### Pendant Modification

- [ ] Surveiller conflits
- [ ] Résoudre conflits détectés
- [ ] Valider modifications

### Après Modification

- [ ] Mettre à jour document de coordination
- [ ] Documenter modifications importantes
- [ ] Signaler conflits résolus
- [ ] Mettre à jour statut zone

## 🔗 Intégration avec Autres Règles

### Règles Complémentaires

- `@.cursor/rules/conflict-detection.md` - Détection proactive des conflits
- `@.cursor/rules/preventive-validation.md` - Validation préventive
- `@.cursor/rules/dependency-intelligence.md` - Intelligence des dépendances
- `@.cursor/rules/script-automation.md` - Automatisation par script

### Scripts Associés

- `scripts/detect-chat-conflicts.ts` - Script de détection automatique
- `docs/COORDINATION_CHATS_CURSOR.md` - Document de coordination

## 🚀 Utilisation

### Vérifier un Fichier Avant Modification

```bash
# Vérifier fichier spécifique
tsx scripts/detect-chat-conflicts.ts --file server/services/CacheService.ts

# Vérifier tous les fichiers modifiés
tsx scripts/detect-chat-conflicts.ts --check-all

# Sortie JSON
tsx scripts/detect-chat-conflicts.ts --file server/services/CacheService.ts --json
```

### Intégration dans Workflow Agent

```typescript
// Dans workflow agent, avant modification
const conflicts = await execScript('detect-chat-conflicts.ts', [
  '--file',
  targetFile
]);

if (conflicts.hasConflicts && conflicts.conflicts.some(c => c.severity === 'critical')) {
  // Bloquer modification
  throw new Error('Critical conflicts detected');
}
```

## 📝 Exemples

### Exemple 1: Vérification Avant Modification

```typescript
// Avant de modifier RedisCacheAdapter.ts
const result = await execScript('detect-chat-conflicts.ts', [
  '--file',
  'server/services/RedisCacheAdapter.ts'
]);

// Résultat: Conflits critiques détectés
// Action: Bloquer modification, contacter chat assigné
```

### Exemple 2: Assignation de Zone

```typescript
// Avant de modifier suppliers/routes.ts
const zoneCheck = await checkWorkZone('server/modules/suppliers/routes.ts');

// Résultat: Zone libre
// Action: S'assigner dans zone, mettre à jour coordination
```

### Exemple 3: Détection Conflits Dépendances

```typescript
// Avant de modifier CacheService.ts
const conflicts = await detectChatConflicts('server/services/CacheService.ts');

// Résultat: Dépendance RedisCacheAdapter.ts modifiée
// Action: Vérifier impact, coordonner modifications
```

---

**Note:** Cette règle garantit que l'agent coordonne automatiquement ses travaux avec les autres chats Cursor pour éviter les conflits et assurer la stabilité de l'application.

**Référence:** `@docs/COORDINATION_CHATS_CURSOR.md` - Document de coordination complet

