/**
 * Repository pour la gestion du module Contacts
 * 
 * Responsabilités :
 * - Gestion des liaisons AO-Contacts (aoContacts)
 * - Gestion des liaisons Project-Contacts (projectContacts)
 * 
 * Ces entités sont des tables de liaison permettant d'associer des contacts
 * (maîtres d'ouvrage, maîtres d'œuvre, etc.) aux AOs et Projets.
 * 
 * Suit le pattern BaseRepository établi avec support transactionnel complet
 */

import { BaseRepository } from '../base/BaseRepository';
import { 
  aoContacts,
  projectContacts,
  type AoContacts, 
  type InsertAoContacts,
  type ProjectContacts,
  type InsertProjectContacts
} from '@shared/schema';
import type { DrizzleTransaction, PaginationOptions, PaginatedResult, SearchFilters, SortOptions } from '../types';
import { eq, asc } from 'drizzle-orm';
import { safeInsert, safeDelete } from '../../utils/safe-query';

/**
 * Repository pour le module Contacts
 * Gère 2 entités : AoContacts (liaison AO-Contacts), ProjectContacts (liaison Project-Contacts)
 * 
 * Note : Ce repository gère plusieurs entités selon le pattern établi par ConfigurationRepository.
 * Les méthodes CRUD héritées sont utilisées pour AoContacts (entité principale).
 * Les méthodes ProjectContacts sont des méthodes supplémentaires.
 */
export class ContactsRepository extends BaseRepository<
  AoContacts,
  InsertAoContacts,
  Partial<InsertAoContacts>
