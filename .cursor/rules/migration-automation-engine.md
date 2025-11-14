<!-- 
Context: migration-automation, automated-migration, route-migration, module-generation, validation
Priority: P1
Auto-load: when automating migrations, when migrating routes to modules, when generating module code
Dependencies: core.md, technical-debt-automation.md, migration-refactoring-manager.md
Score: 75
-->

# Moteur Migration Automatisée - Saxium

**Objectif:** Automatiser la migration de routes depuis routes-poc.ts vers modules avec détection automatique, génération code, migration avec validation continue et synchronisation.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT automatiser la migration de routes avec détection automatique, génération code module cible, migration avec validation continue et synchronisation entre ancien/nouveau code.

**Bénéfices:**
- ✅ Détection automatique routes à migrer
- ✅ Génération code module cible automatique
- ✅ Migration avec validation continue
- ✅ Synchronisation ancien/nouveau code
- ✅ Réduction routes-poc.ts de 11,998 → <3,500 lignes

**Référence:** `@.cursor/rules/technical-debt-automation.md` - Automatisation dette technique  
**Référence:** `@.cursor/rules/migration-refactoring-manager.md` - Gestionnaire migration/refactoring

## 📋 Fonctionnalités Moteur Migration

### 1. Détection Automatique Routes à Migrer

**TOUJOURS:**
- ✅ Scanner routes-poc.ts pour routes
- ✅ Identifier routes par module logique
- ✅ Analyser dépendances routes
- ✅ Prioriser routes à migrer

**Pattern:**
```typescript
// Détection automatique routes
class RouteDetector {
  async detectRoutesToMigrate(
    routesPocFile: File,
    context: Context
  ): Promise<RouteDetection[]> {
    const detections: RouteDetection[] = [];
    
    // 1. Parser routes-poc.ts
    const routes = await this.parseRoutesFile(routesPocFile, context);
    
    // 2. Grouper routes par module logique
    const routeGroups = await this.groupRoutesByModule(routes, context);
    
    // 3. Analyser dépendances
    for (const group of routeGroups) {
      const dependencies = await this.analyzeDependencies(group, context);
      
      detections.push({
        module: group.moduleName,
        routes: group.routes,
        dependencies,
        priority: this.calculatePriority(group, dependencies, context)
      });
    }
    
    return detections;
  }
  
  private async groupRoutesByModule(
    routes: Route[],
    context: Context
  ): Promise<RouteGroup[]> {
    const groups: Map<string, RouteGroup> = new Map();
    
    for (const route of routes) {
      // Identifier module logique depuis path
      const moduleName = this.identifyModuleFromPath(route.path, context);
      
      if (!groups.has(moduleName)) {
        groups.set(moduleName, {
          moduleName,
          routes: []
        });
      }
      
      groups.get(moduleName)!.routes.push(route);
    }
    
    return Array.from(groups.values());
  }
  
  private identifyModuleFromPath(
    path: string,
    context: Context
  ): string {
    // Exemple: /api/auth/login → 'auth'
    const parts = path.split('/').filter(p => p);
    if (parts.length >= 2 && parts[0] === 'api') {
      return parts[1]; // 'auth', 'documents', etc.
    }
    return 'unknown';
  }
}
```

### 2. Génération Code Module Cible

**TOUJOURS:**
- ✅ Générer structure module
- ✅ Générer routes module
- ✅ Générer middleware module
- ✅ Générer types module

