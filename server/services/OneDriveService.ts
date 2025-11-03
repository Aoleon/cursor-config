import { Client } from '@microsoft/microsoft-graph-client';
import { microsoftAuthService } from './MicrosoftAuthService';
import { logger } from '../utils/logger';
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
}

export interface OneDriveFolder {
  id: string;
  name: string;
  itemCount: number;
  webUrl: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  parentPath?: string;
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

export class OneDriveService {
  private client: Client;

  constructor() {
    this.client = Client.init({
      authProvider: async (done) => {
        try {
          const token = await microsoftAuthService.getAccessToken();
          done(null, token);
        } catch (error) {
          logger.error('OneDrive auth provider error', error as Error);
          done(error as Error, null);
        }
      }
    });

    logger.info('OneDriveService initialized');
  }

  /**
   * Get user's drive information
   * Note: Uses /me endpoint which requires delegated permissions.
   * For app-only access, you would need to use /drives/{drive-id} or /users/{user-id}/drive
   */
  async getDriveInfo() {
    try {
      const drive = await this.client.api('/me/drive').get();
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
    } catch (error) {
      logger.error('Failed to get drive info', error as Error);
      throw new Error('Failed to retrieve OneDrive information');
    }
  }

  /**
   * Get drive information using a specific user ID or drive ID
   * Use this for application-only authentication
   */
  async getDriveByUserId(userId: string) {
    try {
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
    } catch (error) {
      logger.error('Failed to get drive info by user ID', error as Error, {
        metadata: { userId }
      });
      throw new Error('Failed to retrieve OneDrive information');
    }
  }

  /**
   * List files and folders in a specific path
   */
  async listItems(path: string = ''): Promise<(OneDriveFile | OneDriveFolder)[]> {
    try {
      const endpoint = path 
        ? `/me/drive/root:/${this.encodePath(path)}:/children`
        : '/me/drive/root/children';

      const response = await this.client.api(endpoint).get();
      const items = response.value || [];

      return items.map((item: any) => this.mapToOneDriveItem(item, path));
    } catch (error) {
      logger.error('Failed to list OneDrive items', error as Error, { metadata: { path } });
      throw new Error(`Failed to list items in path: ${path}`);
    }
  }

  /**
   * Get a specific file or folder by ID
   */
  async getItem(itemId: string): Promise<OneDriveFile | OneDriveFolder> {
    try {
      const item = await this.client.api(`/me/drive/items/${itemId}`).get();
      return this.mapToOneDriveItem(item);
    } catch (error) {
      logger.error('Failed to get OneDrive item', error as Error, { metadata: { itemId } });
      throw new Error(`Failed to retrieve item: ${itemId}`);
    }
  }

  /**
   * Get a file by path
   */
  async getItemByPath(path: string): Promise<OneDriveFile | OneDriveFolder> {
    try {
      const item = await this.client.api(`/me/drive/root:/${this.encodePath(path)}`).get();
      return this.mapToOneDriveItem(item);
    } catch (error) {
      logger.error('Failed to get item by path', error as Error, { metadata: { path } });
      throw new Error(`Failed to retrieve item at path: ${path}`);
    }
  }

  /**
   * Upload a small file (<4MB)
   */
  async uploadSmallFile(
    fileBuffer: Buffer, 
    options: UploadOptions
  ): Promise<OneDriveFile> {
    try {
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
    } catch (error) {
      logger.error('Failed to upload file to OneDrive', error as Error, { 
        metadata: { fileName: options.fileName }
      });
      throw new Error(`Failed to upload file: ${options.fileName}`);
    }
  }

  /**
   * Upload a large file (>4MB) using resumable upload session
   */
  async uploadLargeFile(
    fileBuffer: Buffer,
    options: UploadOptions
  ): Promise<OneDriveFile> {
    try {
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
          throw new Error(`Upload failed with status ${response.status}`);
        }

        uploadedBytes = chunkEnd;
        logger.debug('Upload progress', { 
          metadata: { uploadedBytes, fileSize, percentage: (uploadedBytes / fileSize * 100).toFixed(1) }
        });
      }

      logger.info('Large file uploaded to OneDrive', { 
        metadata: { fileName, path, size: fileSize }
      });
      
