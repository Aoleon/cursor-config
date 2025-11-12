import { Response } from "express";
import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import { randomUUID } from "crypto";
import path from "path";
import { logger } from './utils/logger';

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// Security: Whitelist of allowed folder names for offer document structure
export const ALLOWED_OFFER_FOLDERS = [
  '01-DCE-Cotes-Photos',
  '02-Etudes-fournisseurs', 
  '03-Devis-pieces-administratives'
] as const;

export type AllowedOfferFolder = typeof ALLOWED_OFFER_FOLDERS[number];

// Security: File name sanitization functions
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    throw new AppError('File name is required and must be a string', 500);
  }

  // SECURITY: Immediately reject path traversal attempts - don't sanitize, reject!
  if (fileName.includes('../') || fileName.includes('..\\') || 
      fileName.includes('/') || fileName.includes('\\') ||
      fileName.includes('..') || fileName.startsWith('.')) {
    throw new AppError('Path traversal attempts are not allowed in file names', 500);
  }

  // Extract file extension first to preserve it during length limiting
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    throw new AppError('File must have an extension', 500);
  }

  const extension = fileName.substring(lastDotIndex).toLowerCase();
  const nameWithoutExtension = fileName.substring(0, lastDotIndex);

  // Validate extension first
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.gif', '.txt', '.zip'];
  if (!allowedExtensions.includes(extension)) {
    throw new AppError(`File extension not allowed. Allowed extensions: ${allowedExtensions.join(', ', 500)}`);
  }

  // Sanitize the filename part (without extension)
  const sanitized = nameWithoutExtension
    .replace(/[^\w\-_\s]/g, '') // Keep only alphanumeric, hyphens, underscores, spaces
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with single hyphen
    .toLowerCase()
    .trim();

  // Ensure we have a valid name after sanitization
  if (!sanitized || sanitized === '' || sanitized === '-') {
    throw new AppError('File name cannot be empty after sanitization', 500);
  }

  // Limit length of filename (without extension) to prevent extremely long filenames
  const maxNameLength = 80; // Leave room for extension and path structure
  const truncatedName = sanitized.length > maxNameLength ? sanitized.substring(0, maxNameLength) : sanitized;

  // Combine sanitized name with validated extension
  return truncatedName + extension;
}

