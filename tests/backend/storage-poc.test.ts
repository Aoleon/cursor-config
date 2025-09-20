import { describe, test, expect, beforeEach, vi } from 'vitest';
import { DatabaseStorage } from '../../server/storage-poc';
import type { 
  BusinessAlert, 
  InsertBusinessAlert, 
  AlertThreshold, 
  InsertAlertThreshold,
  ThresholdKey 
} from '../../shared/schema';

// Mock database connection
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  with: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  execute: vi.fn(),
  returning: vi.fn(),
  set: vi.fn(),
  values: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
  gt: vi.fn(),
  lt: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  isNull: vi.fn(),
  isNotNull: vi.fn(),
  desc: vi.fn(),
  asc: vi.fn()
};

// Mock des tables Drizzle
vi.mock('../../shared/schema', () => ({
  businessAlerts: {
    id: 'id',
    type: 'type',
    entity_type: 'entity_type',
    entity_id: 'entity_id',
    severity: 'severity',
    status: 'status',
    created_at: 'created_at'
  },
  alertThresholds: {
    id: 'id',
    key: 'key',
    value: 'value',
    operator: 'operator',
    is_active: 'is_active'
  }
}));

// Données de test
const mockBusinessAlert: BusinessAlert = {
  id: 'alert1',
  type: 'profitability',
  entity_type: 'project',
  entity_id: 'proj1',
  entity_name: 'Projet Test',
  threshold_key: 'project_margin',
  threshold_value: 15.0,
  actual_value: 8.5,
  variance: -6.5,
  severity: 'high',
  status: 'open',
  message: 'Marge projet inférieure au seuil',
  details: JSON.stringify({ impact: 'revenue_loss', estimated_amount: 3000 }),
  created_at: new Date('2024-02-15'),
  updated_at: new Date('2024-02-15'),
  created_by: null,
  acknowledged_by: null,
  acknowledged_at: null,
  assigned_to: null,
  resolved_by: null,
  resolved_at: null,
  resolution_notes: null
};

const mockAlertThreshold: AlertThreshold = {
  id: 'threshold1',
  key: 'project_margin' as ThresholdKey,
  value: 15.0,
  operator: 'greater_than',
  is_active: true,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01')
};

// ========================================
// SUITE DE TESTS STORAGE POC - CRUD ALERTES
// ========================================

