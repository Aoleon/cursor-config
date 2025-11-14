# Cache Services - Architecture

## Services Disponibles

### 1. CacheService
Service de cache général pour données fréquemment accédées (Monday.com, OneDrive, Analytics).

**Localisation:** `server/services/CacheService.ts`

**Fonctionnalités:**
- Cache mémoire avec TTL configurable
- Support Redis (via RedisCacheAdapter)
- Intégration EventBus pour invalidation automatique
- Statistiques de cache (hit rate, miss rate)

### 2. ContextCacheService
Service de cache spécialisé pour les contextes IA enrichis.

**Localisation:** `server/services/ContextCacheService.ts`

**Fonctionnalités:**
- Cache de contextes enrichis (Business, Technical, Relational, Temporal, Administrative)
- Système d'invalidation intelligent par tags
- Cache persistant en base de données
- Compression et optimisation de taille

### 3. CacheInvalidationService (NOUVEAU)
Service centralisé pour gérer les règles d'invalidation du cache.

**Localisation:** `server/services/cache/CacheInvalidationService.ts`

**Fonctionnalités:**
- Règles d'invalidation centralisées
- Invalidation en cascade
- Intégration EventBus pour invalidation automatique
- Support de délais d'invalidation

## Règles d'Invalidation

Les règles d'invalidation sont définies dans `CacheInvalidationService` et couvrent:

- **Projects:** Invalidation en cascade vers offers, suppliers, teams
- **Offers:** Invalidation en cascade vers projects, aos, suppliers
- **AOs:** Invalidation vers offers
- **Suppliers:** Invalidation en cascade avec délai de 5 minutes
- **Analytics:** Invalidation directe sans cascade

## Résilience IA

### Circuit Breakers

Les services IA utilisent des circuit breakers configurés dans `server/services/resilience.ts`:

- **Claude:** Threshold 5 erreurs, timeout 120s
- **GPT:** Threshold 5 erreurs, timeout 120s
- **Fallback automatique:** Si un modèle échoue, bascule vers l'autre

### Fallbacks

- **Cache de réponses dégradées:** Si les deux modèles échouent, retourne une réponse en cache
- **Retry avec backoff:** Jusqu'à 3 tentatives avec délai exponentiel
- **Timeout strict:** Timeout configuré par modèle pour éviter les attentes infinies

## Intégration EventBus

Tous les services de cache s'intègrent avec EventBus pour:
- Invalidation automatique lors de modifications d'entités
- Synchronisation entre services
- Métriques et monitoring

## Configuration

Les TTLs sont configurés dans `server/services/CacheService.ts`:
- Monday boards: 10 minutes
- Analytics KPI: 2 minutes
- OneDrive metadata: 5 minutes
- Contextes IA: 4 heures (par défaut)

