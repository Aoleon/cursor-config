/**
 * CONTEXT COMPOSER - Business Context Composition
 * 
 * Extracted from BusinessContextService to reduce file size.
 * Composes different context builders into a unified business context.
 * 
 * Target LOC: ~300-400
 */

import { logger } from '../../utils/logger';
import { RBACContextBuilder } from './RBACContextBuilder';
import { TemporalContextBuilder } from './TemporalContextBuilder';
import type { BusinessContext, BusinessContextRequest, RBACContext } from '@shared/schema';
import type { TemporalContext } from './TemporalContextBuilder';

export class ContextComposer {
  private rbacBuilder: RBACContextBuilder;
  private temporalBuilder: TemporalContextBuilder;

  constructor(rbacBuilder: RBACContextBuilder) {
    this.rbacBuilder = rbacBuilder;
    this.temporalBuilder = new TemporalContextBuilder();
  }

  /**
   * Compose un contexte métier enrichi
   */
  async composeEnrichedContext(
    request: BusinessContextRequest,
    databaseSchemas: unknown[],
    businessExamples: unknown[],
    suggestedQueries: unknown[]
  ): Promise<BusinessContext> {
    try {
      logger.info('Composition contexte métier enrichi', {
        metadata: {
          service: 'ContextComposer',
          operation: 'composeEnrichedContext',
          userId: request.userId,
          userRole: request.user_role
        }
      });

      // Construire les différents contextes
      const roleSpecificConstraints = await this.rbacBuilder.buildRBACContext(request.userId, request.user_role);
      const temporal_context = this.temporalBuilder.buildTemporalContext();

      // Composer le contexte final
      const context: BusinessContext = {
        databaseSchemas: databaseSchemas as any,
        businessExamples: businessExamples as any,
        roleSpecificConstraints,
        suggestedQueries: suggestedQueries as any,
        temporal_context: temporal_context as any,
        cache_metadata: {
          generated_at: new Date(),
          expires_at: new Date(Date.now() + (request.cache_duration_minutes || 60) * 60 * 1000),
          cache_key: '',
          version: "2.1.0"
        }
      };

      logger.info('Contexte métier composé', {
        metadata: {
          service: 'ContextComposer',
          operation: 'composeEnrichedContext',
          schemasCount: databaseSchemas.length,
          examplesCount: businessExamples.length,
          queriesCount: suggestedQueries.length
        }
      });

      return context;
    } catch (error) {
      logger.error('[ContextComposer] Erreur composition contexte', {
        metadata: {
          service: 'ContextComposer',
          operation: 'composeEnrichedContext',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      // Retourner contexte minimal en cas d'erreur
      return {
        databaseSchemas: [],
        businessExamples: [],
        roleSpecificConstraints: {
          userRole: request.user_role,
          permissions: {},
          restrictions: [],
          accessibleEntities: [],
          accessibleFields: {}
        },
        suggestedQueries: [],
        temporal_context: this.temporalBuilder.buildTemporalContext() as any,
        cache_metadata: {
          generated_at: new Date(),
          version: "2.1.0",
          ttl_minutes: 60
        }
      };
    }
  }

  /**
   * Compose un contexte SQL minimal
   */
  async composeMinimalSQLContext(
    request: BusinessContextRequest
  ): Promise<BusinessContext> {
    try {
      const roleSpecificConstraints = await this.rbacBuilder.buildRBACContext(request.userId, request.user_role);
      
      return {
        databaseSchemas: [],
        businessExamples: [],
        roleSpecificConstraints,
        suggestedQueries: [],
        temporal_context: this.temporalBuilder.buildTemporalContext() as any,
        cache_metadata: {
          generated_at: new Date(),
          expires_at: new Date(Date.now() + (request.cache_duration_minutes || 60) * 60 * 1000),
          cache_key: '',
          version: "2.1.0"
        }
      };
    } catch (error) {
      logger.error('[ContextComposer] Erreur composition contexte SQL minimal', {
        metadata: {
          service: 'ContextComposer',
          operation: 'composeMinimalSQLContext',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      return {
        databaseSchemas: [],
        businessExamples: [],
        roleSpecificConstraints: {
          userRole: request.user_role,
          permissions: {},
          restrictions: [],
          accessibleEntities: [],
          accessibleFields: {}
        },
        suggestedQueries: [],
        temporal_context: this.temporalBuilder.buildTemporalContext() as any,
        cache_metadata: {
          generated_at: new Date(),
          version: "2.1.0",
          ttl_minutes: 60
        }
      };
    }
  }
}

