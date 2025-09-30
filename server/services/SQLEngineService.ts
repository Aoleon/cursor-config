import { AIService } from "./AIService";
import { RBACService } from "./RBACService";
import { BusinessContextService } from "./BusinessContextService";
import { EventBus } from "../eventBus";
import { IStorage } from "../storage-poc";
import { db } from "../db";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";
import sqlParserModule from 'node-sql-parser';
import type {
  AiQueryRequest,
  AiQueryResponse,
  AccessValidationRequest,
  PermissionCheckResult,
  UserPermissionsResponse,
  SQLQueryRequest,
  SQLQueryResult,
  SQLValidationRequest,
  SQLValidationResult
} from "@shared/schema";

// ========================================
// TYPES IMPORTÉS DEPUIS SHARED/SCHEMA.TS
// ========================================

// Note: SQLQueryRequest, SQLQueryResult, SQLValidationRequest, SQLValidationResult
// sont maintenant importés depuis @shared/schema pour éviter la duplication

// ========================================
// CONSTANTES DE SÉCURITÉ
// ========================================

const MAX_RESULTS_DEFAULT = 1000;
const MAX_RESULTS_ADMIN = 10000;
const QUERY_TIMEOUT_DEFAULT = 30000; // 30 secondes
const QUERY_TIMEOUT_COMPLEX = 60000; // 60 secondes pour requêtes complexes

// Instance parser SQL pour analyse AST
const sqlParser = new sqlParserModule.Parser();

// SQL DDL/DML interdits (read-only strict) - DEPRECATED: remplacé par AST
const FORBIDDEN_STATEMENT_TYPES = [
  'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TRUNCATE',
  'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL', 'DECLARE', 'SET',
  'MERGE', 'BULK', 'LOAD', 'COPY', 'IMPORT', 'EXPORT'
];

// Tables autorisées pour les requêtes métier JLM
const ALLOWED_BUSINESS_TABLES = [
  'offers', 'projects', 'suppliers', 'ao_documents', 'project_tasks',
  'team_resources', 'chiffrage_elements', 'validation_milestones',
  'project_timelines', 'date_alerts', 'business_alerts', 'users'
];

// Colonnes sensibles nécessitant des restrictions spéciales
const SENSITIVE_COLUMNS = {
  'users': ['password_hash', 'api_keys', 'tokens'],
  'projects': ['internal_notes', 'confidential_data'],
  'offers': ['internal_margin', 'cost_breakdown']
};

// ========================================
// CLASSE PRINCIPALE MOTEUR SQL SÉCURISÉ
// ========================================

export class SQLEngineService {
  private aiService: AIService;
  private rbacService: RBACService;
  private businessContextService: BusinessContextService;
  private eventBus: EventBus;
  private storage: IStorage;

  constructor(
    aiService: AIService, 
    rbacService: RBACService, 
    businessContextService: BusinessContextService,
    eventBus: EventBus,
    storage: IStorage
  ) {
    this.aiService = aiService;
    this.rbacService = rbacService;
    this.businessContextService = businessContextService;
    this.eventBus = eventBus;
    this.storage = storage;
  }

  // ========================================
  // MÉTHODE PRINCIPALE - GÉNÉRATION ET EXÉCUTION SQL SÉCURISÉE
  // ========================================

