import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';
import { AppError } from './utils/error-handler';
import { logger } from './utils/logger';

const DEFAULT_OFFER_FOLDERS = ['documents', 'plans', 'photos', 'devis', 'contrats'];

export class ObjectStorageService {
  constructor(private readonly sidecarEndpoint: string = process.env.REPLIT_SIDECAR_ENDPOINT ?? '') {}

  getPublicObjectSearchPaths(): string[] {
    const raw = process.env.PUBLIC_OBJECT_SEARCH_PATHS ?? '';
    const paths = raw
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    if (!paths.length) {
      throw new AppError(
        "PUBLIC_OBJECT_SEARCH_PATHS non défini. Configurez l'Object Storage et renseignez la variable d'environnement.",
        500
      );
    }

    return Array.from(new Set(paths));
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR?.trim();
    if (!dir) {
      throw new AppError(
        "PRIVATE_OBJECT_DIR non défini. Configurez l'Object Storage et renseignez la variable d'environnement.",
        500
      );
    }
    return dir;
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const baseDir = this.getPrivateObjectDir();
    const objectId = randomUUID();
    return `${baseDir}/uploads/${objectId}`;
  }

  async objectExists(objectPath: string): Promise<boolean> {
    if (!this.sidecarEndpoint) {
      logger.warn('ObjectStorageService: sidecar endpoint indisponible, objectExists retourne false');
      return false;
    }

    try {
      const response = await fetch(`${this.sidecarEndpoint}/object-storage/object-exists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ object_path: objectPath }),
      });

      if (!response.ok) {
        logger.warn('ObjectStorageService: échec de la vérification objectExists', {
          metadata: { objectPath, status: response.status },
        });
        return false;
      }

      const payload = (await response.json()) as { exists?: boolean };
      return payload.exists === true;
    } catch (error) {
      logger.warn('ObjectStorageService: exception lors de objectExists', {
        metadata: { objectPath, error },
      });
      return false;
    }
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (rawPath.startsWith('https://')) {
      try {
        const url = new URL(rawPath);
        return url.pathname;
      } catch (error) {
        logger.warn('ObjectStorageService: URL invalide lors de normalizeObjectEntityPath', {
          metadata: { rawPath, error },
        });
        return rawPath;
      }
    }
    return rawPath;
  }

  async createOfferDocumentStructure(offerId: string, offerReference: string): Promise<{ basePath: string; folders: string[] }> {
    const baseDir = this.getPrivateObjectDir();
    const basePath = `${baseDir}/offers/${offerId}`;
    logger.info('ObjectStorageService: création structure documents offre', {
      metadata: { offerId, offerReference, basePath },
    });
    return { basePath, folders: DEFAULT_OFFER_FOLDERS };
  }
}
