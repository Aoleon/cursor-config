/**
 * Placeholder Resolver
 * Handles extraction, validation, and resolution of template placeholders
 */

import { Logger } from '../../../utils/logger';
import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import { parseAmountSafely, formatMontantEuros, parseDateSafely, formatDateFR } from '../../../utils/shared-utils';
import _ from 'lodash';
import type {
  Placeholder,
  PlaceholderFormatter,
  PlaceholderPosition,
  ConditionalBlock,
  LoopBlock,
  PlaceholderError
} from './types';

const logger = new Logger('PlaceholderResolver');

export class PlaceholderResolver {
  private readonly placeholderRegex = /\[([^\[\]]+)\]/g;
  private readonly conditionalRegex = /\[if:([^\]]+)\]([\s\S]*?)(?:\[else\]([\s\S]*?))?\[\/if\]/g;
  private readonly loopRegex = /\[foreach:([^\]]+)\]([\s\S]*?)\[\/foreach\]/g;
  private readonly formatterRegex = /^([^:]+)(?::(.+))?$/;

  /**
   * Extract all placeholders from template
   */
  public extractPlaceholders(template: string): Placeholder[] {
    const placeholders: Placeholder[] = [];
    const seen = new Set<string>();

    let match;
    while ((match = this.placeholderRegex.exec(template)) !== null) {
      const raw = match[0];
      const content = match[1];

      // Skip control structures
      if (this.isControlStructure(content)) {
        continue;
      }

      // Skip if already processed
      if (seen.has(raw)) {
        continue;
      }
      seen.add(raw);

      // Parse placeholder
      const placeholder = this.parsePlaceholder(content, match.index, raw.length);
      placeholders.push(placeholder);
    }

    logger.debug('Extracted placeholders', { count: placeholders.length });
    return placeholders;
  }

  /**
   * Extract conditional blocks
   */
  public extractConditionals(template: string): ConditionalBlock[] {
    const conditionals: ConditionalBlock[] = [];
    
    let match;
    while ((match = this.conditionalRegex.exec(template)) !== null) {
      conditionals.push({
        type: 'if',
        condition: match[1],
        content: match[2],
        elseBranch: match[3],
        position: {
          line: this.getLineNumber(template, match.index),
          column: this.getColumnNumber(template, match.index),
          index: match.index,
          length: match[0].length
        });
    }

    logger.debug('Extracted conditionals', { count: conditionals.length });
    return conditionals;
  }

  /**
   * Extract loop blocks
   */
  public extractLoops(template: string): LoopBlock[] {
    const loops: LoopBlock[] = [];
    
    let match;
    while ((match = this.loopRegex.exec(template)) !== null) {
      const [variable, collection] = this.parseLoopExpression(match[1]);
      
      loops.push({
        type: 'foreach',
        variable,
        collection,
        content: match[2],
        position: {
          line: this.getLineNumber(template, match.index),
          column: this.getColumnNumber(template, match.index),
          index: match.index,
          length: match[0].length
        });
    }

    logger.debug('Extracted loops', { count: loops.length });
    return loops;
  }

  /**
   * Resolve placeholders with data
   */
  public async resolve(
    placeholders: Placeholder[],
    data: Record<string, unknown>,
    customFormatters?: Record<string, PlaceholderFormatter>
  ): Promise<{
    resolved: { placeholder: Placeholder; value: unknown}[];
    missing: Placeholder[];
    data: Record<st, unknown>unknown>;
  }> {
    const resolved: { placeholder: Placeholder; va: unknown}y }[] = [];
    const missing: Placeholder[] = [];
    const resolvedData: Recor, unknown>unknown>unknown> = {};

    for (const placeholder of placeholders) {
      await withErrorHandling(
    async () => {

        const value = await this.resolvePlaceholder(placeholder, data, customFormatters);
        
        if (value !== undefined) {
          resolved.push({ placeholder, value });
          _.set(resolvedData, placeholder.path, value);
        } else if (placeholder.isRequired) {
          missing.push(placeholder);
          logger.warn('Required placeholder missing', { 
            path: placeholder.path,
            raw: placeholder.raw 
          });
        } else {
          // Use default value if available
          const defaultValue = placeholder.defaultValue ?? '';
          resolved.push({ placeholder, value: defaultValue });
          _.set(resolvedData, placeholder.path, defaultValue);
        }
      
    },
    {
      operation: 'Logger',
      service: 'PlaceholderResolver',
      metadata: {}
    });
      }

    logger.info('Placeholders resolved', {
      resolved: resolved.length,
      missing: missing.length
    });

    return { resolved, missing, data: resolvedData };
  }

  /**
   * Parse a single placeholder
   */
  private parsePlaceholder(content: string, index: number, length: number): Placeholder {
    const formatterMatch = this.formatterRegex.exec(content);
    
    if (!formatterMatch) {
      throw new AppError(`Invalid placeholder format: ${content}`, 500);
    }

    const path = formatterMatch[1];
    const formatterSpec = formatterMatch[2];
    const segments = path.split('.');

    const placeholder: Placeholder = {
      raw: `[${content}]`,
      path,
      segments,
      position: {
        line: 0, // Will be calculated if needed
        column: 0,
        index,
        length
      }
    };

    // Parse formatter if present
    if (formatterSpec) {
      placeholder.formatter = this.parseFormatter(formatterSpec);
    }

    // Check for default value (path?defaultValue)
    const defaultMatch = path.match(/^(.+)\?(.+)$/);
    if (defaultMatch) {
      placeholder.path = defaultMatch[1];
      placeholder.segments = placeholder.path.split('.');
      placeholder.defaultValue = defaultMatch[2];
    }

    // Check if required (path!)
    if (path.endsWith('!')) {
      placeholder.path = path.slice(0, -1);
      placeholder.segments = placeholder.path.split('.');
      placeholder.isRequired = true;
    }

    return placeholder;
  }

  /**
   * Parse formatter specification
   */
  private parseFormatter(spec: string): PlaceholderFormatter {
    const parts = spec.split(':');
    const type = parts[0] as PlaceholderFormatter['type'];

    const formatter: PlaceholderFormatter = { type };

    switch (type) {
      case 'currency':
        formatter.locale = parts[1] || 'fr-FR';
        formatter.format = parts[2] || 'EUR';
        break;
      
      case 'date':
        formatter.format = parts[1] || 'dd/mm/yyyy';
        formatter.locale = parts[2] || 'fr-FR';
        break;
      
      case 'number':
        formatter.precision = parts[1] ? parseInt(parts[1]) : 2;
        formatter.locale = parts[2] || 'fr-FR';
        break;
      
      case 'uppercase':
      case 'lowercase':
      case 'capitalize':
        // No additional config needed
        break;
      
      case 'custom':
        formatter.format = parts[1];
        break;
      
      default:
        logger.warn('Unknown formatter type', { type, spec });
    }

    return formatter;
  }

  /**
   * Resolve a single placeholder
   */
  private async resolvePlaceholder(
    placeholder: Placeholder,
    data: R, unknown>unknown>unknown any>,
    customFormatters?: Record<string, PlaceholderFormatter>
  ): Promise<unknown> {
    // Get raw value from data
    let value = _.get(data, placeholder.path);

    // Apply formatter if present
    if (placeholder.formatter) {
      const formatter = customFormatters?.[placeholder.formatter.type] || placeholder.formatter;
      value = await this.applyFormatter(value, formatter);
    }

    return value;
  }

  /**
   * Apply formatter to value
   */
  private async applyFormatter(value: unknown, formatter: PlaceholderFormatter): Promise<string> {
    if (value === null || value === undefined) {
      return '';
    }

    switch (formatter.type) {
      case 'currency':
        const amount = parseAmountSafely(value);
        if (formatter.format === 'EUR') {
          return formatMontantEuros(amount);
        }
        return new Intl.NumberFormat(formatter.locale || 'fr-FR', {
          style: 'currency',
          currency: formatter.format || 'EUR'
        }).format(amount.toNumber());

      case 'date':
        const date = parseDateSafely(value);
        if (date) {
          if (formatter.format === 'dd/mm/yyyy') {
            return formatDateFR(date);
          }
          return date.toLocaleDateString(formatter.locale || 'fr-FR');
        }
        return '';

      case 'number':
        const num = typeof value === 'number' ? value : parseFloat(value);
        return new Intl.NumberFormat(formatter.locale || 'fr-FR', {
          minimumFractionDigits: formatter.precision || 2,
          maximumFractionDigits: formatter.precision || 2
        }).format(num);

      case 'uppercase':
        return String(value).toUpperCase();

      case 'lowercase':
        return String(value).toLowerCase();

      case 'capitalize':
        return String(value).replace(/\b\w/g, c => c.toUpperCase());

      case 'custom':
        if (formatter.customFunction) {
          return formatter.customFunction(value);
        }
        return String(value);

      default:
        return String(value);
    }

  /**
   * Check if content is a control structure
   */
  private isControlStructure(content: string): boolean {
    return content.startsWith('if:') ||
           content === '/if' ||
           content === 'else' ||
           content.startsWith('foreach:') ||
           content === '/foreach' ||
           content.startsWith('image ');
  }

  /**
   * Parse loop expression (e.g., "item in items")
   */
  private parseLoopExpression(expression: string): [string, string] {
    const parts = expression.split(/\s+in\s+/);
    if (parts.length === 2) {
      return [parts[0].trim(), parts[1].trim()];
    }
    // Fallback: assume expression is the collection name
    return ['item', expression.trim()];
  }

  /**
   * Get line number for position
   */
  private getLineNumber(text: string, index: number): number {
    return text.substring(0, index).split('\n').length;
  }

  /**
   * Get column number for position
   */
  private getColumnNumber(text: string, index: number): number {
    const lastNewline = text.lastIndexOf('\n', index - 1);
    return index - lastNewline;
  }

  /**
   * Validate placeholder paths against required fields
   */
  public validateRequired(
    placeholders: Placeholder[],
    requiredFields: string[]
  ): { valid: boolean; missing: string[] } {
    const foundPaths = new Set(placeholders.map(p => p.path));
    const missing = requiredFields.filter(field => !foundPaths.has(field));

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Generate placeholder documentation
   */
  public generateDocumentation(placeholders: Placeholder[]): string {
    const grouped = new Map<string, Placeholder[]>();

    // Group by category (first segment)
    for (const placeholder of placeholders) {
      const category = placeholder.segments[0] || 'other';
      const group = grouped.get(category) || [];
      group.push(placeholder);
      grouped.set(category, group);
    }

    let doc = '# Template Placeholders\n\n';

    for (const [category, items] of grouped) {
      doc += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
      
      for (const item of items) {
        doc += `- \`${item.raw}\``;
        if (item.formatter) {
          doc += ` (${item.formatter.type})`;
        }
        if (item.isRequired) {
          doc += ' **[Required]**';
        }
        if (item.defaultValue !== undefined) {
          doc += ` (Default: ${item.defaultValue})`;
        }
        doc += '\n';
      }
      doc += '\n';
    }

    return doc;
  }