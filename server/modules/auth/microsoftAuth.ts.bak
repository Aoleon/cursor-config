import { Router } from 'express';
import passport from 'passport';
import type { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { MicrosoftOAuthService } from '../../services/MicrosoftOAuthService';
import type { IStorage } from '../../storage-poc';

export function createMicrosoftAuthRoutes(storage: IStorage): Router {
  const router = Router();
  
  // Initialize Microsoft OAuth service
  new MicrosoftOAuthService(storage);

  /**
   * GET /auth/microsoft
   * Initie le flow OAuth2 Microsoft Azure AD
   */
  router.get('/auth/microsoft',
    passport.authenticate('azure-ad', {
      failureRedirect: '/login',
      session: true
          }
        })
      );

  /**
   * POST /auth/microsoft/callback
   * Callback après authentification Microsoft réussie
   */
  router.post('/auth/microsoft/callback',
    passport.authenticate('azure-ad', {
      failureRedirect: '/login',
      session: true
    }),
    (req: Request, res: Response) => {
      logger.info('[MicrosoftAuth] User successfully authenticated', { metadata: {
          route: '/auth/microsoft/callback',
          userId: (req.user as any)?.id,
          email: (req.user as any)?.email

        }
                });

      // Redirect to dashboard after successful login
      res.redirect('/');
    }
  );

  /**
   * GET /auth/microsoft/logout
   * Déconnexion Microsoft
   */
  router.get('/auth/microsoft/logout', (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        logger.error('[MicrosoftAuth] Error during logout', { metadata: { error: err.message 

        }
                });
      }
      res.redirect('/login');
    });
  });

  return router;
}
