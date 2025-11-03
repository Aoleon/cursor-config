import { ConfidentialClientApplication, AuthenticationResult } from '@azure/msal-node';
import { logger } from '../utils/logger';

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

export class MicrosoftAuthService {
  private msalClient: ConfidentialClientApplication;
  private tokenCache: TokenCache | null = null;
  private readonly scopes = [
    'https://graph.microsoft.com/Files.Read.All',
    'https://graph.microsoft.com/Files.ReadWrite.All',
    'https://graph.microsoft.com/Sites.Read.All'
  ];

  constructor() {
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const tenantId = process.env.AZURE_TENANT_ID;

    if (!clientId || !clientSecret || !tenantId) {
      throw new Error('Azure credentials not configured. Please set AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID');
    }

    this.msalClient = new ConfidentialClientApplication({
      auth: {
        clientId,
        clientSecret,
        authority: `https://login.microsoftonline.com/${tenantId}`
      }
    });

    logger.info('MicrosoftAuthService initialized', { 
      metadata: { tenantId, clientId: clientId.substring(0, 8) + '...' }
    });
  }

  async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      logger.debug('Using cached Microsoft Graph access token');
      return this.tokenCache.accessToken;
    }

    try {
      logger.info('Acquiring new Microsoft Graph access token');
      
      const result = await this.msalClient.acquireTokenByClientCredential({
        scopes: this.scopes
      });

      if (!result || !result.accessToken) {
        throw new Error('Failed to acquire access token');
      }

      // Cache the token (expires in 1 hour typically, we refresh 5 minutes early)
      const expiresIn = result.expiresOn 
        ? result.expiresOn.getTime() - Date.now() - (5 * 60 * 1000) 
        : 55 * 60 * 1000;

      this.tokenCache = {
        accessToken: result.accessToken,
        expiresAt: Date.now() + expiresIn
      };

      logger.info('Microsoft Graph access token acquired successfully', {
        metadata: { expiresIn: Math.floor(expiresIn / 1000) + 's' }
      });

      return result.accessToken;
    } catch (error) {
      logger.error('Failed to acquire Microsoft Graph access token', error as Error);
      throw new Error('Microsoft authentication failed');
    }
  }

  async refreshToken(): Promise<void> {
    this.tokenCache = null;
    await this.getAccessToken();
  }

  clearCache(): void {
    this.tokenCache = null;
    logger.info('Microsoft auth token cache cleared');
  }
}

// Singleton instance
export const microsoftAuthService = new MicrosoftAuthService();