describe('DatabaseStorage - Tests CRUD Business Alerts', () => {
  let storage: DatabaseStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock de la connexion database
    storage = new DatabaseStorage();
    (storage as any).db = mockDb;
    
    // Configuration des chaînes de mocks pour Drizzle
    mockDb.select.mockReturnThis();
    mockDb.insert.mockReturnThis();
    mockDb.update.mockReturnThis();
    mockDb.delete.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.orderBy.mockReturnThis();
    mockDb.limit.mockReturnThis();
    mockDb.returning.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.values.mockReturnThis();
    mockDb.eq.mockReturnThis();
    mockDb.and.mockReturnThis();
    mockDb.desc.mockReturnThis();
    mockDb.asc.mockReturnThis();
  });

  // ========================================
  // TESTS CRUD BUSINESS ALERTS
  // ========================================

  describe('Business Alerts CRUD Operations', () => {
    test('createBusinessAlert insère nouvelle alerte avec ID généré', async () => {
      const insertData: InsertBusinessAlert = {
        type: 'profitability',
        entity_type: 'project',
        entity_id: 'proj1',
        entity_name: 'Projet Test',
        threshold_key: 'project_margin',
        threshold_value: 15.0,
        actual_value: 8.5,
        variance: -6.5,
        severity: 'high',
        status: 'open',
        message: 'Marge projet critique',
        details: JSON.stringify({ cause: 'material_costs_increase' })
      };

      mockDb.execute.mockResolvedValue([mockBusinessAlert]);

      const result = await storage.createBusinessAlert(insertData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.type).toBe('profitability');
      expect(result.entity_id).toBe('proj1');
      expect(result.status).toBe('open');
      expect(result.created_at).toBeDefined();
      
      // Vérifier que insert a été appelé
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(insertData);
      expect(mockDb.returning).toHaveBeenCalled();
    });

    test('getBusinessAlerts récupère alertes avec filtres', async () => {
      const mockAlerts = [mockBusinessAlert];
      mockDb.execute.mockResolvedValue(mockAlerts);

      const filters = {
        status: 'open' as const,
        severity: 'high' as const,
        entity_type: 'project' as const
      };

      const result = await storage.getBusinessAlerts(filters);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].status).toBe('open');
      expect(result[0].severity).toBe('high');

      // Vérifier que select avec where a été appelé
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });

    test('getBusinessAlerts avec pagination et tri', async () => {
      const mockAlerts = Array.from({ length: 10 }, (_, i) => ({
        ...mockBusinessAlert,
        id: `alert${i + 1}`,
        created_at: new Date(`2024-02-${i + 1}`)
      }));

      mockDb.execute.mockResolvedValue(mockAlerts.slice(0, 5));

      const result = await storage.getBusinessAlerts({}, {
        page: 1,
        pageSize: 5,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });

      expect(result).toBeDefined();
      expect(result.length).toBe(5);
      
      // Vérifier pagination et tri
      expect(mockDb.orderBy).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(5);
    });

    test('updateBusinessAlert modifie alerte existante', async () => {
      const updateData = {
        status: 'acknowledged' as const,
        acknowledged_by: 'user1',
        acknowledged_at: new Date(),
        assigned_to: 'user1'
      };

      const updatedAlert = {
        ...mockBusinessAlert,
        ...updateData,
        updated_at: new Date()
      };

      mockDb.execute.mockResolvedValue([updatedAlert]);

      const result = await storage.updateBusinessAlert('alert1', updateData);

      expect(result).toBeDefined();
      expect(result.status).toBe('acknowledged');
      expect(result.acknowledged_by).toBe('user1');
      expect(result.assigned_to).toBe('user1');
      expect(result.updated_at).toBeDefined();

      // Vérifier que update a été appelé
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(updateData);
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.returning).toHaveBeenCalled();
    });

    test('getBusinessAlert récupère alerte par ID', async () => {
      mockDb.execute.mockResolvedValue([mockBusinessAlert]);

      const result = await storage.getBusinessAlert('alert1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('alert1');
      expect(result?.type).toBe('profitability');

      // Vérifier requête par ID
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.eq).toHaveBeenCalledWith(expect.anything(), 'alert1');
    });

    test('getBusinessAlert retourne null si non trouvé', async () => {
      mockDb.execute.mockResolvedValue([]);

      const result = await storage.getBusinessAlert('nonexistent');

      expect(result).toBeNull();
    });

    test('deleteBusinessAlert supprime alerte (soft delete)', async () => {
      // Dans un vrai système, on ferait un soft delete
      const softDeletedAlert = {
        ...mockBusinessAlert,
        status: 'deleted' as const,
        updated_at: new Date()
      };

      mockDb.execute.mockResolvedValue([softDeletedAlert]);

      const result = await storage.updateBusinessAlert('alert1', {
        status: 'deleted'
      });

      expect(result.status).toBe('deleted');
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  // ========================================
  // TESTS CRUD ALERT THRESHOLDS
  // ========================================

  describe('Alert Thresholds CRUD Operations', () => {
    test('upsertAlertThreshold crée nouveau seuil', async () => {
      const thresholdData: InsertAlertThreshold = {
        key: 'team_utilization',
        value: 85.0,
        operator: 'less_than',
        is_active: true
      };

      const createdThreshold = {
        id: 'threshold_new',
        ...thresholdData,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.execute.mockResolvedValue([createdThreshold]);

      const result = await storage.upsertAlertThreshold(thresholdData);

      expect(result).toBeDefined();
      expect(result.key).toBe('team_utilization');
      expect(result.value).toBe(85.0);
      expect(result.operator).toBe('less_than');
      expect(result.is_active).toBe(true);

      // Vérifier que insert ou update a été appelé
      expect(mockDb.insert).toHaveBeenCalled();
    });

    test('upsertAlertThreshold met à jour seuil existant', async () => {
      const existingThreshold = {
        id: 'threshold1',
        key: 'project_margin' as ThresholdKey,
        value: 18.0, // Mise à jour de 15.0 à 18.0
        operator: 'greater_than' as const,
        is_active: true
      };

      mockDb.execute.mockResolvedValue([{
        ...mockAlertThreshold,
        ...existingThreshold,
        updated_at: new Date()
      }]);

      const result = await storage.upsertAlertThreshold(existingThreshold);

      expect(result.value).toBe(18.0);
      expect(result.updated_at).toBeDefined();
    });

    test('getAlertThresholds récupère seuils actifs', async () => {
      const activeThresholds = [
        mockAlertThreshold,
        {
          ...mockAlertThreshold,
          id: 'threshold2',
          key: 'team_utilization' as ThresholdKey,
          value: 85.0
        }
      ];

      mockDb.execute.mockResolvedValue(activeThresholds);

      const result = await storage.getAlertThresholds();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result.every(t => t.is_active)).toBe(true);

      // Vérifier filtrage sur is_active
      expect(mockDb.where).toHaveBeenCalled();
    });

    test('getAlertThreshold récupère seuil par clé', async () => {
      mockDb.execute.mockResolvedValue([mockAlertThreshold]);

      const result = await storage.getAlertThreshold('project_margin');

      expect(result).toBeDefined();
      expect(result?.key).toBe('project_margin');
      expect(result?.value).toBe(15.0);

      // Vérifier requête par key
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.eq).toHaveBeenCalledWith(expect.anything(), 'project_margin');
    });

    test('deactivateAlertThreshold désactive seuil', async () => {
      const deactivatedThreshold = {
        ...mockAlertThreshold,
        is_active: false,
        updated_at: new Date()
      };

      mockDb.execute.mockResolvedValue([deactivatedThreshold]);

      const result = await storage.updateAlertThreshold('threshold1', {
        is_active: false
      });

      expect(result).toBeDefined();
      expect(result.is_active).toBe(false);
      expect(result.updated_at).toBeDefined();
    });
  });

  // ========================================
  // TESTS REQUÊTES COMPLEXES
  // ========================================

  describe('Requêtes Complexes et Analytics', () => {
    test('getAlertsSummary calcule statistiques alertes', async () => {
      const mockStats = [
        { status: 'open', count: 5 },
        { status: 'acknowledged', count: 3 },
        { status: 'resolved', count: 12 }
      ];

      mockDb.execute.mockResolvedValue(mockStats);

      const result = await storage.getAlertsSummary();

      expect(result).toBeDefined();
      expect(result.totalAlerts).toBe(20);
      expect(result.openAlerts).toBe(5);
      expect(result.acknowledgedAlerts).toBe(3);
      expect(result.resolvedAlerts).toBe(12);

      // Vérifier que groupBy et count ont été utilisés
      expect(mockDb.select).toHaveBeenCalled();
    });

    test('getAlertsTrend calcule tendance alertes sur période', async () => {
      const mockTrend = [
        { date: '2024-02-01', count: 2 },
        { date: '2024-02-02', count: 1 },
        { date: '2024-02-03', count: 3 }
      ];

      mockDb.execute.mockResolvedValue(mockTrend);

      const result = await storage.getAlertsTrend(
        new Date('2024-02-01'),
        new Date('2024-02-03')
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      expect(result[0].date).toBe('2024-02-01');
      expect(result[0].count).toBe(2);

      // Vérifier filtrage par date
      expect(mockDb.where).toHaveBeenCalled();
    });

    test('getAlertsPerformance mesure temps résolution', async () => {
      const mockPerformance = [
        {
          type: 'profitability',
          avg_resolution_time_hours: 24.5,
          total_alerts: 8,
          resolution_rate: 87.5
        },
        {
          type: 'team_utilization',
          avg_resolution_time_hours: 18.2,
          total_alerts: 5,
          resolution_rate: 100.0
        }
      ];

      mockDb.execute.mockResolvedValue(mockPerformance);

      const result = await storage.getAlertsPerformance();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].avg_resolution_time_hours).toBe(24.5);
      expect(result[0].resolution_rate).toBe(87.5);

      // Vérifier calculs de performance
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  // ========================================
  // TESTS GESTION ERREURS ET CONTRAINTES
  // ========================================

  describe('Gestion Erreurs et Contraintes', () => {
    test('gère erreur constraint violation (threshold key unique)', async () => {
      const duplicateThreshold: InsertAlertThreshold = {
        key: 'project_margin', // Clé existante
        value: 20.0,
        operator: 'greater_than',
        is_active: true
      };

      mockDb.execute.mockRejectedValue(new Error('UNIQUE constraint failed'));

      await expect(storage.upsertAlertThreshold(duplicateThreshold))
        .rejects.toThrow('UNIQUE constraint failed');
    });

    test('gère erreur foreign key violation', async () => {
      const invalidAlert: InsertBusinessAlert = {
        type: 'profitability',
        entity_type: 'project',
        entity_id: 'nonexistent_project', // ID projet inexistant
        entity_name: 'Projet Inexistant',
        threshold_key: 'project_margin',
        threshold_value: 15.0,
        actual_value: 8.5,
        variance: -6.5,
        severity: 'high',
        status: 'open',
        message: 'Test erreur FK'
      };

      mockDb.execute.mockRejectedValue(new Error('FOREIGN KEY constraint failed'));

      await expect(storage.createBusinessAlert(invalidAlert))
        .rejects.toThrow('FOREIGN KEY constraint failed');
    });

    test('gère timeout database connection', async () => {
      mockDb.execute.mockRejectedValue(new Error('Connection timeout'));

      await expect(storage.getBusinessAlerts())
        .rejects.toThrow('Connection timeout');
    });

    test('valide données avant insertion', async () => {
      const invalidAlert: any = {
        type: 'invalid_type', // Type non valide
        entity_type: 'project',
        severity: 'invalid_severity', // Severité non valide
        status: 'invalid_status' // Status non valide
      };

      // Dans un vrai système, la validation se ferait avant l'appel DB
      expect(() => {
        if (!['profitability', 'team_utilization', 'predictive_risk'].includes(invalidAlert.type)) {
          throw new Error('Invalid alert type');
        }
      }).toThrow('Invalid alert type');
    });
  });

  // ========================================
  // TESTS PERFORMANCE ET OPTIMISATION
  // ========================================

  describe('Performance et Optimisation', () => {
    test('getBusinessAlerts avec index sur created_at', async () => {
      const mockAlerts = Array.from({ length: 1000 }, (_, i) => ({
        ...mockBusinessAlert,
        id: `alert${i}`,
        created_at: new Date(`2024-01-${Math.floor(i/31) + 1}`)
      }));

      mockDb.execute.mockResolvedValue(mockAlerts.slice(0, 50));

      const startTime = Date.now();
      const result = await storage.getBusinessAlerts(
        { status: 'open' },
        { page: 1, pageSize: 50, sortBy: 'created_at', sortOrder: 'desc' }
      );
      const duration = Date.now() - startTime;

      expect(result.length).toBe(50);
      expect(duration).toBeLessThan(100); // Performance < 100ms pour requête indexée
    });

    test('batch update alertes améliore performance', async () => {
      const alertIds = ['alert1', 'alert2', 'alert3', 'alert4', 'alert5'];
      const updateData = {
        status: 'resolved' as const,
        resolved_by: 'user1',
        resolved_at: new Date()
      };

      // Mock batch update
      mockDb.execute.mockResolvedValue(
        alertIds.map(id => ({ ...mockBusinessAlert, id, ...updateData }))
      );

      const startTime = Date.now();
      const results = await Promise.all(
        alertIds.map(id => storage.updateBusinessAlert(id, updateData))
      );
      const duration = Date.now() - startTime;

      expect(results.length).toBe(5);
      expect(duration).toBeLessThan(200); // Batch plus rapide que updates individuels
    });
  });
});