/**
 * Layout Optimizer
 * Optimizes PDF layout to prevent overlaps and improve readability
 */

import { Logger } from '../../../utils/logger';
import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import type {
  LayoutOptions,
  LayoutMargins,
  GridOptions,
  SpacingOptions,
  BreakpointOptions,
  OptimizationOptions,
  LayoutError
} from './types';

const logger = new Logger('LayoutOptimizer');

export class LayoutOptimizer {
  private readonly defaultOptions: LayoutOptions = {
    pageSize: 'A4',
    orientation: 'portrait',
    margins: {
      top: '2cm',
      right: '1.5cm',
      bottom: '2cm',
      left: '1.5cm'
    },
    grid: {
      enabled: false,
      columns: 12,
      gap: '1rem',
      alignItems: 'start',
      justifyContent: 'start'
    },
    spacing: {
      lineHeight: 1.5,
      paragraphSpacing: '1em',
      sectionSpacing: '2em',
      itemSpacing: '0.5em'
    },
    breakpoints: {
      avoidBreakInside: ['.keep-together', '.table', '.figure'],
      forceBreakBefore: ['.new-page'],
      forceBreakAfter: ['.page-break'],
      orphanControl: true,
      widowControl: true
    },
    optimization: {
      removeEmptyElements: true,
      collapseWhitespace: true,
      inlineStyles: true,
      optimizeImages: true,
      minifyCSS: true,
      prefetchFonts: false
    }
  };

  /**
   * Optimize HTML layout for PDF generation
   */
  public async optimize(html: string, options?: LayoutOptions): Promise<string> {
    const startTime = Date.now();
    const mergedOptions = this.mergeOptions(options);

    return withErrorHandling(
    async () => {

      let optimized = html;

      // Apply optimizations in sequence
      if (mergedOptions.optimization?.removeEmptyElements) {
        optimized = this.removeEmptyElements(optimized);
      }

      if (mergedOptions.optimization?.collapseWhitespace) {
        optimized = this.collapseWhitespace(optimized);
      }

      // Inject CSS for layout control
      optimized = this.injectLayoutCSS(optimized, mergedOptions);

      // Apply grid system if enabled
      if (mergedOptions.grid?.enabled) {
        optimized = this.applyGridSystem(optimized, mergedOptions.grid);
      }

      // Apply spacing rules
      optimized = this.applySpacing(optimized, mergedOptions.spacing!);

      // Apply breakpoint control
      optimized = this.applyBreakpoints(optimized, mergedOptions.breakpoints!);

      // Optimize tables for PDF
      optimized = this.optimizeTables(optimized);

      // Fix common layout issues
      optimized = this.fixLayoutIssues(optimized);

      const duration = Date.now() - startTime;
      logger.info('Layout optimization completed', { duration });

      return optimized;
    
    },
    {
      operation: 'Logger',
      service: 'LayoutOptimizer',
      metadata: {}
    });
    }

  /**
   * Merge options with defaults
   */
  private mergeOptions(options?: LayoutOptions): LayoutOptions {
    if (!options) {
      return this.defaultOptions;
    }

    return {
      ...this.defaultOptions,
      ...options,
      margins: {
        ...this.defaultOptions.margins,
        ...options.margins
      },
      grid: {
        ...this.defaultOptions.grid,
        ...options.grid
      },
      spacing: {
        ...this.defaultOptions.spacing,
        ...options.spacing
      },
      breakpoints: {
        ...this.defaultOptions.breakpoints,
        ...options.breakpoints
      },
      optimization: {
        ...this.defaultOptions.optimization,
        ...options.optimization
      }
    };
  }

  /**
   * Remove empty elements
   */
  private removeEmptyElements(html: string): string {
    // Remove empty paragraphs, divs, spans
    html = html.replace(/<p[^>]*>\s*<\/p>/gi, '');
    html = html.replace(/<div[^>]*>\s*<\/div>/gi, '');
    html = html.replace(/<span[^>]*>\s*<\/span>/gi, '');

    // Remove multiple consecutive line breaks
    html = html.replace(/(<br\s*\/?>){3,}/gi, '<br><br>');

    return html;
  }

  /**
   * Collapse excessive whitespace
   */
  private collapseWhitespace(html: string): string {
    // Collapse multiple spaces
    html = html.replace(/\s+/g, ' ');

    // Remove whitespace between tags
    html = html.replace(/>\s+</g, '><');

    // Preserve whitespace in pre tags
    html = html.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (match) => {
      return match.replace(/ /g, '&nbsp;');
    });