  /**
   * Pipeline complet : NL → Context → AI → Parse → RBAC → Validation → Execution
   */
  async executeNaturalLanguageQuery(request: SQLQueryRequest): Promise<SQLQueryResult> {
    const startTime = Date.now();
    const queryId = crypto.randomUUID();

    try {
      console.log(`[SQLEngine] Démarrage requête ${queryId} pour utilisateur ${request.userId}`);

      // 1. Validation et nettoyage de la requête d'entrée
      const validationResult = this.validateInputQuery(request);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            type: "validation",
            message: "Requête d'entrée invalide",
            details: validationResult.errors
          }
        };
      }

      // 2. Construction du contexte intelligent métier
      const enrichedContext = await this.buildIntelligentContext(request);

      // 3. Génération SQL via IA (optimisé pour performance <15s)
      const aiRequest: AiQueryRequest = {
        query: request.naturalLanguageQuery,
        context: enrichedContext,
        userRole: request.userRole,
        complexity: this.detectQueryComplexity(request.naturalLanguageQuery),
        queryType: "text_to_sql",
        useCache: !request.dryRun,
        maxTokens: 512 // Réduit de 4096 → 512 (SQL = <300 tokens typiques)
      };

      const aiResponse = await this.aiService.generateSQL(aiRequest);
      if (!aiResponse.success || !aiResponse.data?.sqlGenerated) {
        return {
          success: false,
          error: {
            type: "parsing",
            message: "Échec de génération SQL par IA",
            details: aiResponse.error
          }
        };
      }

      const generatedSQL = aiResponse.data.sqlGenerated;

      // 4. Parsing et validation sécurité SQL
      const securityCheck = await this.validateSQLSecurity(generatedSQL, request.userId, request.userRole);
      if (!securityCheck.isSecure) {
        return {
          success: false,
          error: {
            type: "security",
            message: "Requête SQL non sécurisée",
            details: {
              violations: securityCheck.securityViolations,
              sql: generatedSQL
            }
          }
        };
      }

      // 5. Application automatique des filtres RBAC
      const rbacFilteredSQL = await this.applyRBACFilters(
        generatedSQL, 
        request.userId, 
        request.userRole,
        securityCheck.allowedTables
      );

      if (!rbacFilteredSQL.success) {
        return {
          success: false,
          error: {
            type: "rbac",
            message: "Accès refusé par le système RBAC",
            details: rbacFilteredSQL.rbacViolations
          }
        };
      }

      // 6. Exécution sécurisée si pas en mode dry-run
      let results: any[] = [];
      let executionTime = 0;

      if (!request.dryRun) {
        const execResult = await this.executeSecureSQL(
          rbacFilteredSQL.filteredSQL!,
          rbacFilteredSQL.parameters || [],
          request.maxResults || (request.userRole === 'admin' ? MAX_RESULTS_ADMIN : MAX_RESULTS_DEFAULT),
          request.timeoutMs || QUERY_TIMEOUT_DEFAULT
        );

        if (!execResult.success) {
          return {
            success: false,
            error: {
              type: "execution",
              message: "Erreur d'exécution SQL",
              details: execResult.error
            }
          };
        }

        // Sanitize results pour JSON serialization (BigInt → string)
        results = this.sanitizeResultsForJSON(execResult.results || []);
        executionTime = execResult.executionTime || 0;
      }

      // 7. Logging et audit
      await this.logQueryExecution(queryId, request, rbacFilteredSQL.filteredSQL!, results.length, startTime);

      // 8. Publication d'événement si requête sensible
      if (this.isSensitiveQuery(rbacFilteredSQL.filteredSQL!, request.userRole)) {
        await this.eventBus.publish('sql_engine.sensitive_query_executed', {
          queryId,
          userId: request.userId,
          userRole: request.userRole,
          tablesAccessed: securityCheck.allowedTables,
          timestamp: new Date()
        });
      }

      return {
        success: true,
        sql: rbacFilteredSQL.filteredSQL,
        parameters: rbacFilteredSQL.parameters,
        results,
        executionTime,
        rbacFiltersApplied: rbacFilteredSQL.filtersApplied,
        confidence: aiResponse.data.confidence,
        warnings: this.generateWarnings(rbacFilteredSQL.filteredSQL!, results.length, request.userRole),
        metadata: {
          tablesAccessed: securityCheck.allowedTables,
          columnsAccessed: securityCheck.allowedColumns,
          securityChecks: securityCheck.securityViolations,
          aiModelUsed: aiResponse.data.modelUsed,
          cacheHit: aiResponse.data.fromCache
        }
      };

    } catch (error) {
      console.error(`[SQLEngine] Erreur requête ${queryId}:`, error);
      
      return {
        success: false,
        error: {
          type: "execution",
          message: "Erreur interne du moteur SQL",
          details: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  // ========================================
  // VALIDATION UNIQUEMENT SQL (SANS EXÉCUTION)
  // ========================================

  /**
   * Valide un SQL existant selon les règles RBAC et sécurité
   */
  async validateSQL(request: SQLValidationRequest): Promise<SQLValidationResult> {
    try {
      // 1. Validation sécurité de base
      const securityCheck = await this.validateSQLSecurity(request.sql, request.userId, request.userRole);
      
      // 2. Vérification RBAC
      const rbacResult = await this.applyRBACFilters(
        request.sql, 
        request.userId, 
        request.userRole,
        securityCheck.allowedTables
      );

      return {
        isValid: securityCheck.isSecure && rbacResult.success,
        isSecure: securityCheck.isSecure,
        allowedTables: securityCheck.allowedTables,
        deniedTables: securityCheck.deniedTables || [],
        allowedColumns: securityCheck.allowedColumns,
        deniedColumns: securityCheck.deniedColumns || [],
        securityViolations: securityCheck.securityViolations,
        rbacViolations: rbacResult.rbacViolations || [],
        suggestions: this.generateSuggestions(request.sql, securityCheck, rbacResult)
      };

    } catch (error) {
      return {
        isValid: false,
        isSecure: false,
        allowedTables: [],
        deniedTables: [],
        allowedColumns: [],
        deniedColumns: [],
        securityViolations: [`Erreur de validation: ${error}`],
        rbacViolations: []
      };
    }
  }

  // ========================================
  // CONSTRUCTION DU CONTEXTE INTELLIGENT
  // ========================================

  /**
   * Utilise BusinessContextService pour générer un contexte métier intelligent et adaptatif
   */
  private async buildIntelligentContext(request: SQLQueryRequest): Promise<string> {
    try {
      console.log(`[SQLEngine] Génération contexte intelligent pour ${request.userId} (${request.userRole})`);
      
      // Utilisation du BusinessContextService pour un contexte complet et adaptatif
      const enrichedContext = await this.businessContextService.buildIntelligentContextForSQL(
        request.userId,
        request.userRole,
        request.naturalLanguageQuery
      );

      // Ajout du contexte utilisateur s'il existe
      const userContext = request.context ? `\nCONTEXTE UTILISATEUR:\n${request.context}\n` : "";

      // Instructions techniques pour génération SQL (strictes, concises)
      const sqlInstructions = `
CRITICAL RULES (MANDATORY):
1. Return a single SELECT SQL query ONLY
2. NO commentary, NO explanations, NO markdown formatting
3. PostgreSQL syntax, read-only strict
4. LIMIT ${request.userRole === 'admin' ? MAX_RESULTS_ADMIN : MAX_RESULTS_DEFAULT}
5. Apply RBAC filters from context
6. Stop at first semicolon (;)
7. Max output: 300 tokens
`;

      return `${userContext}

${enrichedContext}

${sqlInstructions}`;

    } catch (error) {
      console.error(`[SQLEngine] Erreur génération contexte intelligent:`, error);
      
      // Fallback vers contexte basique en cas d'erreur
      return this.buildFallbackContext(request);
    }
  }

  /**
   * Contexte de fallback en cas d'erreur du BusinessContextService
   */
  private buildFallbackContext(request: SQLQueryRequest): string {
    const userContext = request.context ? `\nCONTEXTE UTILISATEUR:\n${request.context}\n` : "";
    
    return `${userContext}

SCHÉMA BASIQUE SAXIUM (Mode dégradé):
Tables principales: projects, offers, aos, team_resources, project_tasks
Colonnes courantes: id, nom, status, responsableUserId, dateEcheance, montantTotal

INSTRUCTIONS DE BASE:
- SQL SELECT uniquement
- LIMIT ${request.userRole === 'admin' ? MAX_RESULTS_ADMIN : MAX_RESULTS_DEFAULT}
- Filtres RBAC: WHERE responsableUserId = $1 (sauf admin)
- Format PostgreSQL standard
- Préférer JOINs explicites aux sous-requêtes
- Gérer NULL/dates invalides avec COALESCE/CASE WHEN
`;
  }

  // ========================================
  // VALIDATION SÉCURITÉ SQL AVANCÉE
  // ========================================

  /**
   * Validation AST + patterns d'injection + DDL/DML interdits
   */
  private async validateSQLSecurity(sql: string, userId: string, userRole: string): Promise<{
    isSecure: boolean;
    allowedTables: string[];
    deniedTables?: string[];
    allowedColumns: string[];
    deniedColumns?: string[];
    securityViolations: string[];
  }> {
    const violations: string[] = [];
    const allowedTables: string[] = [];
    const allowedColumns: string[] = [];

    console.log(`[SQLSecurity] Validation SQL pour ${userId} (${userRole})`);
    console.log(`[SQLSecurity] SQL à valider: ${sql.substring(0, 200)}${sql.length > 200 ? '...' : ''}`);

    try {
      // 1. ANALYSE AST COMPLÈTE avec node-sql-parser
      console.log(`[SQLSecurity] Étape 1: Parsing AST avec node-sql-parser...`);
      const ast = sqlParser.astify(sql, { database: 'postgresql' });
      console.log(`[SQLSecurity] ✓ Parsing AST réussi`);
      
      // 2. ENFORCEMENT READ-ONLY STRICT
      const astArray = Array.isArray(ast) ? ast : [ast];
      console.log(`[SQLSecurity] Étape 2: Vérification READ-ONLY (${astArray.length} statement(s))...`);
      
      for (const statement of astArray) {
        // Vérifier que TOUTES les statements sont SELECT
        if (statement.type !== 'select') {
          const violation = `Opération dangereuse détectée: ${statement.type.toUpperCase()}. Seuls les SELECT sont autorisés.`;
          console.log(`[SQLSecurity] ✗ ${violation}`);
          violations.push(violation);
          continue;
        }
        console.log(`[SQLSecurity] ✓ Statement type: SELECT`);

        // 3. EXTRACTION ET VALIDATION DES TABLES
        console.log(`[SQLSecurity] Étape 3: Validation des tables...`);
        const tablesInQuery = this.extractTablesFromAST(statement);
        console.log(`[SQLSecurity] Tables extraites: [${tablesInQuery.join(', ')}]`);
        
        for (const tableName of tablesInQuery) {
          if (ALLOWED_BUSINESS_TABLES.includes(tableName)) {
            allowedTables.push(tableName);
            console.log(`[SQLSecurity] ✓ Table autorisée: ${tableName}`);
          } else {
            const violation = `Table non autorisée: ${tableName}`;
            console.log(`[SQLSecurity] ✗ ${violation}`);
            violations.push(violation);
          }
        }

        // 4. COLUMN WHITELISTING ET VALIDATION
        console.log(`[SQLSecurity] Étape 4: Validation des colonnes...`);
        const columnsInQuery = this.extractColumnsFromAST(statement);
        console.log(`[SQLSecurity] Colonnes extraites: ${columnsInQuery.length} colonne(s)`);
        
        for (const { table, column } of columnsInQuery) {
          // Vérifier colonnes sensibles
          if (table && SENSITIVE_COLUMNS[table]?.includes(column)) {
            if (userRole !== 'admin') {
              const violation = `Colonne sensible non autorisée pour rôle ${userRole}: ${table}.${column}`;
              console.log(`[SQLSecurity] ✗ ${violation}`);
              violations.push(violation);
              continue;
            }
          }
          allowedColumns.push(column);
        }

        // 5. DÉTECTION INJECTIONS AVANCÉES VIA AST
        console.log(`[SQLSecurity] Étape 5: Détection patterns d'injection...`);
        const injectionViolationsBefore = violations.length;
        this.detectAdvancedInjectionPatterns(statement, violations);
        if (violations.length > injectionViolationsBefore) {
          console.log(`[SQLSecurity] ✗ Patterns d'injection détectés: ${violations.slice(injectionViolationsBefore).join(', ')}`);
        } else {
          console.log(`[SQLSecurity] ✓ Aucun pattern d'injection détecté`);
        }

        // 6. VALIDATION CONTRAINTES MÉTIER
        console.log(`[SQLSecurity] Étape 6: Validation contraintes métier...`);
        const businessViolationsBefore = violations.length;
        this.validateBusinessConstraints(statement, userRole, violations);
        if (violations.length > businessViolationsBefore) {
          console.log(`[SQLSecurity] ✗ Contraintes métier violées: ${violations.slice(businessViolationsBefore).join(', ')}`);
        } else {
          console.log(`[SQLSecurity] ✓ Contraintes métier respectées`);
        }
      }

    } catch (parseError) {
      // Si parsing échoue, c'est potentiellement malicieux
      const violation = `SQL invalide ou malformé: ${parseError instanceof Error ? parseError.message : String(parseError)}`;
      console.log(`[SQLSecurity] ✗ ERREUR PARSING: ${violation}`);
      console.log(`[SQLSecurity] SQL problématique: ${sql}`);
      violations.push(violation);
    }

    const isSecure = violations.length === 0;
    console.log(`[SQLSecurity] ═══════════════════════════════════════════`);
    console.log(`[SQLSecurity] Résultat final: ${isSecure ? '✓ SÉCURISÉ' : '✗ REJETÉ'}`);
    console.log(`[SQLSecurity] Violations: ${violations.length}`);
    if (violations.length > 0) {
      console.log(`[SQLSecurity] Détail violations:`);
      violations.forEach((v, i) => console.log(`[SQLSecurity]   ${i + 1}. ${v}`));
    }
    console.log(`[SQLSecurity] ═══════════════════════════════════════════`);

    return {
      isSecure,
      allowedTables: [...new Set(allowedTables)], // Déduplique
      allowedColumns: [...new Set(allowedColumns)],
      securityViolations: violations
    };
  }

  /**
   * Extrait toutes les tables référencées dans l'AST
   */
  private extractTablesFromAST(ast: any): string[] {
    const tables: string[] = [];
    
    // Tables FROM clause
    if (ast.from) {
      for (const fromItem of ast.from) {
        if (fromItem.table) {
          tables.push(fromItem.table);
        }
      }
    }
    
    // Tables JOINs
    if (ast.from) {
      for (const fromItem of ast.from) {
        if (fromItem.join) {
          for (const joinItem of fromItem.join) {
            if (joinItem.table) {
              tables.push(joinItem.table);
            }
          }
        }
      }
    }
    
    return tables;
  }

  /**
   * Extrait toutes les colonnes référencées dans l'AST
   */
  private extractColumnsFromAST(ast: any): Array<{table?: string, column: string}> {
    const columns: Array<{table?: string, column: string}> = [];
    
    // Colonnes SELECT
    if (ast.columns && Array.isArray(ast.columns)) {
      for (const col of ast.columns) {
        if (col.expr && col.expr.type === 'column_ref') {
          const table = col.expr.table;
          const column = col.expr.column;
          columns.push({ table, column });
        }
        // Handle wildcards
        if (col.expr && col.expr.type === 'star') {
          columns.push({ column: '*' });
        }
      }
    }
    
    return columns;
  }

  /**
   * Détecte les patterns d'injection sophistiqués via AST
   */
  private detectAdvancedInjectionPatterns(ast: any, violations: string[]): void {
    // Détection UNION injections
    if (ast.union) {
      violations.push('UNION statements non autorisés - risque d\'injection');
    }
    
    // Détection sous-requêtes suspectes
    if (this.hasNestedSelectionsWithSuspiciousPatterns(ast)) {
      violations.push('Sous-requêtes suspectes détectées');
    }
    
    // Détection fonctions système dangereuses
    this.detectDangerousFunctions(ast, violations);
  }

  /**
   * Validation des contraintes métier JLM
   */
  private validateBusinessConstraints(ast: any, userRole: string, violations: string[]): void {
    // Les utilisateurs non-admin doivent avoir des filtres user_id
    if (userRole !== 'admin') {
      const hasUserFilter = this.hasUserIdFilter(ast);
      if (!hasUserFilter) {
        // Cette violation sera corrigée automatiquement par RBAC, mais on la note
        console.log('[SQLEngine] Note: Filtre user_id manquant, sera ajouté par RBAC');
      }
    }
  }

  /**
   * Vérifie la présence de sous-requêtes suspectes
   */
  private hasNestedSelectionsWithSuspiciousPatterns(ast: any): boolean {
    // TODO: Implémenter détection patterns sophistiqués
    return false;
  }

  /**
   * Détecte les fonctions système dangereuses
   */
  private detectDangerousFunctions(ast: any, violations: string[]): void {
    // TODO: Analyser les appels de fonctions dans l'AST
    // Chercher pg_sleep, version(), etc.
  }

  /**
   * Vérifie la présence d'un filtre user_id
   */
  private hasUserIdFilter(ast: any): boolean {
    // TODO: Analyser WHERE clauses pour user_id
    return false;
  }

  // ========================================
  // APPLICATION AUTOMATIQUE FILTRES RBAC
  // ========================================

  /**
   * Applique les contraintes RBAC automatiquement dans le SQL
   */
  private async applyRBACFilters(
    sql: string, 
    userId: string, 
    userRole: string,
    allowedTables: string[]
  ): Promise<{
    success: boolean;
    filteredSQL?: string;
    parameters?: any[];
    filtersApplied?: string[];
    rbacViolations?: string[];
  }> {
    try {
      const filtersApplied: string[] = [];
      const violations: string[] = [];
      let filteredSQL = sql;
      const parameters: any[] = [userId]; // Premier paramètre toujours userId

      // 1. Vérification permissions par table
      for (const table of allowedTables) {
        const accessCheck: AccessValidationRequest = {
          userId,
          role: userRole,
          tableName: table,
          action: "read"
        };

        const permission = await this.rbacService.validateTableAccess(accessCheck);
        if (!permission.allowed) {
          violations.push(`Accès refusé à la table: ${table} - ${permission.denialReason}`);
          continue;
        }

        // 2. Application filtres automatiques selon le rôle
        if (userRole !== 'admin') {
          if (this.hasUserIdColumn(table)) {
            // Filtre automatique par userId pour données personnelles
            const userIdFilter = this.buildUserIdFilter(table, parameters.length);
            filteredSQL = this.injectWhereClause(filteredSQL, table, userIdFilter);
            filtersApplied.push(`Filtre utilisateur sur ${table}`);
          }

          if (this.hasDepartementColumn(table)) {
            // TODO: Récupérer département utilisateur et appliquer filtre
            // Pour l'instant on laisse ouvert, mais c'est prévu dans le système
          }
        }

        // 3. Masquage colonnes sensibles selon le rôle
        if (permission.deniedColumns && permission.deniedColumns.length > 0) {
          filteredSQL = this.maskSensitiveColumns(filteredSQL, table, permission.deniedColumns);
          filtersApplied.push(`Colonnes masquées sur ${table}: ${permission.deniedColumns.join(', ')}`);
        }
      }

      if (violations.length > 0) {
        return {
          success: false,
          rbacViolations: violations
        };
      }

      return {
        success: true,
        filteredSQL,
        parameters,
        filtersApplied
      };

    } catch (error) {
      return {
        success: false,
        rbacViolations: [`Erreur application RBAC: ${error}`]
      };
    }
  }

  // ========================================
  // EXÉCUTION SÉCURISÉE AVEC TIMEOUT
  // ========================================

  /**
   * Exécute le SQL avec timeout et limitation de résultats
   */
  private async executeSecureSQL(
    sql: string, 
    parameters: any[], 
    maxResults: number, 
    timeoutMs: number
  ): Promise<{
    success: boolean;
    results?: any[];
    executionTime?: number;
    error?: any;
  }> {
    const startTime = Date.now();

    try {
      // Limitation des résultats si pas déjà présente
      const limitedSQL = this.ensureLimitClause(sql, maxResults);

      // Exécution avec timeout nettoyable (évite unhandled rejection)
      let timeoutId: NodeJS.Timeout | null = null;
      
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Query timeout')), timeoutMs);
      });

      const queryPromise = db.execute(sql.raw(limitedSQL));
      
      try {
        const results = await Promise.race([queryPromise, timeoutPromise]) as any[];
        
        // Nettoyer le timeout si la requête réussit avant
        if (timeoutId) clearTimeout(timeoutId);
        
        const executionTime = Date.now() - startTime;

        return {
          success: true,
          results: Array.isArray(results) ? results : [results],
          executionTime
        };
      } catch (raceError) {
        // Nettoyer le timeout même en cas d'erreur
        if (timeoutId) clearTimeout(timeoutId);
        throw raceError;
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  // ========================================
  // MÉTHODES UTILITAIRES
  // ========================================

  private validateInputQuery(request: SQLQueryRequest): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!request.naturalLanguageQuery || request.naturalLanguageQuery.trim().length === 0) {
      errors.push("Requête vide");
    }
    if (request.naturalLanguageQuery && request.naturalLanguageQuery.length > 5000) {
      errors.push("Requête trop longue (max 5000 caractères)");
    }
    if (!request.userId || !request.userRole) {
      errors.push("userId et userRole requis");
    }

    return { isValid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  private detectQueryComplexity(query: string): "simple" | "complex" | "expert" {
    const complexKeywords = ['join', 'group by', 'having', 'window', 'union', 'case when', 'subquery'];
    const expertKeywords = ['recursive', 'partition', 'lead', 'lag', 'rank', 'dense_rank'];
    
    const lowerQuery = query.toLowerCase();
    
    if (expertKeywords.some(kw => lowerQuery.includes(kw))) return "expert";
    if (complexKeywords.some(kw => lowerQuery.includes(kw))) return "complex";
    return "simple";
  }

  private isValidBusinessTable(tableName: string): boolean {
    const validTables = [
      'projects', 'offers', 'aos', 'chiffrage_elements', 'team_resources', 
      'project_tasks', 'users', 'supplier_requests', 'validation_milestones',
      'technical_alerts', 'date_alerts', 'business_metrics'
    ];
    return validTables.includes(tableName.toLowerCase());
  }

  private hasUserIdColumn(tableName: string): boolean {
    const userIdTables = ['projects', 'offers', 'project_tasks', 'supplier_requests'];
    return userIdTables.includes(tableName.toLowerCase());
  }

  private hasDepartementColumn(tableName: string): boolean {
    const deptTables = ['projects', 'offers', 'aos'];
    return deptTables.includes(tableName.toLowerCase());
  }

  private buildUserIdFilter(tableName: string, paramIndex: number): string {
    const userIdColumns = {
      'projects': 'responsableUserId',
      'offers': 'userId', 
      'project_tasks': 'assigneeUserId',
      'supplier_requests': 'userId'
    };

    const column = userIdColumns[tableName.toLowerCase() as keyof typeof userIdColumns];
    return column ? `${tableName}.${column} = $${paramIndex}` : '';
  }

  private injectWhereClause(sql: string, tableName: string, condition: string): string {
    if (!condition) return sql;

    // Injection simple dans la clause WHERE existante ou création
    if (sql.toLowerCase().includes('where')) {
      return sql.replace(/where/i, `WHERE ${condition} AND`);
    } else {
      // Injecter avant ORDER BY, GROUP BY, ou LIMIT
      const insertionPoint = sql.search(/(order by|group by|limit)/i);
      if (insertionPoint > -1) {
        return sql.slice(0, insertionPoint) + ` WHERE ${condition} ` + sql.slice(insertionPoint);
      } else {
        return sql + ` WHERE ${condition}`;
      }
    }
  }

  private maskSensitiveColumns(sql: string, tableName: string, deniedColumns: string[]): string {
    // Remplacement basique des colonnes sensibles par NULL
    let maskedSQL = sql;
    for (const column of deniedColumns) {
      const pattern = new RegExp(`\\b${tableName}\\.${column}\\b`, 'gi');
      maskedSQL = maskedSQL.replace(pattern, 'NULL as ' + column);
    }
    return maskedSQL;
  }

  private ensureLimitClause(sql: string, maxResults: number): string {
    if (sql.toLowerCase().includes('limit')) {
      return sql; // Déjà une limite
    }
    return sql + ` LIMIT ${maxResults}`;
  }

  private isSensitiveQuery(sql: string, userRole: string): boolean {
    const sensitiveTables = ['team_resources', 'business_metrics', 'technical_alerts'];
    const sensitiveColumns = ['montantTotal', 'prixUnitaire', 'salaire', 'chargeActuelle'];
    
    const lowerSQL = sql.toLowerCase();
    const hasSensitiveTable = sensitiveTables.some(table => lowerSQL.includes(table));
    const hasSensitiveColumn = sensitiveColumns.some(col => lowerSQL.includes(col.toLowerCase()));
    
    return hasSensitiveTable || hasSensitiveColumn;
  }

  private generateWarnings(sql: string, resultCount: number, userRole: string): string[] {
    const warnings: string[] = [];

    if (resultCount === 0) {
      warnings.push("Aucun résultat trouvé. Vérifiez les critères de recherche.");
    }
    
    if (resultCount >= MAX_RESULTS_DEFAULT && userRole !== 'admin') {
      warnings.push(`Résultats limités à ${MAX_RESULTS_DEFAULT}. Contactez un admin pour plus de données.`);
    }

    if (sql.toLowerCase().includes('*')) {
      warnings.push("Requête avec SELECT * détectée. Privilégiez les colonnes spécifiques pour de meilleures performances.");
    }

    return warnings;
  }

  private generateSuggestions(sql: string, securityCheck: any, rbacResult: any): string[] {
    const suggestions: string[] = [];

    if (!securityCheck.isSecure) {
      suggestions.push("Utilisez uniquement des requêtes SELECT avec des paramètres ($1, $2...)");
    }

    if (!rbacResult.success) {
      suggestions.push("Vérifiez vos permissions d'accès aux tables demandées");
    }

    return suggestions;
  }

  private async logQueryExecution(
    queryId: string, 
    request: SQLQueryRequest, 
    finalSQL: string, 
    resultCount: number, 
    startTime: number
  ): Promise<void> {
    try {
      console.log(`[SQLEngine] Query ${queryId} executed in ${Date.now() - startTime}ms, ${resultCount} results`);
      
      // TODO: Persister en base pour audit complet
      // await this.storage.createQueryLog({
      //   queryId,
      //   userId: request.userId,
      //   userRole: request.userRole,
      //   originalQuery: request.naturalLanguageQuery,
      //   finalSQL,
      //   resultCount,
      //   executionTimeMs: Date.now() - startTime
      // });
      
    } catch (error) {
      console.error('[SQLEngine] Erreur logging:', error);
    }
  }

  // ========================================
  // MÉTHODE CONTEXTE BASE DE DONNÉES (POUR TESTS ET DÉMO)
  // ========================================

  /**
   * Construction du contexte de base de données pour utilisateur donné
   * Utilisé par les tests et démos pour comprendre les capacités du moteur
   */
  async buildDatabaseContext(userId: string, userRole: string): Promise<{
    availableTables: string[];
    context: string;
    rbacFiltersInfo: string;
    exampleQueries: string[];
  }> {
    const availableTables = [
      'projects', 'offers', 'aos', 'chiffrage_elements', 'team_resources',
      'project_tasks', 'users', 'supplier_requests', 'validation_milestones',
      'technical_alerts', 'date_alerts', 'business_metrics'
    ];

    // Filtrer les tables selon le rôle
    const accessibleTables = userRole === 'admin' 
      ? availableTables 
      : availableTables.filter(table => !['users', 'business_metrics'].includes(table));

    const context = `
Base de données Saxium - Entreprise de menuiserie JLM

Tables disponibles:
${accessibleTables.map(table => `- ${table}`).join('\n')}

Schéma métier:
- projects: Projets de menuiserie avec phases (passation, etude, planification, chantier, sav)
- offers: Offres commerciales 
- aos: Appels d'offres sources
- chiffrage_elements: Éléments de chiffrage détaillés
- team_resources: Ressources équipes
- project_tasks: Tâches projet
- technical_alerts: Alertes techniques
- date_alerts: Alertes dates et échéances

Contraintes:
- Données en français (menuiserie, départements français)
- Montants en EUR
- Dates au format ISO
- Status avec valeurs enum spécifiques`;

    const rbacFiltersInfo = userRole === 'admin' 
      ? 'Accès complet à toutes les données (rôle administrateur)'
      : `Accès filtré pour rôle "${userRole}": 
        - Projets et offres: filtrés par utilisateur responsable
        - Tâches: filtrées par utilisateur assigné  
        - Tables système réservées aux admins`;

    const exampleQueries = userRole === 'admin' ? [
      'Analyse de rentabilité par type de matériau',
      'Performance des équipes par département',
      'Évolution du CA mensuel',
      'Statistiques des retards projets',
      'Utilisation des ressources équipes'
    ] : [
      'Mes projets en cours',
      'Mes offres en attente de validation', 
      'Mes tâches de la semaine',
      'Projets en retard sous ma responsabilité',
      'Charge de travail équipe'
    ];

    return {
      availableTables: accessibleTables,
      context,
      rbacFiltersInfo,
      exampleQueries
    };
  }

  /**
   * Sanitize SQL results pour JSON serialization
   * Convertit BigInt → string, Date → ISO, Buffer → base64
   */
  private sanitizeResultsForJSON(results: any[]): any[] {
    return results.map(row => this.sanitizeValueForJSON(row));
  }

  private sanitizeValueForJSON(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    // BigInt → string (cause principale du 500)
    if (typeof value === 'bigint') {
      return value.toString();
    }

    // Date → ISO string
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Buffer → base64
    if (Buffer.isBuffer(value)) {
      return value.toString('base64');
    }

    // Object/Array → récursif
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.map(item => this.sanitizeValueForJSON(item));
      }
      
      const sanitized: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = this.sanitizeValueForJSON(val);
      }
      return sanitized;
    }

    // Primitives (string, number, boolean) → inchangés
    return value;
  }
}