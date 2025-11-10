import { Client } from '@microsoft/microsoft-graph-client';
import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import { microsoftAuthService } from './MicrosoftAuthService';
import { logger } from '../utils/logger';
import { executeOneDrive } from './resilience';
import { getCacheService, TTL_CONFIG } from './CacheService';
import type { CacheService } from './CacheService';
import type { Readable } from 'stream';

export interface OneDriveFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  webUrl: string;
  downloadUrl?: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  isFolder: boolean;
  parentPath?: string;
  deleted?: boolean; // For delta sync - indicates item was deleted
}

export interface OneDriveFolder {
  id: string;
  name: string;
  itemCount: number;
  webUrl: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  parentPath?: string;
  deleted?: boolean; // For delta sync - indicates folder was deleted
}

export interface UploadOptions {
  path: string;
  fileName: string;
  conflictBehavior?: 'rename' | 'replace' | 'fail';
}

export interface ShareLinkOptions {
  type: 'view' | 'edit' | 'embed';
  scope: 'anonymous' | 'organization';
}

export interface DeltaResponse {
  items: (OneDriveFile | OneDriveFolder)[];
  deltaLink: string | null;
  hasMore: boolean;
}

export class OneDriveService {
  private client: Client;
  private cache: CacheService;

  constructor() {
    this.client = Client.init({
      authProvider: async (done) => {
        return withErrorHandling(
    async () => {

          const token = await microsoftAuthService.getAccessToken();
          done(null, token);
        
    },
    {
      operation: 'constructor',
      service: 'OneDriveService',
      metadata: {}
    }
  );
      }
    });

    // PERF-5: Initialize cache for OneDrive metadata
    this.cache = getCacheService();

    logger.info('OneDriveService initialized', {
      metadata: { cacheEnabled: true }
    });
  }

  /**
   * Get user's drive information (with cache)
   * Note: Uses /me endpoint which requires delegated permissions.
   * For app-only access, you would need to use /drives/{drive-id} or /users/{user-id}/drive
   */
  async getDriveInfo() {
    // PERF-5: Check cache first
    const cacheKey = this.cache.buildKey('onedrive', 'drive-info');
    const cached = await this.cache.get<unknown>(cacheKey);
    
    if (cached) {
      logger.debug('OneDrive drive info from cache', {
        metadata: { cacheKey }
      });
      return cached;
    }

    return withErrorHandling(
    async () => {

      const drive = await this.client.api('/me/drive').get();
      const driveInfo = {
        id: drive.id,
        driveType: drive.driveType,
        owner: drive.owner?.user?.displayName,
        quota: {
          total: drive.quota?.total,
          used: drive.quota?.used,
          remaining: drive.quota?.remaining
        }
      };

      // PERF-5: Cache the result
      await this.cache.set(cacheKey, driveInfo, TTL_CONFIG.ONEDRIVE_DRIVE_INFO);

      return driveInfo;
    
    },
    {
      operation: 'constructor',
      service: 'OneDriveService',
      metadata: {}
    }
  );
  }

  /**
   * Get drive information using a specific user ID or drive ID
   * Use this for application-only authentication
   */
  async getDriveByUserId(userId: string) {
    return withErrorHandling(
    async () => {

      const drive = await this.client.api(`/users/${userId}/drive`).get();
      return {
        id: drive.id,
        driveType: drive.driveType,
        owner: drive.owner?.user?.displayName,
        quota: {
          total: drive.quota?.total,
          used: drive.quota?.used,
          remaining: drive.quota?.remaining
        }
      };
    
    },
    {
      operation: 'constructor',
      service: 'OneDriveService',
      metadata: {}
    }
  );
  }

