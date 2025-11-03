import passport from 'passport';
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
        try {
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

          return done(null, user);
        } catch (error) {
          logger.error('[MicrosoftOAuth] Error during Microsoft authentication', {
            metadata: {
              service: 'MicrosoftOAuthService',
              error: error instanceof Error ? error.message : String(error)
            }
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