> {
  protected readonly tableName = 'ao_contacts';
  protected readonly table = aoContacts;
  protected readonly primaryKey = aoContacts.id;

  /**
   * Constructeur
   * 
   * @param db - Instance Drizzle de la base de données
   * @param eventBus - Event bus optionnel pour notifications
   */
  constructor(db: any, eventBus?: any) {
    super('ContactsRepository', db, eventBus);
  }

  // ========================================
  // IMPLÉMENTATION DES MÉTHODES ABSTRAITES IRepository
  // ========================================

  /**
   * Récupère une liaison AO-Contact par son ID (implémentation IRepository)
   */
  async findById(id: string, tx?: DrizzleTransaction): Promise<AoContacts | undefined> {
    return this.getAoContactById(id, tx);
  }

  /**
   * Récupère toutes les liaisons AO-Contacts (implémentation IRepository)
   */
  async findAll(filters?: SearchFilters, tx?: DrizzleTransaction): Promise<AoContacts[]> {
    return this.getAllAoContacts(tx);
  }

  /**
   * Récupère les liaisons AO-Contacts avec pagination (implémentation IRepository)
   */
  async findPaginated(
    filters?: SearchFilters,
    pagination?: PaginationOptions,
    sort?: SortOptions,
    tx?: DrizzleTransaction
  ): Promise<PaginatedResult<AoContacts>> {
    const allContacts = await this.getAllAoContacts(tx);
    const total = allContacts.length;
    
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const offset = (page - 1) * limit;
    
    const paginatedContacts = allContacts.slice(offset, offset + limit);
    
    return this.createPaginatedResult(paginatedContacts, total, pagination);
  }

  /**
   * Supprime plusieurs liaisons AO-Contacts (implémentation IRepository)
   */
  async deleteMany(ids: string[], tx?: DrizzleTransaction): Promise<number> {
    let deleted = 0;
    for (const id of ids) {
      await this.deleteAoContact(id, tx);
      deleted++;
    }
    return deleted;
  }

  /**
   * Vérifie l'existence d'une liaison AO-Contact (implémentation IRepository)
   */
  async exists(id: string, tx?: DrizzleTransaction): Promise<boolean> {
    const contact = await this.getAoContactById(id, tx);
    return contact !== undefined;
  }

  // ========================================
  // AO CONTACTS - 3 MÉTHODES + HELPERS
  // ========================================

  /**
   * Récupère toutes les liaisons AO-Contacts filtrées par AO ID
   * Résultats triés par createdAt (asc)
   * 
   * @param aoId - ID de l'AO (UUID) pour filtrer les contacts
   * @param tx - Transaction optionnelle pour support transactionnel
   * @returns Liste des liaisons AO-Contacts triées par date de création
   * 
   * @example
   * ```typescript
   * // Tous les contacts d'un AO
   * const contacts = await repo.getAoContacts('550e8400-...');
   * contacts.forEach(c => {
   *   console.log(`Contact: ${c.contact_id}, Type: ${c.link_type}`);
   * });
   * 
   * // Dans une transaction
   * await withTransaction(db, async (tx) => {
   *   const contacts = await repo.getAoContacts('550e8400-...', tx);
   *   // ...
   * });
   * ```
   */
  async getAoContacts(
    aoId: string,
    tx?: DrizzleTransaction
  ): Promise<AoContacts[]> {
    const normalizedAoId = this.normalizeId(aoId);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const results = await dbToUse
          .select()
          .from(aoContacts)
          .where(eq(aoContacts.ao_id, normalizedAoId))
          .orderBy(asc(aoContacts.createdAt));

        return results;
      },
      'getAoContacts',
      { aoId: normalizedAoId }
    );
  }

  /**
   * Crée une nouvelle liaison AO-Contact
   * 
   * @param contact - Données de la liaison à créer
   * @param tx - Transaction optionnelle pour support transactionnel
   * @returns La liaison créée
   * 
   * @example
   * ```typescript
   * const newContact = await repo.createAoContact({
   *   ao_id: '550e8400-...',
   *   contact_id: '660f9500-...',
   *   link_type: 'maitre_ouvrage'
   * });
   * 
   * // Dans une transaction
   * await withTransaction(db, async (tx) => {
   *   const contact = await repo.createAoContact({
   *     ao_id: '550e8400-...',
   *     contact_id: '660f9500-...',
   *     link_type: 'maitre_oeuvre'
   *   }, tx);
   * });
   * ```
   */
  async createAoContact(
    contact: InsertAoContacts,
    tx?: DrizzleTransaction
  ): Promise<AoContacts> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeInsert<AoContacts[]>(
          'ao_contacts',
          () => dbToUse.insert(aoContacts).values({
            ...contact,
            createdAt: new Date()
          }).returning(),
          { service: this.repositoryName, operation: 'createAoContact' }
        );

        const newContact = result[0];
        if (!newContact) {
          throw new Error('Failed to create AO contact');
        }

        this.emitEvent('ao_contact:created', { 
          id: newContact.id, 
          aoId: newContact.ao_id,
          contactId: newContact.contact_id,
          linkType: newContact.link_type
        });

        return newContact;
      },
      'createAoContact',
      { aoId: contact.ao_id, contactId: contact.contact_id }
    );
  }

  /**
   * Supprime une liaison AO-Contact
   * 
   * @param id - ID de la liaison (UUID)
   * @param tx - Transaction optionnelle
   * @returns void
   * 
   * @example
   * ```typescript
   * await repo.deleteAoContact('550e8400-...');
   * ```
   */
  async deleteAoContact(id: string, tx?: DrizzleTransaction): Promise<void> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        await safeDelete(
          'ao_contacts',
          () => dbToUse.delete(aoContacts).where(eq(aoContacts.id, normalizedId)),
          1
        );

        this.emitEvent('ao_contact:deleted', { id: normalizedId });
      },
      'deleteAoContact',
      { id: normalizedId }
    );
  }

  /**
   * Helper privé : Récupère une liaison AO-Contact par ID
   * Utilisé par findById() et exists()
   */
  private async getAoContactById(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<AoContacts | undefined> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const [contact] = await dbToUse
          .select()
          .from(aoContacts)
          .where(eq(aoContacts.id, normalizedId))
          .limit(1);

        return contact;
      },
      'getAoContactById',
      { id: normalizedId }
    );
  }

  /**
   * Helper privé : Récupère toutes les liaisons AO-Contacts
   * Utilisé par findAll() et findPaginated()
   */
  private async getAllAoContacts(tx?: DrizzleTransaction): Promise<AoContacts[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        return await dbToUse
          .select()
          .from(aoContacts)
          .orderBy(asc(aoContacts.createdAt));
      },
      'getAllAoContacts',
      {}
    );
  }

  // ========================================
  // PROJECT CONTACTS - 3 MÉTHODES
  // ========================================

  /**
   * Récupère toutes les liaisons Project-Contacts filtrées par Project ID
   * Résultats triés par createdAt (asc)
   * 
   * @param projectId - ID du projet (UUID) pour filtrer les contacts
   * @param tx - Transaction optionnelle pour support transactionnel
   * @returns Liste des liaisons Project-Contacts triées par date de création
   * 
   * @example
   * ```typescript
   * // Tous les contacts d'un projet
   * const contacts = await repo.getProjectContacts('770e9600-...');
   * contacts.forEach(c => {
   *   console.log(`Contact: ${c.contact_id}, Type: ${c.link_type}`);
   * });
   * 
   * // Dans une transaction
   * await withTransaction(db, async (tx) => {
   *   const contacts = await repo.getProjectContacts('770e9600-...', tx);
   *   // ...
   * });
   * ```
   */
  async getProjectContacts(
    projectId: string,
    tx?: DrizzleTransaction
  ): Promise<ProjectContacts[]> {
    const normalizedProjectId = this.normalizeId(projectId);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const results = await dbToUse
          .select()
          .from(projectContacts)
          .where(eq(projectContacts.project_id, normalizedProjectId))
          .orderBy(asc(projectContacts.createdAt));

        return results;
      },
      'getProjectContacts',
      { projectId: normalizedProjectId }
    );
  }

  /**
   * Crée une nouvelle liaison Project-Contact
   * 
   * @param contact - Données de la liaison à créer
   * @param tx - Transaction optionnelle pour support transactionnel
   * @returns La liaison créée
   * 
   * @example
   * ```typescript
   * const newContact = await repo.createProjectContact({
   *   project_id: '770e9600-...',
   *   contact_id: '660f9500-...',
   *   link_type: 'maitre_ouvrage'
   * });
   * 
   * // Dans une transaction
   * await withTransaction(db, async (tx) => {
   *   const contact = await repo.createProjectContact({
   *     project_id: '770e9600-...',
   *     contact_id: '660f9500-...',
   *     link_type: 'architecte'
   *   }, tx);
   * });
   * ```
   */
  async createProjectContact(
    contact: InsertProjectContacts,
    tx?: DrizzleTransaction
  ): Promise<ProjectContacts> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeInsert<ProjectContacts[]>(
          'project_contacts',
          () => dbToUse.insert(projectContacts).values({
            ...contact,
            createdAt: new Date()
          }).returning(),
          { service: this.repositoryName, operation: 'createProjectContact' }
        );

        const newContact = result[0];
        if (!newContact) {
          throw new Error('Failed to create project contact');
        }

        this.emitEvent('project_contact:created', { 
          id: newContact.id, 
          projectId: newContact.project_id,
          contactId: newContact.contact_id,
          linkType: newContact.link_type
        });

        return newContact;
      },
      'createProjectContact',
      { projectId: contact.project_id, contactId: contact.contact_id }
    );
  }

  /**
   * Supprime une liaison Project-Contact
   * 
   * @param id - ID de la liaison (UUID)
   * @param tx - Transaction optionnelle
   * @returns void
   * 
   * @example
   * ```typescript
   * await repo.deleteProjectContact('880f0700-...');
   * ```
   */
  async deleteProjectContact(id: string, tx?: DrizzleTransaction): Promise<void> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        await safeDelete(
          'project_contacts',
          () => dbToUse.delete(projectContacts).where(eq(projectContacts.id, normalizedId)),
          1
        );

        this.emitEvent('project_contact:deleted', { id: normalizedId });
      },
      'deleteProjectContact',
      { id: normalizedId }
    );
  }
}
