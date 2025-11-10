# Checklist Qualité - Saxium

**Checklist exhaustive** pour garantir qualité exemplaire du code.

## ✅ Checklist Avant Commit

### Types et Validation
- [ ] Types TypeScript stricts (pas de `any`)
- [ ] Types depuis `@shared/schema.ts` (pas de types dupliqués)
- [ ] Validation Zod sur toutes les entrées
- [ ] Validation métier après validation technique
- [ ] Messages d'erreur clairs et actionnables

### Gestion d'Erreurs
- [ ] Tous les cas d'erreur couverts
- [ ] Erreurs typées explicites (`ValidationError`, `NotFoundError`, etc.)
- [ ] Messages d'erreur clairs
- [ ] Logging structuré pour debugging
- [ ] Propagation correcte des erreurs
- [ ] `asyncHandler` utilisé pour routes (pas de try-catch)

### Code Clarté
- [ ] Noms de variables/fonctions explicites
- [ ] Fonctions courtes (< 100 lignes)
- [ ] Une responsabilité par fonction
- [ ] Documentation inline pour logique complexe
- [ ] Commentaires pour "pourquoi", pas "quoi"
- [ ] Pas de code dupliqué (DRY principle)

### Sécurité
- [ ] Validation stricte de toutes les entrées
- [ ] Protection contre injections (SQL, XSS, etc.)
- [ ] RBAC vérifié si nécessaire
- [ ] Pas de données sensibles dans logs
- [ ] Rate limiting appliqué si nécessaire

### Performance
- [ ] Cache intelligent avec invalidation
- [ ] Pagination pour listes
- [ ] Lazy loading pour code non critique
- [ ] Memoization pour calculs coûteux
- [ ] Optimisation requêtes SQL (éviter N+1)
- [ ] Index base de données si nécessaire

### Tests
- [ ] Tests écrits pour nouvelle fonctionnalité
- [ ] Tests passent (succès, erreurs, cas limites)
- [ ] Couverture de code vérifiée (85% backend, 80% frontend)
- [ ] Tests E2E pour workflows critiques

### Documentation
- [ ] Documentation inline pour logique complexe
- [ ] Types TypeScript comme documentation
- [ ] README mis à jour si nécessaire
- [ ] Commentaires pour "pourquoi", pas "quoi"

### Logging
- [ ] `logger` utilisé (jamais `console.log`/`error`)
- [ ] Métadonnées structurées incluses
- [ ] Correlation IDs pour traçage
- [ ] Pas de données sensibles dans logs

## ✅ Checklist Code Review

### Qualité Code
- [ ] Respecte tous les standards de qualité
- [ ] Code clair et auto-documenté
- [ ] Pas de code dupliqué
- [ ] Fonctions < 100 lignes
- [ ] Types TypeScript stricts

### Robustesse
- [ ] Gestion d'erreurs exhaustive
- [ ] Validation stricte
- [ ] Protection contre injections
- [ ] Circuit breakers si services externes
- [ ] Timeouts sur opérations asynchrones

### Performance
- [ ] Cache intelligent
- [ ] Pagination pour listes
- [ ] Optimisation requêtes SQL
- [ ] Lazy loading si nécessaire
- [ ] Memoization si nécessaire

### Tests
- [ ] Tests exhaustifs
- [ ] Tests passent
- [ ] Couverture de code maintenue
- [ ] Tests E2E si workflow critique

### Documentation
- [ ] Documentation complète
- [ ] Types TypeScript comme documentation
- [ ] README mis à jour

### Sécurité
- [ ] Validation stricte
- [ ] Protection contre injections
- [ ] RBAC vérifié
- [ ] Pas de données sensibles exposées

## ✅ Checklist Avant Merge

### Tests
- [ ] Tous les tests passent
- [ ] Couverture de code maintenue
- [ ] Tests E2E passent
- [ ] Pas de régression

### Qualité
- [ ] Code review approuvé
- [ ] Standards de qualité respectés
- [ ] Documentation complète
- [ ] Pas de dette technique ajoutée

### Performance
- [ ] Performance vérifiée
- [ ] Pas de régression performance
- [ ] Optimisations appliquées si nécessaire

### Sécurité
- [ ] Sécurité vérifiée
- [ ] Pas de vulnérabilités introduites
- [ ] Validation stricte appliquée

## 🚫 Red Flags (Bloquants)

**NE JAMAIS MERGER si:**
- ❌ Types `any` utilisés
- ❌ Pas de validation Zod
- ❌ Pas de gestion d'erreurs
- ❌ `console.log`/`error` dans code serveur
- ❌ SQL brut (pas via Drizzle ORM)
- ❌ Code dupliqué significatif
- ❌ Fonctions > 150 lignes
- ❌ Pas de tests pour nouvelle fonctionnalité
- ❌ Couverture de code en baisse
- ❌ Données sensibles dans logs

## 🔗 Références

- `@.cursor/rules/quality-principles.md` - Principes de qualité
- `@.cursor/rules/code-quality.md` - Standards qualité code
- `@.cursor/rules/testing.md` - Standards tests
- `@.cursor/rules/performance.md` - Guide performance

---

**Note:** Cette checklist garantit qualité exemplaire. Code qui ne respecte pas ces standards doit être refactorisé avant merge.