**Pattern:**
```typescript
// Génération code module cible
class ModuleCodeGenerator {
  async generateModuleCode(
    detection: RouteDetection,
    context: Context
  ): Promise<ModuleCode> {
    // 1. Générer structure module
    const moduleStructure = await this.generateModuleStructure(
      detection.module,
      context
    );
    
    // 2. Générer routes module
    const routes = await this.generateModuleRoutes(
      detection.routes,
      detection.module,
      context
    );
    
    // 3. Générer middleware module
    const middleware = await this.generateModuleMiddleware(
      detection,
      context
    );
    
    // 4. Générer types module
    const types = await this.generateModuleTypes(
      detection,
      context
    );
    
    return {
      structure: moduleStructure,
      routes,
      middleware,
      types
    };
  }
  
  private async generateModuleStructure(
    moduleName: string,
    context: Context
  ): Promise<ModuleStructure> {
    return {
      directory: `server/modules/${moduleName}/`,
      files: [
        `server/modules/${moduleName}/routes.ts`,
        `server/modules/${moduleName}/middleware.ts`,
        `server/modules/${moduleName}/types.ts`,
        `server/modules/${moduleName}/index.ts`
      ]
    };
  }
  
  private async generateModuleRoutes(
    routes: Route[],
    moduleName: string,
    context: Context
  ): Promise<string> {
    // Générer code routes module
    let code = `import { Router } from 'express';\n`;
    code += `import { asyncHandler } from '../../utils/asyncHandler';\n`;
    code += `import { logger } from '../../utils/logger';\n\n`;
    code += `const router = Router();\n\n`;
    
    for (const route of routes) {
      code += await this.generateRouteCode(route, context);
    }
    
    code += `\nexport default router;\n`;
    
    return code;
  }
  
  private async generateRouteCode(
    route: Route,
    context: Context
  ): Promise<string> {
    // Générer code route avec asyncHandler
    return `
router.${route.method}('${route.path}', asyncHandler(async (req, res) => {
  logger.info('${route.method} ${route.path}', {
    metadata: {
      module: '${route.module}',
      action: '${route.action}'
    }
  });
  
  ${route.handlerCode}
}));
`;
  }
}
```

### 3. Migration avec Validation Continue

**TOUJOURS:**
- ✅ Migrer routes progressivement
- ✅ Valider après chaque migration
- ✅ Tests de non-régression
- ✅ Rollback si validation échoue

**Pattern:**
```typescript
// Migration avec validation continue
class MigrationEngine {
  async migrateWithValidation(
    detection: RouteDetection,
    moduleCode: ModuleCode,
    context: Context
  ): Promise<MigrationResult> {
    // 1. Créer structure module
    await this.createModuleStructure(moduleCode.structure, context);
    
    // 2. Écrire fichiers module
    await this.writeModuleFiles(moduleCode, context);
    
    // 3. Migrer routes progressivement
    const migrationResults: RouteMigrationResult[] = [];
    
    for (const route of detection.routes) {
      // Migrer route
      const routeMigration = await this.migrateRoute(
        route,
        detection.module,
        context
      );
      
      // Valider immédiatement
      const validation = await this.validateRouteMigration(
        routeMigration,
        context
      );
      
      if (!validation.valid) {
        // Rollback route
        await this.rollbackRouteMigration(routeMigration, context);
        throw new Error(`Migration route ${route.path} échouée`);
      }
      
      migrationResults.push({
        route,
        migration: routeMigration,
        validation
      });
    }
    
    // 4. Tests de non-régression
    const regressionTests = await this.runRegressionTests(
      detection.module,
      context
    );
    
    if (!regressionTests.passed) {
      // Rollback migration complète
      await this.rollbackMigration(detection.module, context);
      throw new Error('Tests de non-régression échoués');
    }
    
    return {
      module: detection.module,
      routesMigrated: migrationResults.length,
      validation,
      regressionTests
    };
  }
  
  private async validateRouteMigration(
    migration: RouteMigration,
    context: Context
  ): Promise<ValidationResult> {
    // 1. Vérifier syntaxe TypeScript
    const syntaxCheck = await this.checkTypeScriptSyntax(
      migration.newFile,
      context
    );
    
    // 2. Vérifier imports
    const importsCheck = await this.checkImports(migration, context);
    
    // 3. Vérifier exports
    const exportsCheck = await this.checkExports(migration, context);
    
    return {
      valid: syntaxCheck.valid && importsCheck.valid && exportsCheck.valid,
      syntaxCheck,
      importsCheck,
      exportsCheck
    };
  }
}
```

### 4. Synchronisation Ancien/Nouveau Code

**TOUJOURS:**
- ✅ Maintenir synchronisation pendant migration
- ✅ Détecter incohérences
- ✅ Résoudre incohérences automatiquement
- ✅ Supprimer ancien code après validation

