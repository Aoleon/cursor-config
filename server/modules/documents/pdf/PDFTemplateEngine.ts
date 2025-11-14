/**
 * PDF Template Engine
 * Main orchestrator for the PDF template processing pipeline
 */

import { ImageIntegrator } from './ImageIntegrator';
import { logger } from '../../../utils/logger';
import type {
  PDFTemplateEngineConfig,
  RenderOptions,
  RenderResult,
  PDFTemplate,
  RenderContext,
} from './types';

const PLACEHOLDER_REGEX = /\{\{\s*([\w.]+)\s*\}\}/g;

function resolvePath(context: RenderContext, path: string): unknown {
  const source = context.data ?? {};
  return path.split('.').reduce<unknown>((value, segment) => {
    if (value && typeof value === 'object' && segment in (value as Record<string, unknown>)) {
      return (value as Record<string, unknown>)[segment];
    }
    return undefined;
  }, source);
}

function replacePlaceholders(template: string, context: RenderContext): { html: string; resolved: number } {
  let resolved = 0;
  const html = template.replace(PLACEHOLDER_REGEX, (match, path) => {
    const value = resolvePath(context, path);
    if (value === undefined || value === null) {
      return '';
    }
    resolved += 1;
    return String(value);
  });
  return { html, resolved };
}

function ensureTemplateContent(template: PDFTemplate | string): string {
  return typeof template === 'string' ? template : template.content ?? '';
}

export class PDFTemplateEngine {
  private static instance: PDFTemplateEngine | null = null;

  private readonly config: PDFTemplateEngineConfig;
  private readonly imageIntegrator = new ImageIntegrator();

  private constructor(config?: PDFTemplateEngineConfig) {
    this.config = config ?? {};
  }

  static getInstance(config?: PDFTemplateEngineConfig): PDFTemplateEngine {
    if (!PDFTemplateEngine.instance) {
      PDFTemplateEngine.instance = new PDFTemplateEngine(config);
    }
    return PDFTemplateEngine.instance;
  }

  async render(options: RenderOptions): Promise<RenderResult> {
    const startedAt = performance.now();
    const templateContent = ensureTemplateContent(options.template);
    const context = options.context ?? { data: {} };

    const { html: interpolatedHtml, resolved } = replacePlaceholders(templateContent, context);

    const references = this.imageIntegrator.extractImageReferences(interpolatedHtml);
    const processedImages = await this.imageIntegrator.processImages(references);
    const htmlWithImages = this.imageIntegrator.injectImages(interpolatedHtml, processedImages);

    const metadata = {
      renderTime: performance.now() - startedAt,
      placeholdersResolved: resolved,
      placeholdersMissing: [],
      imagesLoaded: Object.values(processedImages).filter((img) => img.url || img.base64).length,
      imagesFailed: Object.entries(processedImages)
        .filter(([, img]) => !img.url && !img.base64)
        .map(([key]) => key),
    };

    logger.info('PDFTemplateEngine: rendu terminé', {
      metadata: {
        renderTime: metadata.renderTime,
        placeholders: metadata.placeholdersResolved,
        images: metadata.imagesLoaded,
      },
    });

    return {
      success: true,
      html: htmlWithImages,
      metadata,
      warnings: [],
      errors: [],
    } satisfies RenderResult;
  }

  clearCaches(): void {
    this.imageIntegrator.clearCache();
  }
}