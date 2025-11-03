# Runbook Opérationnel - Synchronisation OneDrive

## Vue d'ensemble

Ce document fournit toutes les informations nécessaires pour opérer, monitorer et dépanner le système de synchronisation OneDrive de Saxium.

**Version**: 1.0  
**Dernière mise à jour**: Novembre 2025  
**Responsable**: Équipe DevOps Saxium

---

## Table des matières

1. [Architecture](#architecture)
2. [Configuration](#configuration)
3. [Monitoring](#monitoring)
4. [Troubleshooting](#troubleshooting)
5. [Procédures opérationnelles](#procédures-opérationnelles)
6. [Métriques et SLAs](#métriques-et-slas)
7. [Checklist de santé](#checklist-de-santé)

---

## Architecture

### Composants principaux

```
┌─────────────────┐
│  SyncScheduler  │  → Planification automatique (cron)
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ DocumentSyncService │  → Orchestration synchronisation
└────────┬────────────┘
         │
         ▼
┌─────────────────┐
│ OneDriveService │  → API Microsoft Graph
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  CacheService   │  → Cache métadonnées (Redis/Memory)
└─────────────────┘
```

### Flux de données

1. **Déclenchement**
   - Automatique: Cron job (configurable via `ONEDRIVE_SYNC_SCHEDULE`)
   - Manuel: API `/api/sync/onedrive/:aoId`

2. **Synchronisation**
   - Invalidation cache pour garantir fraîcheur
   - Scan parallèle des 3 catégories OneDrive
   - Delta sync incrémentale (si delta token disponible)
   - Création/Mise à jour/Suppression documents en DB

3. **Persistence**
   - Documents stockés en PostgreSQL
   - Métadonnées OneDrive cachées (Redis ou mémoire)
   - Delta tokens persistés (1h TTL)

---

## Configuration

### Variables d'environnement

#### Obligatoires (Production)

```bash
# Microsoft Azure OAuth
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret

# Database
DATABASE_URL=postgresql://user:password@host:5432/db

# Node Environment
NODE_ENV=production
```

#### Optionnelles

```bash
# OneDrive Sync Schedule (cron format)
# Par défaut: "0 */6 * * *" (toutes les 6 heures)
ONEDRIVE_SYNC_SCHEDULE="0 */4 * * *"

# OneDrive Sync Enabled
# Par défaut: true
ONEDRIVE_SYNC_ENABLED=true

# Cache Provider (redis ou memory)
# Par défaut: memory en dev, redis en prod
CACHE_PROVIDER=redis

# Redis URL (si CACHE_PROVIDER=redis)
REDIS_URL=redis://localhost:6379

# OneDrive Taxonomy Configuration (JSON)
# Override de la structure de dossiers
ONEDRIVE_TAXONOMY_CONFIG='{"basePath":"OneDrive-Custom","aoPrefix":"Project"}'

# Logging Level
LOG_LEVEL=info  # debug, info, warn, error
```

### Configuration taxonomie OneDrive

**Structure par défaut** :
```
OneDrive-JLM/
  └── 01 - ETUDES AO/
      └── AO-{reference}/
          ├── 01-DCE-Cotes-Photos/
          ├── 02-Etudes-fournisseurs/
          └── 03-Devis-pieces-administratives/
```

**Override personnalisé** :
```javascript
// server/config/onedrive.config.ts
export const DEFAULT_ONEDRIVE_TAXONOMY = {
  basePath: 'OneDrive-JLM',
  studiesPath: '01 - ETUDES AO',
  aoPrefix: 'AO',
  categories: [
    '01-DCE-Cotes-Photos',
    '02-Etudes-fournisseurs',
    '03-Devis-pieces-administratives'
  ]
};
```

### Cache TTL Configuration

```typescript
// server/services/CacheService.ts
export const TTL_CONFIG = {
  // OneDrive metadata caching
  ONEDRIVE_FILE_METADATA: 5 * 60,      // 5 minutes
  ONEDRIVE_DIRECTORY_LIST: 3 * 60,     // 3 minutes
  ONEDRIVE_DELTA_LINK: 60 * 60,        // 1 heure
  ONEDRIVE_DRIVE_INFO: 10 * 60,        // 10 minutes
};
```

### Circuit Breaker Configuration

```typescript
// server/services/resilience.ts
const CIRCUIT_BREAKER_CONFIG = {
  OneDrive: {
    failureThreshold: 4,        // 4 échecs avant ouverture
    timeout: 90000,             // 90 secondes
    resetTimeout: 60000,        // 60s avant tentative reset
  }
};

const RETRY_CONFIG = {
  OneDrive: {
    maxAttempts: 4,
    initialDelay: 1000,         // 1s
    maxDelay: 15000,            // 15s
    backoffMultiplier: 2,       // Exponentiel
  }
};
```

---

## Monitoring

### Métriques clés

#### 1. Santé du système

**Endpoint**: `GET /api/sync/health`

```bash
curl http://localhost:5000/api/sync/health
```

**Réponse attendue** :
```json
{
  "status": "healthy",
  "services": {
    "scheduler": {
      "running": true,
      "schedule": "0 */6 * * *",
      "nextRun": "2025-11-03T18:00:00.000Z"
    },
    "onedrive": {
      "configured": true,
      "authenticated": true
    },
    "cache": {
      "provider": "redis",
      "connected": true
    }
  },
  "lastSync": {
    "status": "success",
    "timestamp": "2025-11-03T12:00:00.000Z",
    "totalAOs": 42,
    "documentsAdded": 15,
    "documentsUpdated": 3,
    "documentsDeleted": 1,
    "duration": 12340,
    "errors": []
  }
}
```

#### 2. Statut synchronisation

**Endpoint**: `GET /api/sync/status`

```bash
curl http://localhost:5000/api/sync/status
```

**Indicateurs** :
- `lastSyncStatus`: success | error | running
- `lastSyncAt`: Date dernière sync
- `nextSyncAt`: Date prochaine sync
- `isEnabled`: Scheduler activé ou non

#### 3. Logs structurés

**Recherche dans les logs** :

```bash
# Logs de synchronisation
grep "[DocumentSyncService]" /tmp/logs/server_*.log

# Erreurs OneDrive
grep "ERROR.*OneDrive" /tmp/logs/server_*.log

# Performance cache
grep "Cache.*hit\|miss" /tmp/logs/server_*.log

# Circuit breaker events
grep "Circuit.*opened\|closed" /tmp/logs/server_*.log
```

**Patterns importants** :
- `[DocumentSyncService] Début synchronisation` → Démarrage sync
- `[DocumentSyncService] Cache OneDrive invalidé` → Cache refresh
- `[DocumentSyncService] Synchronisation terminée` → Fin sync
- `[OneDriveService] Circuit breaker opened` → ⚠️ Service dégradé

### Dashboards recommandés

#### Grafana / Datadog

**Métriques à tracker** :
1. **Sync Success Rate** : `(syncs_success / syncs_total) × 100`
2. **Sync Duration** : Temps moyen/p95/p99 de synchronisation
3. **Documents Synced** : Nombre de docs ajoutés/mis à jour/supprimés
4. **Error Rate** : Taux d'erreurs par catégorie
5. **Cache Hit Rate** : `(cache_hits / cache_requests) × 100`
6. **Circuit Breaker Status** : État ouvert/fermé par service

**Alertes recommandées** :
- 🚨 **Critique** : Sync échoue 3 fois consécutives
- ⚠️ **Warning** : Circuit breaker OneDrive ouvert
- ℹ️ **Info** : Sync duration > 60s (p95)

---

## Troubleshooting

### Problèmes fréquents

#### 1. Sync échoue avec "Authentication failed"

**Symptômes** :
```
[OneDriveService] Erreur API Microsoft Graph: Authentication failed
```

**Diagnostic** :
```bash
# Vérifier tokens OAuth
curl http://localhost:5000/api/auth/health

# Vérifier env vars
echo $AZURE_CLIENT_ID
echo $AZURE_TENANT_ID
```

**Solutions** :
1. Vérifier que `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` sont définis
2. Tokens expirés → Forcer refresh via `/api/login/microsoft`
3. Vérifier permissions Microsoft Graph: `Files.Read.All`, `Sites.Read.All`

**Temps résolution** : 5-10 minutes

---

#### 2. Cache retourne données obsolètes

**Symptômes** :
```
Documents récemment ajoutés sur OneDrive n'apparaissent pas après sync
```

**Diagnostic** :
```bash
# Vérifier logs d'invalidation cache
grep "Cache OneDrive invalidé" /tmp/logs/server_*.log

# Vérifier TTL cache
redis-cli TTL "cache:onedrive:*"
```

**Solutions** :
1. ✅ **Automatique** : Cache invalidé au début de chaque sync (depuis perf-5 fix)
2. **Manuel** : Forcer sync avec `force=true` → `/api/sync/onedrive/:aoId?force=true`
3. **Emergency** : Flush cache Redis : `redis-cli FLUSHDB`

**Temps résolution** : Immédiat

---

#### 3. Circuit breaker ouvert

**Symptômes** :
```
[OneDriveService] Circuit breaker opened for OneDrive API
```

**Diagnostic** :
```bash
# Vérifier état circuit breaker
curl http://localhost:5000/api/sync/health | jq '.services.onedrive'

# Vérifier logs erreurs OneDrive
grep "OneDrive.*error\|timeout" /tmp/logs/server_*.log | tail -20
```

**Solutions** :
1. **Attendre reset automatique** : 60 secondes (voir `resetTimeout`)
2. **Identifier root cause** :
   - Rate limiting Microsoft ? → Réduire fréquence sync
   - Timeout réseau ? → Vérifier connectivité
   - API down ? → Vérifier [Microsoft Service Health](https://status.cloud.microsoft)
3. **Forcer reset** : Redémarrer workflow "Start application"

**Temps résolution** : 1-5 minutes (auto-heal) ou 10-30 minutes (investigation)

---

#### 4. Sync très lent (> 60s)

**Symptômes** :
```
[DocumentSyncService] Synchronisation terminée - duration: 85000ms
```

**Diagnostic** :
```bash
# Analyser performance par catégorie
grep "Catégorie.*scannée" /tmp/logs/server_*.log

# Vérifier nombre de fichiers
# Temps attendu: ~500ms par catégorie (vide) à 5s (50+ fichiers)
```

**Solutions** :
1. **Optimisation activée** :
   - ✅ Delta sync incrémentale (si delta token disponible)
   - ✅ Parallélisation scan catégories
   - ✅ Pagination automatique (200 items/page)
   - ✅ Cache métadonnées
2. **Si toujours lent** :
   - Vérifier latence réseau vers Microsoft Graph API
   - Considérer réduire fréquence sync (ex: toutes les 8h au lieu de 6h)
   - Monitorer taille répertoires OneDrive (>500 fichiers/catégorie = anormal)

**Temps résolution** : Variable (investigation réseau)

---

#### 5. Documents en double dans la DB

**Symptômes** :
```sql
SELECT name, COUNT(*) FROM documents 
WHERE entity_type = 'ao' AND entity_id = 'ao-123' 
GROUP BY name HAVING COUNT(*) > 1;
```

**Diagnostic** :
```bash
# Vérifier si oneDriveId est bien unique
SELECT onedrive_id, COUNT(*) FROM documents 
WHERE onedrive_id IS NOT NULL 
GROUP BY onedrive_id HAVING COUNT(*) > 1;
```

**Solutions** :
1. **Prévention** : `oneDriveId` utilisé comme clé unique (mapping existingDocsMap)
2. **Cleanup** : Script SQL pour dédupliquer :
```sql
-- Supprimer doublons (garder le plus récent)
DELETE FROM documents d1
WHERE id NOT IN (
  SELECT MAX(id) FROM documents d2 
  WHERE d2.onedrive_id = d1.onedrive_id 
  GROUP BY onedrive_id
);
```

**Temps résolution** : 15-30 minutes

---

#### 6. Erreur "Sync already in progress"

**Symptômes** :
```
[DocumentSyncService] Synchronisation déjà en cours pour AO ao-123
```

**Diagnostic** :
```bash
# Vérifier locks actifs
# DocumentSyncService utilise Set syncInProgress
```

**Solutions** :
1. **Normal** : Sync déjà lancée, attendre fin (timeout: 120s)
2. **Bloqué** : Redémarrer workflow pour clear locks
3. **Prévention** : Ne pas lancer syncs manuelles simultanées pour même AO

**Temps résolution** : 2 minutes (attente) ou 30s (restart)

---

### Debugging avancé

#### Activer logging debug

```bash
# Temporaire (runtime)
export LOG_LEVEL=debug
npm run dev

# Logs détaillés OneDrive API
grep -A 5 "[OneDriveService]" /tmp/logs/server_*.log | grep "debug"
```

#### Tracer une synchronisation

```bash
# 1. Déclencher sync manuel avec logging
curl -X POST http://localhost:5000/api/sync/onedrive/ao-2503

# 2. Suivre logs en temps réel
tail -f /tmp/logs/server_*.log | grep "ao-2503"

# 3. Analyser résultat
grep "ao-2503.*Synchronisation terminée" /tmp/logs/server_*.log
```

#### Inspecter cache Redis

```bash
# Lister toutes les clés OneDrive
redis-cli KEYS "cache:onedrive:*"

# Voir contenu d'une clé
redis-cli GET "cache:onedrive:delta:ao-2503"

# Vérifier TTL restant
redis-cli TTL "cache:onedrive:delta:ao-2503"

# Flush cache OneDrive seulement
redis-cli KEYS "cache:onedrive:*" | xargs redis-cli DEL
```

---

## Procédures opérationnelles

### Démarrage initial

**Checklist** :

1. ✅ Variables d'environnement configurées
2. ✅ Base de données PostgreSQL accessible
3. ✅ Redis configuré (si production)
4. ✅ Microsoft OAuth configuré avec permissions correctes
5. ✅ Au moins un utilisateur admin créé
6. ✅ Connexion OneDrive testée via `/api/auth/health`

**Commandes** :
```bash
# 1. Vérifier configuration
npm run check:config  # (à créer)

# 2. Démarrer application
npm run dev

# 3. Vérifier santé
curl http://localhost:5000/api/sync/health

# 4. Lancer première sync (optionnel)
curl -X POST http://localhost:5000/api/sync/manual
```

---

### Maintenance planifiée

#### Mise à jour taxonomie OneDrive

**Étapes** :

1. **Backup configuration actuelle**
```bash
cp server/config/onedrive.config.ts server/config/onedrive.config.ts.backup
```

2. **Modifier taxonomie**
```typescript
// server/config/onedrive.config.ts
export const DEFAULT_ONEDRIVE_TAXONOMY = {
  basePath: 'OneDrive-New',
  categories: [
    '01-Nouveau-Dossier',
    '02-Dossier-Bis',
    // ...
  ]
};
```

3. **Tester en dev**
```bash
NODE_ENV=development npm run dev
curl -X POST http://localhost:5000/api/sync/onedrive/ao-test
```

4. **Déployer en prod**
```bash
git commit -am "feat: Update OneDrive taxonomy"
git push origin main
# → Auto-deploy via CI/CD
```

5. **Vérifier sync post-déploiement**
```bash
curl https://saxium-prod.replit.app/api/sync/health
```

---

#### Nettoyage cache

**Fréquence recommandée** : Tous les 30 jours

```bash
# Option 1: Flush cache Redis complet
redis-cli FLUSHDB

# Option 2: Flush cache OneDrive seulement
redis-cli KEYS "cache:onedrive:*" | xargs redis-cli DEL

# Option 3: Via API (à implémenter)
curl -X POST http://localhost:5000/api/cache/clear \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

#### Migration de données

**Scénario** : Changer structure de dossiers OneDrive

**Étapes** :

1. **Désactiver sync automatique**
```bash
# Via env var
export ONEDRIVE_SYNC_ENABLED=false
```

2. **Réorganiser dossiers dans OneDrive**
```
# Ancienne structure
OneDrive-JLM/01 - ETUDES AO/AO-2503/...

# Nouvelle structure
OneDrive-JLM/Projects/AO-2503/...
```

3. **Mettre à jour configuration**
```typescript
// server/config/onedrive.config.ts
basePath: 'OneDrive-JLM/Projects'
```

4. **Re-sync complète** (force mode)
```bash
# Pour chaque AO
curl -X POST http://localhost:5000/api/sync/onedrive/ao-2503?force=true
```

5. **Réactiver scheduler**
```bash
export ONEDRIVE_SYNC_ENABLED=true
```

---

### Procédure d'incident

#### Niveau 1 : Service dégradé (sync échoue)

**Actions** :

1. ✅ Vérifier logs : `grep ERROR /tmp/logs/server_*.log | tail -50`
2. ✅ Tester connectivité OneDrive : `curl https://graph.microsoft.com/v1.0/me`
3. ✅ Vérifier circuit breaker : `GET /api/sync/health`
4. ✅ Tenter sync manuelle : `POST /api/sync/onedrive/:aoId`
5. ⚠️ Si échec persistant → Escalade Niveau 2

**SLA** : Résolution < 30 minutes

---

#### Niveau 2 : Incident majeur (service down)

**Actions** :

1. 🚨 **Alerter équipe** : #ops-alerts Slack
2. 🔍 **Diagnostic approfondi** :
   ```bash
   # Vérifier tous les services
   curl http://localhost:5000/health
   
   # Vérifier DB
   psql $DATABASE_URL -c "SELECT 1"
   
   # Vérifier Redis
   redis-cli PING
   
   # Analyser logs d'erreur
   grep -A 10 "FATAL\|CRITICAL" /tmp/logs/server_*.log
   ```
3. 🔄 **Rollback si nécessaire** :
   ```bash
   git revert HEAD
   npm run deploy
   ```
4. 📝 **Post-mortem** : Documenter incident dans `docs/incidents/`

**SLA** : Résolution < 2 heures

---

## Métriques et SLAs

### Service Level Objectives (SLOs)

| Métrique | Objectif | Mesure |
|----------|----------|--------|
| **Disponibilité sync** | 99.5% | Uptime mensuel |
| **Sync success rate** | 98% | Syncs réussies / total |
| **Sync duration (p95)** | < 30s | Temps de traitement |
| **Freshness garantie** | 100% | Cache invalidé avant sync |
| **Error recovery** | < 5 min | Circuit breaker reset |

### Indicateurs de performance

**Baseline (environnement prod)** :

- **AO avec 10 documents** : ~2-5 secondes
- **AO avec 50 documents** : ~10-15 secondes
- **AO avec 100+ documents** : ~20-30 secondes
- **Sync globale (50 AOs)** : ~3-5 minutes

**Optimisations actives** :

- ✅ Delta sync : -70% appels API (sync incrémentale)
- ✅ Parallélisation : -66% temps scan (3 catégories simultanées)
- ✅ Cache : -50% latence (métadonnées cached)
- ✅ Pagination : Support 10000+ fichiers/dossier

---

## Checklist de santé

### Daily Health Check

```bash
#!/bin/bash
# daily-health-check.sh

echo "=== OneDrive Sync Health Check ==="

# 1. Service health
echo "1. Checking service health..."
curl -s http://localhost:5000/api/sync/health | jq '.status'

# 2. Last sync status
echo "2. Checking last sync..."
curl -s http://localhost:5000/api/sync/status | jq '.lastSyncStatus'

# 3. Error rate (last 24h)
echo "3. Checking error rate..."
errors=$(grep -c "ERROR.*DocumentSyncService" /tmp/logs/server_*.log)
echo "Errors in last 24h: $errors"

# 4. Cache hit rate
echo "4. Checking cache performance..."
redis-cli INFO stats | grep keyspace_hits

# 5. Circuit breaker status
echo "5. Checking circuit breakers..."
curl -s http://localhost:5000/api/sync/health | jq '.services.onedrive'

echo "=== Health Check Complete ==="
```

**Exécution recommandée** : Cron job quotidien à 8h00

---

### Weekly Review

**Questions à se poser** :

1. ✅ Le scheduler tourne-t-il régulièrement ? (vérifier `nextSyncAt`)
2. ✅ Y a-t-il des AOs avec sync échouée persistante ? (> 3 jours)
3. ✅ Les temps de sync augmentent-ils ? (tendance à la hausse)
4. ✅ Le cache hit rate est-il satisfaisant ? (> 60%)
5. ✅ Y a-t-il des erreurs récurrentes dans les logs ?

**Actions préventives** :

- Nettoyer documents orphelins en DB
- Optimiser index PostgreSQL si ralentissement
- Monitorer croissance stockage OneDrive
- Vérifier rotation logs (éviter saturation disque)

---

## Annexes

### A. Commandes utiles

```bash
# Sync manuelle d'un AO
curl -X POST http://localhost:5000/api/sync/onedrive/ao-2503

# Sync manuelle forcée (ignore cache)
curl -X POST "http://localhost:5000/api/sync/onedrive/ao-2503?force=true"

# Sync globale tous les AOs
curl -X POST http://localhost:5000/api/sync/manual

# Vérifier configuration scheduler
curl http://localhost:5000/api/sync/status | jq '.schedule'

# Désactiver scheduler
curl -X POST http://localhost:5000/api/sync/disable

# Réactiver scheduler
curl -X POST http://localhost:5000/api/sync/enable

# Obtenir détails dernière sync
curl http://localhost:5000/api/sync/history/latest
```

### B. Références externes

- [Microsoft Graph API Documentation](https://learn.microsoft.com/en-us/graph/api/overview)
- [OneDrive API Reference](https://learn.microsoft.com/en-us/graph/api/resources/onedrive)
- [Delta Query Docs](https://learn.microsoft.com/en-us/graph/delta-query-overview)
- [Azure OAuth Setup](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)

### C. Contacts et escalade

| Niveau | Contact | Délai réponse |
|--------|---------|---------------|
| L1 Support | support@saxium.fr | < 1h (heures ouvrées) |
| L2 DevOps | devops@saxium.fr | < 2h (24/7) |
| L3 Architecture | architecture@saxium.fr | < 4h (urgences) |

---

**Fin du runbook**  
Prochaine révision : Février 2026