  /**
   * List files and folders in a specific path (with pagination support + cache)
   */
  async listItems(path: string = ''): Promise<(OneDriveFile | OneDriveFolder)[]> {
    // PERF-5: Check cache first
    const cacheKey = this.cache.buildKey('onedrive', 'list', { path });
    const cached = await this.cache.get<(OneDriveFile | OneDriveFolder)[]>(cacheKey);
    
    if (cached) {
      logger.debug('OneDrive directory list from cache', {
        metadata: { path, itemCount: cached.length }
      });
      return cached;
    }

    // PERF-4: Wrap with retry + circuit breaker
    const items = await executeOneDrive(async () => {
      const endpoint = path 
        ? `/me/drive/root:/${this.encodePath(path)}:/children`
        : '/me/drive/root/children';

      const allItems: (OneDriveFile | OneDriveFolder)[] = [];
      let nextLink: string | null = endpoint;

      // PERF-2: Pagination support - follow @odata.nextLink
      while (nextLink) {
        const response = await this.client.api(nextLink).get();
        const items = response.value || [];
        
        allItems.push(...items.map((item: unknown) => this.mapToOneDriveItem(item, path)));

        nextLink = response['@odata.nextLink'] || null;
        
        if (nextLink) {
          logger.info('OneDrive pagination: fetching next page', {
            metadata: { path, currentItems: allItems.length }
          });
        }
      }

      return allItems;
    }, `listItems:${path || 'root'}`);

    // PERF-5: Cache the result
    await this.cache.set(cacheKey, items, TTL_CONFIG.ONEDRIVE_DIRECTORY_LIST);

    return items;
  }

  /**
   * PERF-5: Get stored delta link for a path from cache
   */
  async getDeltaLink(path: string): Promise<string | null> {
    const cacheKey = this.cache.buildKey('onedrive', 'delta-link', { path });
    return await this.cache.get<string>(cacheKey);
  }

  /**
   * PERF-5: Store delta link for a path in cache
   */
  async saveDeltaLink(path: string, deltaLink: string): Promise<void> {
    const cacheKey = this.cache.buildKey('onedrive', 'delta-link', { path });
    await this.cache.set(cacheKey, deltaLink, TTL_CONFIG.ONEDRIVE_DELTA_LINK);
    logger.debug('OneDrive delta link saved', {
      metadata: { path, cacheKey }
    });
  }

