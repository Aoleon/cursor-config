import { Request, Response, NextFunction } from "express";
import { z, ZodError, ZodSchema } from "zod";
import { fromZodError } from "zod-validation-error";

// Interface pour les options de validation
interface ValidationOptions {
  strict?: boolean; // Mode strict : rejeter les champs non définis
  stripUnknown?: boolean; // Supprimer les champs non définis
}

// Types pour les différentes sources de validation
type ValidationSource = 'body' | 'params' | 'query';

// Middleware de validation générique
export function validate(
  source: ValidationSource,
  schema: ZodSchema,
  options: ValidationOptions = {}
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate = req[source];
      
      // Configuration par défaut
      const opts = {
        strict: false,
        stripUnknown: true,
        ...options
      };

      // Appliquer la validation selon les options
      let validatedData;
      if (opts.stripUnknown) {
        validatedData = schema.parse(dataToValidate);
      } else {
        // Pour le mode strict, nous devons nous assurer que le schema est un ZodObject
        // Sinon, nous utilisons parse standard avec passthrough
        if ('strict' in schema && typeof schema.strict === 'function') {
          validatedData = (schema as any).strict().parse(dataToValidate);
        } else {
          validatedData = schema.parse(dataToValidate);
        }
      }

      // Remplacer les données par les données validées
      (req as any)[source] = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({
          success: false,
          error: 'Erreur de validation',
          details: {
            source,
            message: validationError.message,
            issues: error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message,
              code: issue.code,
              received: 'received' in issue ? (issue as any).received : 'undefined'
            }))
          }
        });
      }
      next(error);
    }
  };
}

// Helpers spécialisés pour différents types de validation
export const validateBody = (schema: ZodSchema, options?: ValidationOptions) => 
  validate('body', schema, options);

export const validateParams = (schema: ZodSchema, options?: ValidationOptions) => 
  validate('params', schema, options);

export const validateQuery = (schema: ZodSchema, options?: ValidationOptions) => 
  validate('query', schema, options);

// Schémas de validation communs pour les paramètres d'URL
export const commonParamSchemas = {
  id: z.object({
    id: z.string().uuid('ID invalide - doit être un UUID valide')
  }),
  
  idOptional: z.object({
    id: z.string().uuid().optional()
  }),

  // Pagination commune
  pagination: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
    search: z.string().optional(),
    status: z.string().optional()
  })
};

// Schémas de validation pour les query strings courantes
export const commonQuerySchemas = {
  search: z.object({
    search: z.string().min(1, 'Le terme de recherche ne peut pas être vide').optional(),
    status: z.string().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
    offset: z.string().regex(/^\d+$/).transform(Number).default('0')
  }),

  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    periode: z.enum(['jour', 'semaine', 'mois', 'trimestre', 'annee']).optional()
  }),

  filters: z.object({
    departement: z.string().length(2).optional(),
    type: z.string().optional(),
    priority: z.enum(['tres_faible', 'faible', 'normale', 'elevee', 'critique']).optional()
  })
};

// Middleware de validation combinée pour les routes complexes
export function validateRequest(validations: {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}, options?: ValidationOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: any[] = [];

    // Valider le body si fourni
    if (validations.body) {
      try {
        req.body = validations.body.parse(req.body);
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push({
            source: 'body',
            issues: error.issues
          });
        }
      }
    }

    // Valider les params si fourni
    if (validations.params) {
      try {
        req.params = validations.params.parse(req.params);
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push({
            source: 'params',
            issues: error.issues
          });
        }
      }
    }

    // Valider la query si fournie
    if (validations.query) {
      try {
        req.query = validations.query.parse(req.query);
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push({
            source: 'query',
            issues: error.issues
          });
        }
      }
    }

    // S'il y a des erreurs, les retourner
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Erreurs de validation',
        details: errors.map(err => ({
          source: err.source,
          issues: err.issues.map((issue: any) => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
            received: 'received' in issue ? (issue as any).received : 'undefined'
          }))
        }))
      });
    }

    next();
  };
}

// Middleware pour valider les uploads de fichiers
export function validateFileUpload(
  fieldName: string,
  options: {
    maxSize?: number; // en bytes
    allowedMimeTypes?: string[];
    required?: boolean;
  } = {}
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const file = req.file;
    const files = req.files;
    
    const opts = {
      maxSize: 10 * 1024 * 1024, // 10MB par défaut
      allowedMimeTypes: [],
      required: false,
      ...options
    };

    // Vérifier si le fichier est requis
    if (opts.required && !file && (!files || !Array.isArray(files) || files.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Fichier requis',
        details: {
          field: fieldName,
          message: `Le fichier ${fieldName} est requis`
        }
      });
    }

    // Si pas de fichier et pas requis, continuer
    if (!file && (!files || !Array.isArray(files) || files.length === 0)) {
      return next();
    }

    // Valider le fichier principal ou les fichiers multiples
    const filesToValidate = file ? [file] : (Array.isArray(files) ? files : []);

    for (const f of filesToValidate) {
      // Vérifier la taille
      if (f.size > opts.maxSize) {
        return res.status(400).json({
          success: false,
          error: 'Fichier trop volumineux',
          details: {
            field: fieldName,
            maxSize: opts.maxSize,
            actualSize: f.size,
            message: `Le fichier ${f.originalname} dépasse la taille limite de ${opts.maxSize} bytes`
          }
        });
      }

      // Vérifier le type MIME
      if (opts.allowedMimeTypes.length > 0 && !opts.allowedMimeTypes.includes(f.mimetype)) {
        return res.status(400).json({
          success: false,
          error: 'Type de fichier non autorisé',
          details: {
            field: fieldName,
            allowedTypes: opts.allowedMimeTypes,
            actualType: f.mimetype,
            message: `Le type ${f.mimetype} n'est pas autorisé pour ${f.originalname}`
          }
        });
      }
    }

    next();
  };
}