export function validateOfferFolder(folderName: string): AllowedOfferFolder {
  if (!folderName || typeof folderName !== 'string') {
    throw new AppError('Folder name is required and must be a string', 500);
  }

  // Trim and check for empty/whitespace-only strings
  const trimmedFolder = folderName.trim();
  if (!trimmedFolder) {
    throw new AppError('Invalid folder name. Allowed folders: ' + ALLOWED_OFFER_FOLDERS.join(', ', 500));
  }

  // Check against whitelist
  if (!ALLOWED_OFFER_FOLDERS.includes(trimmedFolder as AllowedOfferFolder)) {
    throw new AppError(`Invalid folder name. Allowed folders: ${ALLOWED_OFFER_FOLDERS.join(', ', 500)}`);
  }

  return trimmedFolder as AllowedOfferFolder;
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// The object storage service is used to interact with the object storage service.
export class ObjectStorageService {
  constructor() {}

  // Gets the public object search paths.
  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new AppError(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths, 500)."
      );
    }
    return paths;
  }

  // Gets the private object directory.
  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new AppError(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      , 500);
    }
    return dir;
  }

  // Downloads an object from storage via Replit sidecar
  async downloadObject(objectPath: string, res: Response) {
    return withErrorHandling(
    async () => {

      logger.debug('ObjectStorage - Downloading object', { metadata: { objectPath 

      });
      // Use Replit's sidecar to get the file
      const response = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/object-storage/get-object`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ object_path: objectPath }),
      });

      logger.debug('ObjectStorage - Download response', { metadata: { objectPath, status: response.status 
              }
 
            });
      if (!response.ok) {
        logger.warn('ObjectStorage - Download failed', { metadata: { objectPath, status: response.status 
              }
 
            });
        return res.status(404).json({ error: "File not found" });
      }

      // Stream the response to client
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const contentLength = response.headers.get('content-length');

      res.set({
        "Content-Type": contentType,
        ...(contentLength && { "Content-Length": contentLength }),
        "Cache-Control": "private, max-age=3600",
      });

      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      
      res.end();
    
    },
    {
      operation: 'sanitizeFileName',
      service: 'objectStorage',
      metadata: {
                                                                                      }

                                                                                    });
      }
    }
  }

  // Gets the upload URL for an object entity.
  async getObjectEntityUploadURL(): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new AppError(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      , 500);
    }

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    // Sign URL for PUT method with TTL
    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  // Checks if an object exists in storage
  async objectExists(objectPath: string): Promise<boolean> {
    return withErrorHandling(
    async () => {

      logger.debug('ObjectStorage - Checking if object exists', { metadata: { objectPath 

      });
      const response = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/object-storage/object-exists`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ object_path: objectPath }),
      });
      
      logger.debug('ObjectStorage - Object exists response', { metadata: { objectPath, status: response.status 
              }
 
            });
      if (!response.ok) {
        logger.warn('ObjectStorage - Object exists check failed', { metadata: { objectPath, status: response.status 
              }
 
            });
        return false;
      }
      const data = await response.json();
      logger.debug('ObjectStorage - Object exists result', { metadata: { objectPath, exists: data.exists 
              }
 
            });
      return data.exists === true;
    
    },
    {
      operation: 'sanitizeFileName',
      service: 'objectStorage',
      metadata: {
                                                                                      }

                                                                                    });
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
  
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
  
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
  
    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }

    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  // Create offer document structure with organized folders
  async createOfferDocumentStructure(offerId: string, offerReference: string): Promise<{ basePath: string; folders: string[] }> {
    const privateObjectDir = this.getPrivateObjectDir();
    const basePath = `${privateObjectDir}/offers/${offerId}`;
    
    // Use the security-hardened folder list
    const folders = [...ALLOWED_OFFER_FOLDERS];
    
    // Create folder structure by uploading empty .gitkeep files via Replit sidecar
    for (const folder of folders) {
      const keepFilePath = `${basePath}/${folder}/.gitkeep`;
      const { bucketName, objectName } = parseObjectPath(keepFilePath);
      
      await withErrorHandling(
    async () => {

        // Upload empty file to create folder structure
        const uploadUrl = await signObjectURL({
          bucketName,
          objectName,
          method: "PUT",
          ttlSec: 300,
        });

        await fetch(uploadUrl, {
          method: "PUT",
          body: '',
          headers: {
            'Content-Type': 'text/plain',
            'x-goog-meta-offer-id': offerId,
            'x-goog-meta-offer-reference': offerReference,
            'x-goog-meta-folder-type': folder,
            'x-goog-meta-auto-generated': 'true'
          });
      
    },
    {
      operation: 'sanitizeFileName',
      service: 'objectStorage',
      metadata: {
                                                                                      }

                                                                                    });
    }
    
    return { basePath, folders };
  }

  // Get upload URL for specific offer folder - SECURITY HARDENED
  async getOfferFileUploadURL(offerId: string, folderName: string, fileName: string): Promise<string> {
    // SECURITY: Validate folder name against whitelist
    const validatedFolder = validateOfferFolder(folderName);
    
    // SECURITY: Sanitize file name to prevent path traversal and other attacks
    const sanitizedFileName = sanitizeFileName(fileName);
    
    // SECURITY: Validate offer ID format (should be UUID-like)
    if (!offerId || typeof offerId !== 'string' || offerId.length < 10) {
      throw new AppError('Invalid offer ID format', 500);
    }

    const privateObjectDir = this.getPrivateObjectDir();
    
    // Use validated and sanitized inputs only - NO direct concatenation of user input
    const filePath = `${privateObjectDir}/offers/${offerId}/${validatedFolder}/${sanitizedFileName}`;
    
    // Log security-related upload attempts for monitoring
    logger.info('ObjectStorage - Secure upload URL generated', { metadata: { offerId, folder: validatedFolder, file: sanitizedFileName 
              }
 
            });
    
    const { bucketName, objectName } = parseObjectPath(filePath);

    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  // Upload supplier document directly from Buffer - SECURITY HARDENED
  async uploadSupplierDocument(
    fileBuffer: Buffer,
    sessionId: string,
    fileName: string,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<{ filePath: string; objectUrl: string }> {
    // SECURITY: Sanitize file name
    const sanitizedFileName = sanitizeFileName(fileName);
    
    // SECURITY: Validate session ID format
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 10) {
      throw new AppError('Invalid session ID format', 500);
    }

    const privateObjectDir = this.getPrivateObjectDir();
    
    // Create unique file path for supplier documents
    const timestamp = Date.now();
    const filePath = `${privateObjectDir}/supplier-quotes/${sessionId}/${timestamp}_${sanitizedFileName}`;
    
    logger.info('ObjectStorage - Uploading supplier document', { metadata: { sessionId, file: sanitizedFileName, size: fileBuffer.length 
              }
 
            });
    
    const { bucketName, objectName } = parseObjectPath(filePath);

    // Get signed URL for upload
    const uploadUrl = await signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 300, // 5 minutes for upload
    });

    // Upload file using signed URL
    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Content-Length': fileBuffer.length.toString(),
    };

    // Add custom metadata if provided
    if (metadata) {
      for (const [key, value] of Object.entries(metadata)) {
        headers[`x-goog-meta-${key}`] = value;
      }
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: fileBuffer,
      headers,
    });

    if (!uploadResponse.ok) {
      throw new AppError(`Failed to upload file: ${uploadResponse.status} ${uploadResponse.statusText}`, 500);
    }

    logger.info('ObjectStorage - Supplier document uploaded successfully', { metadata: { filePath 
              }
 
            });

    return {
      filePath,
      objectUrl: filePath, // Return full path for internal use
    };
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new AppError("Invalid path: must contain at least a bucket name", 500);
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new AppError(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    , 500);
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}