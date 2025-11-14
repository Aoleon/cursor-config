/**
 * RBAC CONTEXT BUILDER - RBAC Context Construction
 * 
 * Extracted from BusinessContextService to reduce file size.
 * Handles RBAC context building for business context.
 * 
 * Target LOC: ~200-300
 */

import { RBACService } from '../RBACService';
import { logger } from '../../utils/logger';
import type { RBACContext } from '@shared/schema';

export class RBACContextBuilder {
  constructor(private rbacService: RBACService) {}

  /**
   * Construit le contexte RBAC pour un utilisateur
   */
  async buildRBACContext(userId: string, userRole: string): Promise<RBACContext> {
    try {
      logger.info('Construction contexte RBAC', {
        metadata: {
          service: 'RBACContextBuilder',
          operation: 'buildRBACContext',
          userId,
          userRole
        }
      });

      const userPermissions = await this.rbacService.getUserPermissions(userId, userRole);
      
      if (!userPermissions || Object.keys(userPermissions.permissions).length === 0) {
        return {
          user_role: userRole,
          permissions: {},
          restrictions: [],
          accessibleEntities: [],
          accessibleFields: {}
        };
      }

      const accessibleEntities: string[] = [];
      const accessibleFields: Record<string, string[]> = {};

      // Construire liste des entités accessibles
      for (const [entity, permissions] of Object.entries(userPermissions.permissions)) {
        if (permissions.read || permissions.write || permissions.delete) {
          accessibleEntities.push(entity);
          
          // Extraire les champs accessibles (simplifié)
          accessibleFields[entity] = ['*']; // Tous les champs pour l'instant
        }
      }

      const restrictions: string[] = [];
      
      // Ajouter restrictions selon le rôle
      if (userRole !== 'admin') {
        restrictions.push(`Filtre automatique: userId = '${userId}' pour données personnelles`);
      }

      return {
        user_role: userRole,
        permissions: userPermissions.permissions,
        restrictions,
        accessibleEntities,
        accessibleFields
      };
    } catch (error) {
      logger.error('[RBACContextBuilder] Erreur construction contexte RBAC', {
        metadata: {
          service: 'RBACContextBuilder',
          operation: 'buildRBACContext',
          userId,
          user_role: userRole,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      // Retourner contexte minimal en cas d'erreur
      return {
        user_role: userRole,
        permissions: {},
        restrictions: [],
        accessibleEntities: [],
        accessibleFields: {}
      };
    }
  }
}

