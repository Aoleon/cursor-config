# Guide de Démarrage Rapide - Nhost Self-Hosted

Ce guide vous permet de démarrer rapidement avec Nhost self-hosted en développement local.

## ✅ Étapes Complétées

1. ✅ Installation des dépendances (`pg` et `@types/pg`)
2. ✅ Configuration des fichiers Docker Compose
3. ✅ Création des scripts de migration et validation
4. ✅ Mise à jour de `server/db.ts` pour support multi-provider
5. ✅ Mise à jour des scripts npm

## 🚀 Prochaines Étapes

### 1. Démarrer Docker Desktop

**Sur macOS:**
```bash
open -a Docker
```

Attendez que Docker Desktop soit complètement démarré (icône Docker dans la barre de menu).

### 2. Configurer l'Environnement Local

Créez un fichier `.env.local` à partir du template :

```bash
cp env.local.example .env.local
```

Éditez `.env.local` et configurez :

```bash
# Pour utiliser Nhost PostgreSQL local
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nhost

# OU pour continuer avec Neon DB en développement
# DATABASE_URL=postgresql://user:password@neon-host/database?sslmode=require
```

### 3. Démarrer les Services Nhost

```bash
# Démarrer tous les services Docker (PostgreSQL, Hasura, Auth, Storage, MinIO, Redis)
npm run nhost:up

# Vérifier que tous les services sont démarrés
docker compose ps

# Voir les logs si nécessaire
npm run nhost:logs
```

### 4. Appliquer le Schéma de Base de Données

```bash
# Appliquer les migrations Drizzle
npm run db:push
```

### 5. Tester la Connexion

```bash
# Démarrer l'application avec Nhost
npm run dev:nhost
```

L'application devrait démarrer et se connecter à Nhost PostgreSQL local.

## 📋 Commandes Utiles

### Gestion des Services Nhost

```bash
# Démarrer les services
npm run nhost:up

# Arrêter les services
npm run nhost:down

# Voir les logs
npm run nhost:logs

# Redémarrer les services
npm run nhost:down && npm run nhost:up
```

### Base de Données

```bash
# Backup de Neon DB (si vous utilisez encore Neon)
npm run db:backup

# Migration vers Nhost (quand vous êtes prêt)
npm run db:migrate:nhost

# Valider la migration
npm run db:validate:migration

# Appliquer le schéma Drizzle
npm run db:push
```

### Accès aux Services

Une fois les services démarrés, vous pouvez accéder à :

- **PostgreSQL**: `localhost:5432` (user: `postgres`, password: `postgres`)
- **Hasura Console**: `http://localhost:1337` (non utilisé mais disponible)
- **Nhost Auth**: `http://localhost:1338` (désactivé, nous utilisons Microsoft OAuth)
- **Nhost Storage**: `http://localhost:1339`
- **MinIO Console**: `http://localhost:9001` (user: `minioadmin`, password: `minioadmin`)
- **Redis**: `localhost:6379`

## 🔍 Vérification

### Vérifier que les Services sont Démarrés

```bash
docker compose ps
```

Vous devriez voir tous les services avec le statut "Up" :
- `nhost-postgres`
- `nhost-hasura`
- `nhost-auth`
- `nhost-storage`
- `nhost-minio`
- `nhost-redis`

### Vérifier la Connexion à PostgreSQL

```bash
# Se connecter à PostgreSQL
docker exec -it nhost-postgres psql -U postgres -d nhost

# Dans psql, tester une requête
SELECT version();
\q
```

### Vérifier les Logs

```bash
# Logs de tous les services
npm run nhost:logs

# Logs d'un service spécifique
docker compose logs postgres
docker compose logs hasura
```

## ⚠️ Dépannage

### Docker n'est pas démarré

```bash
# Vérifier si Docker est en cours d'exécution
docker ps

# Si erreur "Cannot connect to the Docker daemon", démarrer Docker Desktop
open -a Docker
```

### Port déjà utilisé

Si un port est déjà utilisé (par exemple 5432 pour PostgreSQL), vous pouvez :

1. Arrêter le service qui utilise le port
2. Modifier le port dans `docker-compose.yml`
3. Mettre à jour `DATABASE_URL` dans `.env.local`

### Erreur de connexion à la base de données

1. Vérifier que PostgreSQL est démarré : `docker compose ps postgres`
2. Vérifier les logs : `docker compose logs postgres`
3. Vérifier que `DATABASE_URL` est correct dans `.env.local`

### Erreur lors de l'application du schéma

1. Vérifier que PostgreSQL est accessible
2. Vérifier que `DATABASE_URL` pointe vers Nhost PostgreSQL
3. Vérifier les logs : `npm run nhost:logs`

## 📚 Documentation Complète

Pour plus de détails, consultez :
- `docs/NHOST_DEPLOYMENT.md` - Guide complet de déploiement
- `env.local.example` - Toutes les variables d'environnement disponibles
- `env.production.example` - Configuration production

## 🎯 Prochaines Étapes

Une fois que tout fonctionne en local :

1. **Tester la migration** : Si vous avez des données dans Neon, tester la migration vers Nhost local
2. **Valider la migration** : Utiliser `npm run db:validate:migration` pour vérifier
3. **Préparer la production** : Configurer `.env.production` pour le VPS OVH
4. **Déployer en production** : Suivre le guide dans `docs/NHOST_DEPLOYMENT.md`

---

**Note**: L'authentification Microsoft OAuth et l'API REST Express sont conservées et fonctionnent normalement avec Nhost PostgreSQL.


