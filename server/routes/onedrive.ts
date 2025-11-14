/**
 * Routes API pour l'intégration OneDrive
 * Gestion des documents via Microsoft OneDrive
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { oneDriveService } from '../services/OneDriveService';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Configuration multer pour upload de fichiers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  }
});

// ========================================
// MIDDLEWARE D'AUTHENTIFICATION
// ========================================

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user || (req as any).session?.user;
  
  if (!user) {
    return res.status(401).json({
      error: 'Non authentifié',
      message: 'Authentification requise'
    });
  }
  
  next();
};

// ========================================
// DRIVE INFO
// ========================================

/**
 * Récupère les informations sur le drive OneDrive
 * GET /api/onedrive/info
 */
router.get('/info', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const driveInfo = await oneDriveService.getDriveInfo();
  
  res.json({
    success: true,
    data: driveInfo
  });
}));

// ========================================
// LISTE DES FICHIERS ET DOSSIERS
// ========================================

/**
 * Liste les fichiers et dossiers à un chemin donné
 * GET /api/onedrive/list?path=...
 */
router.get('/list', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const path = (req.query.path as string) || '';
  
  const items = await oneDriveService.listItems(path);
  
  res.json({
    success: true,
    data: {
      path,
      items,
      count: items.length
    }
  });
}));

/**
 * Récupère un fichier/dossier par ID
 * GET /api/onedrive/item/:itemId
 */
router.get('/item/:itemId', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { itemId } = req.params;
  
  const item = await oneDriveService.getItem(itemId);
  
  res.json({
    success: true,
    data: item
  });
}));

/**
 * Récupère un fichier/dossier par chemin
 * GET /api/onedrive/item-by-path?path=...
 */
router.get('/item-by-path', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const path = req.query.path as string;
  
  if (!path) {
    return res.status(400).json({
      success: false,
      error: 'Le paramètre path est requis'
    });
  }
  
  const item = await oneDriveService.getItemByPath(path);
  
  res.json({
    success: true,
    data: item
  });
}));

// ========================================
// UPLOAD
// ========================================

/**
 * Upload un fichier vers OneDrive
 * POST /api/onedrive/upload
 * Body: multipart/form-data avec file, path, conflictBehavior
 */
router.post('/upload', requireAuth, upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'Aucun fichier fourni'
    });
  }
  
  const file = req.file;
  const path = (req.body.path as string) || '';
  const conflictBehavior = (req.body.conflictBehavior as 'rename' | 'replace' | 'fail') || 'rename';
  
  logger.info('Uploading file to OneDrive', { 
    metadata: {
      fileName: file.originalname,
      size: file.size,
      path,
      conflictBehavior
    }
  });
  
  // Choisir la méthode d'upload selon la taille
  const uploadedFile = file.size < 4 * 1024 * 1024
    ? await oneDriveService.uploadSmallFile(file.buffer, {
        path,
        fileName: file.originalname,
        conflictBehavior
      })
    : await oneDriveService.uploadLargeFile(file.buffer, {
        path,
        fileName: file.originalname,
        conflictBehavior
      });
  
  res.json({
    success: true,
    data: uploadedFile,
    message: 'Fichier uploadé avec succès'
  });
}));

// ========================================
// DOWNLOAD
// ========================================

/**
 * Télécharge un fichier depuis OneDrive
 * GET /api/onedrive/download/:itemId
 */
router.get('/download/:itemId', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { itemId } = req.params;
  
  // Récupérer les informations du fichier
  const item = await oneDriveService.getItem(itemId);
  
  if ((item as any).isFolder) {
    return res.status(400).json({
      success: false,
      error: 'Impossible de télécharger un dossier'
    });
  }
  
  // Télécharger le fichier
  const fileBuffer = await oneDriveService.downloadFile(itemId);
  
  // Déterminer le type MIME
  const mimeType = (item as any).mimeType || 'application/octet-stream';
  
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${(item as any).name}"`);
  res.setHeader('Content-Length', fileBuffer.length.toString());
  
  res.send(fileBuffer);
}));

// ========================================
// DOSSIERS
// ========================================

/**
 * Crée un dossier sur OneDrive
 * POST /api/onedrive/folder
 * Body: { name, parentPath }
 */
router.post('/folder', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { name, parentPath } = req.body;
  
  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Le nom du dossier est requis'
    });
  }
  
  const folder = await oneDriveService.createFolder(name, parentPath || '');
  
  res.json({
    success: true,
    data: folder,
    message: 'Dossier créé avec succès'
  });
}));

// ========================================
// RECHERCHE
// ========================================

/**
 * Recherche des fichiers sur OneDrive
 * GET /api/onedrive/search?q=...
 */
router.get('/search', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const query = req.query.q as string;
  
  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Le paramètre de recherche q est requis'
    });
  }
  
  const files = await oneDriveService.searchFiles(query);
  
  res.json({
    success: true,
    data: {
      query,
      files,
      count: files.length
    }
  });
}));

// ========================================
// PARTAGE
// ========================================

/**
 * Crée un lien de partage pour un fichier/dossier
 * POST /api/onedrive/share/:itemId
 * Body: { type, scope }
 */
router.post('/share/:itemId', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { itemId } = req.params;
  const { type = 'view', scope = 'organization' } = req.body;
  
  if (!['view', 'edit', 'embed'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Type invalide. Utilisez: view, edit, ou embed'
    });
  }
  
  if (!['anonymous', 'organization'].includes(scope)) {
    return res.status(400).json({
      success: false,
      error: 'Scope invalide. Utilisez: anonymous ou organization'
    });
  }
  
  const shareLink = await oneDriveService.createShareLink(itemId, { type, scope });
  
  res.json({
    success: true,
    data: {
      shareLink
    },
    message: 'Lien de partage créé avec succès'
  });
}));

// ========================================
// GESTION DES FICHIERS
// ========================================

/**
 * Supprime un fichier ou dossier
 * DELETE /api/onedrive/item/:itemId
 */
router.delete('/item/:itemId', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { itemId } = req.params;
  
  await oneDriveService.deleteItem(itemId);
  
  res.json({
    success: true,
    message: 'Élément supprimé avec succès'
  });
}));

/**
 * Copie un fichier ou dossier
 * POST /api/onedrive/copy/:itemId
 * Body: { destinationFolderId, newName }
 */
router.post('/copy/:itemId', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { itemId } = req.params;
  const { destinationFolderId, newName } = req.body;
  
  if (!destinationFolderId) {
    return res.status(400).json({
      success: false,
      error: 'destinationFolderId est requis'
    });
  }
  
  await oneDriveService.copyItem(itemId, destinationFolderId, newName);
  
  res.json({
    success: true,
    message: 'Copie en cours (opération asynchrone)'
  });
}));

/**
 * Déplace ou renomme un fichier ou dossier
 * PATCH /api/onedrive/item/:itemId
 * Body: { newParentId?, newName? }
 */
router.patch('/item/:itemId', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { itemId } = req.params;
  const { newParentId, newName } = req.body;
  
  if (!newParentId && !newName) {
    return res.status(400).json({
      success: false,
      error: 'Au moins newParentId ou newName doit être fourni'
    });
  }
  
  const updatedItem = await oneDriveService.moveItem(itemId, newParentId, newName);
  
  res.json({
    success: true,
    data: updatedItem,
    message: 'Élément mis à jour avec succès'
  });
}));

export default router;
