import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from 'vitest';
import type { Server } from 'http';
import request from 'supertest';
import express from 'express';
import { storage } from '../../server/storage-poc';
import { EventBus, eventBus } from '../../server/eventBus';
import { MondayImportService } from '../../server/services/MondayImportService';
import { mondayService } from '../../server/services/MondayService';
import mondayRouter from '../../server/modules/monday/routes';
import { errorHandler } from '../../server/middleware/errorHandler';
import { EventType } from '../../shared/events';
import type { RealtimeEvent } from '../../shared/events';

describe('Monday.com Import Regression Suite', () => {
  let app: express.Application;
  let server: Server;
  let mondayImportService: MondayImportService;
  let publishedEvents: RealtimeEvent[] = [];
  let eventSubscriptionId: string;

  // Mock Monday API responses
  const mockProjectBoard = {
    board: {
      id: 'board-123',
      name: 'Test Projects Board'
    },
    columns: [
      { id: 'name', title: 'Name', type: 'text' },
      { id: 'status', title: 'Status', type: 'status' },
      { id: 'montantEstime', title: 'Montant Estimé', type: 'number' }
    ],
    items: [
      {
        id: 'item-proj-1',
        name: 'Projet Test 1',
        column_values: [
          { id: 'name', type: 'text', text: 'Projet Test 1', value: '{"text":"Projet Test 1"}' },
          { id: 'status', type: 'status', text: 'Active', value: '{"index":0}' },
          { id: 'montantEstime', type: 'numbers', text: '150000', value: '{"number":"150000"}' }
        ]
      },
      {
        id: 'item-proj-2',
        name: 'Projet Test 2',
        column_values: [
          { id: 'name', type: 'text', text: 'Projet Test 2', value: '{"text":"Projet Test 2"}' },
          { id: 'status', type: 'status', text: 'Archived', value: '{"index":1}' },
          { id: 'montantEstime', type: 'numbers', text: '250000', value: '{"number":"250000"}' }
        ]
      }
    ]
  };

  const mockAOBoard = {
    board: {
      id: 'board-456',
      name: 'Test AOs Board'
    },
    columns: [
      { id: 'name', title: 'Name', type: 'text' },
      { id: 'reference', title: 'Reference', type: 'text' },
      { id: 'status', title: 'Status', type: 'status' },
      { id: 'montantEstime', title: 'Montant Estimé', type: 'number' }
    ],
    items: [
      {
        id: 'item-ao-1',
        name: 'AO Test 1',
        column_values: [
          { id: 'name', type: 'text', text: 'AO Test 1', value: '{"text":"AO Test 1"}' },
          { id: 'reference', type: 'text', text: 'AO-2025-001', value: '{"text":"AO-2025-001"}' },
          { id: 'status', type: 'status', text: 'En cours', value: '{"index":0}' },
          { id: 'montantEstime', type: 'numbers', text: '75000', value: '{"number":"75000"}' }
        ]
      }
    ]
  };

  const mockSupplierBoard = {
    board: {
      id: 'board-789',
      name: 'Test Suppliers Board'
    },
    columns: [
      { id: 'name', title: 'Name', type: 'text' },
      { id: 'contact', title: 'Contact', type: 'text' },
      { id: 'email', title: 'Email', type: 'email' }
    ],
    items: [
      {
        id: 'item-supplier-1',
        name: 'Fournisseur Test 1',
        column_values: [
          { id: 'name', type: 'text', text: 'Fournisseur Test 1', value: '{"text":"Fournisseur Test 1"}' },
          { id: 'contact', type: 'text', text: 'Jean Dupont', value: '{"text":"Jean Dupont"}' },
          { id: 'email', type: 'email', text: 'jean@test.fr', value: '{"email":"jean@test.fr","text":"jean@test.fr"}' }
        ]
      }
    ]
  };

  beforeAll(async () => {
    // Mock MondayService.getBoardData
    vi.spyOn(mondayService, 'getBoardData').mockImplementation(async (boardId: string) => {
      if (boardId === 'board-123') return mockProjectBoard as any;
      if (boardId === 'board-456') return mockAOBoard as any;
      if (boardId === 'board-789') return mockSupplierBoard as any;
      throw new Error(`Board not found: ${boardId}`);
    });

    // Mock storage methods for Projects, AOs, and Suppliers
    const createdProjects = new Map();
    const createdAos = new Map();
    const createdSuppliers = new Map();
    
    // Direct assignment instead of vi.spyOn to avoid "does not exist" errors
    (storage as any).getProjectByMondayItemId = vi.fn(async (mondayItemId: string) => {
      return createdProjects.get(mondayItemId);
    });
    
    (storage as any).createProject = vi.fn(async (data: any) => {
      const project = {
        id: Math.floor(Math.random() * 1000000),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      if (data.mondayItemId) {
        createdProjects.set(data.mondayItemId, project);
      }
      return project as any;
    });
    
    (storage as any).updateProject = vi.fn(async (id: number, data: any) => {
      const existing = Array.from(createdProjects.values()).find((p: any) => p.id === id);
      const updated = {
        ...existing,
        ...data,
        id,
        updatedAt: new Date()
      };
      if (data.mondayItemId || existing?.mondayItemId) {
        createdProjects.set(data.mondayItemId || existing.mondayItemId, updated);
      }
      return updated as any;
    });

    (storage as any).getAOByMondayItemId = vi.fn(async (mondayItemId: string) => {
      return createdAos.get(mondayItemId);
    });
    
    (storage as any).createAo = vi.fn(async (data: any) => {
      const ao = {
        id: Math.floor(Math.random() * 1000000),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      if (data.mondayItemId) {
        createdAos.set(data.mondayItemId, ao);
      }
      return ao as any;
    });
    
    (storage as any).updateAo = vi.fn(async (id: number, data: any) => {
      const existing = Array.from(createdAos.values()).find((a: any) => a.id === id);
      const updated = {
        ...existing,
        ...data,
        id,
        updatedAt: new Date()
      };
      if (data.mondayItemId || existing?.mondayItemId) {
        createdAos.set(data.mondayItemId || existing.mondayItemId, updated);
      }
      return updated as any;
    });

    (storage as any).getSupplierByMondayItemId = vi.fn(async (mondayItemId: string) => {
      return createdSuppliers.get(mondayItemId);
    });
    
    (storage as any).createSupplier = vi.fn(async (data: any) => {
      const supplier = {
        id: Math.floor(Math.random() * 1000000),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      if (data.mondayItemId) {
        createdSuppliers.set(data.mondayItemId, supplier);
      }
      return supplier as any;
    });
    
    (storage as any).updateSupplier = vi.fn(async (id: number, data: any) => {
      const existing = Array.from(createdSuppliers.values()).find((s: any) => s.id === id);
      const updated = {
        ...existing,
        ...data,
        id,
        updatedAt: new Date()
      };
      if (data.mondayItemId || existing?.mondayItemId) {
        createdSuppliers.set(data.mondayItemId || existing.mondayItemId, updated);
      }
      return updated as any;
    });
    
    (storage as any).getProjects = vi.fn(async () => {
      return Array.from(createdProjects.values()) as any;
    });
    
    (storage as any).getSuppliers = vi.fn(async () => {
      return Array.from(createdSuppliers.values()) as any;
    });

    // Create MondayImportService instance
    mondayImportService = new MondayImportService();

    // Setup Express app with Monday routes
    app = express();
    app.use(express.json());
    app.use(mondayRouter); // Router already includes /api/monday prefix
    app.use(errorHandler); // Add error handler middleware

    server = app.listen(0); // Random port
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    // Capture EventBus events
    publishedEvents = [];
    eventSubscriptionId = eventBus.subscribe((event) => {
      publishedEvents.push(event);
    });
  });

  afterEach(() => {
    publishedEvents = [];
    if (eventSubscriptionId) {
      eventBus.unsubscribe(eventSubscriptionId);
    }
  });

  describe('Projects Import', () => {
    it('should import projects successfully and emit PROJECT_CREATED events', async () => {
      const response = await request(app)
        .post('/api/monday/import')
        .send({
          boardId: 'board-123',
          targetEntity: 'project',
          columnMappings: [
            { mondayColumnId: 'name', saxiumField: 'name' },
            { mondayColumnId: 'montantEstime', saxiumField: 'montantEstime' }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.importedCount).toBe(2);

      // Verify EventBus emitted PROJECT_CREATED events
      const projectCreatedEvents = publishedEvents.filter(
        e => e.type === EventType.PROJECT_CREATED
      );
      expect(projectCreatedEvents.length).toBe(2);
      expect(projectCreatedEvents[0]).toBeDefined();
      expect(projectCreatedEvents[0]!.entity).toBe('project');
      expect(projectCreatedEvents[0]!.metadata?.action).toBe('create');
    });

    it('should update existing projects and emit PROJECT_UPDATED events on re-import', async () => {
      // First import
      await request(app)
        .post('/api/monday/import')
        .send({
          boardId: 'board-123',
          targetEntity: 'project',
          columnMappings: [
            { mondayColumnId: 'name', saxiumField: 'name' }
          ]
        });

      publishedEvents = []; // Clear events

      // Re-import the same board
      const response = await request(app)
        .post('/api/monday/import')
        .send({
          boardId: 'board-123',
          targetEntity: 'project',
          columnMappings: [
            { mondayColumnId: 'name', saxiumField: 'name' }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify EventBus emitted PROJECT_UPDATED events (not CREATED)
      const projectUpdatedEvents = publishedEvents.filter(
        e => e.type === EventType.PROJECT_UPDATED
      );
      expect(projectUpdatedEvents.length).toBeGreaterThan(0);
      expect(projectUpdatedEvents[0]).toBeDefined();
      expect(projectUpdatedEvents[0]!.metadata?.action).toBe('update');

      // Ensure no PROJECT_CREATED events on re-import
      const projectCreatedEvents = publishedEvents.filter(
        e => e.type === EventType.PROJECT_CREATED
      );
      expect(projectCreatedEvents.length).toBe(0);
    });

    it('should handle null decimal values correctly (coerceDecimalToString)', async () => {
      // Mock board with null montantEstime
      const boardWithNull = {
        ...mockProjectBoard,
        items: [
          {
            ...mockProjectBoard.items[0],
            id: 'item-null-test',
            name: 'Projet Null Test',
            column_values: [
              { id: 'name', type: 'text', text: 'Projet Null Test', value: '{"text":"Projet Null Test"}' },
              { id: 'montantEstime', type: 'numbers', text: '', value: null }
            ]
          }
        ]
      };

      vi.spyOn(mondayService, 'getBoardData').mockResolvedValueOnce(boardWithNull as any);

      const response = await request(app)
        .post('/api/monday/import')
        .send({
          boardId: 'board-123',
          targetEntity: 'project',
          columnMappings: [
            { mondayColumnId: 'name', saxiumField: 'name' },
            { mondayColumnId: 'montantEstime', saxiumField: 'montantEstime' }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify project was created with null montantEstime (not undefined)
      const projects = await storage.getProjects();
      const importedProject = projects.find(p => p.name === 'Projet Null Test');
      expect(importedProject).toBeDefined();
      expect(importedProject?.montantEstime).toBeNull();
    });
  });

  describe('AOs Import', () => {
    it('should import AOs successfully and emit OFFER_CREATED events', async () => {
      const response = await request(app)
        .post('/api/monday/import')
        .send({
          boardId: 'board-456',
          targetEntity: 'ao',
          columnMappings: [
            { mondayColumnId: 'name', saxiumField: 'name' },
            { mondayColumnId: 'reference', saxiumField: 'reference' },
            { mondayColumnId: 'montantEstime', saxiumField: 'montantEstime' }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.importedCount).toBe(1);

      // Verify EventBus emitted OFFER_CREATED events
      const offerCreatedEvents = publishedEvents.filter(
        e => e.type === EventType.OFFER_CREATED
      );
      expect(offerCreatedEvents.length).toBe(1);
      expect(offerCreatedEvents[0]).toBeDefined();
      expect(offerCreatedEvents[0]!.entity).toBe('offer');
      expect(offerCreatedEvents[0]!.metadata?.action).toBe('create');
    });

    it('should update existing AOs and emit OFFER_UPDATED events on re-import', async () => {
      // First import
      await request(app)
        .post('/api/monday/import')
        .send({
          boardId: 'board-456',
          targetEntity: 'ao',
          columnMappings: [
            { mondayColumnId: 'name', saxiumField: 'name' },
            { mondayColumnId: 'reference', saxiumField: 'reference' }
          ]
        });

      publishedEvents = [];

      // Re-import
      const response = await request(app)
        .post('/api/monday/import')
        .send({
          boardId: 'board-456',
          targetEntity: 'ao',
          columnMappings: [
            { mondayColumnId: 'name', saxiumField: 'name' },
            { mondayColumnId: 'reference', saxiumField: 'reference' }
          ]
        });

      expect(response.status).toBe(200);

      // Verify OFFER_UPDATED events
      const offerUpdatedEvents = publishedEvents.filter(
        e => e.type === EventType.OFFER_UPDATED
      );
      expect(offerUpdatedEvents.length).toBeGreaterThan(0);
      expect(offerUpdatedEvents[0]).toBeDefined();
      expect(offerUpdatedEvents[0]!.metadata?.action).toBe('update');
    });
  });

  describe('Suppliers Import', () => {
    it('should import suppliers successfully', async () => {
      const response = await request(app)
        .post('/api/monday/import')
        .send({
          boardId: 'board-789',
          targetEntity: 'supplier',
          columnMappings: [
            { mondayColumnId: 'name', saxiumField: 'name' },
            { mondayColumnId: 'contact', saxiumField: 'contact' },
            { mondayColumnId: 'email', saxiumField: 'email' }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.importedCount).toBe(1);
    });

    it('should not create duplicates on re-import (upsert strategy)', async () => {
      // First import
      await request(app)
        .post('/api/monday/import')
        .send({
          boardId: 'board-789',
          targetEntity: 'supplier',
          columnMappings: [
            { mondayColumnId: 'name', saxiumField: 'name' }
          ]
        });

      const suppliersAfterFirst = await storage.getSuppliers();
      const countAfterFirst = suppliersAfterFirst.length;

      // Re-import the same board
      await request(app)
        .post('/api/monday/import')
        .send({
          boardId: 'board-789',
          targetEntity: 'supplier',
          columnMappings: [
            { mondayColumnId: 'name', saxiumField: 'name' }
          ]
        });

      const suppliersAfterSecond = await storage.getSuppliers();
      const countAfterSecond = suppliersAfterSecond.length;

      // Count should be the same (no duplicates created)
      expect(countAfterSecond).toBe(countAfterFirst);
    });
  });

  describe('Error Handling & Resilience', () => {
    it('should handle validation errors gracefully', async () => {
      // Mock invalid board data (missing required fields)
      const invalidBoard = {
        ...mockProjectBoard,
        items: [
          {
            id: 'item-invalid',
            name: '',
            column_values: []
          }
        ]
      };

      vi.spyOn(mondayService, 'getBoardData').mockResolvedValueOnce(invalidBoard as any);

      const response = await request(app)
        .post('/api/monday/import')
        .send({
          boardId: 'board-123',
          targetEntity: 'project',
          columnMappings: [
            { mondayColumnId: 'name', saxiumField: 'name' }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.errors.length).toBeGreaterThan(0);
    });

    it('should handle Monday API failures', async () => {
      vi.spyOn(mondayService, 'getBoardData').mockRejectedValueOnce(
        new Error('Monday API unreachable')
      );

      const response = await request(app)
        .post('/api/monday/import')
        .send({
          boardId: 'board-nonexistent',
          targetEntity: 'project',
          columnMappings: [
            { mondayColumnId: 'name', saxiumField: 'name' }
          ]
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should apply removeUndefined before Zod validation and storage', async () => {
      // This test ensures the DRIZZLE COMPATIBILITY fix is working
      const boardWithUndefined = {
        ...mockProjectBoard,
        items: [
          {
            id: 'item-undefined',
            name: 'Test Undefined',
            column_values: [
              { id: 'name', text: 'Test Undefined', value: '"Test Undefined"' },
              { id: 'nonexistent', text: undefined, value: undefined }
            ]
          }
        ]
      };

      vi.spyOn(mondayService, 'getBoardData').mockResolvedValueOnce(boardWithUndefined as any);

      const response = await request(app)
        .post('/api/monday/import')
        .send({
          boardId: 'board-123',
          targetEntity: 'project',
          columnMappings: [
            { mondayColumnId: 'name', saxiumField: 'name' }
          ]
        });

      // Should succeed despite undefined values (removeUndefined cleans them)
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('EventBus Telemetry Validation', () => {
    it('should emit correct event types for all entities', async () => {
      // Import Projects
      await request(app)
        .post('/api/monday/import')
        .send({
          boardId: 'board-123',
          targetEntity: 'project',
          columnMappings: [{ mondayColumnId: 'name', saxiumField: 'name' }]
        });

      const projectEvents = publishedEvents.filter(e => e.entity === 'project');
      expect(projectEvents.every(e => 
        e.type === EventType.PROJECT_CREATED || e.type === EventType.PROJECT_UPDATED
      )).toBe(true);

      publishedEvents = [];

      // Import AOs
      await request(app)
        .post('/api/monday/import')
        .send({
          boardId: 'board-456',
          targetEntity: 'ao',
          columnMappings: [
            { mondayColumnId: 'name', saxiumField: 'name' },
            { mondayColumnId: 'reference', saxiumField: 'reference' }
          ]
        });

      const aoEvents = publishedEvents.filter(e => e.entity === 'offer');
      expect(aoEvents.every(e => 
        e.type === EventType.OFFER_CREATED || e.type === EventType.OFFER_UPDATED
      )).toBe(true);
    });

    it('should include correct metadata in events', async () => {
      await request(app)
        .post('/api/monday/import')
        .send({
          boardId: 'board-123',
          targetEntity: 'project',
          columnMappings: [{ mondayColumnId: 'name', saxiumField: 'name' }]
        });

      const event = publishedEvents.find(e => e.type === EventType.PROJECT_CREATED || e.type === EventType.PROJECT_UPDATED);
      expect(event).toBeDefined();
      expect(event!.metadata).toBeDefined();
      expect(event!.metadata?.source).toBe('monday.com');
      expect(event!.metadata?.mondayItemId).toBeDefined();
      expect(event!.metadata?.boardId).toBe('board-123');
      expect(event!.metadata?.action).toMatch(/create|update/);
    });

    it('should not emit "unknown" event types', async () => {
      await request(app)
        .post('/api/monday/import')
        .send({
          boardId: 'board-123',
          targetEntity: 'project',
          columnMappings: [{ mondayColumnId: 'name', saxiumField: 'name' }]
        });

      const unknownEvents = publishedEvents.filter(e => !Object.values(EventType).includes(e.type as any));
      expect(unknownEvents.length).toBe(0);
    });
  });
});
