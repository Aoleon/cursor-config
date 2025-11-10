# =====================================================
# SAXIUM → BATIGEST SYNCHRONISATION AGENT
# =====================================================
# 
# Agent Windows PowerShell pour synchronisation automatique
# des exports Saxium vers Sage Batigest
#
# Installation:
# 1. Configurer les variables ci-dessous
# 2. Créer tâche planifiée Windows (toutes les 5 minutes)
# 3. Vérifier les logs dans C:\SaxiumBatigest\Logs
#
# =====================================================

# ========================================
# CONFIGURATION
# ========================================

# URL API Saxium (remplacer par votre URL)
$SAXIUM_API_URL = "https://votre-app.replit.app"

# Répertoires de travail
$WORK_DIR = "C:\SaxiumBatigest"
$DOWNLOAD_DIR = "$WORK_DIR\Downloads"
$IMPORT_DIR = "$WORK_DIR\ToImport"
$ARCHIVE_DIR = "$WORK_DIR\Archive"
$LOG_DIR = "$WORK_DIR\Logs"
$ERROR_DIR = "$WORK_DIR\Errors"

# Chemin d'import Batigest (à adapter selon votre installation)
$BATIGEST_IMPORT_PATH = "C:\Program Files\Sage\Batigest\Import"

# Configuration agent
$AGENT_ID = [System.Environment]::MachineName
$AGENT_VERSION = "1.0.0"

# Délai entre tentatives en cas d'erreur (secondes)
$RETRY_DELAY = 60

# ========================================
# INITIALISATION
# ========================================

# Créer les répertoires si nécessaires
$directories = @($WORK_DIR, $DOWNLOAD_DIR, $IMPORT_DIR, $ARCHIVE_DIR, $LOG_DIR, $ERROR_DIR)
foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# Fichier log avec timestamp
$logFile = "$LOG_DIR\sync-$(Get-Date -Format 'yyyy-MM-dd').log"

# ========================================
# FONCTIONS UTILITAIRES
# ========================================

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    Write-Host $logMessage
    Add-Content -Path $logFile -Value $logMessage
}

function Get-PendingExports {
    try {
        Write-Log "Récupération des exports en attente..."
        
        $url = "$SAXIUM_API_URL/api/batigest/exports/pending?limit=50&agentId=$AGENT_ID"
        $response = Invoke-RestMethod -Uri $url -Method GET -ContentType "application/json"
        
        if ($response.data) {
            Write-Log "Trouvé $($response.data.Count) export(s) en attente"
            return $response.data
        }
        
        return @()
    }
    catch {
        Write-Log "Erreur lors de la récupération des exports: $_" -Level "ERROR"
        return @()
    }
}

function Download-ExportFile {
    param(
        [string]$ExportId,
        [string]$Reference,
        [string]$Format = "xml"
    )
    
    try {
        Write-Log "Téléchargement $Format pour $Reference (ID: $ExportId)..."
        
        $url = "$SAXIUM_API_URL/api/batigest/exports/$ExportId/download?format=$Format"
        $fileName = "$Reference.$Format"
        $filePath = "$DOWNLOAD_DIR\$fileName"
        
        Invoke-WebRequest -Uri $url -OutFile $filePath
        
        if (Test-Path $filePath) {
            Write-Log "Fichier téléchargé: $filePath"
            return $filePath
        }
        
        return $null
    }
    catch {
        Write-Log "Erreur téléchargement $Format: $_" -Level "ERROR"
        return $null
    }
}

function Import-ToBatigest {
    param(
        [string]$FilePath,
        [string]$DocumentType
    )
    
    try {
        Write-Log "Import dans Batigest: $FilePath"
        
        # Copier le fichier vers le répertoire d'import Batigest
        $fileName = Split-Path $FilePath -Leaf
        $batigestFile = "$BATIGEST_IMPORT_PATH\$fileName"
        
        Copy-Item -Path $FilePath -Destination $batigestFile -Force
        
        # Attendre que Batigest traite le fichier (surveiller disparition du fichier)
        $timeout = 0
        $maxTimeout = 30 # 30 secondes max
        
        while ((Test-Path $batigestFile) -and ($timeout -lt $maxTimeout)) {
            Start-Sleep -Seconds 1
            $timeout++
        }
        
        if (Test-Path $batigestFile) {
            Write-Log "Timeout - fichier non traité par Batigest" -Level "WARNING"
            return $false
        }
        
        Write-Log "Import Batigest réussi"
        return $true
    }
    catch {
        Write-Log "Erreur import Batigest: $_" -Level "ERROR"
        return $false
    }
}