**Pattern:**
```typescript
// Synchronisation ancien/nouveau code
class CodeSynchronizer {
  async synchronizeOldNewCode(
    migration: MigrationResult,
    context: Context
  ): Promise<SynchronizationResult> {
    // 1. Maintenir synchronisation pendant migration
    await this.maintainSynchronization(migration, context);
    
    // 2. Détecter incohérences
    const inconsistencies = await this.detectInconsistencies(
      migration,
      context
    );
    
    // 3. Résoudre incohérences
    if (inconsistencies.length > 0) {
      await this.resolveInconsistencies(
        inconsistencies,
        migration,
        context
      );
    }
    
    // 4. Valider synchronisation
    const syncValidation = await this.validateSynchronization(
      migration,
      context
    );
    
    if (!syncValidation.valid) {
      throw new Error('Synchronisation échouée');
    }
    
    // 5. Supprimer ancien code après validation
    if (syncValidation.valid && migration.regressionTests.passed) {
      await this.removeOldCode(migration, context);
    }
    
    return {
      synchronized: true,
      inconsistencies: inconsistencies.length,
      syncValidation
    };
  }
  
  private async maintainSynchronization(
    migration: MigrationResult,
    context: Context
  ): Promise<void> {
    // Maintenir synchronisation entre routes-poc.ts et module
    // Pendant migration, les deux doivent fonctionner
    
    // 1. Vérifier routes-poc.ts toujours fonctionnel
    const oldCodeValid = await this.validateOldCode(context);
    
    // 2. Vérifier module nouveau fonctionnel
    const newCodeValid = await this.validateNewCode(migration, context);
    
    if (!oldCodeValid || !newCodeValid) {
      throw new Error('Synchronisation perdue');
    }
  }
  
  private async removeOldCode(
    migration: MigrationResult,
    context: Context
  ): Promise<void> {
    // Supprimer routes migrées de routes-poc.ts
    await this.removeRoutesFromPoc(
      migration.routesMigrated,
      context
    );
    
    logger.info('Ancien code supprimé après migration validée', {
      metadata: {
        module: migration.module,
        routesRemoved: migration.routesMigrated.length
      }
    });
  }
}
```

## 🔄 Workflow Migration Automatisée

### Workflow Complet

1. **Détecter routes à migrer** → Scanner routes-poc.ts, grouper par module
2. **Générer code module** → Structure, routes, middleware, types
3. **Migrer avec validation** → Migration progressive, validation continue
4. **Synchroniser ancien/nouveau** → Maintenir synchronisation, résoudre incohérences
5. **Supprimer ancien code** → Après validation complète

**Pattern:**
```typescript
// Workflow complet migration automatisée
class MigrationAutomationEngine {
  async executeAutomatedMigration(
    targetModule: string,
    context: Context
  ): Promise<AutomatedMigrationResult> {
    // 1. Détecter routes à migrer
    const routesPocFile = await this.loadRoutesPocFile(context);
    const detections = await this.routeDetector.detectRoutesToMigrate(
      routesPocFile,
      context
    );
    
    const targetDetection = detections.find(d => d.module === targetModule);
    if (!targetDetection) {
      throw new Error(`Module ${targetModule} non trouvé`);
    }
    
    // 2. Générer code module
    const moduleCode = await this.moduleCodeGenerator.generateModuleCode(
      targetDetection,
      context
    );
    
    // 3. Migrer avec validation
    const migration = await this.migrationEngine.migrateWithValidation(
      targetDetection,
      moduleCode,
      context
    );
    
    // 4. Synchroniser ancien/nouveau
    const synchronization = await this.codeSynchronizer.synchronizeOldNewCode(
      migration,
      context
    );
    
    // 5. Mesurer impact
    const impact = await this.measureImpact(migration, context);
    
    return {
      detection: targetDetection,
      moduleCode,
      migration,
      synchronization,
      impact
    };
  }
}
```

## ⚠️ Règles Migration Automatisée

### TOUJOURS:

- ✅ Détecter routes automatiquement
- ✅ Générer code module automatiquement
- ✅ Valider après chaque migration
- ✅ Maintenir synchronisation ancien/nouveau
- ✅ Supprimer ancien code après validation
- ✅ Documenter processus migration

### NE JAMAIS:

- ❌ Migrer sans validation
- ❌ Supprimer ancien code avant validation
- ❌ Ignorer synchronisation
- ❌ Ne pas documenter processus

## 🔗 Références

### Règles Intégrées

- `@.cursor/rules/technical-debt-automation.md` - Automatisation dette technique
- `@.cursor/rules/migration-refactoring-manager.md` - Gestionnaire migration/refactoring

---

**Note:** Ce fichier définit le moteur de migration automatisée avec détection, génération code, migration avec validation continue et synchronisation.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

