# Installation Agent de Synchronisation Batigest

## Vue d'ensemble

L'agent de synchronisation Batigest est un script PowerShell qui s'exécute sur votre serveur Windows où Batigest est installé. Il :

1. **Poll** l'API Saxium toutes les X minutes
2. **Télécharge** les exports (devis clients, bons de commande) au format XML/CSV
3. **Import** automatiquement les fichiers dans Batigest
4. **Notifie** Saxium du statut de synchronisation

## Prérequis

- **Windows Server** avec PowerShell 5.1+ ou PowerShell Core 7+
- **Sage Batigest** installé et configuré
- **Accès réseau** vers l'API Saxium (HTTPS)
- **Droits administrateur** pour créer des tâches planifiées

## Installation Étape par Étape

### 1. Télécharger le Script

Copiez le fichier `batigest-sync-agent.ps1` dans un répertoire permanent sur votre serveur, par exemple :

```
C:\Program Files\SaxiumBatigestAgent\batigest-sync-agent.ps1
```

### 2. Configuration du Script

Ouvrez `batigest-sync-agent.ps1` avec un éditeur de texte et modifiez les variables de configuration :

```powershell
# URL de votre application Saxium (remplacer par votre URL Replit)
$SAXIUM_API_URL = "https://votre-app.replit.app"

# Répertoires de travail (créés automatiquement)
$WORK_DIR = "C:\SaxiumBatigest"

# Chemin d'import Batigest (vérifier selon votre installation)
$BATIGEST_IMPORT_PATH = "C:\Program Files\Sage\Batigest\Import"
```

### 3. Test Manuel

Exécutez le script manuellement pour vérifier qu'il fonctionne :

```powershell
powershell.exe -ExecutionPolicy Bypass -File "C:\Program Files\SaxiumBatigestAgent\batigest-sync-agent.ps1"
```

**Vérifications** :
- Les répertoires sont créés dans `C:\SaxiumBatigest\`
- Un fichier log est créé dans `C:\SaxiumBatigest\Logs\`
- Le script se connecte à l'API Saxium sans erreur

### 4. Créer la Tâche Planifiée Windows

#### Option A : Via l'Interface Graphique

1. Ouvrir **Planificateur de tâches** (`taskschd.msc`)
2. Cliquer sur **Créer une tâche...**
3. **Général** :
   - Nom : `Saxium Batigest Sync`
   - Description : `Synchronisation automatique Saxium → Batigest`
   - Cocher "Exécuter même si l'utilisateur n'est pas connecté"
   - Cocher "Exécuter avec les autorisations maximales"
4. **Déclencheurs** → Nouveau :
   - Commencer la tâche : **Selon une planification**
   - Répéter la tâche toutes les : **5 minutes**
   - Pendant : **Indéfiniment**
5. **Actions** → Nouveau :
   - Programme/script : `powershell.exe`
   - Ajouter des arguments : `-ExecutionPolicy Bypass -File "C:\Program Files\SaxiumBatigestAgent\batigest-sync-agent.ps1"`
   - Démarrer dans : `C:\SaxiumBatigest`
6. **Conditions** :
   - Décocher "Démarrer uniquement si l'ordinateur est relié au secteur"
7. **Paramètres** :
   - Cocher "Autoriser la tâche à être exécutée à la demande"

#### Option B : Via PowerShell (Automatique)

Exécutez ce script PowerShell **en tant qu'administrateur** :

```powershell
# Configuration
$taskName = "Saxium Batigest Sync"
$scriptPath = "C:\Program Files\SaxiumBatigestAgent\batigest-sync-agent.ps1"

# Créer l'action
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`"" `
    -WorkingDirectory "C:\SaxiumBatigest"

# Créer le déclencheur (toutes les 5 minutes)
$trigger = New-ScheduledTaskTrigger `
    -Once `
    -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes 5) `
    -RepetitionDuration ([TimeSpan]::MaxValue)

# Créer les paramètres
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -DontStopOnIdleEnd

# Créer le principal (utilisateur système)
$principal = New-ScheduledTaskPrincipal `
    -UserId "SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest

# Enregistrer la tâche
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Synchronisation automatique Saxium → Batigest" `
    -Force

