/**
 * Repository pour la gestion du module Date Intelligence
 * 
 * Responsabilités :
 * - Gestion des règles métier intelligentes (DateIntelligenceRule)
 * - Gestion des alertes de dates et échéances (DateAlert)
 * 
 * Suit le pattern BaseRepository établi avec support transactionnel complet
 */

import { BaseRepository } from '../base/BaseRepository';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import { logger } from './utils/logger';
import { 
  dateIntelligenceRules,
  dateAlerts,
  type DateIntelligenceRule, 
  type InsertDateIntelligenceRule,
  type DateAlert,
  type InsertDateAlert,
  projectStatusEnum
} from '@shared/schema';
import type { DrizzleTransaction } from '../types';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { safeInsert, safeUpdate, safeDelete } from '../../utils/safe-query';

/**
 * Repository pour le module Date Intelligence
 * Gère 2 entités principales : DateIntelligenceRule, DateAlert
 * 
 * Note : Ce repository ne suit pas exactement le pattern BaseRepository standard car il gère
 * plusieurs entités. Les méthodes CRUD héritées sont utilisées pour DateIntelligenceRule.
 */
export class DateIntelligenceRepository extends BaseRepository<
  DateIntelligenceRule,
  InsertDateIntelligenceRule,
  Partial<InsertDateIntelligenceRule>
