import passport from 'passport';
import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import { logger } from '../utils/logger';
import type { IStorage } from '../storage-poc';

// Types pour passport-azure-ad (pas de @types disponibles)
interface IOIDCStrategyOption {
  identityMetadata: string;
  clientID: string;
  clientSecret: string;
  responseType: string;
  responseMode: string;
  redirectUrl: string;
  allowHttpForRedirectUrl: boolean;
  validateIssuer: boolean;
  passReqToCallback: boolean;
  scope: string[];
  loggingLevel?: string;
}

interface IProfile {
  oid: string;
  upn?: string;
  displayName?: string;
  name?: {
    givenName?: string;
    familyName?: string;
  };
  _json: {
    email?: string;
    [key: string]: any;
  };
}

type VerifyCallback = (error: any, user?: any, info?: any) => void;

// Import dynamique de la stratégie
import { OIDCStrategy } from 'passport-azure-ad';

export class MicrosoftOAuthService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.initializeStrategy();
  }

  private initializeStrategy(): void {
    const clientID = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const tenantID = process.env.AZURE_TENANT_ID;
    const callbackURL = process.env.MICROSOFT_CALLBACK_URL || 'http://localhost:5000/auth/microsoft/callback';

    if (!clientID || !clientSecret || !tenantID) {
      logger.warn('[MicrosoftOAuth] Azure AD credentials not configured - Microsoft login will be unavailable', {
        metadata: { service: 'MicrosoftOAuthService' }
      });
      return;
    }

    const strategyConfig: IOIDCStrategyOption = {
      identityMetadata: `https://login.microsoftonline.com/${tenantID}/v2.0/.well-known/openid-configuration`,
      clientID,
      clientSecret,
      responseType: 'code',
      responseMode: 'form_post',
      redirectUrl: callbackURL,
      allowHttpForRedirectUrl: process.env.NODE_ENV === 'development',
      validateIssuer: true,
      passReqToCallback: false,
      scope: ['profile', 'email', 'openid'],
      loggingLevel: process.env.NODE_ENV === 'development' ? 'info' as any : 'error' as any,
    };

    passport.use('azure-ad', new OIDCStrategy(
      strategyConfig,
      async (
        iss: string,
        sub: string,
        profile: IProfile,
        accessToken: string,
        refreshToken: string,
        done: VerifyCallback
      ) => {
        return withErrorHandling(
    async () => {

          logger.info('[MicrosoftOAuth] User authenticated via Microsoft', {
            metadata: {
              service: 'MicrosoftOAuthService',
              microsoftId: profile.oid,
              email: profile._json.email || profile.upn
            }
          });

          const microsoftId = profile.oid;
          const email = profile._json.email || profile.upn || `${profile.oid}@unknown.com`;
          const firstName = profile.name?.givenName || profile.displayName?.split(' ')[0] || 'Utilisateur';
          const lastName = profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || 'Microsoft';

          let user = await this.storage.getUserByMicrosoftId(microsoftId);

          if (!user) {
            logger.info('[MicrosoftOAuth] Creating new user from Microsoft profile', {
              metadata: { microsoftId, email }
            });

            user = await this.storage.createUser({
              email,
              microsoftId,
              firstName,
              lastName,
              profileImageUrl: undefined,
              role: 'client',
              isActive: true,
            });
          } else {
            logger.info('[MicrosoftOAuth] Existing user found', {
              metadata: { userId: user.id, email: user.email }
            });
          }

          // SECURITY: Store OAuth tokens securely in session
          // Calculate token expiration (Microsoft tokens typically expire in 1 hour)
          const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

          const authenticatedUser = {
            ...user,
            accessToken,
            refreshToken,
            expiresAt,
            isMicrosoftAuth: true,
          };

          logger.info('[MicrosoftOAuth] Tokens stored securely in session', {
            metadata: {
              userId: user.id,
              expiresAt: new Date(expiresAt * 1000).toISOString(),
              hasAccessToken: !!accessToken,
              hasRefreshToken: !!refreshToken
            }
          });

          return done(null, authenticatedUser);
        
    },
    {
      operation: 'ad',
      service: 'MicrosoftOAuthService',
      metadata: {}
    }
  );
          });
          return done(error as Error);
        }
      }
    ));

    logger.info('[MicrosoftOAuth] Microsoft OAuth strategy initialized', {
      metadata: { service: 'MicrosoftOAuthService', tenantID }
    });
  }
}

/**
 * Refresh Microsoft OAuth access token using refresh token
 * @param refreshToken - The refresh token from Microsoft
 * @returns New access and refresh tokens
 */
export async function refreshMicrosoftToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
}> {
  const clientID = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const tenantID = process.env.AZURE_TENANT_ID;

  if (!clientID || !clientSecret || !tenantID) {
    throw new AppError('Azure AD credentials not configured', 500);
  }

  return withErrorHandling(
    async () => {

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantID}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: clientID,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: 'openid profile email offline_access'
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new AppError(`Token refresh failed: ${error}`, 500);
    }

    const data = await response.json();

    logger.info('[MicrosoftOAuth] Token refreshed successfully', {
      metadata: {
        hasAccessToken: !!data.access_token,
        hasRefreshToken: !!data.refresh_token
      }
    });

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  
    },
    {
      operation: 'ad',
      service: 'MicrosoftOAuthService',
      metadata: {}
    }
  );
    });
    throw error;
  }
}
