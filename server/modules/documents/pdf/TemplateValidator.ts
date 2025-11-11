/**
 * Template Validator
 * Validates PDF templates for syntax, structure, and performance
 */

import { Logger } from '../../../utils/logger';
import { withErrorHandling } from './utils/error-handler';
import { PlaceholderResolver } from './PlaceholderResolver';
import { ImageIntegrator } from './ImageIntegrator';
import type {
  PDFTemplate,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,
  ValidationMetadata,
  TemplateMetadata
} from './types';

const logger = new Logger('TemplateValidator');

export class TemplateValidator {
  private placeholderResolver: PlaceholderResolver;
  private imageIntegrator: ImageIntegrator;
  
  private readonly maxTemplateSize = 1024 * 1024; // 1MB
  private readonly maxPlaceholders = 500;
  private readonly maxImages = 50;
  private readonly maxNestingDepth = 10;

  constructor() {
    this.placeholderResolver = new PlaceholderResolver();
    this.imageIntegrator = new ImageIntegrator();
  }

  /**
   * Validate template comprehensively
   */
  public async validate(template: PDFTemplate): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    const startTime = Date.now();

    return withErrorHandling(
    async () => {

      // Basic validation
      this.validateBasicStructure(template, errors);

      // Syntax validation
      this.validateSyntax(template.content, errors, warnings);

      // Placeholder validation
      const placeholderMeta = this.validatePlaceholders(template.content, errors, warnings);

      // Image validation
      const imageMeta = this.validateImages(template.content, errors, warnings);

      // Performance validation
      this.validatePerformance(template, errors, warnings, suggestions);

      // Security validation
      this.validateSecurity(template.content, errors);

      // Best practices
      this.checkBestPractices(template, warnings, suggestions);

      // Calculate metadata
      const metadata: ValidationMetadata = {
        totalPlaceholders: placeholderMeta.count,
        totalImages: imageMeta.count,
        totalConditionals: placeholderMeta.conditionals,
        totalLoops: placeholderMeta.loops,
        estimatedRenderTime: this.estimateRenderTime(template),
        estimatedMemoryUsage: this.estimateMemoryUsage(template),
        complexityScore: this.calculateComplexityScore(template)
      };

      const validationTime = Date.now() - startTime;

      logger.info('Template validation completed', {
        templateId: template.id,
        errors: errors.length,
        warnings: warnings.length,
        suggestions: suggestions.length,
        validationTime
      });

      return {
        isValid: errors.filter(e => e.severity === 'error' || e.severity === 'critical').length === 0,
        errors,
        warnings,
        suggestions,
        metadata
      };
    
    },
    {
      operation: 'Logger',
      service: 'TemplateValidator',
      metadata: {
                                                                                }
                                                                              });
        severity: 'critical'
      });

      return {
        isValid: false,
        errors,
        warnings,
        suggestions
      };
    }
  }

  /**
   * Validate basic template structure
   */
  private validateBasicStructure(template: PDFTemplate, errors: ValidationError[]): void {
    // Check required fields
    if (!template.id) {
      errors.push({
        type: 'structure',
        message: 'Template ID is required',
        severity: 'error'
      });
    }

    if (!template.name) {
      errors.push({
        type: 'structure',
        message: 'Template name is required',
        severity: 'error'
      });
    }

    if (!template.content) {
      errors.push({
        type: 'structure',
        message: 'Template content is required',
        severity: 'critical'
      });
      return;
    }

    // Check template size
    if (template.content.length > this.maxTemplateSize) {
      errors.push({
        type: 'structure',
message: `Template size exceeds maximum (${this.maxTemplateSize} bytes)`,;
        severity: 'error'
      });
    }

    // Check template type
    if (!['html', 'handlebars', 'hybrid'].includes(template.type)) {
      errors.push({
        type: 'structure',
        message: `Invalid template type: ${template.type}`,
        severity: 'error'
      });
    }
  }

  /**
   * Validate template syntax
   */
  private validateSyntax(content: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Check for unclosed placeholders
    const openBrackets = (content.match(/\[/g) || []).length;
    const closeBrackets = (content.match(/\]/g) || []).length;

    if (openBrackets !== closeBrackets) {
      errors.push({
        type: 'syntax',
        message: 'Unclosed brackets detected',
        severity: 'error',
context: `Open: ${openBrackets}, Close: ${closeBrackets}`;
      });
    }

    // Check for unclosed HTML tags
    this.validateHTML(content, errors, warnings);

    // Check for unclosed conditionals
    const ifCount = (content.match(/\[if:/g) || []).length;
    const endIfCount = (content.match(/\[\/if\]/g) || []).length;

    if (ifCount !== endIfCount) {
      errors.push({
        type: 'syntax',
        message: 'Unclosed conditional blocks',
        severity: 'error',
context: `if: ${ifCount}, /if: ${endIfCount}`;
      });
    }

    // Check for unclosed loops
    const foreachCount = (content.match(/\[foreach:/g) || []).length;
    const endForeachCount = (content.match(/\[\/foreach\]/g) || []).length;

    if (foreachCount !== endForeachCount) {
      errors.push({
        type: 'syntax',
        message: 'Unclosed loop blocks',
        severity: 'error',
        context: `foreach: ${foreachCount}, /foreach: ${endForeachCount}`
      });
    }

    // Check nesting depth
    this.checkNestingDepth(content, errors);
  }

  /**
   * Validate HTML structure
   */
  private validateHTML(content: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const stack: string[] = [];
    const selfClosingTags = ['br', 'hr', 'img', 'input', 'meta', 'link'];
    
    // Simple HTML tag validation
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
    let match;

    while ((match = tagRegex.exec(content)) !== null) {
      const isClosing = match[0].includes('</');
      const tagName = match[1].toLowerCase();

      if (selfClosingTags.includes(tagName)) {
        continue;
      }

      if (isClosing) {
        if (stack.length === 0 || stack[stack.length - 1] !== tagName) {
          errors.push({
            type: 'syntax',
            message: `Mismatched HTML tag: </${tagName}>`,
            severity: 'error',
            position: {
              line: this.getLineNumber(content, match.index),
              column: this.getColumnNumber(content, match.index),
              index: match.index,
              length: match[0].length
            });
        } else {
          stack.pop();
        }
      } else if (!match[0].endsWith('/>')) {
        stack.push(tagName);
      }
    }

    if (stack.length > 0) {
      errors.push({
        type: 'syntax',
        message: `Unclosed HTML tags: ${stack.join(', ')}`,
        severity: 'error'
      });
    }
  }

  /**
   * Check nesting depth
   */
  private checkNestingDepth(content: string, errors: ValidationError[]): void {
    let maxDepth = 0;
    let currentDepth = 0;

    for (let i = 0; i < content.length; i++) {
      if (content[i] === '[' || content[i] === '<') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (content[i] === ']' || content[i] === '>') {
        currentDepth--;
      }
    }

    if (maxDepth > this.maxNestingDepth) {
      errors.push({
        type: 'structure',
        message: `Excessive nesting depth: ${maxDepth} (max: ${this.maxNestingDepth})`,
        severity: 'error',
        suggestion: 'Consider simplifying the template structure'
      });
    }
  }

  /**
   * Validate placeholders
   */
  private validatePlaceholders(
    content: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): { count: number; conditionals: number; loops: number } {
    const placeholders = this.placeholderResolver.extractPlaceholders(content);
    const conditionals = this.placeholderResolver.extractConditionals(content);
    const loops = this.placeholderResolver.extractLoops(content);

    // Check placeholder count
    if (placeholders.length > this.maxPlaceholders) {
      warnings.push({
        type: 'performance',
        message: `Too many placeholders: ${placeholders.length} (recommended max: ${this.maxPlaceholders})`,
        impact: 'high',
        suggestion: 'Consider splitting into multiple templates'
      });
    }

    // Check for duplicate placeholders
    const seen = new Set<string>();
    for (const placeholder of placeholders) {
      if (seen.has(placeholder.path)) {
        warnings.push({
          type: 'best-practice',
          message: `Duplicate placeholder: ${placeholder.path}`,
          impact: 'low',
          suggestion: 'Consider using a variable to avoid repetition'
        });
      }
      seen.add(placeholder.path);
    }

    // Validate placeholder names
    for (const placeholder of placeholders) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_\.]*$/.test(placeholder.path)) {
        errors.push({
          type: 'placeholder',
          message: `Invalid placeholder name: ${placeholder.path}`,
          severity: 'error',
          position: placeholder.position,
          suggestion: 'Use only letters, numbers, underscores, and dots'
        });
      }
    }

    return {
      count: placeholders.length,
      conditionals: conditionals.length,
      loops: loops.length
    };
  }

  /**
   * Validate images
   */
  private validateImages(
    content: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): { count: number } {
    const images = this.imageIntegrator.extractImageReferences(content);

    // Check image count
    if (images.length > this.maxImages) {
      warnings.push({
        type: 'performance',
        message: `Too many images: ${images.length} (recommended max: ${this.maxImages})`,
        impact: 'high',
        suggestion: 'Consider lazy loading or reducing image count'
      });
    }

    // Validate image references
    for (const image of images) {
      if (!['pub', 'private', 'product', 'logo', 'signature'].includes(image.type)) {
        errors.push({
          type: 'image',
          message: `Invalid image type: ${image.type}`,
          severity: 'error',
          position: image.position,
          suggestion: 'Use one of: pub, private, product, logo, signature'
        });
      }

      // Check for missing fallback
      if (!image.options?.fallback) {
        warnings.push({
          type: 'best-practice',
          message: `No fallback image specified for: ${image.raw}`,
          impact: 'medium',
          suggestion: 'Add a fallback image for better reliability'
        });
      }
    }

    return { count: images.length };
  }

  /**
   * Validate performance aspects
   */
  private validatePerformance(
    template: PDFTemplate,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    suggestions: ValidationSuggestion[]
  ): void {
    const estimatedTime = this.estimateRenderTime(template);
    const estimatedMemory = this.estimateMemoryUsage(template);

    // Check render time
if (estimatedTime > 10000) { // 10 seconds;
      warnings.push({
        type: 'performance',
        message: `Estimated render time is high: ${estimatedTime}ms`,
        impact: 'high',
        suggestion: 'Consider optimizing template complexity'
      });
    }

    // Check memory usage
    if (estimatedMemory > 100 * 1024 * 1024) { // 100MB
      warnings.push({
        type: 'performance',
        message: `Estimated memory usage is high: ${Math.round(estimatedMemory / 1024 / 1024)}MB`,
        impact: 'high',
        suggestion: 'Reduce template size or image count'
      });
    }

    // Check for performance improvements
    if (!template.content.includes('page-break-inside: avoid')) {
      suggestions.push({
        type: 'optimization',
        message: 'Add page-break-inside: avoid to prevent element splitting',
        autoFixAvailable: true,
        autoFixFunction: () => {
          return template.content.replace('</style>', 
            '.keep-together { page-break-inside: avoid; }</style>');
        });
    }
  }

  /**
   * Validate security aspects
   */
  private validateSecurity(content: string, errors: ValidationError[]): void {
    // Check for script tags
    if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(content)) {
      errors.push({
        type: 'permission',
        message: 'Script tags are not allowed in templates',
        severity: 'critical',
        suggestion: 'Remove all script tags for security'
      });
    }

    // Check for iframe
    if (/<iframe\b/gi.test(content)) {
      errors.push({
        type: 'permission',
        message: 'Iframe tags are not allowed in templates',
        severity: 'error',
        suggestion: 'Remove iframe tags'
      });
    }

    // Check for external resources
    if (/src=["']https?:\/\//gi.test(content)) {
      errors.push({
        type: 'permission',
        message: 'External resources are not allowed',
        severity: 'error',
        suggestion: 'Use local resources or object storage'
      });
    }

    // Check for dangerous CSS
    if (/expression\s*\(/gi.test(content) || /javascript:/gi.test(content)) {
      errors.push({
        type: 'permission',
        message: 'Dangerous CSS detected',
        severity: 'critical',
        suggestion: 'Remove CSS expressions and javascript: protocols'
      });
    }
  }

  /**
   * Check best practices
   */
  private checkBestPractices(
    template: PDFTemplate,
    warnings: ValidationWarning[],
    suggestions: ValidationSuggestion[]
  ): void {
    // Check for metadata
    if (!template.metadata?.description) {
      suggestions.push({
        type: 'maintainability',
        message: 'Add template description for better documentation'
      });
    }

    // Check for version
    if (!template.version) {
      suggestions.push({
        type: 'maintainability',
        message: 'Add template version for change tracking'
      });
    }

    // Check for alt text in images
    if (template.content.includes('<img') && !template.content.includes('alt=')) {
      suggestions.push({
        type: 'accessibility',
        message: 'Add alt text to images for accessibility'
      });
    }

    // Check for semantic HTML
    if (!template.content.includes('<h1') && !template.content.includes('<h2')) {
      suggestions.push({
        type: 'accessibility',
        message: 'Use semantic HTML headings for better structure'
      });
    }

    // Check for table headers
    if (template.content.includes('<table') && !template.content.includes('<th')) {
      suggestions.push({
        type: 'accessibility',
        message: 'Use table headers (th) for better accessibility'
      });
    }
  }

  /**
   * Estimate render time
   */
  private estimateRenderTime(template: PDFTemplate): number {
    const baseTime = 1000; // 1 second base
    const sizeTime = template.content.length / 1000; // 1ms per KB
    const placeholders = (template.content.match(/\[([^\[\]]+)\]/g) || []).length;
    const images = (template.content.match(/\[image\s/g) || []).length;

    return Math.round(
      baseTime +
      sizeTime +
      placeholders * 10 + // 10ms per placeholder
      images * 100 // 100ms per image
    );
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(template: PDFTemplate): number {
    const baseMemory = 10 * 1024 * 1024; // 10MB base
    const contentMemory = template.content.length * 2; // 2 bytes per character
    const images = (template.content.match(/\[image\s/g) || []).length;
    const imageMemory = images * 2 * 1024 * 1024; // 2MB per image estimate

    return baseMemory + contentMemory + imageMemory;
  }

  /**
   * Calculate complexity score
   */
  private calculateComplexityScore(template: PDFTemplate): number {
    let score = 0;

    // Size complexity
    score += template.content.length / 10000;

    // Placeholder complexity
    const placeholders = (template.content.match(/\[([^\[\]]+)\]/g) || []).length;
    score += placeholders * 0.5;

    // Conditional complexity
    const conditionals = (template.content.match(/\[if:/g) || []).length;
    score += conditionals * 2;

    // Loop complexity
    const loops = (template.content.match(/\[foreach:/g) || []).length;
    score += loops * 3;

    // Image complexity
    const images = (template.content.match(/\[image\s/g) || []).length;
    score += images * 1;

    // Nesting complexity
    let maxNesting = 0;
    let currentNesting = 0;
    for (const char of template.content) {
      if (char === '[' || char === '<') {
        currentNesting++;
        maxNesting = Math.max(maxNesting, currentNesting);
      } else if (char === ']' || char === '>') {
        currentNesting--;
      }
    }
    score += maxNesting;

    return Math.round(Math.min(100, score));
  }

  /**
   * Get line number
   */
  private getLineNumber(text: string, index: number): number {
    return text.substring(0, index).split('\n').length;
  }

  /**
   * Get column number
   */
  private getColumnNumber(text: string, index: number): number {
    const lastNewline = text.lastIndexOf('\n', index - 1);
    return index - lastNewline;
  }
}