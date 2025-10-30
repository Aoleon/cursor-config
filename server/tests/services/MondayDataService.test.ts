/**
 * MONDAY DATA SERVICE - Comprehensive Unit Tests
 * 
 * Test Coverage:
 * - Import transformations (Monday → Saxium)
 * - Export transformations (Saxium → Monday)
 * - Mapping validation
 * - Data splitting and extraction
 * - Mock storage and EventBus
 * - Golden tests for known transformation scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MondayDataService } from '../../services/consolidated/MondayDataService';
import type { ImportMapping, MondayItem } from '../../services/consolidated/MondayIntegrationService';
import type { SplitResult } from '../../services/monday/types';

// ========================================
// MOCKS
// ========================================

const mockStorage = {
  createProject: vi.fn(),
  createAo: vi.fn(),
  createSupplier: vi.fn(),
  updateProject: vi.fn(),
  updateAo: vi.fn(),
  getProject: vi.fn(),
  getAo: vi.fn(),
  getProjectsPaginated: vi.fn(),
  getAos: vi.fn(),
  updateProjectMondayId: vi.fn(),
  updateAOMondayId: vi.fn(),
  getAOByMondayItemId: vi.fn(),
  findOrCreateMaitreOuvrage: vi.fn(),
  findOrCreateMaitreOeuvre: vi.fn(),
  findOrCreateContact: vi.fn(),
  linkAoContact: vi.fn(),
  createAoLot: vi.fn(),
  transaction: vi.fn((callback) => callback({})),
};

const mockMondayIntegrationService = {
  getBoardData: vi.fn(),
  getItem: vi.fn(),
  executeGraphQL: vi.fn(),
};

const mockEventBus = {
  publish: vi.fn(),
  emit: vi.fn(),
};

// ========================================
// TEST DATA
// ========================================

const createMockMondayItem = (overrides: Partial<MondayItem> = {}): MondayItem => ({
  id: '123456',
  name: 'Test Project',
  column_values: [
    { id: 'status', type: 'status', text: 'Active', label: 'Active' },
    { id: 'client', type: 'text', text: 'ACME Corp' },
    { id: 'location', type: 'text', text: 'Paris' },
    { id: 'budget', type: 'numbers', text: '50000' },
  ],
  ...overrides,
});

const createMockMapping = (targetEntity: 'project' | 'ao' | 'supplier' = 'project'): ImportMapping => ({
  mondayBoardId: '789012',
  targetEntity,
  columnMappings: [
    { mondayColumnId: 'status', saxiumField: 'status' },
    { mondayColumnId: 'client', saxiumField: 'client' },
    { mondayColumnId: 'location', saxiumField: 'location' },
    { mondayColumnId: 'budget', saxiumField: 'budget' },
  ],
});

// ========================================
// TEST SUITE
// ========================================

describe('MondayDataService', () => {
  let service: MondayDataService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MondayDataService(mockStorage as any);
  });

  // ========================================
  // IMPORT TESTS
  // ========================================

  describe('importFromMonday', () => {
    it('should import Monday items as Projects', async () => {
      const mockBoardData = {
        board: { id: '789012', name: 'Projects Board' },
        columns: [],
        items: [createMockMondayItem()],
      };

      mockMondayIntegrationService.getBoardData.mockResolvedValue(mockBoardData);
      mockStorage.createProject.mockResolvedValue({ id: 'proj-1', name: 'Test Project' });

      const mapping = createMockMapping('project');
      const result = await service.importFromMonday('789012', mapping, 'project');

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);
      expect(result.createdIds).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(mockStorage.createProject).toHaveBeenCalledOnce();
    });

    it('should import Monday items as AOs', async () => {
      const mockBoardData = {
        board: { id: '789012', name: 'AOs Board' },
        columns: [],
        items: [createMockMondayItem({ name: 'AO-2025-001' })],
      };

      mockMondayIntegrationService.getBoardData.mockResolvedValue(mockBoardData);
      mockStorage.createAo.mockResolvedValue({ id: 'ao-1', reference: 'AO-2025-001' });

      const mapping = createMockMapping('ao');
      const result = await service.importFromMonday('789012', mapping, 'ao');

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);
      expect(mockStorage.createAo).toHaveBeenCalledOnce();
    });

    it('should import Monday items as Suppliers', async () => {
      const mockBoardData = {
        board: { id: '789012', name: 'Suppliers Board' },
        columns: [],
        items: [createMockMondayItem({ name: 'Supplier Co' })],
      };

      mockMondayIntegrationService.getBoardData.mockResolvedValue(mockBoardData);
      mockStorage.createSupplier.mockResolvedValue({ id: 'supp-1', name: 'Supplier Co' });

      const mapping = createMockMapping('supplier');
      const result = await service.importFromMonday('789012', mapping, 'supplier');

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);
      expect(mockStorage.createSupplier).toHaveBeenCalledOnce();
    });

    it('should handle import errors gracefully', async () => {
      const mockBoardData = {
        board: { id: '789012', name: 'Projects Board' },
        columns: [],
        items: [createMockMondayItem({ name: '' })],
      };

      mockMondayIntegrationService.getBoardData.mockResolvedValue(mockBoardData);

      const mapping = createMockMapping('project');
      const result = await service.importFromMonday('789012', mapping, 'project');

      expect(result.success).toBe(false);
      expect(result.importedCount).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('nom manquant');
    });

    it('should publish EventBus events on successful import', async () => {
      const mockBoardData = {
        board: { id: '789012', name: 'Projects Board' },
        columns: [],
        items: [createMockMondayItem()],
      };

      mockMondayIntegrationService.getBoardData.mockResolvedValue(mockBoardData);
      mockStorage.createProject.mockResolvedValue({ id: 'proj-1', name: 'Test Project' });

      const mapping = createMockMapping('project');
      await service.importFromMonday('789012', mapping, 'project');

      expect(mockEventBus.publish).toHaveBeenCalled();
      const event = mockEventBus.publish.mock.calls[0][0];
      expect(event.type).toBe('project:created');
      expect(event.entity).toBe('project');
      expect(event.severity).toBe('success');
    });
  });

  // ========================================
  // EXPORT TESTS
  // ========================================

  describe('exportToMonday', () => {
    it('should export Project to Monday.com', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        client: 'ACME Corp',
        location: 'Paris',
        status: 'active',
        mondayId: null,
      };

      mockStorage.getProject.mockResolvedValue(mockProject);
      mockMondayIntegrationService.executeGraphQL.mockResolvedValue({
        create_item: { id: 'monday-123' },
      });
      mockStorage.updateProjectMondayId.mockResolvedValue(undefined);

      const mondayId = await service.exportToMonday('project', 'proj-1');

      expect(mondayId).toBe('monday-123');
      expect(mockMondayIntegrationService.executeGraphQL).toHaveBeenCalled();
      expect(mockStorage.updateProjectMondayId).toHaveBeenCalledWith('proj-1', 'monday-123');
    });

    it('should export AO to Monday.com', async () => {
      const mockAo = {
        id: 'ao-1',
        reference: 'AO-2025-001',
        client: 'ACME Corp',
        location: 'Paris',
        status: 'open',
        mondayId: null,
        menuiserieType: 'fenetre',
      };

      mockStorage.getAo.mockResolvedValue(mockAo);
      mockMondayIntegrationService.executeGraphQL.mockResolvedValue({
        create_item: { id: 'monday-456' },
      });
      mockStorage.updateAOMondayId.mockResolvedValue(undefined);

      const mondayId = await service.exportToMonday('ao', 'ao-1');

      expect(mondayId).toBe('monday-456');
      expect(mockMondayIntegrationService.executeGraphQL).toHaveBeenCalled();
      expect(mockStorage.updateAOMondayId).toHaveBeenCalledWith('ao-1', 'monday-456');
    });

    it('should return existing Monday ID if already exported (idempotent)', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        mondayId: 'existing-monday-123',
      };

      mockStorage.getProject.mockResolvedValue(mockProject);

      const mondayId = await service.exportToMonday('project', 'proj-1');

      expect(mondayId).toBe('existing-monday-123');
      expect(mockMondayIntegrationService.executeGraphQL).not.toHaveBeenCalled();
    });

    it('should throw error if entity not found', async () => {
      mockStorage.getProject.mockResolvedValue(null);

      await expect(service.exportToMonday('project', 'non-existent')).rejects.toThrow(
        'Project non-existent not found'
      );
    });
  });

  // ========================================
  // VALIDATION TESTS
  // ========================================

  describe('validateMapping', () => {
    it('should validate correct mapping', () => {
      const mapping = createMockMapping('project');
      const result = service.validateMapping(mapping);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing mondayBoardId', () => {
      const mapping = { ...createMockMapping('project'), mondayBoardId: '' };
      const result = service.validateMapping(mapping);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('mondayBoardId is required');
    });

    it('should detect missing targetEntity', () => {
      const mapping = { ...createMockMapping('project'), targetEntity: '' as any };
      const result = service.validateMapping(mapping);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('targetEntity is required');
    });

    it('should detect invalid targetEntity', () => {
      const mapping = { ...createMockMapping('project'), targetEntity: 'invalid' as any };
      const result = service.validateMapping(mapping);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid targetEntity'))).toBe(true);
    });

    it('should detect missing columnMappings', () => {
      const mapping = { ...createMockMapping('project'), columnMappings: null as any };
      const result = service.validateMapping(mapping);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('columnMappings must be an array');
    });

    it('should warn about empty columnMappings', () => {
      const mapping = { ...createMockMapping('project'), columnMappings: [] };
      const result = service.validateMapping(mapping);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('No column mappings defined');
    });
  });

  // ========================================
  // TRANSFORMATION TESTS
  // ========================================

  describe('transformItem', () => {
    it('should transform Monday item using mapping', () => {
      const item = createMockMondayItem();
      const mapping = createMockMapping('project');

      const transformed = service.transformItem(item, mapping);

      expect(transformed.name).toBe('Test Project');
      expect(transformed.status).toBe('Active');
      expect(transformed.client).toBe('ACME Corp');
      expect(transformed.location).toBe('Paris');
      expect(transformed.budget).toBe(50000);
    });

    it('should handle missing column values gracefully', () => {
      const item = createMockMondayItem({ column_values: [] });
      const mapping = createMockMapping('project');

      const transformed = service.transformItem(item, mapping);

      expect(transformed.name).toBe('Test Project');
      expect(transformed.status).toBeUndefined();
      expect(transformed.client).toBeUndefined();
    });

    it('should validate dates when option is enabled', () => {
      const item = createMockMondayItem({
        column_values: [
          { id: 'date', type: 'date', text: '->01/10/25' },
        ],
      });
      const mapping = {
        ...createMockMapping('project'),
        columnMappings: [{ mondayColumnId: 'date', saxiumField: 'startDate' }],
      };

      const transformed = service.transformItem(item, mapping, { validateDates: true });

      expect(transformed.startDate).toBe('2025-10-01');
    });
  });

  // ========================================
  // DATA SPLITTING TESTS
  // ========================================

  describe('splitData', () => {
    it('should analyze item for splitting opportunities', async () => {
      const mockItem = createMockMondayItem();
      mockMondayIntegrationService.getItem.mockResolvedValue(mockItem);

      const analysis = await service.analyzeItem('123456', '789012');

      expect(analysis.opportunites).toBeDefined();
      expect(analysis.diagnostics).toBeDefined();
    });

    it('should split Monday item into multiple entities (dry run)', async () => {
      const mockItem = createMockMondayItem();
      mockMondayIntegrationService.getItem.mockResolvedValue(mockItem);
      mockStorage.getAOByMondayItemId.mockResolvedValue(null);

      const result = await service.splitData('123456', '789012', { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.extractedData).toBeDefined();
      expect(mockStorage.createAo).not.toHaveBeenCalled();
    });

    it('should create AO and related entities when not dry run', async () => {
      const mockItem = createMockMondayItem();
      mockMondayIntegrationService.getItem.mockResolvedValue(mockItem);
      mockStorage.getAOByMondayItemId.mockResolvedValue(null);
      mockStorage.createAo.mockResolvedValue({ id: 'ao-1', reference: 'AO-001' });

      const result = await service.splitData('123456', '789012', { dryRun: false });

      expect(result.success).toBe(true);
      expect(result.aoCreated).toBe(true);
      expect(result.aoId).toBe('ao-1');
    });

    it('should update existing AO if already imported', async () => {
      const mockItem = createMockMondayItem();
      const existingAO = { id: 'ao-1', reference: 'AO-001', menuiserieType: 'fenetre', source: 'other' };
      
      mockMondayIntegrationService.getItem.mockResolvedValue(mockItem);
      mockStorage.getAOByMondayItemId.mockResolvedValue(existingAO);
      mockStorage.updateAo.mockResolvedValue({ ...existingAO, updatedAt: new Date() });

      const result = await service.splitData('123456', '789012', { dryRun: false });

      expect(result.success).toBe(true);
      expect(result.aoCreated).toBe(false);
      expect(result.aoUpdated).toBe(true);
      expect(mockStorage.updateAo).toHaveBeenCalled();
    });
  });

  // ========================================
  // PREVIEW TESTS
  // ========================================

  describe('previewImport', () => {
    it('should generate import preview with suggested mappings', async () => {
      const mockBoardData = {
        board: { id: '789012', name: 'Projects Board' },
        columns: [
          { id: 'name', title: 'Nom', type: 'text' },
          { id: 'client', title: 'Client', type: 'text' },
          { id: 'location', title: 'Lieu', type: 'text' },
          { id: 'budget', title: 'Budget', type: 'numbers' },
        ],
        items: [createMockMondayItem(), createMockMondayItem()],
      };

      mockMondayIntegrationService.getBoardData.mockResolvedValue(mockBoardData);

      const preview = await service.previewImport('789012', 'project');

      expect(preview.boardName).toBe('Projects Board');
      expect(preview.itemCount).toBe(2);
      expect(preview.columns).toHaveLength(4);
      expect(preview.suggestedMappings.length).toBeGreaterThan(0);
    });

    it('should suggest mappings based on column titles', async () => {
      const mockBoardData = {
        board: { id: '789012', name: 'Projects Board' },
        columns: [
          { id: 'col1', title: 'Nom du projet', type: 'text' },
          { id: 'col2', title: 'Client', type: 'text' },
        ],
        items: [],
      };

      mockMondayIntegrationService.getBoardData.mockResolvedValue(mockBoardData);

      const preview = await service.previewImport('789012', 'project');

      const nameSuggestion = preview.suggestedMappings.find(m => m.saxiumField === 'name');
      const clientSuggestion = preview.suggestedMappings.find(m => m.saxiumField === 'client');

      expect(nameSuggestion).toBeDefined();
      expect(nameSuggestion?.mondayColumnId).toBe('col1');
      expect(clientSuggestion).toBeDefined();
      expect(clientSuggestion?.mondayColumnId).toBe('col2');
    });
  });

  // ========================================
  // GOLDEN TESTS (Known Transformation Scenarios)
  // ========================================

  describe('Golden Tests', () => {
    it('should transform JLM project format correctly', () => {
      const jlmItem = createMockMondayItem({
        name: 'NEXITY - BOULOGNE - 60 lgts',
        column_values: [
          { id: 'status7', type: 'status', text: 'AO EN COURS', label: 'AO EN COURS' },
          { id: 'client', type: 'text', text: 'NEXITY' },
          { id: 'text', type: 'text', text: 'BOULOGNE' },
          { id: 'date', type: 'date', text: '->15/11/25' },
        ],
      });

      const mapping: ImportMapping = {
        mondayBoardId: '3946257560',
        targetEntity: 'ao',
        columnMappings: [
          { mondayColumnId: 'status7', saxiumField: 'operationalStatus' },
          { mondayColumnId: 'client', saxiumField: 'client' },
          { mondayColumnId: 'text', saxiumField: 'location' },
          { mondayColumnId: 'date', saxiumField: 'dateLimiteRemise' },
        ],
      };

      const transformed = service.transformItem(jlmItem, mapping, { validateDates: true });

      expect(transformed.name).toBe('NEXITY - BOULOGNE - 60 lgts');
      expect(transformed.operationalStatus).toBe('AO EN COURS');
      expect(transformed.client).toBe('NEXITY');
      expect(transformed.location).toBe('BOULOGNE');
      expect(transformed.dateLimiteRemise).toBe('2025-11-15');
    });

    it('should handle complex Monday.com status column format', () => {
      const item = createMockMondayItem({
        column_values: [
          { 
            id: 'status', 
            type: 'status', 
            text: 'En cours',
            label: 'En cours',
            index: 1
          },
        ],
      });

      const mapping = {
        ...createMockMapping('project'),
        columnMappings: [{ mondayColumnId: 'status', saxiumField: 'status' }],
      };

      const transformed = service.transformItem(item, mapping);

      expect(transformed.status).toBe('En cours');
    });

    it('should handle Monday.com people column format', () => {
      const item = createMockMondayItem({
        column_values: [
          { 
            id: 'people', 
            type: 'people', 
            values: [
              { id: 'user-1', text: 'John Doe' },
              { id: 'user-2', text: 'Jane Smith' },
            ]
          },
        ],
      });

      const mapping = {
        ...createMockMapping('project'),
        columnMappings: [{ mondayColumnId: 'people', saxiumField: 'assignedUsers' }],
      };

      const transformed = service.transformItem(item, mapping);

      expect(transformed.assignedUsers).toEqual(['user-1', 'user-2']);
    });
  });

  // ========================================
  // SYNC TESTS
  // ========================================

  describe('syncFromMonday', () => {
    it('should sync create event from Monday', async () => {
      const mockItem = createMockMondayItem();
      mockMondayIntegrationService.getItem.mockResolvedValue(mockItem);
      mockStorage.createProject.mockResolvedValue({ id: 'proj-1', name: 'Test Project' });

      await service.syncFromMonday({
        boardId: '789012',
        itemId: '123456',
        changeType: 'create',
      });

      expect(mockStorage.createProject).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should sync update event from Monday', async () => {
      const mockItem = createMockMondayItem();
      const existingProject = {
        id: 'proj-1',
        name: 'Old Name',
        mondayId: '123456',
        updatedAt: new Date('2025-01-01'),
      };

      mockMondayIntegrationService.getItem.mockResolvedValue(mockItem);
      mockStorage.getProjectsPaginated.mockResolvedValue({
        projects: [existingProject],
        total: 1,
      });
      mockStorage.updateProject.mockResolvedValue({ ...existingProject, name: 'Test Project' });

      await service.syncFromMonday({
        boardId: '789012',
        itemId: '123456',
        changeType: 'update',
        mondayUpdatedAt: new Date('2025-01-15'),
      });

      expect(mockStorage.updateProject).toHaveBeenCalled();
    });

    it('should handle delete event from Monday', async () => {
      const mockItem = createMockMondayItem();
      mockMondayIntegrationService.getItem.mockResolvedValue(mockItem);

      await service.syncFromMonday({
        boardId: '789012',
        itemId: '123456',
        changeType: 'delete',
      });

      expect(mockStorage.createProject).not.toHaveBeenCalled();
      expect(mockStorage.updateProject).not.toHaveBeenCalled();
    });
  });
});
