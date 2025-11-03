# Intégration Microsoft OneDrive - Guide Technique

## 📋 Vue d'ensemble

Cette intégration permet à Saxium d'interact avec Microsoft OneDrive pour la gestion documentaire. Elle inclut :

- ✅ Authentification OAuth 2.0 avec Azure AD
- ✅ Opérations de base OneDrive (upload, download, liste, recherche)
- ✅ API REST complète  
- ⏳ Synchronisation automatique (en développement)

## 🔐 Configuration de l'Authentification

### Configuration Azure AD Actuelle

L'application utilise actuellement l'**authentification Client Credentials** (app-only) qui :
- ✅ Ne nécessite pas de connexion utilisateur
- ⚠️ Requiert l'utilisation d'endpoints spécifiques (`/users/{userId}/drive` ou `/drives/{driveId}`)
- ⚠️ Ne peut PAS utiliser les endpoints `/me/*` 

### Credentials Configurés

Les secrets suivants sont configurés dans Replit Secrets :
- `AZURE_CLIENT_ID` : ID de l'application Azure
- `AZURE_CLIENT_SECRET` : Secret client
- `AZURE_TENANT_ID` : ID du tenant Azure

### Permissions Requises

Dans Azure AD App Registration, les permissions suivantes sont configurées :
- `Files.Read.All` - Lecture de tous les fichiers
- `Files.ReadWrite.All` - Lecture et écriture de tous les fichiers
- `Sites.Read.All` - Lecture des sites SharePoint

**Important** : Ces permissions nécessitent le consentement administrateur dans Azure AD.

## 🏗️ Architecture

### Services

#### 1. MicrosoftAuthService (`server/services/MicrosoftAuthService.ts`)
- Gère l'authentification OAuth 2.0
- Cache automatique des tokens (rafraîchissement 5 min avant expiration)
- Singleton pour réutilisation

```typescript
import { microsoftAuthService } from './MicrosoftAuthService';

const token = await microsoftAuthService.getAccessToken();
```

#### 2. OneDriveService (`server/services/OneDriveService.ts`)
- Opérations CRUD sur OneDrive
- Support des petits fichiers (<4MB) et grands fichiers (>4MB)
- Méthodes principales :
  - `getDriveInfo()` - Informations sur le drive
  - `listItems(path)` - Liste des fichiers/dossiers
  - `uploadSmallFile(buffer, options)` - Upload fichier <4MB
  - `uploadLargeFile(buffer, options)` - Upload fichier >4MB avec chunks
  - `downloadFile(itemId)` - Téléchargement
  - `searchFiles(query)` - Recherche
  - `createShareLink(itemId, options)` - Lien de partage

```typescript
import { oneDriveService } from './OneDriveService';

// Lister les fichiers
const items = await oneDriveService.listItems('Documents/AO');

// Upload un fichier
const file = await oneDriveService.uploadSmallFile(buffer, {
  path: 'Documents',
  fileName: 'devis.pdf',
  conflictBehavior: 'rename'
});
```

#### 3. OneDriveSyncService (`server/services/OneDriveSyncService.ts`) ⏳

**Statut** : En développement - Nécessite l'extension de IStorage

Ce service permettra la synchronisation automatique des dossiers AO depuis OneDrive.

**Dépendances manquantes** :
- `IStorage.getAllDocuments()` - Non implémenté
- `IStorage.createDocument()` - Non implémenté  
- `IStorage.updateDocument()` - Non implémenté

**TODO** : Étendre l'interface IStorage avec ces méthodes ou adapter pour utiliser les méthodes existantes.

### Routes API

**Base URL** : `/api/onedrive`

Toutes les routes requièrent l'authentification.

#### Informations Drive

```http
GET /api/onedrive/info
```

Retourne les informations sur le drive OneDrive.

#### Liste des fichiers

```http
GET /api/onedrive/list?path=Documents/AO
```

Liste les fichiers et dossiers à un chemin donné.

#### Récupérer un item

```http
GET /api/onedrive/item/:itemId
GET /api/onedrive/item-by-path?path=Documents/file.pdf
```

#### Upload

```http
POST /api/onedrive/upload
Content-Type: multipart/form-data

{
  "file": <binary>,
  "path": "Documents",
  "conflictBehavior": "rename" | "replace" | "fail"
}
```

#### Download

```http
GET /api/onedrive/download/:itemId
```

Télécharge un fichier.

#### Recherche

```http
GET /api/onedrive/search?q=devis
```

Recherche des fichiers par nom ou contenu.

#### Créer un dossier

```http
POST /api/onedrive/folder
Content-Type: application/json

{
  "name": "Nouveau Dossier",
  "parentPath": "Documents"
}
```

#### Partage

```http
POST /api/onedrive/share/:itemId
Content-Type: application/json

{
  "type": "view" | "edit" | "embed",
  "scope": "anonymous" | "organization"
}
```

