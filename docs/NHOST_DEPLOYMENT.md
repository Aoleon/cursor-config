# Guide de Déploiement Nhost Self-Hosted

Ce guide explique comment déployer Nhost self-hosted avec Docker pour PostgreSQL, en conservant l'architecture Express REST actuelle.

## Table des matières

1. [Prérequis](#prérequis)
2. [Déploiement Local](#déploiement-local)
3. [Déploiement Production (VPS OVH)](#déploiement-production-vps-ovh)
4. [Configuration](#configuration)
5. [Migration des Données](#migration-des-données)
6. [Backup et Restauration](#backup-et-restauration)
7. [Sécurité](#sécurité)
8. [Monitoring](#monitoring)
9. [Dépannage](#dépannage)

## Prérequis

### Développement Local

- Docker Desktop installé et fonctionnel
- Docker Compose v2 ou supérieur
- Node.js 20+ et npm
- Accès à la base de données Neon (pour backup avant migration)

### Production VPS OVH

- Serveur VPS OVH avec Ubuntu 22.04 LTS ou supérieur
- Docker et Docker Compose installés
- Accès SSH au serveur
- Domaine configuré (optionnel mais recommandé)
- Certificat SSL (Let's Encrypt recommandé)

## Déploiement Local

### 1. Configuration Initiale

1. **Cloner le projet** (si ce n'est pas déjà fait)

```bash
git clone <repository-url>
cd jlm-app
```

2. **Créer le fichier `.env.local`**

```bash
cp env.local.example .env.local
```

3. **Éditer `.env.local`** et configurer :

```bash
# Base de données - Utiliser Nhost PostgreSQL local
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nhost

# Ou continuer avec Neon DB en développement
# DATABASE_URL=postgresql://user:password@neon-host/database?sslmode=require

# Configuration Docker Nhost
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=nhost
HASURA_GRAPHQL_ADMIN_SECRET=nhost-admin-secret
```

### 2. Démarrer les Services Nhost

```bash
# Démarrer tous les services (PostgreSQL, Hasura, Auth, Storage, MinIO, Redis)
docker-compose up -d

# Vérifier que tous les services sont démarrés
docker-compose ps

# Voir les logs
docker-compose logs -f
```

### 3. Initialiser le Schéma de Base de Données

```bash
# Appliquer les migrations Drizzle
npm run db:push

# Vérifier la connexion
npm run dev
```

### 4. Accéder aux Services

- **PostgreSQL**: `localhost:5432`
- **Hasura Console**: `http://localhost:1337` (non utilisé mais disponible)
- **Nhost Auth**: `http://localhost:1338` (désactivé, nous utilisons Microsoft OAuth)
- **Nhost Storage**: `http://localhost:1339`
- **MinIO Console**: `http://localhost:9001` (admin/minioadmin par défaut)
- **Redis**: `localhost:6379`

### 5. Arrêter les Services

```bash
# Arrêter tous les services
docker-compose down

# Arrêter et supprimer les volumes (⚠️ supprime les données)
docker-compose down -v
```

## Déploiement Production (VPS OVH)

### 1. Préparation du Serveur

1. **Se connecter au serveur VPS**

```bash
ssh user@your-vps-ip
```

2. **Installer Docker et Docker Compose**

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Installer Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Vérifier l'installation
docker --version
docker-compose --version
```

3. **Créer un utilisateur pour l'application** (optionnel mais recommandé)

```bash
sudo useradd -m -s /bin/bash appuser
sudo usermod -aG docker appuser
sudo su - appuser
```

### 2. Déployer l'Application

1. **Cloner le projet sur le serveur**

```bash
cd ~
git clone <repository-url> jlm-app
cd jlm-app
```

2. **Créer le fichier `.env.production`**

```bash
cp env.production.example .env.production
nano .env.production
```

3. **Configurer les variables d'environnement**

```bash
# Base de données Nhost PostgreSQL
DATABASE_URL=postgresql://postgres:CHANGE_ME_STRONG_PASSWORD@nhost-postgres:5432/nhost

# Configuration Docker Nhost Production
POSTGRES_USER=postgres
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD  # ⚠️ Générer un mot de passe fort
POSTGRES_DB=nhost
HASURA_GRAPHQL_ADMIN_SECRET=CHANGE_ME_STRONG_ADMIN_SECRET  # ⚠️ Générer un secret fort

# Authentification Microsoft (conservée)
AZURE_TENANT_ID=your-azure-tenant-id
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret

# Sécurité
SESSION_SECRET=CHANGE_ME_STRONG_SESSION_SECRET  # ⚠️ Générer un secret fort
CORS_ORIGIN=https://your-domain.com

# MinIO Storage
S3_ACCESS_KEY_ID=CHANGE_ME_MINIO_ACCESS_KEY  # ⚠️ Générer des clés fortes
S3_SECRET_ACCESS_KEY=CHANGE_ME_MINIO_SECRET_KEY

# Redis
REDIS_PASSWORD=CHANGE_ME_REDIS_PASSWORD  # ⚠️ Optionnel mais recommandé
```

4. **Générer des secrets forts**

```bash
# Générer des mots de passe forts
openssl rand -base64 32  # Pour POSTGRES_PASSWORD
openssl rand -base64 32  # Pour HASURA_GRAPHQL_ADMIN_SECRET
openssl rand -base64 32  # Pour SESSION_SECRET
```

5. **Démarrer les services en production**

```bash
# Utiliser docker-compose.production.yml
docker-compose -f docker-compose.production.yml --env-file .env.production up -d

# Vérifier le statut
docker-compose -f docker-compose.production.yml ps

# Voir les logs
docker-compose -f docker-compose.production.yml logs -f
```

### 3. Configuration Réseau et Sécurité

1. **Configurer le pare-feu**

```bash
# Autoriser les ports nécessaires
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (pour Let's Encrypt)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

2. **Configurer Nginx comme reverse proxy** (recommandé)

```bash
# Installer Nginx
sudo apt install nginx

# Créer la configuration
sudo nano /etc/nginx/sites-available/jlm-app
```

Configuration Nginx exemple :

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirection HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Proxy vers l'application Express
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy vers Hasura (si nécessaire)
    location /hasura/ {
        proxy_pass http://localhost:1337/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. **Installer Let's Encrypt SSL**

```bash
# Installer Certbot
sudo apt install certbot python3-certbot-nginx

# Obtenir un certificat
sudo certbot --nginx -d your-domain.com

# Vérifier le renouvellement automatique
sudo certbot renew --dry-run
```

### 4. Initialiser le Schéma de Base de Données

```bash
# Appliquer les migrations Drizzle
npm run db:push

# Vérifier la connexion
npm run start
```

## Configuration

### Variables d'Environnement

#### Développement Local (`.env.local`)

- `DATABASE_URL`: URL de connexion PostgreSQL (Nhost local ou Neon)
- `POSTGRES_USER`: Utilisateur PostgreSQL (défaut: `postgres`)
- `POSTGRES_PASSWORD`: Mot de passe PostgreSQL (défaut: `postgres`)
- `POSTGRES_DB`: Nom de la base de données (défaut: `nhost`)
- `HASURA_GRAPHQL_ADMIN_SECRET`: Secret admin Hasura (défaut: `nhost-admin-secret`)

#### Production (`.env.production`)

- Toutes les variables de développement, plus :
- `SESSION_SECRET`: Secret pour les sessions Express
- `CORS_ORIGIN`: Origine autorisée pour CORS
- `REDIS_PASSWORD`: Mot de passe Redis (optionnel)
- `BACKUP_SCHEDULE`: Planification des backups (format cron)
- `BACKUP_RETENTION_DAYS`: Nombre de jours de rétention des backups

### Basculement entre Neon et Nhost

Le système détecte automatiquement le provider basé sur `DATABASE_URL`:

- **Neon**: Si `DATABASE_URL` contient `neon.tech`
- **Nhost/Standard PostgreSQL**: Sinon

Pour basculer :

```bash
# Utiliser Nhost local
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nhost

# Utiliser Neon DB
export DATABASE_URL=postgresql://user:password@neon-host/database?sslmode=require
```

## Migration des Données

### 1. Backup de Neon DB

Avant toute migration, créer un backup complet :

```bash
# Backup complet de Neon
npm run db:backup

# Le backup sera créé dans ./backups/neon-backup-YYYY-MM-DDTHH-MM-SS.sql
```

### 2. Migration vers Nhost

1. **Démarrer Nhost localement** (ou sur le serveur de production)

```bash
docker-compose up -d
```

2. **Exécuter la migration**

```bash
# Définir les URLs de source et destination
export NEON_DATABASE_URL=postgresql://user:password@neon-host/database?sslmode=require
export NHOST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nhost

# Exécuter la migration
npm run db:migrate:nhost
```

3. **Valider la migration**

```bash
# Valider que toutes les données ont été migrées correctement
npm run db:validate:migration
```

### 3. Migration en Production

⚠️ **Important**: La migration en production doit être effectuée pendant une fenêtre de maintenance.

1. **Mettre l'application en mode maintenance**

2. **Créer un backup complet de Neon**

3. **Démarrer Nhost sur le serveur de production**

4. **Exécuter la migration**

5. **Valider la migration**

6. **Mettre à jour `DATABASE_URL` dans `.env.production`**

7. **Redémarrer l'application**

8. **Vérifier que tout fonctionne correctement**

## Backup et Restauration

### Backup Automatique

Le service `postgres-backup` dans `docker-compose.production.yml` effectue des backups automatiques selon la planification définie dans `BACKUP_SCHEDULE`.

### Backup Manuel

```bash
# Backup manuel de la base de données
docker exec nhost-postgres-prod pg_dump -U postgres nhost > backup-$(date +%Y%m%d-%H%M%S).sql
```

### Restauration

```bash
# Restaurer depuis un backup
docker exec -i nhost-postgres-prod psql -U postgres nhost < backup-YYYYMMDD-HHMMSS.sql
```

## Sécurité

### Recommandations Production

1. **Mots de passe forts**: Utiliser `openssl rand -base64 32` pour générer des secrets
2. **Ports exposés**: Les services ne sont exposés que sur `127.0.0.1` (localhost) dans la configuration production
3. **Reverse proxy**: Utiliser Nginx comme reverse proxy avec SSL/TLS
4. **Pare-feu**: Configurer UFW pour limiter l'accès aux ports nécessaires
5. **Backups réguliers**: Configurer des backups automatiques quotidiens
6. **Monitoring**: Surveiller les logs et les métriques

### Sécurité des Volumes Docker

Les volumes Docker contiennent des données sensibles. Assurez-vous que :

- Les volumes sont stockés dans un emplacement sécurisé
- Les permissions sont correctement configurées
- Les backups sont chiffrés (optionnel mais recommandé)

## Monitoring

### Logs

```bash
# Voir les logs de tous les services
docker-compose -f docker-compose.production.yml logs -f

# Logs d'un service spécifique
docker-compose -f docker-compose.production.yml logs -f postgres
```

### Santé des Services

```bash
# Vérifier le statut des services
docker-compose -f docker-compose.production.yml ps

# Vérifier la santé d'un service
docker inspect nhost-postgres-prod | grep -A 10 Health
```

### Métriques PostgreSQL

```bash
# Se connecter à PostgreSQL
docker exec -it nhost-postgres-prod psql -U postgres -d nhost

# Voir les statistiques
SELECT * FROM pg_stat_database WHERE datname = 'nhost';
```

## Dépannage

### Problèmes Courants

#### 1. Services ne démarrent pas

```bash
# Vérifier les logs
docker-compose logs

# Vérifier les ports utilisés
sudo netstat -tulpn | grep -E '5432|1337|1338|1339'

# Redémarrer les services
docker-compose down
docker-compose up -d
```

#### 2. Erreur de connexion à la base de données

- Vérifier que `DATABASE_URL` est correctement configuré
- Vérifier que PostgreSQL est démarré: `docker-compose ps postgres`
- Vérifier les logs: `docker-compose logs postgres`

#### 3. Erreur de migration

- Vérifier que le schéma Drizzle est à jour
- Vérifier que les deux bases de données sont accessibles
- Vérifier les logs de migration

#### 4. Problèmes de performance

- Vérifier les ressources du serveur (CPU, RAM, disque)
- Ajuster les paramètres PostgreSQL dans `docker-compose.production.yml`
- Vérifier les index de la base de données

### Support

Pour plus d'aide, consulter :

- [Documentation Nhost](https://docs.nhost.io)
- [Documentation Docker](https://docs.docker.com)
- [Documentation PostgreSQL](https://www.postgresql.org/docs/)

---

**Note**: Ce guide est spécifique à l'intégration Nhost self-hosted pour PostgreSQL. L'authentification Microsoft OAuth et l'API REST Express sont conservées et non modifiées.

