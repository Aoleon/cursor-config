# Redis Cache Distribution - Guide de Déploiement

## Vue d'ensemble

Redis est déjà configuré dans `docker-compose.yml` et peut être utilisé pour le cache distribué. Le système utilise automatiquement Redis si `REDIS_URL` est configuré, sinon il utilise le cache mémoire.

## Configuration

### 1. Variables d'Environnement

Ajouter dans `.env`:
```bash
REDIS_URL=redis://localhost:6379
# Ou avec authentification:
# REDIS_URL=redis://:password@localhost:6379
```

### 2. Démarrage Redis

```bash
# Démarrage avec Docker Compose
docker compose up -d redis

# Vérification
docker compose ps redis
redis-cli ping  # Devrait retourner PONG
```

### 3. Utilisation Automatique

Le `CacheService` détecte automatiquement Redis et l'utilise si disponible:

```typescript
import { getCacheService } from './services/CacheService';

// Utilise Redis si REDIS_URL est configuré, sinon MemoryCacheAdapter
const cacheService = getCacheService();
```

## Architecture

### Adapters Disponibles

1. **MemoryCacheAdapter** (par défaut)
   - Cache en mémoire
   - Limité à une instance
   - Pas de persistance

2. **RedisCacheAdapter** (si Redis disponible)
   - Cache distribué
   - Partageable entre instances
   - Persistance optionnelle

### Synchronisation EventBus

Le cache Redis est synchronisé via EventBus pour:
- Invalidation automatique lors de modifications
- Synchronisation entre instances
- Métriques partagées

## Métriques de Dette Technique

Le service `TechnicalDebtMetricsService` suit:
- Fichiers monolithiques
- Duplication de code
- Couverture de tests
- Performance (requêtes lentes)
- Documentation

### Accès aux Métriques

```typescript
import { getTechnicalDebtMetricsService } from './services/TechnicalDebtMetricsService';

const metricsService = getTechnicalDebtMetricsService();
const report = metricsService.generateReport();
```

### Alertes

Les alertes sont émises via EventBus si le score global < 60.

## Production

Pour la production, utiliser Redis cluster ou Redis Sentinel pour haute disponibilité.

**Configuration recommandée:**
- Redis cluster avec 3 nœuds minimum
- Persistence activée (AOF + RDB)
- Monitoring avec RedisInsight ou équivalent