> {
  protected readonly tableName = 'date_intelligence_rules';
  protected readonly table = dateIntelligenceRules;
  protected readonly primaryKey = dateIntelligenceRules.id;

  /**
   * Constructeur
   * 
   * @param db - Instance Drizzle de la base de données
   * @param eventBus - Event bus optionnel pour notifications
   */
  constructor(db: unknown, eventBus?: unknown) {
    super('DateIntelligenceRepository', db, eventBus);
  }

  // ========================================
  // DATE INTELLIGENCE RULES - 6 MÉTHODES
  // ========================================

  /**
   * Récupère toutes les règles actives avec filtres optionnels
   * Filtre automatiquement par :
   * - isActive = true
   * - Validité temporelle (validFrom <= now <= validUntil)
   * Résultats triés par priorité (desc)
   * 
   * @param filters - Filtres optionnels
   * @param filters.phase - Phase du projet (ex: "etude", "planification")
   * @param filters.projectType - Type de projet (ex: "neuf", "renovation")
   * @param tx - Transaction optionnelle
   * @returns Liste des règles actives triées par priorité
   * 
   * @example
   * ```typescript
   * const rules = await repo.getActiveRules({ 
   *   phase: 'etude', 
   *   projectType: 'neuf' 
   * });
   * logger.info(`Trouvé ${rules.length} règles actives`);
   * ```
   */
  async getActiveRules(
    filters?: { 
      phase?: typeof projectStatusEnum.enumValues[number], 
      projectType?: string 
    },
    tx?: DrizzleTransaction
  ): Promise<DateIntelligenceRule[]> {
    const dbToUse = this.getDb(tx);
    const now = new Date();

    return this.executeQuery(
      async () => {
        const conditions = [
          eq(dateIntelligenceRules.isActive, true),
          lte(dateIntelligenceRules.validFrom, now)
        ];

        if (filters?.phase) {
          conditions.push(eq(dateIntelligenceRules.phase, filters.phase));
        }

        if (filters?.projectType) {
          conditions.push(eq(dateIntelligenceRules.projectType, filters.projectType));
        }

        const rules = await dbToUse
          .select()
          .from(dateIntelligenceRules)
          .where(and(...conditions))
          .orderBy(desc(dateIntelligenceRules.priority));

        const validRules = rules.filter((rule: DateIntelligenceRule) => {
          if (rule.validFrom && now < rule.validFrom) return false;
          if (rule.validUntil && now > rule.validUntil) return false;
          return true;
        });

        return validRules;
      },
      'getActiveRules',
      { filters }
    );
  }

  /**
   * Récupère toutes les règles (actives et inactives)
   * Résultats triés par priorité (desc)
   * 
   * @param tx - Transaction optionnelle
   * @returns Liste de toutes les règles triées par priorité
   * 
   * @example
   * ```typescript
   * const allRules = await repo.getAllRules();
   * logger.info(`Total de ${allRules.length} règles dans le système`);
   * ```
   */
  async getAllRules(tx?: DrizzleTransaction): Promise<DateIntelligenceRule[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        return await dbToUse
          .select()
          .from(dateIntelligenceRules)
          .orderBy(desc(dateIntelligenceRules.priority));
      },
      'getAllRules'
    );
  }

  /**
   * Récupère une règle par son ID
   * 
   * @param id - ID de la règle (UUID)
   * @param tx - Transaction optionnelle
   * @returns La règle trouvée ou undefined si non trouvée
   * 
   * @example
   * ```typescript
   * const rule = await repo.getRule('550e8400-...');
   * if (rule) {
   *   logger.info(`Règle: ${rule.name}, priorité: ${rule.priority}`);
   * }
   * ```
   */
  async getRule(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<DateIntelligenceRule | undefined> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const [rule] = await dbToUse
          .select()
          .from(dateIntelligenceRules)
          .where(eq(dateIntelligenceRules.id, normalizedId))
          .limit(1);

        return rule;
      },
      'getRule',
      { id: normalizedId }
    );
  }

  /**
   * Crée une nouvelle règle d'intelligence de dates
   * Applique les defaults suivants :
   * - isActive = true
   * - priority = 100
   * - validFrom = now
   * 
   * @param data - Données de la règle à créer
   * @param tx - Transaction optionnelle
   * @returns La règle créée
   * 
   * @example
   * ```typescript
   * const newRule = await repo.createRule({
   *   name: 'Durée phase étude projets neufs',
   *   description: 'Calcul automatique durée phase étude',
   *   phase: 'etude',
   *   projectType: 'neuf',
   *   baseDuration: 30,
   *   multiplierFactor: '1.20',
   *   bufferPercentage: '0.15'
   * });
   * ```
   */
  async createRule(
    data: InsertDateIntelligenceRule,
    tx?: DrizzleTransaction
  ): Promise<DateIntelligenceRule> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const ruleWithDefaults = {
          ...data,
          isActive: data.isActive ?? true,
          priority: data.priority ?? 100,
          validFrom: data.validFrom ?? new Date()
        };

        const result = await safeInsert<DateIntelligenceRule[]>(
          'date_intelligence_rules',
          () => dbToUse
            .insert(dateIntelligenceRules)
            .values(ruleWithDefaults)
            .returning(),
          { service: this.repositoryName, operation: 'createRule' }
        );

        const newRule = result[0];
        if (!newRule) {
          throw new AppError('Failed to create date intelligence rule', 500);
        }

        this.emitEvent('date_intelligence_rule:created', { 
          id: newRule.id,
          name: newRule.name,
          phase: newRule.phase
        });

        return newRule;
      },
      'createRule',
      { name: data.name }
    );
  }

  /**
   * Met à jour une règle existante
   * 
   * @param id - ID de la règle (UUID)
   * @param data - Données partielles à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns La règle mise à jour
   * @throws DatabaseError si la règle n'existe pas
   * 
   * @example
   * ```typescript
   * const updated = await repo.updateRule('550e8400-...', {
   *   isActive: false,
   *   priority: 50
   * });
   * ```
   */
  async updateRule(
    id: string,
    data: Partial<InsertDateIntelligenceRule>,
    tx?: DrizzleTransaction
  ): Promise<DateIntelligenceRule> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeUpdate<DateIntelligenceRule[]>(
          'date_intelligence_rules',
          () => dbToUse
            .update(dateIntelligenceRules)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(dateIntelligenceRules.id, normalizedId))
            .returning(),
          1,
          { service: this.repositoryName, operation: 'updateRule' }
        );

        const updatedRule = result[0];
        if (!updatedRule) {
          this.handleNotFound(normalizedId, 'updateRule');
        }

        this.emitEvent('date_intelligence_rule:updated', { 
          id: updatedRule.id,
          name: updatedRule.name
        });

        return updatedRule;
      },
      'updateRule',
      { id: normalizedId }
    );
  }

  /**
   * Supprime une règle
   * 
   * @param id - ID de la règle (UUID)
   * @param tx - Transaction optionnelle
   * @throws DatabaseError si la règle n'existe pas
   * 
   * @example
   * ```typescript
   * await repo.deleteRule('550e8400-...');
   * ```
   */
  async deleteRule(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<void> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeDelete<DateIntelligenceRule[]>(
          'date_intelligence_rules',
          () => dbToUse
            .delete(dateIntelligenceRules)
            .where(eq(dateIntelligenceRules.id, normalizedId))
            .returning(),
          1,
          { service: this.repositoryName, operation: 'deleteRule' }
        );

        if (result.length === 0) {
          this.handleNotFound(normalizedId, 'deleteRule');
        }

        this.emitEvent('date_intelligence_rule:deleted', { id: normalizedId });
      },
      'deleteRule',
      { id: normalizedId }
    );
  }

  // ========================================
  // DATE ALERTS - 7 MÉTHODES
  // ========================================

  /**
   * Récupère les alertes de dates avec filtres optionnels
   * Résultats triés par detectedAt (desc) - plus récentes en premier
   * 
   * @param filters - Filtres optionnels
   * @param filters.entityType - Type d'entité (ex: "project", "offer", "ao")
   * @param filters.entityId - ID de l'entité
   * @param filters.status - Statut de l'alerte (ex: "pending", "acknowledged", "resolved")
   * @param tx - Transaction optionnelle
   * @returns Liste des alertes triées par date de détection
   * 
   * @example
   * ```typescript
   * const alerts = await repo.getDateAlerts({ 
   *   entityType: 'project',
   *   status: 'pending'
   * });
   * logger.info(`${alerts.length} alertes en attente`);
   * ```
   */
  async getDateAlerts(
    filters?: { 
      entityType?: string, 
      entityId?: string, 
      status?: string 
    },
    tx?: DrizzleTransaction
  ): Promise<DateAlert[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const conditions = [];

        if (filters?.entityType) {
          conditions.push(eq(dateAlerts.entityType, filters.entityType));
        }

        if (filters?.entityId) {
          const normalizedEntityId = this.normalizeId(filters.entityId);
          conditions.push(eq(dateAlerts.entityId, normalizedEntityId));
        }

        if (filters?.status) {
          conditions.push(eq(dateAlerts.status, filters.status));
        }

        const query = conditions.length > 0
          ? dbToUse
              .select()
              .from(dateAlerts)
              .where(and(...conditions))
              .orderBy(desc(dateAlerts.detectedAt))
          : dbToUse
              .select()
              .from(dateAlerts)
              .orderBy(desc(dateAlerts.detectedAt));

        return await query;
      },
      'getDateAlerts',
      { filters }
    );
  }

  /**
   * Récupère une alerte par son ID
   * 
   * @param id - ID de l'alerte (UUID)
   * @param tx - Transaction optionnelle
   * @returns L'alerte trouvée ou undefined si non trouvée
   * 
   * @example
   * ```typescript
   * const alert = await repo.getDateAlert('550e8400-...');
   * if (alert) {
   *   logger.info(`Alerte: ${alert.title}, sévérité: ${alert.severity}`);
   * }
   * ```
   */
  async getDateAlert(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<DateAlert | undefined> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const [alert] = await dbToUse
          .select()
          .from(dateAlerts)
          .where(eq(dateAlerts.id, normalizedId))
          .limit(1);

        return alert;
      },
      'getDateAlert',
      { id: normalizedId }
    );
  }

  /**
   * Crée une nouvelle alerte de date
   * Applique les defaults suivants :
   * - status = 'pending'
   * - severity = 'warning'
   * - detectedAt = now
   * 
   * @param data - Données de l'alerte à créer
   * @param tx - Transaction optionnelle
   * @returns L'alerte créée
   * 
   * @example
   * ```typescript
   * const newAlert = await repo.createDateAlert({
   *   entityType: 'project',
   *   entityId: '550e8400-...',
   *   alertType: 'deadline_approaching',
   *   title: 'Échéance approchant',
   *   message: 'La phase étude arrive à échéance dans 3 jours',
   *   targetDate: new Date('2025-11-15'),
   *   delayDays: 0
   * });
   * ```
   */
  async createDateAlert(
    data: InsertDateAlert,
    tx?: DrizzleTransaction
  ): Promise<DateAlert> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const alertWithDefaults = {
          ...data,
          status: data.status ?? 'pending',
          severity: data.severity ?? 'warning',
          detectedAt: new Date()
        };

        const result = await safeInsert<DateAlert[]>(
          'date_alerts',
          () => dbToUse
            .insert(dateAlerts)
            .values(alertWithDefaults)
            .returning(),
          { service: this.repositoryName, operation: 'createDateAlert' }
        );

        const newAlert = result[0];
        if (!newAlert) {
          throw new AppError('Failed to create date alert', 500);
        }

        this.emitEvent('date_alert:created', { 
          id: newAlert.id,
          title: newAlert.title,
          entityType: newAlert.entityType,
          entityId: newAlert.entityId
        });

        return newAlert;
      },
      'createDateAlert',
      { entityType: data.entityType, entityId: data.entityId }
    );
  }

  /**
   * Met à jour une alerte existante
   * 
   * @param id - ID de l'alerte (UUID)
   * @param data - Données partielles à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns L'alerte mise à jour
   * @throws DatabaseError si l'alerte n'existe pas
   * 
   * @example
   * ```typescript
   * const updated = await repo.updateDateAlert('550e8400-...', {
   *   severity: 'critical',
   *   delayDays: 5
   * });
   * ```
   */
  async updateDateAlert(
    id: string,
    data: Partial<InsertDateAlert>,
    tx?: DrizzleTransaction
  ): Promise<DateAlert> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeUpdate<DateAlert[]>(
          'date_alerts',
          () => dbToUse
            .update(dateAlerts)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(dateAlerts.id, normalizedId))
            .returning(),
          1,
          { service: this.repositoryName, operation: 'updateDateAlert' }
        );

        const updatedAlert = result[0];
        if (!updatedAlert) {
          this.handleNotFound(normalizedId, 'updateDateAlert');
        }

        this.emitEvent('date_alert:updated', { 
          id: updatedAlert.id,
          title: updatedAlert.title
        });

        return updatedAlert;
      },
      'updateDateAlert',
      { id: normalizedId }
    );
  }

  /**
   * Supprime une alerte
   * 
   * @param id - ID de l'alerte (UUID)
   * @param tx - Transaction optionnelle
   * @throws DatabaseError si l'alerte n'existe pas
   * 
   * @example
   * ```typescript
   * await repo.deleteDateAlert('550e8400-...');
   * ```
   */
  async deleteDateAlert(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<void> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeDelete<DateAlert[]>(
          'date_alerts',
          () => dbToUse
            .delete(dateAlerts)
            .where(eq(dateAlerts.id, normalizedId))
            .returning(),
          1,
          { service: this.repositoryName, operation: 'deleteDateAlert' }
        );

        if (result.length === 0) {
          this.handleNotFound(normalizedId, 'deleteDateAlert');
        }

        this.emitEvent('date_alert:deleted', { id: normalizedId });
      },
      'deleteDateAlert',
      { id: normalizedId }
    );
  }

  /**
   * Acquitte une alerte (change son statut à 'acknowledged')
   * Met à jour :
   * - status -> 'acknowledged'
   * - assignedTo -> userId
   * - acknowledgedAt -> now
   * - updatedAt -> now
   * 
   * @param id - ID de l'alerte (UUID)
   * @param userId - ID de l'utilisateur qui acquitte l'alerte
   * @param tx - Transaction optionnelle
   * @returns true si l'opération a réussi
   * @throws DatabaseError si l'alerte n'existe pas
   * 
   * @example
   * ```typescript
   * const success = await repo.acknowledgeAlert('550e8400-...', 'user-123');
   * if (success) {
   *   logger.info('Alerte acquittée avec succès');
   * }
   * ```
   */
  async acknowledgeAlert(
    id: string,
    userId: string,
    tx?: DrizzleTransaction
  ): Promise<boolean> {
    const normalizedId = this.normalizeId(id);
    const normalizedUserId = this.normalizeId(userId);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const now = new Date();

        const result = await safeUpdate<DateAlert[]>(
          'date_alerts',
          () => dbToUse
            .update(dateAlerts)
            .set({
                status: 'acknowledged',
              assignedTo: normalizedUserId,
              acknowledgedAt: now,
              updatedAt: now
            })
            .where(eq(dateAlerts.id, normalizedId))
            .returning(),
          1,
          { service: this.repositoryName, operation: 'acknowledgeAlert' }
        );

        const acknowledgedAlert = result[0];
        if (!acknowledgedAlert) {
          this.handleNotFound(normalizedId, 'acknowledgeAlert');
        }

        this.emitEvent('date_alert:acknowledged', { 
          id: acknowledgedAlert.id,
          userId: normalizedUserId
        });

        return true;
      },
      'acknowledgeAlert',
      { id: normalizedId, userId: normalizedUserId }
    );
  }

  /**
   * Résout une alerte (change son statut à 'resolved')
   * Met à jour :
   * - status -> 'resolved'
   * - actionBy -> userId
   * - resolvedAt -> now
   * - actionTaken (si fourni)
   * - updatedAt -> now
   * 
   * @param id - ID de l'alerte (UUID)
   * @param userId - ID de l'utilisateur qui résout l'alerte
   * @param actionTaken - Description de l'action prise (optionnel)
   * @param tx - Transaction optionnelle
   * @returns true si l'opération a réussi
   * @throws DatabaseError si l'alerte n'existe pas
   * 
   * @example
   * ```typescript
   * const success = await repo.resolveAlert(
   *   '550e8400-...', 
   *   'user-123',
   *   'Délai prolongé de 5 jours après validation client'
   * );
   * if (success) {
   *   logger.info('Alerte résolue avec succès');
   * }
   * ```
   */
  async resolveAlert(
    id: string,
    userId: string,
    actionTaken?: string,
    tx?: DrizzleTransaction
  ): Promise<boolean> {
    const normalizedId = this.normalizeId(id);
    const normalizedUserId = this.normalizeId(userId);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const now = new Date();

        const updateData: unknown = {
          status: 'resolved',
          actionBy: normalizedUserId,
          resolvedAt: now,
          updatedAt: now
        };

        if (actionTaken !== undefined) {
          updateData.actionTaken = actionTaken;
        }

        const result = await safeUpdate<DateAlert[]>(
          'date_alerts',
          () => dbToUse
            .update(dateAlerts)
            .set(updateData)
            .where(eq(dateAlerts.id, normalizedId))
            .returning(),
          1,
          { service: this.repositoryName, operation: 'resolveAlert' }
        );

        const resolvedAlert = result[0];
        if (!resolvedAlert) {
          this.handleNotFound(normalizedId, 'resolveAlert');
        }

        this.emitEvent('date_alert:resolved', { 
          id: resolvedAlert.id,
          userId: normalizedUserId,
          actionTaken: actionTaken
        });

        return true;
      },
      'resolveAlert',
      { id: normalizedId, userId: normalizedUserId }
    );
  }

  // ========================================
  // MÉTHODES HÉRITÉES NON UTILISÉES
  // ========================================

  /**
   * @deprecated Ce repository gère plusieurs entités - utiliser getRule pour DateIntelligenceRule ou getDateAlert pour DateAlert
   */
  async findById(id: string, tx?: DrizzleTransaction): Promise<DateIntelligenceRule | undefined> {
    throw new AppError('Use getRule(, 500) or getDateAlert() instead');
  }

  /**
   * @deprecated Ce repository gère plusieurs entités - utiliser getAllRules, getActiveRules, ou getDateAlerts
   */
  async findAll(filt: unknown, unknown, tx?: DrizzleTransaction): Promise<DateIntelligenceRule[]> {
    throw new AppError('Use getAllRules(, 500), getActiveRules(), or getDateAlerts() instead');
  }

  /**
   * @deprecated Ce repository gère plusieurs entités - utiliser les méthodes spécifiques
   */
  async findPaginated(
    : unknown,s?: unknown,
   : unknown,ation?: unknown,
    sorunknown,unknown,
    tx?: DrizzleTransaction
  ): Promise<unknown> {
    throw new AppError('Pagination not implemented for multi-entity repository - use specific methods with filtering', 500);
  }

  /**
   * @deprecated Ce repository gère plusieurs entités - utiliser deleteRule ou deleteDateAlert
   */
  asyn: unknown,teMany(funknown,unknown any, tx?: DrizzleTransaction): Promise<number> {
    throw new AppError('Use deleteRule(, 500) or deleteDateAlert() instead');
  }

  /**
   * @deprecated Ce repository gère plusieurs entités - utiliser les méthodes spécifiques
   */
  async exists(id: string, tx?: DrizzleTransaction): Promise<boolean> {
    throw new AppError('Use getRule(, 500) or getDateAlert() to check existence');
  }

  /**
   * @deprecated Ce repository gère plusieurs entités - utiliser les méthodes spécifiques avec filtres
   *: unknown,ync coununknown,unknownrs?: any, tx?: DrizzleTransaction): Promise<number> {
    throw new AppError('Count not implemented for multi-entity repository', 500);
  }
