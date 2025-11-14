/**
 * OpenAPI Documentation Generator
 * 
 * Generates OpenAPI 3.0 specification from Express routes.
 * This script analyzes route definitions and generates API documentation.
 * 
 * Usage: npm run generate:openapi
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../server/utils/logger';

interface RouteInfo {
  method: string;
  path: string;
  description?: string;
  parameters?: Array<{
    name: string;
    in: 'path' | 'query' | 'header';
    required: boolean;
    schema: { type: string };
  }>;
  requestBody?: {
    content: {
      'application/json': {
        schema: Record<string, unknown>;
      };
    };
  };
  responses: Record<string, {
    description: string;
    content?: {
      'application/json': {
        schema: Record<string, unknown>;
      };
    };
  }>;
}

/**
 * Generates OpenAPI 3.0 specification
 */
function generateOpenAPISpec(): {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{ url: string; description: string }>;
  paths: Record<string, Record<string, RouteInfo>>;
  components: {
    schemas: Record<string, unknown>;
    securitySchemes: Record<string, unknown>;
  };
} {
  logger.info('Génération documentation OpenAPI', {
    metadata: {
      service: 'OpenAPIGenerator',
      operation: 'generateOpenAPISpec'
    }
  });

  // Base OpenAPI structure
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'Saxium API',
      version: '1.0.0',
      description: 'API REST pour la gestion de projets JLM Menuiserie'
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:5000',
        description: 'Serveur de développement'
      }
    ],
    paths: {} as Record<string, Record<string, RouteInfo>>,
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'string' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        basicAuth: {
          type: 'http',
          scheme: 'basic'
        }
      }
    }
  };

  // Note: This is a basic structure. Full implementation would require
  // parsing route files to extract actual route definitions, parameters, etc.
  // For now, this provides the foundation for manual documentation.

  logger.info('Structure OpenAPI de base générée', {
    metadata: {
      service: 'OpenAPIGenerator',
      operation: 'generateOpenAPISpec',
      pathsCount: Object.keys(spec.paths).length
    }
  });

  return spec;
}

/**
 * Main function to generate and save OpenAPI spec
 */
async function main(): Promise<void> {
  try {
    const spec = generateOpenAPISpec();
    const outputPath = join(process.cwd(), 'docs', 'api', 'openapi.json');
    
    // Ensure docs/api directory exists
    const { mkdirSync } = await import('fs');
    const { dirname } = await import('path');
    mkdirSync(dirname(outputPath), { recursive: true });
    
    writeFileSync(outputPath, JSON.stringify(spec, null, 2), 'utf-8');
    
    logger.info('Documentation OpenAPI générée', {
      metadata: {
        service: 'OpenAPIGenerator',
        operation: 'main',
        outputPath
      }
    });
    
    console.log(`✅ Documentation OpenAPI générée: ${outputPath}`);
    console.log('📝 Note: Cette version est basique. Pour une documentation complète,');
    console.log('   il faudrait parser les fichiers de routes pour extraire les définitions.');
  } catch (error) {
    logger.error('Erreur lors de la génération OpenAPI', error as Error, {
      metadata: {
        service: 'OpenAPIGenerator',
        operation: 'main'
      }
    });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { generateOpenAPISpec };