Write-Host "✓ Tâche planifiée créée avec succès : $taskName"
```

### 5. Vérification de l'Installation

#### Vérifier la tâche planifiée

```powershell
Get-ScheduledTask -TaskName "Saxium Batigest Sync"
```

#### Vérifier les logs

```powershell
Get-Content "C:\SaxiumBatigest\Logs\sync-$(Get-Date -Format 'yyyy-MM-dd').log" -Tail 50
```

#### Tester manuellement la tâche

```powershell
Start-ScheduledTask -TaskName "Saxium Batigest Sync"
```

## Structure des Répertoires

L'agent crée automatiquement cette structure :

```
C:\SaxiumBatigest\
├── Downloads\          # Fichiers téléchargés depuis Saxium
├── ToImport\           # Fichiers en attente d'import
├── Archive\            # Fichiers importés avec succès
├── Errors\             # Fichiers en erreur
└── Logs\               # Logs journaliers (sync-YYYY-MM-DD.log)
```

## Workflow de Synchronisation

```
┌─────────────────────────────────────────────────────────┐
│  1. SAXIUM (Cloud)                                      │
│     - Génère devis client / bon de commande            │
│     - Convertit en XML/CSV format Batigest             │
│     - Ajoute à la queue d'export (statut: ready)       │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  2. AGENT WINDOWS (Polling toutes les 5 min)           │
│     - GET /api/batigest/exports/pending                │
│     - Télécharge fichiers XML/CSV                      │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  3. IMPORT BATIGEST                                     │
│     - Copie fichier → répertoire import Batigest       │
│     - Batigest traite automatiquement                  │
│     - Vérifie succès (disparition fichier)             │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  4. CONFIRMATION SAXIUM                                 │
│     - POST /api/batigest/exports/{id}/mark-synced      │
│     - OU POST /api/batigest/exports/{id}/mark-error    │
│     - Archive ou déplace vers erreurs                  │
└─────────────────────────────────────────────────────────┘
```

## Configuration Avancée

### Modifier la Fréquence de Synchronisation

Pour changer la fréquence (ex: toutes les 10 minutes) :

1. Ouvrir le Planificateur de tâches
2. Double-cliquer sur "Saxium Batigest Sync"
3. Onglet **Déclencheurs** → Modifier
4. Changer "Répéter la tâche toutes les" à **10 minutes**

### Activer le Mode Verbeux

Modifier le script pour plus de détails dans les logs :

```powershell
# Ajouter en début de script
$VerbosePreference = "Continue"
$DebugPreference = "Continue"
```

### Notifications Email en cas d'Erreur

Ajouter cette fonction au script :

```powershell
function Send-ErrorEmail {
    param([string]$ErrorMessage)
    
    $smtpServer = "smtp.votre-serveur.com"
    $from = "batigest-agent@votre-entreprise.fr"
    $to = "admin@votre-entreprise.fr"
    
    Send-MailMessage `
        -SmtpServer $smtpServer `
        -From $from `
        -To $to `
        -Subject "Erreur Agent Batigest" `
        -Body $ErrorMessage
}

# Utiliser dans les blocs catch
catch {
    Send-ErrorEmail -ErrorMessage $_
    # ...
}
```

## Dépannage

### L'agent ne se connecte pas à Saxium

**Vérifications** :
- URL Saxium correcte dans `$SAXIUM_API_URL`
- Pare-feu Windows autorise PowerShell HTTPS sortant
- Proxy d'entreprise configuré si nécessaire :

```powershell
$proxy = "http://proxy.entreprise.fr:8080"
$env:HTTP_PROXY = $proxy
$env:HTTPS_PROXY = $proxy
```

### Batigest n'importe pas les fichiers

**Vérifications** :
- Chemin `$BATIGEST_IMPORT_PATH` correct
- Droits d'écriture sur le répertoire d'import Batigest
- Format XML conforme aux specs Sage
- Batigest en cours d'exécution

### Les exports restent en statut "pending"

**Causes possibles** :
- Erreur de téléchargement → vérifier logs
- Erreur d'import Batigest → vérifier `C:\SaxiumBatigest\Errors\`
- Agent non démarré → vérifier tâche planifiée

## Monitoring et Surveillance

### Dashboard Saxium

Consultez `/api/batigest/status` pour voir :
- Nombre d'exports en attente
- Nombre d'exports synchronisés
- Erreurs récentes
- Santé de la queue

### Surveillance Logs

Script PowerShell pour surveiller les erreurs :

```powershell
# Affiche les erreurs du jour
Get-Content "C:\SaxiumBatigest\Logs\sync-$(Get-Date -Format 'yyyy-MM-dd').log" | Select-String "ERROR"
```

## Sécurité

- **Chiffrement** : HTTPS obligatoire pour API Saxium
- **Authentification** : Agent ID unique par machine
- **Permissions** : Droits minimaux requis sur Batigest
- **Logs** : Rotation automatique, pas de données sensibles

## Support

En cas de problème :

1. **Consulter les logs** : `C:\SaxiumBatigest\Logs\`
2. **Vérifier la queue** : GET `/api/batigest/exports/pending`
3. **Tester manuellement** : Exécuter le script PowerShell
4. **Contacter le support Saxium** avec :
   - Version agent (`$AGENT_VERSION`)
   - Logs des dernières 24h
   - Capture d'écran erreur Batigest

## Mise à Jour de l'Agent

Pour mettre à jour le script :

1. Arrêter la tâche planifiée
2. Remplacer `batigest-sync-agent.ps1`
3. Tester manuellement
4. Redémarrer la tâche planifiée
5. Vérifier les logs

---

**Version**: 1.0.0  
**Dernière mise à jour**: Octobre 2025  
**Compatibilité**: Sage Batigest i7 / Batigest Connect