    return html;
  }

  /**
   * Inject layout CSS
   */
  private injectLayoutCSS(html: string, options: LayoutOptions): string {
    const css = this.generateLayoutCSS(options);

    // Check if head exists
    if (html.includes('</head>')) {
      html = html.replace('</head>', `<style>${css}</style></head>`);
    } else if (html.includes('<body')) {
      html = html.replace('<body', `<style>${css}</style><body`);
    } else {
      html = `<style>${css}</style>${html}`;
    }

    return html;
  }

  /**
   * Generate layout CSS
   */
  private generateLayoutCSS(options: LayoutOptions): string {
    const margins = options.margins!;
    const spacing = options.spacing!;

    return `
      @page {
        size: ${options.pageSize} ${options.orientation};
        margin: ${margins.top} ${margins.right} ${margins.bottom} ${margins.left};
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: ${spacing.lineHeight};
        color: #333;
        background: white;
      }

      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid;
        page-break-inside: avoid;
        margin-top: ${spacing.sectionSpacing};
        margin-bottom: ${spacing.paragraphSpacing};
        line-height: 1.2;
      }

      h1 { font-size: 2em; }
      h2 { font-size: 1.5em; }
      h3 { font-size: 1.3em; }
      h4 { font-size: 1.1em; }
      h5 { font-size: 1em; }
      h6 { font-size: 0.9em; }

      p {
        margin-bottom: ${spacing.paragraphSpacing};
        orphans: 3;
        widows: 3;
      }

      ul, ol {
        margin-bottom: ${spacing.paragraphSpacing};
        padding-left: 2em;
      }

      li {
        margin-bottom: ${spacing.itemSpacing};
      }

      table {
        width: 100%;
        border-collapse: collapse;
        page-break-inside: auto;
        margin-bottom: ${spacing.sectionSpacing};
      }

      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }

      th {
        background-color: #f5f5f5;
        font-weight: bold;
        text-align: left;
        padding: 8px;
        border: 1px solid #ddd;
      }

      td {
        padding: 8px;
        border: 1px solid #ddd;
      }

      img {
        max-width: 100%;
        height: auto;
        page-break-inside: avoid;
      }

      .keep-together {
        page-break-inside: avoid;
      }

      .new-page {
        page-break-before: always;
      }

      .page-break {
        page-break-after: always;
      }

      .avoid-break {
        page-break-inside: avoid;
      }

      .column-layout {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .column {
        flex: 1;
        min-width: 0;
      }

      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .text-justify { text-align: justify; }

      .mt-1 { margin-top: 0.5rem; }
      .mt-2 { margin-top: 1rem; }
      .mt-3 { margin-top: 1.5rem; }
      .mt-4 { margin-top: 2rem; }

      .mb-1 { margin-bottom: 0.5rem; }
      .mb-2 { margin-bottom: 1rem; }
      .mb-3 { margin-bottom: 1.5rem; }
      .mb-4 { margin-bottom: 2rem; }

      .p-1 { padding: 0.5rem; }
      .p-2 { padding: 1rem; }
      .p-3 { padding: 1.5rem; }
      .p-4 { padding: 2rem; }

      .border { border: 1px solid #ddd; }
      .border-top { border-top: 1px solid #ddd; }
      .border-bottom { border-bottom: 1px solid #ddd; }

      .bg-light { background-color: #f8f9fa; }
      .bg-dark { background-color: #343a40; color: white; }
      .bg-primary { background-color: #007bff; color: white; }
      .bg-success { background-color: #28a745; color: white; }
      .bg-warning { background-color: #ffc107; }
      .bg-danger { background-color: #dc3545; color: white; }
    `;
  }

  /**
   * Apply grid system
   */
  private applyGridSystem(html: string, grid: GridOptions): string {
    const gridCSS = `
      .grid {
        display: grid;
        grid-template-columns: repeat(${grid.columns}, 1fr);
        gap: ${grid.gap};
        align-items: ${grid.alignItems};
        justify-content: ${grid.justifyContent};
      }

      .grid-item {
        min-width: 0;
      }

      @media print {
        .grid {
          display: block;
        }
        .grid-item {
          page-break-inside: avoid;
          margin-bottom: ${grid.gap};
        }
    `;

    // Inject grid CSS
    if (html.includes('</style>')) {
      html = html.replace('</style>', `${gridCSS}</style>`);
    } else {
      html = html.replace('</head>', `<style>${gridCSS}</style></head>`);
    }

    // Wrap grid containers
    html = html.replace(/<div class="row">/gi, '<div class="grid">');
    html = html.replace(/<div class="col[^"]*">/gi, '<div class="grid-item">');

    return html;
  }

  /**
   * Apply spacing rules
   */
  private applySpacing(html: string, spacing: SpacingOptions): string {
    // Apply to specific elements
    const spacingRules = `
      p + p { margin-top: ${spacing.paragraphSpacing}; }
      h1 + *, h2 + *, h3 + * { margin-top: ${spacing.paragraphSpacing}; }
      section + section { margin-top: ${spacing.sectionSpacing}; }
      .spaced > * + * { margin-top: ${spacing.itemSpacing}; }
    `;

    if (html.includes('</style>')) {
      html = html.replace('</style>', `${spacingRules}</style>`);
    }

    return html;
  }

  /**
   * Apply breakpoint control
   */
  private applyBreakpoints(html: string, breakpoints: BreakpointOptions): string {
    let css = '';

    // Avoid break inside
    if (breakpoints.avoidBreakInside?.length) {
      css += `${breakpoints.avoidBreakInside.join(', ')} { page-break-inside: avoid; }\n`;
    }

    // Force break before
    if (breakpoints.forceBreakBefore?.length) {
      css += `${breakpoints.forceBreakBefore.join(', ')} { page-break-before: always; }\n`;
    }

    // Force break after
    if (breakpoints.forceBreakAfter?.length) {
      css += `${breakpoints.forceBreakAfter.join(', ')} { page-break-after: always; }\n`;
    }

    // Orphan and widow control
    if (breakpoints.orphanControl || breakpoints.widowControl) {
      css += `p, li, td { orphans: 3; widows: 3; }\n`;
    }

    if (css && html.includes('</style>')) {
      html = html.replace('</style>', `${css}</style>`);
    }

    return html;
  }

  /**
   * Optimize tables for PDF
   */
  private optimizeTables(html: string): string {
    // Add table headers to each page
    html = html.replace(/<table[^>]*>/gi, (match) => {
      if (!match.includes('class=')) {
        return match.replace('>', ' class="pdf-table">');
      }
      return match.replace('class="', 'class="pdf-table ');
    });

    // Add CSS for repeating headers
    const tableCSS = `
      .pdf-table {
        width: 100%;
        border-collapse: collapse;
      }
      .pdf-table thead {
        display: table-header-group;
      }
      .pdf-table tbody {
        display: table-row-group;
      }
      .pdf-table tr {
        page-break-inside: avoid;
      }
      @media print {
        .pdf-table thead {
          display: table-header-group;
        }
    `;

    if (html.includes('</style>')) {
      html = html.replace('</style>', `${tableCSS}</style>`);
    }

    return html;
  }

  /**
   * Fix common layout issues
   */
  private fixLayoutIssues(html: string): string {
    // Fix floating elements
    html = html.replace(/(<div[^>]*style="[^"]*float:\s*(left|right)[^"]*"[^>]*>[\s\S]*?<\/div>)/gi, 
      (match) => `<div style="clear:both"></div>${match}<div style="clear:both"></div>`
    );

    // Fix absolute positioning for PDF
    html = html.replace(/position:\s*absolute/gi, 'position: relative');
    html = html.replace(/position:\s*fixed/gi, 'position: relative');

    // Ensure images fit within page
    html = html.replace(/<img([^>]*)>/gi, (match, attrs) => {
      if (!attrs.includes('style=')) {
        return `<img${attrs} style="max-width: 100%; height: auto;">`;
      }
      return match.replace('style="', 'style="max-width: 100%; height: auto; ');
    });

    // Add clearfix to containers
    html = html.replace(/<div class="container[^"]*">/gi, (match) => {
      return match.replace('>', ' style="overflow: auto;">');
    });

    return html;
  }

  /**
   * Calculate optimal margins based on content
   */
  public calculateOptimalMargins(contentWidth: number, pageSize: string): LayoutMargins {
    const pageDimensions = this.getPageDimensions(pageSize);
    const availableWidth = pageDimensions.width;
    
    // Calculate margins to center content
    const horizontalMargin = Math.max(1, (availableWidth - contentWidth) / 2);
    const verticalMargin = Math.max(2, availableWidth * 0.1);

    return {
      top: `${verticalMargin}cm`,
      right: `${horizontalMargin}cm`,
      bottom: `${verticalMargin}cm`,
      left: `${horizontalMargin}cm`
    };
  }

  /**
   * Get page dimensions in cm
   */
  private getPageDimensions(pageSize: string): { width: number; height: number } {
    const dimensions: Record<string, { width: number; height: number }> = {
      'A4': { width: 21, height: 29.7 },
      'A3': { width: 29.7, height: 42 },
      'Letter': { width: 21.6, height: 27.9 },
      'Legal': { width: 21.6, height: 35.6 },
      'Tabloid': { width: 27.9, height: 43.2 }
    };

    return dimensions[pageSize] || dimensions.A4;
  }