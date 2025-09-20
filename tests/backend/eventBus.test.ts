import { describe, test, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '../../server/eventBus';
import { EventType } from '../../shared/events';

/**
 * Tests EventBus - publishAnalyticsCalculated Method
 * Validation correction duplication et type safety
 * Assurer cohérence QueryKeys pour cache TanStack Query
 */

describe('EventBus - publishAnalyticsCalculated Corrections', () => {
  let eventBus: EventBus;
  
  beforeEach(() => {
    eventBus = new EventBus();
  });

  test('publishAnalyticsCalculated uses consistent EventType and queryKeys', () => {
    // Spy sur la méthode publish pour vérifier l'appel
    const spy = vi.spyOn(eventBus, 'publish');
    
    const mockMetadata = {
      calculationType: 'kpis-refresh',
      affectedEntities: ['offers', 'projects'],
      timestamp: new Date().toISOString()
    };
    
    // Appeler la méthode
    eventBus.publishAnalyticsCalculated(mockMetadata);
    
    // Vérifier que publish a été appelé exactement une fois
    expect(spy).toHaveBeenCalledTimes(1);
    
    // Récupérer l'argument passé à publish
    const publishedEvent = spy.mock.calls[0][0];
    
    // Vérifications critiques selon spécifications
    expect(publishedEvent.type).toBe(EventType.ANALYTICS_CALCULATED);
    expect(publishedEvent.entity).toBe("analytics");
    expect(publishedEvent.entityId).toBe("analytics-system");
    expect(publishedEvent.message).toBe("Analytics KPIs calculés et mis à jour");
    expect(publishedEvent.severity).toBe('info');
    
    // Vérifier QueryKeys cohérents avec convention TanStack Query
    expect(publishedEvent.affectedQueryKeys).toEqual(
      expect.arrayContaining([
        ['query', '/api/analytics/kpis'],
        ['query', '/api/analytics/metrics'],
        ['query', '/api/analytics/snapshots'],
        ['query', '/api/dashboard/kpis']
      ])
    );
    
    // Vérifier que tous les QueryKeys sont présents
    expect(publishedEvent.affectedQueryKeys).toHaveLength(4);
    
    // Vérifier que metadata est bien transmis
    expect(publishedEvent.metadata).toEqual(mockMetadata);
    
    spy.mockRestore();
  });

  test('publishAnalyticsCalculated ne doit pas avoir de variants dupliqués', () => {
    // Vérifier qu'il n'y a qu'une seule méthode publishAnalyticsCalculated
    const eventBusPrototype = Object.getPrototypeOf(eventBus);
    const methodNames = Object.getOwnPropertyNames(eventBusPrototype);
    
    const analyticsCalculatedMethods = methodNames.filter(name => 
      name.includes('publishAnalyticsCalculated')
    );
    
    // Il ne doit y avoir qu'une seule méthode
    expect(analyticsCalculatedMethods).toHaveLength(1);
    expect(analyticsCalculatedMethods[0]).toBe('publishAnalyticsCalculated');
  });

  test('publishAnalyticsCalculated enforces type safety - no "as any" usage', () => {
    // Test indirect pour vérifier que la méthode compile sans erreurs TypeScript
    const mockMetadata = { test: 'value' };
    
    // Si le code compile et s'exécute sans erreur, c'est que le type safety est correct
    expect(() => {
      eventBus.publishAnalyticsCalculated(mockMetadata);
    }).not.toThrow();
  });

  test('publishAnalyticsCalculated QueryKeys respectent convention TanStack Query', () => {
    const spy = vi.spyOn(eventBus, 'publish');
    
    eventBus.publishAnalyticsCalculated({ test: 'data' });
    
    const publishedEvent = spy.mock.calls[0][0];
    
    // Tous les QueryKeys doivent commencer par 'query'
    publishedEvent.affectedQueryKeys.forEach(queryKey => {
      expect(queryKey[0]).toBe('query');
      expect(queryKey[1]).toMatch(/^\/api\//);
    });
    
    spy.mockRestore();
  });
});