      // Get the uploaded file info
      return await this.getItemByPath(fullPath) as OneDriveFile;
    } catch (error) {
      logger.error('Failed to upload large file to OneDrive', error as Error, { 
        metadata: { fileName: options.fileName }
      });
      throw new Error(`Failed to upload large file: ${options.fileName}`);
    }
  }

  /**
   * Download a file
   */
  async downloadFile(itemId: string): Promise<Buffer> {
    try {
      const response = await this.client
        .api(`/me/drive/items/${itemId}/content`)
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
    } catch (error) {
      logger.error('Failed to download file from OneDrive', error as Error, { 
        metadata: { itemId }
      });
      throw new Error(`Failed to download file: ${itemId}`);
    }
  }

  /**
   * Create a folder
   */
  async createFolder(folderName: string, parentPath: string = ''): Promise<OneDriveFolder> {
    try {
      const endpoint = parentPath
        ? `/me/drive/root:/${this.encodePath(parentPath)}:/children`
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
    } catch (error) {
      logger.error('Failed to create folder on OneDrive', error as Error, { 
        metadata: { folderName, parentPath }
      });
      throw new Error(`Failed to create folder: ${folderName}`);
    }
  }

  /**
   * Delete a file or folder
   */
  async deleteItem(itemId: string): Promise<void> {
    try {
      await this.client.api(`/me/drive/items/${itemId}`).delete();
      logger.info('Item deleted from OneDrive', { 
        metadata: { itemId }
      });
    } catch (error) {
      logger.error('Failed to delete item from OneDrive', error as Error, { 
        metadata: { itemId }
      });
      throw new Error(`Failed to delete item: ${itemId}`);
    }
  }

  /**
   * Search for files
   */
  async searchFiles(query: string): Promise<OneDriveFile[]> {
    try {
      const response = await this.client
        .api(`/me/drive/root/search(q='${encodeURIComponent(query)}')`)
        .get();

      const items = response.value || [];
      return items
        .filter((item: any) => item.file) // Only files, not folders
        .map((item: any) => this.mapToOneDriveItem(item) as OneDriveFile);
    } catch (error) {
      logger.error('Failed to search OneDrive files', error as Error, { 
        metadata: { query }
      });
      throw new Error(`Search failed for query: ${query}`);
    }
  }

  /**
   * Create a sharing link
   */
  async createShareLink(itemId: string, options: ShareLinkOptions = { type: 'view', scope: 'organization' }): Promise<string> {
    try {
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
    } catch (error) {
      logger.error('Failed to create share link', error as Error, { 
        metadata: { itemId }
      });
      throw new Error(`Failed to create share link for item: ${itemId}`);
    }
  }

  /**
   * Copy a file or folder
   */
  async copyItem(itemId: string, destinationFolderId: string, newName?: string): Promise<void> {
    try {
      await this.client
        .api(`/me/drive/items/${itemId}/copy`)
        .post({
          parentReference: {
            id: destinationFolderId
          },
          name: newName
        });

      logger.info('Item copied on OneDrive', { 
        metadata: { itemId, destinationFolderId, newName }
      });
    } catch (error) {
      logger.error('Failed to copy item on OneDrive', error as Error, { 
        metadata: { itemId, destinationFolderId }
      });
      throw new Error(`Failed to copy item: ${itemId}`);
    }
  }

  /**
   * Move or rename a file or folder
   */
  async moveItem(itemId: string, newParentId?: string, newName?: string): Promise<OneDriveFile | OneDriveFolder> {
    try {
      const updateData: any = {};
      if (newName) updateData.name = newName;
      if (newParentId) updateData.parentReference = { id: newParentId };

      const item = await this.client
        .api(`/me/drive/items/${itemId}`)
        .patch(updateData);

      logger.info('Item moved/renamed on OneDrive', { 
        metadata: { itemId, newParentId, newName }
      });
      return this.mapToOneDriveItem(item);
    } catch (error) {
      logger.error('Failed to move/rename item on OneDrive', error as Error, { 
        metadata: { itemId }
      });
      throw new Error(`Failed to move/rename item: ${itemId}`);
    }
  }

  private mapToOneDriveItem(item: any, parentPath?: string): OneDriveFile | OneDriveFolder {
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
