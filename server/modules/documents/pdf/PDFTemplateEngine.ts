/**
 * PDF Template Engine
 * Main orchestrator for the PDF template processing pipeline
 */

import { Logger } from '../../../utils/logger';
import { PdfGeneratorService } from '../../../services/pdfGeneratorService';
import { PlaceholderResolver } from './PlaceholderResolver';
import { ImageIntegrator } from './ImageIntegrator';
import { LayoutOptimizer } from './LayoutOptimizer';
import { TemplateValidator } from './TemplateValidator';
import * as Handlebars from 'handlebars';
import { createHash } from 'crypto';
import type {
  PDFTemplate,
  CompiledTemplate,
  TemplateCache,
  CacheStats,
  RenderContext,
  RenderOptions,
  RenderResult,
  RenderMetadata,
  PDFTemplateEngineConfig,
  TemplateError,
  ValidationResult
} from './types';

const logger = new Logger('PDFTemplateEngine');

export class PDFTemplateEngine {
  private static instance: PDFTemplateEngine;
  private cache: TemplateCache;
  private config: PDFTemplateEngineConfig;
  private placeholderResolver: PlaceholderResolver;
  private imageIntegrator: ImageIntegrator;
  private layoutOptimizer: LayoutOptimizer;
  private validator: TemplateValidator;
  private handlebars: typeof Handlebars;
  private pdfGenerator: typeof PdfGeneratorService;

