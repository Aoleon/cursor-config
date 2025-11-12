import { 
  Permission, 
  PermissionContext, 
  UserPermissionContext,
  RbacAuditLog,
  PermissionCheckResult,
  UserPermissionsResponse,
  AccessValidationRequest,
  type InsertRbacAuditLog,
  permissions,
  permissionContexts,
  userPermissionContexts,
  rbacAuditLog,
  users
} from "@shared/schema";
import type { IStorage } from "../storage-poc";
import { withErrorHandling } from './utils/error-handler';
import { eq, and, or, desc, asc, gt, gte, lte, inArray, sql, isNull } from "drizzle-orm";
import { db } from "../db";
import { logger } from "../utils/logger";
import { DatabaseError } from '../utils/error-handler';

export class RBACService {
  constructor(private storage: IStorage) {}

  /**
   * Récupère toutes les permissions d'un utilisateur pour une table donnée
   * @param userId ID de l'utilisateur
   * @param role Rôle de l'utilisateur
   * @param tableName Nom de la table (optionnel)
   * @returns Permissions de l'utilisateur
   */
  async getUserPermissions(
    userId: string, 
    role: string, 
    tableName?: string
  ): Promise<UserPermissionsResponse> {
    try {
      // Récupérer les permissions pour le rôle
      let permissionsQuery = db
        .select()
        .from(permissions)
        .where(and(
          eq(permissions.role, role as unknown),
          eq(permissions.isActive, true),
          ...(tableName ? [eq(permissions.tableName, tableName)] : [])
        ));

      const userPermissions = await permissionsQuery;

      // Récupérer les contextes de l'utilisateur
      const userContexts = await db
        .select()
        .from(userPermissionContexts)
        .where(and(
          eq(userPermissionContexts.userId, userId),
          eq(userPermissionContexts.isActive, true),
          or(
            isNull(userPermissionContexts.validUntil),
            gte(userPermissionContexts.validUntil, new Date())
          )
        ));

      // Organiser les permissions par table et action
      const permissionsByTable: { [tableName: string]: unknown} = {};

      userPermissions.forEach(permission => {
        if (!permissionsByTable[permission.tableName]) {
          permissionsByTable[permission.tableName] = {
            read: { allowed: false },
            write: { allowed: false },
            delete: { allowed: false },
            create: { allowed: false },
            export: { allowed: false }
          };
        }

        const table = permissionsByTable[permission.tableName];
        
        if (permission.canRead) {
          table.read = this.buildPermissionResult(permission, 'read');
        }
        if (permission.canWrite) {
          table.write = this.buildPermissionResult(permission, 'write');
        }
        if (permission.canDelete) {
          table.delete = this.buildPermissionResult(permission, 'delete');
        }
        if (permission.canCreate) {
          table.create = this.buildPermissionResult(permission, 'create');
        }
        if (permission.canExport) {
          table.export = this.buildPermissionResult(permission, 'export');
        });

      return {
        userId,
        role,
        permissions: permissionsByTable,
        contexts: userContexts,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('[RBACService] Erreur lors de la récupération des permissions utilisateur', { metadata: {
          operation: 'getUserPermissions',
          service: 'RBACService',
          userId,
          role,
          error: error instanceof Error ? error.message : String(error) 

              }
 
              
                                                            });
      throw new DatabaseError('Erreur lors de la récupération des permissions utilisateur', error as Error);
    }

  /**
   * Valide l'accès d'un utilisateur à une table/action spécifique
   * @param request Requête de validation d'accès
   * @returns Résultat de la validation
   */
  async validateTableAccess(request: AccessValidationRequest): Promise<PermissionCheckResult> {
    return withErrorHandling(
    async () => {

      const { userId, role, tableName, action, columns = [], recordId, contextValues = {} } = request;

      // Admin a toujours accès (bypass)
      if (role === 'admin') {
        await this.logAccess(userId, role, action, tableName, recordId, columns, true);
        return {
          allowed: true,
          allowedColumns: [],
          auditRequired: true
        };
      }

      // Récupérer les permissions pour ce rôle et cette table
      const tablePermissions = await db
        .select()
        .from(permissions)
        .where(and(
          eq(permissions.role, ras unknown),
          eq(permissions.tableName, tableName),
          eq(permissions.isActive, true)
        ))
        .orderBy(asc(permissions.priority));

      if (tablePermissions.length === 0) {
        await this.logAccess(userId, role, action, tableName, recordId, columns, false, "Aucune permission définie");
        return {
          allowed: false,
          denialReason: "Aucune permission définie pour ce rôle et cette table"
        };
      }

      // Vérifier l'action demandée
      const permission = tablePermissions[0]; // Prendre la permission avec la plus haute priorité
      const actionAllowed = this.checkActionPermission(permission, action);

      if (!actionAllowed) {
        await this.logAccess(userId, role, action, tableName, recordId, columns, false, `Action '${action}' non autorisée`);
        return {
          allowed: false,
          denialReason: `Action '${action}' non autorisée pour ce rôle`
        };
      }

      // Vérifier les colonnes si spécifiées
      const columnCheck = this.checkColumnAccess(permission, columns);
      if (!columnCheck.allowed) {
        await this.logAccess(userId, role, action, tableName, recordId, columns, false, columnCheck.denialReason);
        return columnCheck;
      }

      // Vérifier les contextes requis
      const contextCheck = await this.checkContextRequirements(
        userId, 
        permission, 
        contextValues, 
        recordId
      );

      if (!contextCheck.allowed) {
        await this.logAccess(userId, role, action, tableName, recordId, columns, false, contextCheck.denialReason);
        return contextCheck;
      }

      // Validation réussie
      await this.logAccess(userId, role, action, tableName, recordId, columns, true);
      
      return {
        allowed: true,
        allowedColumns: permission.allowedColumns || [],
        deniedColumns: permission.deniedColumns || [],
        conditions: permission.conditions,
        contextRequired: permission.contextRequired ?? undefined,
        auditRequired: permission.dataSensitivity === 'confidential' || permission.dataSensitivity === 'restricted'
      };

    
    },
    {
      operation: 'constructor',
      service: 'RBACService',
      metadata: {}
    } );
      return {
        allowed: false,
        denialReason: "Erreur système lors de la validation"
      };
    }

  /**
   * Crée un contexte de permission dynamique
   * @param contextName Nom du contexte
   * @param description Description du contexte
   * @param sqlCondition Condition SQL template
   * @param requiredParameters Paramètres requis
   * @param appliesTo Tables concernées
   * @returns ID du contexte créé
   */
  async createPermissionContext(
    contextName: string,
    description: string,
    sqlCondition: string,
    requiredParameters: string[] = [],
    appliesTo: string[] = []
  ): Promise<string> {
    return withErrorHandling(
    async () => {

      const [newContext] = await db.insert(permissionContexts).values({
        contextName,
        description,
        sqlCondition,
        requiredParameters,
        appliesTo,
        isSystemContext: false,
        isActive: true
      }).returning();

      return newContext.id;
    
    },
    {
      operation: 'constructor',
      service: 'RBACService',
      metadata: {}
    } );
      throw new DatabaseError('Erreur lors de la création du contexte', error as Error);
    }

  /**
   * Assigne un contexte de permission à un utilisateur
   * @param userId ID utilisateur
   * @param contextName Nom du contexte
   * @param contextValues Valeurs du contexte
   * @param grantedBy ID de l'utilisateur qui accorde
   * @param validUntil Date d'expiration (optionnel)
   * @returns ID de l'assignation
   */
  async assignContextToUser(
    userId: string,
    contextName: string,
    contextValues: Record<string, unknown>,
    grantedBy: string,
    validUntil?: Date
  ): Promise<string> {
    return withErrorHandling(
    async () => {

      const [assignment] = await db.insert(userPermissionContexts).values({
        userId,
        contextName,
        contextValues,
        grantedBy,
        validUntil,
        isActive: true
      }).returning();

      return assignment.id;
    
    },
    {
      operation: 'constructor',
      service: 'RBACService',
      metadata: {}
    } );
      throw new DatabaseError('Erreur lors de l\'assignation du contexte', error as Error);
    }

  /**
   * Récupère l'historique d'audit pour un utilisateur/table
   * @param filters Filtres de recherche
   * @returns Entrées d'audit
   */
  async getAuditHistory(filters: {
    userId?: string;
    tableName?: string;
    action?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<RbacAuditLog[]> {
    return withErrorHandling(
    async () => {

      const conditions = [];
      if (filters.userId) conditions.push(eq(rbacAuditLog.userId, filters.userId));
      if (filters.tableName) conditions.push(eq(rbacAuditLog.tableName, filters.tableName));
      if (filters.action) conditions.push(eq(rbacAuditLog.action, filtersas unknown) as unknown));
      if (filters.dateFrom) conditions.push(gte(rbacAuditLog.timestamp, filters.dateFrom));
      if (filters.dateTo) conditions.push(lte(rbacAuditLog.timestamp, filters.dateTo));

      // Construire la requête complète d'un coup pour éviter les problèmes de type
      const baseQuery = db
        .select()
        .from(rbacAuditLog)
        .orderBy(desc(rbacAuditLog.timestamp));

      let finalQuery = conditions.length > 0 
        ? baseQuery.where(and(...conditions))
        : baseQuery;

      if (filters.limit && filters.offset) {
        return await finalQuery.limit(filters.limit).offset(filters.offset);
      } else if (filters.limit) {
        return await finalQuery.limit(filters.limit);
      } else if (filters.offset) {
        return await finalQuery.offset(filters.offset);
      } else {
        return await finalQuery;
      }
    
    },
    {
      operation: 'constructor',
      service: 'RBACService',
      metadata: {}
    } );
      throw new DatabaseError('Erreur lors de la récupération de l\'audit', error as Error);
    }

  // ========================================
  // MÉTHODES PRIVÉES
  // ========================================

  private buildPermissionResult(permission: Permission, action: string): PermissionCheckResult {
    return {
      allowed: true,
      allowedColumns: permission.allowedColumns || [],
      deniedColumns: permission.deniedColumns || [],
      conditions: permission.conditions,
      contextRequired: permission.contextRequired ?? undefined,
      auditRequired: permission.dataSensitivity === 'confidential' || permission.dataSensitivity === 'restricted'
    };
  }

  private checkActionPermission(permission: Permission, action: string): boolean {
    switch (action) {
      case 'read': return permission.canRead ?? false;
      case 'write': return permission.canWrite ?? false;
      case 'delete': return permission.canDelete ?? false;
      case 'create': return permission.canCreate ?? false;
      case 'export': return permission.canExport ?? false;
      default: return false;
    }

  private checkColumnAccess(permission: Permission, requestedColumns: string[]): PermissionCheckResult {
    const allowedColumns = permission.allowedColumns || [];
    const deniedColumns = permission.deniedColumns || [];

    // Si aucune colonne spécifiée dans la permission, accès total
    if (allowedColumns.length === 0 && deniedColumns.length === 0) {
      return { allowed: true };
    }

    // Si des colonnes sont explicitement refusées
    if (deniedColumns.length > 0) {
      const blockedColumns = requestedColumns.filter(col => deniedColumns.includes(col));
      if (blockedColumns.length > 0) {
        return {
          allowed: false,
          denialReason: `Accès refusé aux colonnes: ${blockedColumns.join(', ')}`
        };
      }

    // Si des colonnes sont explicitement autorisées
    if (allowedColumns.length > 0) {
      const unauthorizedColumns = requestedColumns.filter(col => !allowedColumns.includes(col));
      if (unauthorizedColumns.length > 0) {
        return {
          allowed: false,
          denialReason: `Accès non autorisé aux colonnes: ${unauthorizedColumns.join(', ')}`
        };
      }

    return { allowed: true, allowedColumns, deniedColumns };
  }

  private async checkContextRequirements(
    userId: string,
    permission: Permission,
    contextValues: Record<st, unknown>,
    recordId?: string
  ): Promise<PermissionCheckResult> {
    
    // Si aucun contexte requis, accès autorisé
    if (permission.contextRequired === 'all') {
      return { allowed: true };
    }

    // Vérifier selon le type de contexte
    switch (permission.contextRequired) {
      case 'own_only':
        return this.checkOwnOnlyContext(userId, contextValues, recordId);
      
      case 'team_projects':
        return this.checkTeamProjectsContext(userId, contextValues);
      
      case 'assigned_projects':
        return this.checkAssignedProjectsContext(userId, contextValues);
      
      case 'department_data':
        return this.checkDepartmentContext(userId, contextValues);
      
      case 'financial_restricted':
        return this.checkFinancialContext(userId, contextValues);
      
      default:
        return { allowed: true };
    }

  private async checkOwnOnlyContext(
    userId: string, 
    contextValues: Recor, unknown>unknown>unknown>, 
    recordId?: string
  ): Promise<PermissionCheckResult> {
    // Logique pour vérifier que l'utilisateur accède seulement à ses propres données
    // Cette logique sera spécifique à chaque table
    return { allowed: true }; // Implémentation simplifiée
  }

  private async checkTeamProjectsContext(
    userId: string, 
    contextValues: Record<string, unknown>
  ): Promise<PermissionCheckResult> {
    // Vérifier que l'utilisateur fait partie de l'équipe du projet
    return { allowed: true }; // Implémentation simplifiée
  }

  private async checkAssignedProjectsContext(
    userId: string, 
    contextValue, unknown>unknown>unknowning, unknown>
  ): Promise<PermissionCheckResult> {
    // Vérifier que l'utilisateur est assigné au projet
    return { allowed: true }; // Implémentation simplifiée
  }

  private async checkDepartmentContext(
    userId: string, 
    contextV, unknown>unknown>unknown<st, unknown>unknown>
  ): Promise<PermissionCheckResult> {
    // Vérifier que les données appartiennent au département de l'utilisateur
    return { allowed: true }; // Implémentation simplifiée
  }

  private async checkFinancialContext(
    userId: string, 
    cont, unknown>unknown>unknowncor, unknown>unknown>unknown>
  ): Promise<PermissionCheckResult> {
    // Vérifier les permissions financières spéciales
    return { allowed: true }; // Implémentation simplifiée
  }

  private async logAccess(
    userId: string,
    role: string,
    action: string,
    tableName: string,
    recordId?: string,
    columns?: string[],
    success: boolean = true,
    denialReason?: string
  ): Promise<void> {
    return withErrorHandling(
    async () => {

      await db.insert(rbacAuditLog).values({
        userId,
        userRole: role as unknown,
        action: actas unknown, unknown,
        tableName,
        recordId,
        accessedColumns: columns || [],
        success,
        denialReason,
        sensitivityLevel: 'internal', // Par défaut
        timestamp: new Date()
      });
    
    },
    {
      operation: 'constructor',
      service: 'RBACService',
      metadata: {}
    } );
      // Ne pas faire échouer l'opération principale si l'audit échoue
    }