function Mark-ExportSynced {
    param(
        [string]$ExportId,
        [string]$Reference,
        [string]$BatigestReference = ""
    )
    
    try {
        Write-Log "Marquage export comme synchronisé: $Reference"
        
        $url = "$SAXIUM_API_URL/api/batigest/exports/$ExportId/mark-synced"
        $body = @{
            exportId = $ExportId
            batigestReference = if ($BatigestReference) { $BatigestReference } else { $Reference }
            agentId = $AGENT_ID
            agentVersion = $AGENT_VERSION
            batigestResponse = @{
                importedAt = (Get-Date).ToString("o")
                success = $true
            }
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri $url -Method POST -Body $body -ContentType "application/json" | Out-Null
        
        Write-Log "Export marqué comme synchronisé"
        return $true
    }
    catch {
        Write-Log "Erreur marquage synced: $_" -Level "ERROR"
        return $false
    }
}

function Mark-ExportError {
    param(
        [string]$ExportId,
        [string]$ErrorMessage
    )
    
    try {
        Write-Log "Marquage export en erreur: $ExportId - $ErrorMessage" -Level "ERROR"
        
        $url = "$SAXIUM_API_URL/api/batigest/exports/$ExportId/mark-error"
        $body = @{
            exportId = $ExportId
            errorMessage = $ErrorMessage
            errorDetails = @{
                timestamp = (Get-Date).ToString("o")
                agentId = $AGENT_ID
                agentVersion = $AGENT_VERSION
            }
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri $url -Method POST -Body $body -ContentType "application/json" | Out-Null
        
        return $true
    }
    catch {
        Write-Log "Erreur marquage error: $_" -Level "ERROR"
        return $false
    }
}

function Archive-ExportFile {
    param(
        [string]$FilePath
    )
    
    $fileName = Split-Path $FilePath -Leaf
    $archivePath = "$ARCHIVE_DIR\$(Get-Date -Format 'yyyy-MM-dd-HHmmss')-$fileName"
    
    Copy-Item -Path $FilePath -Destination $archivePath -Force
    Remove-Item -Path $FilePath -Force
    
    Write-Log "Fichier archivé: $archivePath"
}

# ========================================
# BOUCLE PRINCIPALE DE SYNCHRONISATION
# ========================================

Write-Log "========================================" -Level "INFO"
Write-Log "DÉMARRAGE AGENT BATIGEST v$AGENT_VERSION" -Level "INFO"
Write-Log "Agent ID: $AGENT_ID" -Level "INFO"
Write-Log "========================================" -Level "INFO"

try {
    # Récupérer les exports en attente
    $exports = Get-PendingExports
    
    if ($exports.Count -eq 0) {
        Write-Log "Aucun export en attente"
        exit 0
    }
    
    # Traiter chaque export
    foreach ($export in $exports) {
        try {
            Write-Log "----------------------------------------"
            Write-Log "Traitement export: $($export.documentReference) (Type: $($export.documentType))"
            
            # Télécharger le fichier XML (format principal)
            $xmlFile = Download-ExportFile -ExportId $export.id -Reference $export.documentReference -Format "xml"
            
            if (-not $xmlFile) {
                Write-Log "Échec téléchargement XML" -Level "ERROR"
                Mark-ExportError -ExportId $export.id -ErrorMessage "Échec téléchargement fichier XML"
                continue
            }
            
            # Import dans Batigest
            $importSuccess = Import-ToBatigest -FilePath $xmlFile -DocumentType $export.documentType
            
            if ($importSuccess) {
                # Marquer comme synchronisé
                $synced = Mark-ExportSynced -ExportId $export.id -Reference $export.documentReference
                
                if ($synced) {
                    # Archiver le fichier
                    Archive-ExportFile -FilePath $xmlFile
                    Write-Log "✓ Export synchronisé avec succès: $($export.documentReference)" -Level "INFO"
                }
            }
            else {
                # Erreur import
                Mark-ExportError -ExportId $export.id -ErrorMessage "Échec import dans Batigest"
                
                # Déplacer vers répertoire erreur
                $errorFile = "$ERROR_DIR\$(Split-Path $xmlFile -Leaf)"
                Move-Item -Path $xmlFile -Destination $errorFile -Force
                Write-Log "Fichier déplacé vers erreurs: $errorFile" -Level "ERROR"
            }
        }
        catch {
            Write-Log "Erreur traitement export $($export.id): $_" -Level "ERROR"
            Mark-ExportError -ExportId $export.id -ErrorMessage "Erreur agent: $_"
        }
    }
    
    Write-Log "========================================" -Level "INFO"
    Write-Log "SYNCHRONISATION TERMINÉE" -Level "INFO"
    Write-Log "Exports traités: $($exports.Count)" -Level "INFO"
    Write-Log "========================================" -Level "INFO"
}
catch {
    Write-Log "ERREUR FATALE: $_" -Level "ERROR"
    exit 1
}

exit 0