  private constructor(config?: PDFTemplateEngineConfig) {
    this.config = {
      cacheEnabled: true,
      cacheTTL: 3600, // 1 hour
      cacheMaxSize: 100,
      validationStrict: true,
      defaultLocale: 'fr-FR',
      defaultTimezone: 'Europe/Paris',
      imageOptimization: true,
      layoutOptimization: true,
      debugMode: process.env.NODE_ENV === 'development',
      performanceTracking: true,
      errorRecovery: true,
      maxRenderTime: 30000, // 30 seconds
      ...config
    };

    this.cache = new TemplateCacheImpl(this.config.cacheMaxSize!, this.config.cacheTTL!);
    this.placeholderResolver = new PlaceholderResolver();
    this.imageIntegrator = new ImageIntegrator();
    this.layoutOptimizer = new LayoutOptimizer();
    this.validator = new TemplateValidator();
    this.handlebars = Handlebars.create();
    this.pdfGenerator = PdfGeneratorService;

    this.registerHelpers();
    logger.info('PDF Template Engine initialized', { config: this.config });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: PDFTemplateEngineConfig): PDFTemplateEngine {
    if (!PDFTemplateEngine.instance) {
      PDFTemplateEngine.instance = new PDFTemplateEngine(config);
    }
    return PDFTemplateEngine.instance;
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    // Currency formatter
    this.handlebars.registerHelper('currency', (amount: any, currency = 'EUR') => {
      return new Intl.NumberFormat(this.config.defaultLocale, {
        style: 'currency',
        currency
      }).format(amount);
    });

    // Date formatter
    this.handlebars.registerHelper('date', (date: any, format = 'short') => {
      if (!date) return '';
      const d = new Date(date);
      const options: Intl.DateTimeFormatOptions = 
        format === 'short' ? { dateStyle: 'short' } :
        format === 'long' ? { dateStyle: 'long' } :
        { dateStyle: 'medium' };
      return d.toLocaleDateString(this.config.defaultLocale, options);
    });

    // Number formatter
    this.handlebars.registerHelper('number', (num: any, decimals = 2) => {
      return new Intl.NumberFormat(this.config.defaultLocale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(num);
    });

    // Conditional helper
    this.handlebars.registerHelper('when', (condition: any, options: any) => {
      if (condition) {
        return options.fn(this);
      } else if (options.inverse) {
        return options.inverse(this);
      }
    });

    // Loop helper with separator
    this.handlebars.registerHelper('each_with_separator', (context: any[], separator: string, options: any) => {
      return context.map((item, index) => {
        const result = options.fn(item, {
          data: { index, first: index === 0, last: index === context.length - 1 }
        });
        return index < context.length - 1 ? result + separator : result;
      }).join('');
    });

    logger.debug('Handlebars helpers registered');
  }

  /**
   * Compile template with caching
   */
  public async compileTemplate(template: PDFTemplate): Promise<CompiledTemplate> {
    const startTime = Date.now();
    const templateId = this.generateTemplateId(template);

    // Check cache
    if (this.config.cacheEnabled) {
      const cached = this.cache.get(templateId);
      if (cached) {
        logger.debug('Template retrieved from cache', { templateId });
        return cached;
      }
    }

    try {
      // Validate template
      if (this.config.validationStrict) {
        const validation = await this.validator.validate(template);
        if (!validation.isValid) {
          throw new TemplateError('Template validation failed', 'VALIDATION_FAILED', validation.errors);
        }
      }

      // Process template content
      let processedContent = template.content;

      // Convert custom placeholder syntax to Handlebars
      processedContent = this.convertPlaceholderSyntax(processedContent);

      // Extract metadata
      const placeholders = this.placeholderResolver.extractPlaceholders(processedContent);
      const images = this.imageIntegrator.extractImageReferences(processedContent);
      const conditionals = this.placeholderResolver.extractConditionals(processedContent);
      const loops = this.placeholderResolver.extractLoops(processedContent);

      // Compile with Handlebars
      const compiledHandlebars = this.handlebars.compile(processedContent);

      const compiled: CompiledTemplate = {
        id: templateId,
        originalId: template.id,
        content: processedContent,
        placeholders,
        images,
        conditionals,
        loops,
        dependencies: this.extractDependencies(template),
        compiledAt: new Date(),
        version: template.version || '1.0.0',
        checksum: this.generateChecksum(processedContent)
      };

      // Store compiled template function
      (compiled as any).renderFunction = compiledHandlebars;

      // Cache if enabled
      if (this.config.cacheEnabled) {
        this.cache.set(templateId, compiled);
      }

      const compileTime = Date.now() - startTime;
      logger.info('Template compiled successfully', {
        templateId,
        compileTime,
        placeholders: placeholders.length,
        images: images.length
      });

      return compiled;
    } catch (error) {
      logger.error('Template compilation failed', error as Error, { templateId });
      throw error;
    }
  }

  /**
   * Convert custom placeholder syntax to Handlebars
   */
  private convertPlaceholderSyntax(content: string): string {
    // Convert [placeholder] to {{placeholder}}
    let converted = content.replace(/\[([^\[\]]+)\]/g, (match, placeholder) => {
      // Handle special syntax
      if (placeholder.startsWith('if:')) {
        const condition = placeholder.substring(3);
        return `{{#if ${condition}}}`;
      }
      if (placeholder === '/if') {
        return '{{/if}}';
      }
      if (placeholder.startsWith('foreach:')) {
        const variable = placeholder.substring(8);
        return `{{#each ${variable}}}`;
      }
      if (placeholder === '/foreach') {
        return '{{/each}}';
      }
      if (placeholder.startsWith('image ')) {
        // Keep image references as-is for ImageIntegrator
        return match;
      }

      // Handle formatters
      const parts = placeholder.split(':');
      if (parts.length > 1) {
        const field = parts[0];
        const formatter = parts[1];
        const args = parts.slice(2).join(' ');
        return `{{${formatter} ${field} ${args}}}`.trim();
      }

      // Standard placeholder
      return `{{${placeholder}}}`;
    });

    return converted;
  }

  /**
   * Render template to HTML/PDF
   */
  public async render(options: RenderOptions): Promise<RenderResult> {
    const startTime = Date.now();
    const renderMetadata: RenderMetadata = {
      renderTime: 0,
      placeholdersResolved: 0,
      placeholdersMissing: [],
      imagesLoaded: 0,
      imagesFailed: []
    };

    try {
      // Get or compile template
      const template = typeof options.template === 'string' 
        ? { id: 'inline', name: 'inline', type: 'handlebars' as const, content: options.template }
        : options.template;

      const compiled = await this.compileTemplate(template);
      renderMetadata.templateId = compiled.id;

      // Resolve placeholders
      const resolvedContext = await this.placeholderResolver.resolve(
        compiled.placeholders,
        options.context.data,
        options.context.formatters
      );
      renderMetadata.placeholdersResolved = resolvedContext.resolved.length;
      renderMetadata.placeholdersMissing = resolvedContext.missing.map(p => p.path);

      // Process images
      const processedImages = await this.imageIntegrator.processImages(
        compiled.images,
        options.context.images || {}
      );
      renderMetadata.imagesLoaded = processedImages.successful.length;
      renderMetadata.imagesFailed = processedImages.failed.map(i => i.raw);

      // Prepare final context
      const finalContext = {
        ...options.context.data,
        ...resolvedContext.data,
        __images: processedImages.processed
      };

      // Render with Handlebars
      const renderFunction = (compiled as any).renderFunction;
      if (!renderFunction) {
        throw new TemplateError('Template not properly compiled', 'RENDER_FUNCTION_MISSING');
      }

      let html = renderFunction(finalContext, {
        helpers: options.context.helpers,
        partials: options.context.partials
      });

      // Inject processed images
      html = await this.imageIntegrator.injectImages(html, processedImages.processed);

      // Optimize layout if enabled
      if (options.layout && this.config.layoutOptimization) {
        html = await this.layoutOptimizer.optimize(html, options.layout);
      }

      // Generate PDF if needed
      let pdfBuffer: Buffer | undefined;
      if (options.template && typeof options.template !== 'string') {
        await this.pdfGenerator.initialize();
        const pdfResult = await this.pdfGenerator.generatePdfFromHtml(html, {
          format: options.layout?.pageSize || 'A4',
          orientation: options.layout?.orientation,
          includeBackground: true,
          margins: options.layout?.margins
        });
        pdfBuffer = pdfResult.buffer;
        renderMetadata.pdfSize = pdfResult.size;
      }

      renderMetadata.renderTime = Date.now() - startTime;

      logger.info('Template rendered successfully', renderMetadata);

      return {
        success: true,
        html,
        pdf: pdfBuffer,
        metadata: renderMetadata
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Template rendering failed', error as Error, { options });

      // Try fallback template if error recovery is enabled
      if (this.config.errorRecovery && options.fallbackTemplate) {
        logger.info('Attempting fallback template');
        return this.render({
          ...options,
          template: options.fallbackTemplate,
          fallbackTemplate: undefined // Prevent infinite recursion
        });
      }

      return {
        success: false,
        errors: [{
          type: 'syntax',
          message: errorMessage,
          severity: 'error'
        }],
        metadata: renderMetadata
      };
    }
  }

  /**
   * Validate template
   */
  public async validateTemplate(template: PDFTemplate): Promise<ValidationResult> {
    return this.validator.validate(template);
  }

  /**
   * Clear cache
   */
  public clearCache(templateId?: string): void {
    this.cache.clear(templateId);
    logger.info('Template cache cleared', { templateId });
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Generate unique template ID
   */
  private generateTemplateId(template: PDFTemplate): string {
    const hash = createHash('sha256');
    hash.update(template.id);
    hash.update(template.content);
    hash.update(template.version || '1.0.0');
    return hash.digest('hex');
  }

  /**
   * Generate content checksum
   */
  private generateChecksum(content: string): string {
    return createHash('md5').update(content).digest('hex');
  }

  /**
   * Extract template dependencies
   */
  private extractDependencies(template: PDFTemplate): string[] {
    const dependencies: Set<string> = new Set();

    // Extract partial references
    const partialMatches = template.content.matchAll(/\{\{>\s*([^\s}]+)/g);
    for (const match of partialMatches) {
      dependencies.add(match[1]);
    }

    // Extract helper references
    const helperMatches = template.content.matchAll(/\{\{#?\s*([^\s}]+)/g);
    for (const match of helperMatches) {
      if (!['if', 'unless', 'each', 'with'].includes(match[1])) {
        dependencies.add(match[1]);
      }
    }

    return Array.from(dependencies);
  }
}

/**
 * Template Cache Implementation
 */
class TemplateCacheImpl implements TemplateCache {
  private cache: Map<string, { template: CompiledTemplate; timestamp: number }>;
  private stats: CacheStats;
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number, ttl: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl * 1000; // Convert to milliseconds
    this.stats = {
      size: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      avgCompileTime: 0,
      lastCleared: new Date()
    };
  }

  get(id: string): CompiledTemplate | null {
    const entry = this.cache.get(id);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(id);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();
    return entry.template;
  }

  set(id: string, template: CompiledTemplate): void {
    // Evict oldest if at max size
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(id, {
      template,
      timestamp: Date.now()
    });

    this.stats.size = this.cache.size;
  }

  has(id: string): boolean {
    return this.cache.has(id);
  }

  clear(id?: string): void {
    if (id) {
      this.cache.delete(id);
    } else {
      this.cache.clear();
      this.stats.lastCleared = new Date();
    }
    this.stats.size = this.cache.size;
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }
}