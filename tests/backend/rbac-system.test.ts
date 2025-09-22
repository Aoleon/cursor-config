import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RBACService } from '../../server/services/RBACService';
import { MemStorage } from '../../server/storage';
import { db } from '../../server/db';
import { 
  permissions, 
  permissionContexts, 
  userPermissionContexts,
  rbacAuditLog,
  users,
  type AccessValidationRequest,
  type PermissionCheckResult,
  type UserPermissionsResponse
} from '../../shared/schema';

describe('Système RBAC Granulaire - Chatbot IA Saxium', () => {
  let rbacService: RBACService;
  let storage: MemStorage;

  // Données de test
  const testUsers = {
    admin: { id: 'admin-001', role: 'admin', email: 'admin@jlm.fr' },
    chefProjet: { id: 'chef-001', role: 'chef_projet', email: 'chef@jlm.fr' },
    technicienBE: { id: 'tech-001', role: 'technicien_be', email: 'tech@jlm.fr' },
    responsableBE: { id: 'resp-001', role: 'responsable_be', email: 'resp@jlm.fr' },
    chefTravaux: { id: 'travaux-001', role: 'chef_travaux', email: 'travaux@jlm.fr' }
  };

  const testPermissions = [
    // Admin - Accès total
    {
      role: 'admin',
      tableName: 'users',
      allowedColumns: [],
      canRead: true,
      canWrite: true,
      canDelete: true,
      canCreate: true,
      canExport: true,
      contextRequired: 'all',
      dataSensitivity: 'internal'
    },
    {
      role: 'admin',
      tableName: 'projects',
      allowedColumns: [],
      canRead: true,
      canWrite: true,
      canDelete: true,
      canCreate: true,
      canExport: true,
      contextRequired: 'all',
      dataSensitivity: 'internal'
    },
    
    // Chef de projet - Ses projets + données équipe
    {
      role: 'chef_projet',
      tableName: 'projects',
      allowedColumns: ['id', 'reference', 'client', 'status', 'startDate', 'endDate', 'responsableUserId'],
      deniedColumns: ['montantTotal', 'margeCommerciale'],
      canRead: true,
      canWrite: true,
      canDelete: false,
      canCreate: true,
      canExport: true,
      contextRequired: 'team_projects',
      dataSensitivity: 'internal'
    },
    {
      role: 'chef_projet',
      tableName: 'offers',
      allowedColumns: ['id', 'reference', 'client', 'status', 'montantEstime'],
      deniedColumns: ['margeCommerciale', 'coutInterne'],
      canRead: true,
      canWrite: true,
      canDelete: false,
      canCreate: true,
      canExport: false,
      contextRequired: 'assigned_projects',
      dataSensitivity: 'internal'
    },

    // Technicien BE - Projets assignés + données techniques (pas financier)
    {
      role: 'technicien_be',
      tableName: 'projects',
      allowedColumns: ['id', 'reference', 'client', 'status', 'startDate', 'endDate', 'description'],
      deniedColumns: ['montantTotal', 'margeCommerciale', 'coutInterne', 'budgetPrevu'],
      canRead: true,
      canWrite: true,
      canDelete: false,
      canCreate: false,
      canExport: false,
      contextRequired: 'assigned_projects',
      dataSensitivity: 'internal'
    },
    {
      role: 'technicien_be',
      tableName: 'offers',
      allowedColumns: ['id', 'reference', 'client', 'status', 'description'],
      deniedColumns: ['montantEstime', 'margeCommerciale', 'coutInterne'],
      canRead: true,
      canWrite: true,
      canDelete: false,
      canCreate: false,
      canExport: false,
      contextRequired: 'assigned_projects',
      dataSensitivity: 'internal'
    },

    // Responsable BE - Tous projets BE + métriques département
    {
      role: 'responsable_be',
      tableName: 'projects',
      allowedColumns: ['id', 'reference', 'client', 'status', 'startDate', 'endDate', 'description', 'budgetPrevu'],
      deniedColumns: ['margeCommerciale'],
      canRead: true,
      canWrite: true,
      canDelete: false,
      canCreate: true,
      canExport: true,
      contextRequired: 'department_data',
      dataSensitivity: 'internal'
    },
    {
      role: 'responsable_be',
      tableName: 'users',
      allowedColumns: ['id', 'firstName', 'lastName', 'email', 'role', 'chargeStatus'],
      deniedColumns: [],
      canRead: true,
      canWrite: false,
      canDelete: false,
      canCreate: false,
      canExport: true,
      contextRequired: 'department_data',
      dataSensitivity: 'internal'
    },

    // Chef de travaux - Données chantier + planning
    {
      role: 'chef_travaux',
      tableName: 'projects',
      allowedColumns: ['id', 'reference', 'client', 'status', 'startDate', 'endDate', 'planning'],
      deniedColumns: ['montantTotal', 'margeCommerciale', 'coutInterne'],
      canRead: true,
      canWrite: true,
      canDelete: false,
      canCreate: false,
      canExport: false,
      contextRequired: 'assigned_projects',
      dataSensitivity: 'internal'
    }
  ];

  beforeEach(async () => {
    storage = new MemStorage();
    rbacService = new RBACService(storage);
  });

  afterEach(async () => {
    // Nettoyage après chaque test
  });

  describe('Gestion des permissions par rôle', () => {
    
    it('Admin doit avoir accès total à toutes les données', async () => {
      const request: AccessValidationRequest = {
        userId: testUsers.admin.id,
        role: testUsers.admin.role as any,
        tableName: 'projects',
        action: 'read',
        columns: ['id', 'montantTotal', 'margeCommerciale']
      };

      const result = await rbacService.validateTableAccess(request);

      expect(result.allowed).toBe(true);
      expect(result.auditRequired).toBe(true);
      expect(result.denialReason).toBeUndefined();
    });

    it('Chef projet doit pouvoir lire ses projets mais pas les données financières sensibles', async () => {
      const request: AccessValidationRequest = {
        userId: testUsers.chefProjet.id,
        role: testUsers.chefProjet.role as any,
        tableName: 'projects',
        action: 'read',
        columns: ['id', 'reference', 'client', 'margeCommerciale'] // margeCommerciale est interdite
      };

      const result = await rbacService.validateTableAccess(request);

      expect(result.allowed).toBe(false);
      expect(result.denialReason).toContain('margeCommerciale');
    });

    it('Technicien BE ne doit pas pouvoir créer de projets', async () => {
      const request: AccessValidationRequest = {
        userId: testUsers.technicienBE.id,
        role: testUsers.technicienBE.role as any,
        tableName: 'projects',
        action: 'create'
      };

      const result = await rbacService.validateTableAccess(request);

      expect(result.allowed).toBe(false);
      expect(result.denialReason).toContain('create');
    });

    it('Responsable BE doit pouvoir accéder aux métriques département', async () => {
      const request: AccessValidationRequest = {
        userId: testUsers.responsableBE.id,
        role: testUsers.responsableBE.role as any,
        tableName: 'users',
        action: 'read',
        columns: ['id', 'firstName', 'lastName', 'chargeStatus']
      };

      const result = await rbacService.validateTableAccess(request);

      expect(result.allowed).toBe(true);
      expect(result.contextRequired).toBe('department_data');
    });

    it('Chef de travaux ne doit pas pouvoir supprimer de projets', async () => {
      const request: AccessValidationRequest = {
        userId: testUsers.chefTravaux.id,
        role: testUsers.chefTravaux.role as any,
        tableName: 'projects',
        action: 'delete'
      };

      const result = await rbacService.validateTableAccess(request);

      expect(result.allowed).toBe(false);
      expect(result.denialReason).toContain('delete');
    });
  });

  describe('Validation des colonnes granulaires', () => {

    it('Doit bloquer l\'accès aux colonnes interdites', async () => {
      const request: AccessValidationRequest = {
        userId: testUsers.technicienBE.id,
        role: testUsers.technicienBE.role as any,
        tableName: 'projects',
        action: 'read',
        columns: ['id', 'reference', 'montantTotal'] // montantTotal est interdit pour technicien_be
      };

      const result = await rbacService.validateTableAccess(request);

      expect(result.allowed).toBe(false);
      expect(result.denialReason).toContain('montantTotal');
    });

    it('Doit autoriser l\'accès aux colonnes autorisées uniquement', async () => {
      const request: AccessValidationRequest = {
        userId: testUsers.technicienBE.id,
        role: testUsers.technicienBE.role as any,
        tableName: 'projects',
        action: 'read',
        columns: ['id', 'reference', 'description'] // Colonnes autorisées
      };

      const result = await rbacService.validateTableAccess(request);

      expect(result.allowed).toBe(true);
      expect(result.allowedColumns).toContain('id');
      expect(result.allowedColumns).toContain('reference');
      expect(result.deniedColumns).toContain('montantTotal');
    });
  });

  describe('Contextes de permissions dynamiques', () => {

    it('Doit créer un contexte de permission dynamique', async () => {
      const contextId = await rbacService.createPermissionContext(
        'own_projects_only',
        'Accès aux projets dont l\'utilisateur est responsable',
        'responsableUserId = :userId',
        ['userId'],
        ['projects']
      );

      expect(contextId).toBeDefined();
      expect(typeof contextId).toBe('string');
    });

    it('Doit assigner un contexte à un utilisateur', async () => {
      const assignmentId = await rbacService.assignContextToUser(
        testUsers.chefProjet.id,
        'team_projects',
        { teamId: 'team-001', projectIds: ['proj-001', 'proj-002'] },
        testUsers.admin.id
      );

      expect(assignmentId).toBeDefined();
      expect(typeof assignmentId).toBe('string');
    });

    it('Doit valider les contextes requis pour l\'accès', async () => {
      const request: AccessValidationRequest = {
        userId: testUsers.chefProjet.id,
        role: testUsers.chefProjet.role as any,
        tableName: 'projects',
        action: 'read',
        contextValues: { teamId: 'team-001' }
      };

      const result = await rbacService.validateTableAccess(request);

      expect(result.contextRequired).toBe('team_projects');
    });
  });

  describe('Audit et traçabilité', () => {

    it('Doit enregistrer les accès autorisés dans l\'audit', async () => {
      const request: AccessValidationRequest = {
        userId: testUsers.admin.id,
        role: testUsers.admin.role as any,
        tableName: 'projects',
        action: 'read',
        columns: ['id', 'reference']
      };

      await rbacService.validateTableAccess(request);

      const auditHistory = await rbacService.getAuditHistory({
        userId: testUsers.admin.id,
        tableName: 'projects',
        limit: 1
      });

      expect(auditHistory.length).toBeGreaterThan(0);
      expect(auditHistory[0].success).toBe(true);
      expect(auditHistory[0].action).toBe('read');
    });

    it('Doit enregistrer les accès refusés avec la raison', async () => {
      const request: AccessValidationRequest = {
        userId: testUsers.technicienBE.id,
        role: testUsers.technicienBE.role as any,
        tableName: 'projects',
        action: 'delete' // Action non autorisée
      };

      await rbacService.validateTableAccess(request);

      const auditHistory = await rbacService.getAuditHistory({
        userId: testUsers.technicienBE.id,
        action: 'delete',
        limit: 1
      });

      expect(auditHistory.length).toBeGreaterThan(0);
      expect(auditHistory[0].success).toBe(false);
      expect(auditHistory[0].denialReason).toContain('delete');
    });

    it('Doit récupérer l\'historique d\'audit avec filtres', async () => {
      const dateFrom = new Date();
      dateFrom.setHours(dateFrom.getHours() - 1);

      const auditHistory = await rbacService.getAuditHistory({
        tableName: 'projects',
        dateFrom,
        limit: 10
      });

      expect(Array.isArray(auditHistory)).toBe(true);
      auditHistory.forEach(entry => {
        expect(entry.tableName).toBe('projects');
        expect(new Date(entry.timestamp)).toBeInstanceOf(Date);
      });
    });
  });

  describe('Récupération des permissions utilisateur', () => {

    it('Doit récupérer toutes les permissions d\'un utilisateur', async () => {
      const permissions = await rbacService.getUserPermissions(
        testUsers.responsableBE.id,
        testUsers.responsableBE.role as any
      );

      expect(permissions.userId).toBe(testUsers.responsableBE.id);
      expect(permissions.role).toBe(testUsers.responsableBE.role);
      expect(permissions.permissions).toBeDefined();
      expect(typeof permissions.permissions).toBe('object');
      expect(permissions.lastUpdated).toBeInstanceOf(Date);
    });

    it('Doit récupérer les permissions pour une table spécifique', async () => {
      const permissions = await rbacService.getUserPermissions(
        testUsers.chefProjet.id,
        testUsers.chefProjet.role as any,
        'projects'
      );

      expect(permissions.permissions.projects).toBeDefined();
      expect(permissions.permissions.projects.read.allowed).toBe(true);
      expect(permissions.permissions.projects.delete.allowed).toBe(false);
    });
  });

  describe('Gestion des erreurs et cas limites', () => {

    it('Doit refuser l\'accès si aucune permission n\'est définie', async () => {
      const request: AccessValidationRequest = {
        userId: 'unknown-user',
        role: 'unknown_role' as any,
        tableName: 'unknown_table',
        action: 'read'
      };

      const result = await rbacService.validateTableAccess(request);

      expect(result.allowed).toBe(false);
      expect(result.denialReason).toContain('Aucune permission définie');
    });

    it('Doit gérer les rôles invalides gracieusement', async () => {
      const request: AccessValidationRequest = {
        userId: testUsers.admin.id,
        role: 'invalid_role' as any,
        tableName: 'projects',
        action: 'read'
      };

      const result = await rbacService.validateTableAccess(request);

      expect(result.allowed).toBe(false);
    });

    it('Doit valider les actions invalides', async () => {
      const request: AccessValidationRequest = {
        userId: testUsers.admin.id,
        role: testUsers.admin.role as any,
        tableName: 'projects',
        action: 'invalid_action' as any
      };

      const result = await rbacService.validateTableAccess(request);

      expect(result.allowed).toBe(false);
    });
  });

  describe('Permissions restrictives par défaut', () => {

    it('Les permissions par défaut doivent être restrictives', async () => {
      const request: AccessValidationRequest = {
        userId: 'new-user',
        role: 'new_role' as any,
        tableName: 'sensitive_table',
        action: 'read'
      };

      const result = await rbacService.validateTableAccess(request);

      expect(result.allowed).toBe(false);
      expect(result.denialReason).toBeDefined();
    });

    it('Un rôle sans permissions explicites ne doit rien pouvoir faire', async () => {
      const actions = ['read', 'write', 'delete', 'create', 'export'];
      
      for (const action of actions) {
        const request: AccessValidationRequest = {
          userId: 'restricted-user',
          role: 'restricted_role' as any,
          tableName: 'any_table',
          action: action as any
        };

        const result = await rbacService.validateTableAccess(request);
        expect(result.allowed).toBe(false);
      }
    });
  });

  describe('Performance et optimisation', () => {

    it('Doit traiter les permissions rapidement', async () => {
      const start = Date.now();
      
      const request: AccessValidationRequest = {
        userId: testUsers.admin.id,
        role: testUsers.admin.role as any,
        tableName: 'projects',
        action: 'read'
      };

      await rbacService.validateTableAccess(request);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Moins de 100ms
    });

    it('Doit gérer plusieurs validations simultanées', async () => {
      const requests = [
        { userId: testUsers.admin.id, role: testUsers.admin.role as any, tableName: 'projects', action: 'read' as const },
        { userId: testUsers.chefProjet.id, role: testUsers.chefProjet.role as any, tableName: 'offers', action: 'read' as const },
        { userId: testUsers.technicienBE.id, role: testUsers.technicienBE.role as any, tableName: 'projects', action: 'write' as const }
      ];

      const results = await Promise.all(
        requests.map(req => rbacService.validateTableAccess(req))
      );

      expect(results).toHaveLength(3);
      expect(results[0].allowed).toBe(true); // Admin
      expect(results[1].allowed).toBe(true); // Chef projet sur offers
      expect(results[2].allowed).toBe(true); // Technicien BE write sur projects
    });
  });
});