  /**
   * PERF-1: Get items using delta query (incremental sync with cached deltaLink)
   * Returns only changed items since last deltaLink
   * @param path - The folder path to track
   * @param previousDeltaLink - Delta link from previous sync (null = check cache, then initial sync)
   * @returns Delta response with items and new deltaLink
   */
  async getItemsDelta(path: string = '', previousDeltaLink?: string | null): Promise<DeltaResponse> {
    // PERF-5: If no previousDeltaLink provided, check cache
    let deltaLink = previousDeltaLink;
    if (!deltaLink) {
      deltaLink = await this.getDeltaLink(path);
      if (deltaLink) {
        logger.info('OneDrive delta: using cached delta link', {
          metadata: { path }
        });
      }
    }

    // PERF-4: Wrap with retry + circuit breaker
    const result = await executeOneDrive(async () => {
      let endpoint: string;
      
      if (deltaLink) {
        // Use delta link for incremental changes
        endpoint = deltaLink;
        logger.info('OneDrive delta: incremental sync', {
          metadata: { path, hasPreviousDelta: true }
        });
      } else {
        // Initial sync - use delta endpoint
        endpoint = path
          ? `/me/drive/root:/${this.encodePath(path)}:/delta`
          : '/me/drive/root/delta';
        
        logger.info('OneDrive delta: initial sync', {
          metadata: { path }
        });
      }

      const allItems: (OneDriveFile | OneDriveFolder)[] = [];
      let nextLink: string | null = endpoint;
      let newDeltaLink: string | null = null;

      // Follow pagination and delta links
      while (nextLink) {
        const response = await this.client.api(nextLink).get();
        const items = response.value || [];
        
        // Map ALL items including deleted ones (consumers need to handle deletions)
        const mappedItems = items.map((: unknown)unknown) => {
          // For deleted items, create minimal object with deleted flag
          if (item.deleted) {
            const isFolder = !!item.folder;
            return {
              id: item.id,
              name: item.name || 'deleted-item',
              deleted: true,
              isFolder,
              parentPath: path,
              // Include minimal metadata if available (for folders)
              ...(isFolder && { itemCount: 0 })
            } as OneDriveFile | OneDriveFolder;
          }
          return this.mapToOneDriveItem(item, path);
        });
        
        allItems.push(...mappedItems);
        
        // Log deletion events
        const deletedCount = items.f: unknown)unknown)unknown) => i.deleted).length;
        if (deletedCount > 0) {
          logger.info('OneDrive delta: deletions detected', {
            metadata: { path, deletedItems: deletedCount }
          });
        }

        // Check for delta link (indicates end of delta sequence)
        if (response['@odata.deltaLink']) {
          newDeltaLink = response['@odata.deltaLink'];
          nextLink = null;
          
          logger.info('OneDrive delta: sync complete', {
            metadata: {
              path,
              totalItems: allItems.length,
              hasDeltaLink: true
            }
          });
        } else if (response['@odata.nextLink']) {
          // More pages available
          nextLink = response['@odata.nextLink'];
          
          logger.info('OneDrive delta: fetching next page', {
            metadata: { path, currentItems: allItems.length }
          });
        } else {
          // No more data
          nextLink = null;
        }
      }

      return {
        items: allItems,
        deltaLink: newDeltaLink,
        hasMore: false
      };
    }, `getItemsDelta:${path || 'root'}`);

    // PERF-5: Save new delta link to cache if we got one
    if (result.deltaLink) {
      await this.saveDeltaLink(path, result.deltaLink);
    }

    return result;
  }

  /**
   * PERF-5: Invalidate cache for a specific path
   */
  async invalidateCache(path?: string): Promise<void> {
    if (path) {
      // Invalidate specific path
      const listCacheKey = this.cache.buildKey('onedrive', 'list', { path });
      const deltaCacheKey = this.cache.buildKey('onedrive', 'delta-link', { path });
      
      await this.cache.invalidate(listCacheKey);
      await this.cache.invalidate(deltaCacheKey);
      
      logger.info('OneDrive cache invalidated for path', {
        metadata: { path }
      });
    } else {
      // Invalidate all OneDrive cache
      await this.cache.invalidatePattern('onedrive:*');
      
      logger.info('All OneDrive cache invalidated');
    }
  }

  /**
   * Get a specific file or folder by ID
   */
  async getItem(itemId: string): Promise<OneDriveFile | OneDriveFolder> {
    return withErrorHandling(
    async () => {

      const item = await this.client.api(`/me/drive/items/${itemId}`).get();
      return this.mapToOneDriveItem(item);
    
    },
    {
      operation: 'constructor',
      service: 'OneDriveService',
      metadata: {}
    }
  );`, 500);
    }
  }

  /**
   * Get a file by path
   */
  async getItemByPath(path: string): Promise<OneDriveFile | OneDriveFolder> {
    return withErrorHandling(
    async () => {

      const item = await this.client.api(`/me/drive/root:/${this.encodePath(path)}`).get();
      return this.mapToOneDriveItem(item);
    
    },
    {
      operation: 'constructor',
service: 'OneDriveService',;
      metadata: {}
    }
  );`, 500);
    }
  }

  /**
   * Upload a small file (<4MB)
   */
  async uploadSmallFile(
    fileBuffer: Buffer, 
    options: UploadOptions
  ): Promise<OneDriveFile> {
    return withErrorHandling(
    async () => {

      const { path, fileName, conflictBehavior = 'rename' } = options;
      const fullPath = path ? `${path}/${fileName}` : fileName;

      const item = await this.client
        .api(`/me/drive/root:/${this.encodePath(fullPath)}:/content`)
        .header('Content-Type', 'application/octet-stream')
        .put(fileBuffer);

      logger.info('File uploaded to OneDrive', { 
        metadata: { fileName, path, size: fileBuffer.length }
      });
      return this.mapToOneDriveItem(item) as OneDriveFile;
    
    },
    {
      operation: 'constructor',
service: 'OneDriveService',;
      metadata: {}
    }
  );`, 500);
    }
  }

  /**
   * Upload a large file (>4MB) using resumable upload session
   */
  async uploadLargeFile(
    fileBuffer: Buffer,
    options: UploadOptions
  ): Promise<OneDriveFile> {
    return withErrorHandling(
    async () => {

      const { path, fileName, conflictBehavior = 'rename' } = options;
      const fullPath = path ? `${path}/${fileName}` : fileName;

      // Create upload session
      const uploadSession = await this.client
        .api(`/me/drive/root:/${this.encodePath(fullPath)}:/createUploadSession`)
        .post({
          item: {
            '@microsoft.graph.conflictBehavior': conflictBehavior,
            name: fileName
          }
        });

      const uploadUrl = uploadSession.uploadUrl;
      const fileSize = fileBuffer.length;
      const chunkSize = 320 * 1024; // 320KB chunks
      let uploadedBytes = 0;
      let finalResponse: Response | null = null;

      // Upload in chunks
      while (uploadedBytes < fileSize) {
        const chunkEnd = Math.min(uploadedBytes + chunkSize, fileSize);
        const chunk = fileBuffer.slice(uploadedBytes, chunkEnd);

        const response = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Length': chunk.length.toString(),
            'Content-Range': `bytes ${uploadedBytes}-${chunkEnd - 1}/${fileSize}`
          },
          body: chunk
        });

        if (!response.ok && response.status !== 202) {
          throw new AppError(`Upload failed with status ${response.status}`, 500);
        }

        uploadedBytes = chunkEnd;
        finalResponse = response;
        logger.debug('Upload progress', { 
          metadata: { uploadedBytes, fileSize, percentage: (uploadedBytes / fileSize * 100).toFixed(1) }
        });
      }

      // Parse final response to get uploaded file metadata
      // OneDrive returns the file metadata in the final chunk response
      if (!finalResponse) {
        throw new AppError('Upload completed but no response received', 500);
      }

      const uploadedItem = await finalResponse.json();
      
      logger.info('Large file uploaded to OneDrive', { 
        metadata: { 
          fileName, 
          path, 
          size: fileSize,
          actualName: uploadedItem.name,
          oneDriveId: uploadedItem.id
        }
      });
      
      // Return the metadata from the upload response (handles renamed files correctly)
      return this.mapToOneDriveItem(uploadedItem) as OneDriveFile;
    
    },
    {
      operation: 'constructor',
service: 'OneDriveService',;
      metadata: {}
    }
  );`, 500);
    }
  }

  /**
   * Download a file
   */
  async downloadFile(itemId: string): Promise<Buffer> {
    return withErrorHandling(
    async () => {

      const response = await this.client
.api(`/me/drive/items/${itemId}/content`);
        .getStream();

      const chunks: Buffer[] = [];
      for await (const chunk of response as Readable) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      logger.info('File downloaded from OneDrive', { 
        metadata: { itemId, size: buffer.length }
      });
      return buffer;
    
    },
    {
      operation: 'constructor',
service: 'OneDriveService',;
      metadata: {}
    }
  );`, 500);
    }
  }

  /**
   * Create a folder
   */
  async createFolder(folderName: string, parentPath: string = ''): Promise<OneDriveFolder> {
    return withErrorHandling(
    async () => {

      const endpoint = parentPath
? `/me/drive/root:/${this.encodePath(parentPath)}:/children`;
        : '/me/drive/root/children';

      const folder = await this.client.api(endpoint).post({
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename'
      });

      logger.info('Folder created on OneDrive', { 
        metadata: { folderName, parentPath }
      });
      return this.mapToOneDriveItem(folder) as OneDriveFolder;
    
    },
    {
      operation: 'constructor',
      service: 'OneDriveService',
      metadata: {}
    }
  );`, 500);
    }
  }

  /**
   * Delete a file or folder
   */
  async deleteItem(itemId: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await this.client.api(`/me/drive/items/${itemId}`).delete();
      logger.info('Item deleted from OneDrive', { 
        metadata: { itemId }
      });
    
    },
    {
      operation: 'constructor',
      service: 'OneDriveService',
      metadata: {}
    }
  );`, 500);
    }
  }

  /**
   * Search for files
   */
  async searchFiles(query: string): Promise<OneDriveFile[]> {
    return withErrorHandling(
    async () => {

      const response = await this.client
        .api(`/me/drive/root/search(q='${encodeURIComponent(query)}')`)
        .get();

      const items = response.value || [];
      return items
        .: unknown)unknown)unknown any) => item.file) // Only files, not folders
  : unknown)unknown)unknowntem: any) => this.mapToOneDriveItem(item) as OneDriveFile);
    
    },
    {
      operation: 'constructor',
      service: 'OneDriveService',
      metadata: {}
    }
  );`, 500);
    }
  }

  /**
   * Create a sharing link
   */
  async createShareLink(itemId: string, options: ShareLinkOptions = { type: 'view', scope: 'organization' }): Promise<string> {
    return withErrorHandling(
    async () => {

      const response = await this.client
        .api(`/me/drive/items/${itemId}/createLink`)
        .post({
          type: options.type,
          scope: options.scope
        });

      logger.info('Share link created', { 
        metadata: { itemId, type: options.type, scope: options.scope }
      });
      return response.link.webUrl;
    
    },
    {
      operation: 'constructor',
      service: 'OneDriveService',
      metadata: {}
    }
  );`, 500);
    }
  }

  /**
   * Copy a file or folder
   */
  async copyItem(itemId: string, destinationFolderId: string, newName?: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await this.client
.api(`/me/drive/items/${itemId}/copy`);
        .post({
          parentReference: {
            id: destinationFolderId
          },
          name: newName
        });

      logger.info('Item copied on OneDrive', { 
        metadata: { itemId, destinationFolderId, newName }
      });
    
    },
    {
      operation: 'constructor',
service: 'OneDriveService',;
      metadata: {}
    }
  );`, 500);
    }
  }

  /**
   * Move or rename a file or folder
   */
  async moveItem(itemId: string, newParentId?: string, newName?: string): Promise<OneDriveFile | OneDriveFolder> {
    return withErrorHandling(
    async () => {

      const updateData: unknown = {};
      if (newName) updateData.name = newName;
      if (newParentId) updateData.parentReference = { id: newParentId };

      const item = await this.client
.api(`/me/drive/items/${itemId}`);
        .patch(updateData);

      logger.info('Item moved/renamed on OneDrive', { 
        metadata: { itemId, newParentId, newName }
      });
      return this.mapToOneDriveItem(item);
    
    },
    {
      operation: 'constructor',
      service: 'OneDriveService',
      metadata: {}
    }
  );`, 500);
    }
  }

  private mapToOneDriveItem(item: unknown, parentPath?: string): OneDriveFile | OneDriveFolder {
    const isFolder = !!item.folder;
    
    const baseItem = {
      id: item.id,
      name: item.name,
      webUrl: item.webUrl,
      createdDateTime: item.createdDateTime,
      lastModifiedDateTime: item.lastModifiedDateTime,
      parentPath
    };

    if (isFolder) {
      return {
        ...baseItem,
        isFolder: true,
        itemCount: item.folder?.childCount || 0
      } as OneDriveFolder;
    } else {
      return {
        ...baseItem,
        isFolder: false,
        size: item.size || 0,
        mimeType: item.file?.mimeType || 'application/octet-stream',
        downloadUrl: item['@microsoft.graph.downloadUrl']
      } as OneDriveFile;
    }
  }

  private encodePath(path: string): string {
    return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
  }
}

// Singleton instance
export const oneDriveService = new OneDriveService();
