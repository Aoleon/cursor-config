/**
 * PDF Template Engine Module
 * Exports all components for PDF generation with template support
 */

// Main engine
export { PDFTemplateEngine } from './PDFTemplateEngine';

// Core components
export { PlaceholderResolver } from './PlaceholderResolver';
export { ImageIntegrator } from './ImageIntegrator';
export { LayoutOptimizer } from './LayoutOptimizer';
export { TemplateValidator } from './TemplateValidator';

// Type exports
export type {
  // Template types
  PDFTemplate,
  TemplateMetadata,
  CompiledTemplate,
  TemplateCache,
  CacheStats,

  // Placeholder types
  Placeholder,
  PlaceholderFormatter,
  PlaceholderPosition,
  ConditionalBlock,
  LoopBlock,

  // Image types
  ImageReference,
  ImageOptions,
  ProcessedImage,

  // Layout types
  LayoutOptions,
  LayoutMargins,
  GridOptions,
  SpacingOptions,
  BreakpointOptions,
  OptimizationOptions,

  // Validation types
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,
  ValidationMetadata,

  // Rendering types
  RenderContext,
  RenderOptions,
  RenderResult,
  RenderMetadata,

  // Configuration
  PDFTemplateEngineConfig,

  // LDM specific types
  LDMTemplateData,
  LDMItem,

  // Error types
  TemplateError,
  PlaceholderError,
  ImageError,
  LayoutError
} from './types';

// Template loader utility
export async function loadTemplate(templatePath: string): Promise<string> {
  const { readFile } = await import('fs/promises');
  const { join } = await import('path');
  const fullPath = join(__dirname, templatePath);
  return readFile(fullPath, 'utf-8');
}

// Pre-defined template paths
export const TEMPLATES = {
  LDM: {
    BASIC: 'templates/ldm/basic-ldm.hbs',
    COMPLEX: 'templates/ldm/complex-ldm.hbs',
    VISUAL: 'templates/ldm/visual-ldm.hbs'
  }
} as const;

// Helper function to create LDM data
export function createLDMData(data: Partial<import('./types').LDMTemplateData>): import('./types').LDMTemplateData {
  const { Decimal } = require('decimal.js-light');
  
  return {
    reference: data.reference || 'LDM-' + Date.now(),
    client: {
      name: 'Client Non Défini',
      ...data.client
    },
    project: {
      name: 'Projet Non Défini',
      reference: 'PROJ-' + Date.now(),
      ...data.project
    },
    supplier: data.supplier,
    items: data.items || [],
    totals: {
      ht: data.totals?.ht || new Decimal(0),
      tva: data.totals?.tva || new Decimal(0),
      ttc: data.totals?.ttc || new Decimal(0),
      discount: data.totals?.discount
    },
    conditions: data.conditions,
    notes: data.notes,
    validityDate: data.validityDate
  };
}

// Factory function for quick setup
export async function createPDFEngine(config?: import('./types').PDFTemplateEngineConfig): Promise<PDFTemplateEngine> {
  const engine = PDFTemplateEngine.getInstance(config);
  
  // Pre-load common templates if needed
  if (config?.preloadTemplates) {
    const templates = [
      { id: 'ldm-basic', path: TEMPLATES.LDM.BASIC },
      { id: 'ldm-complex', path: TEMPLATES.LDM.COMPLEX },
      { id: 'ldm-visual', path: TEMPLATES.LDM.VISUAL }
    ];

    for (const template of templates) {
      try {
        const content = await loadTemplate(template.path);
        await engine.compileTemplate({
          id: template.id,
          name: template.id,
          type: 'handlebars',
          content
        });
      } catch (error) {
        console.warn(`Failed to preload template ${template.id}:`, error);
      }
    }
  }

  return engine;
}

// Re-export logger for consistent logging
export { Logger } from '../../../utils/logger';