#### Gestion des fichiers

```http
DELETE /api/onedrive/item/:itemId
POST /api/onedrive/copy/:itemId
PATCH /api/onedrive/item/:itemId
```

## 💾 Base de Données

### Extension du Schéma

La table `documents` a été étendue avec les champs suivants :

```sql
-- Intégration OneDrive
onedrive_id VARCHAR,              -- ID du fichier sur OneDrive
onedrive_path TEXT,                -- Chemin complet sur OneDrive
onedrive_url TEXT,                 -- URL web du fichier
onedrive_share_link TEXT,          -- Lien de partage si créé
synced_from_onedrive BOOLEAN,      -- Document provient d'OneDrive
last_synced_at TIMESTAMP,          -- Dernière synchronisation

-- Index
CREATE INDEX documents_onedrive_id_idx ON documents(onedrive_id);
CREATE INDEX documents_synced_onedrive_idx ON documents(synced_from_onedrive);
```

**Migration** : Les champs ont été ajoutés au schéma Drizzle (`shared/schema.ts`). Exécutez `npm run db:push` pour appliquer les changements à la base de données.

## 🚀 Utilisation

### Tester l'Authentification

```bash
# Via l'API
curl http://localhost:5000/api/onedrive/info \
  -H "Cookie: connect.sid=<votre-session-id>"
```

### Exemple Frontend (React Query)

```typescript
import { useQuery } from '@tanstack/react-query';

function OneDriveExplorer() {
  const { data: items } = useQuery({
    queryKey: ['/api/onedrive/list', path],
    enabled: !!path
  });

  return (
    <div>
      {items?.data?.items.map(item => (
        <div key={item.id}>
          {item.name} {item.isFolder ? '📁' : '📄'}
        </div>
      ))}
    </div>
  );
}
```

## ⚠️ Limitations Actuelles

### 1. Authentification

**Problème** : L'authentification Client Credentials ne fonctionne pas avec les endpoints `/me/*`.

**Solutions** :

#### Option A : Utiliser l'email/userId spécifique
```typescript
// Au lieu de /me/drive
const drive = await oneDriveService.getDriveByUserId('user@domain.com');
```

#### Option B : Passer à l'authentification déléguée (Recommandé)
Nécessite :
1. Configurer OAuth 2.0 flow avec redirect URI
2. Implémenter le flow d'autorisation utilisateur
3. Stocker les refresh tokens par utilisateur

### 2. Synchronisation Automatique

La synchronisation automatique des dossiers AO nécessite :
- Extension de l'interface `IStorage` avec les méthodes documents
- Implémentation de la persistence dans le storage layer
- Mapping intelligent entre chemins OneDrive et références AO

**Statut** : À implémenter

### 3. Gestion des Permissions

L'application nécessite le consentement administrateur Azure AD pour accéder aux fichiers de tous les utilisateurs.

## 🔧 Prochaines Étapes

### Phase 1 : Fonctionnel de Base ✅
- [x] Service d'authentification
- [x] Service OneDrive avec opérations CRUD
- [x] Routes API
- [x] Extension du schéma DB

### Phase 2 : Synchronisation (En cours)
- [ ] Étendre IStorage avec méthodes documents
- [ ] Implémenter OneDriveSyncService
- [ ] Endpoint de synchronisation manuelle
- [ ] Synchronisation automatique périodique

### Phase 3 : Interface Utilisateur
- [ ] Page de navigation OneDrive
- [ ] Upload/download de fichiers
- [ ] Recherche de documents
- [ ] Configuration de la synchronisation

### Phase 4 : Optimisations
- [ ] Webhook OneDrive pour sync en temps réel
- [ ] Cache des métadonnées de fichiers
- [ ] Retry logic avec exponential backoff
- [ ] Monitoring et alertes

## 📚 Ressources

- [Microsoft Graph API - OneDrive](https://learn.microsoft.com/en-us/graph/onedrive-concept-overview)
- [Azure AD App Registration](https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps)
- [Microsoft Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer) - Pour tester les appels API

## 🐛 Débogage

### Token d'accès invalide (401)

1. Vérifier que les credentials Azure sont corrects
2. Vérifier que les permissions sont accordées et consenties
3. Vérifier l'expiration du token (cache de 55 minutes)

```typescript
// Forcer le rafraîchissement du token
await microsoftAuthService.refreshToken();
```

### Endpoint non trouvé (404)

1. Vérifier le chemin du fichier (sensible à la casse)
2. Vérifier que le fichier existe
3. Utiliser l'ID du fichier plutôt que le chemin si possible

### Upload échoue

1. Vérifier la taille du fichier (<4MB = small, >4MB = large)
2. Vérifier les permissions d'écriture
3. Vérifier le comportement de conflit

## 📞 Support

Pour toute question sur l'intégration OneDrive, consultez :
- Ce README
- Le code source commenté
- Les logs de l'application (structured logging)
