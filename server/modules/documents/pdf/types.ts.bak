/**
 * PDF Template Engine Type Definitions
 * Comprehensive type system for the PDF template processing pipeline
 */

import type { Decimal } from 'decimal.js-light';

// Template types
export interface PDFTemplate {
  id: string;
  name: string;
  type: 'html' | 'handlebars' | 'hybrid';
  content: string;
  category?: string;
  version?: string;
  metadata?: TemplateMetadata;
  compiledAt?: Date;
  isActive?: boolean;
}

export interface TemplateMetadata {
  title?: string;
  description?: string;
  author?: string;
  requiredFields?: string[];
  optionalFields?: string[];
  supportedFormats?: string[];
  dependencies?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Placeholder types
export interface Placeholder {
  raw: string;                 // Original text like "[client.name]"
  path: string;                 // Extracted path like "client.name"
  segments: string[];           // Path segments ["client", "name"]
  formatter?: PlaceholderFormatter;
  defaultValue?: unknown;
  isRequired?: boolean;
  position?: PlaceholderPosition;
}

export interface PlaceholderFormatter {
  type: 'currency' | 'date' | 'number' | 'uppercase' | 'lowercase' | 'capitalize' | 'custom';
  format?: string;              // e.g., "dd/mm/yyyy" for dates
  precision?: number;           // For numbers
  locale?: string;              // For currency and dates
  customFunction?: (value: unknown) => string;
}

export interface PlaceholderPosition {
  line: number;
  column: number;
  index: number;
  length: number;
}

export interface ConditionalBlock {
  type: 'if' | 'unless';
  condition: string;
  content: string;
  elseBranch?: string;
  position?: PlaceholderPosition;
}

export interface LoopBlock {
  type: 'foreach' | 'for';
  variable: string;
  collection: string;
  content: string;
  separator?: string;
  position?: PlaceholderPosition;
}

// Image types
export interface ImageReference {
  raw: string;                 // Original text like "[image pub 1]"
  type: 'pub' | 'private' | 'product' | 'logo' | 'signature';
  identifier: string | number;  // The ID or name
  path?: string;               // Resolved path in object storage
  format?: 'png' | 'jpg' | 'jpeg' | 'svg' | 'webp';
  options?: ImageOptions;
  position?: PlaceholderPosition;
}

export interface ImageOptions {
  width?: number | string;
  height?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
  quality?: number;             // 0-100 for JPEG compression
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  fallback?: string;            // Fallback image path
  alt?: string;                 // Alt text for accessibility
}

export interface ProcessedImage {
  base64?: string;              // Base64 encoded image
  url?: string;                 // URL or path
  width: number;
  height: number;
  format: string;
  size: number;                 // Size in bytes
  optimized: boolean;
}

// Layout types
export interface LayoutOptions {
  pageSize?: 'A4' | 'A3' | 'Letter' | 'Legal' | 'Tabloid';
  orientation?: 'portrait' | 'landscape';
  margins?: LayoutMargins;
  grid?: GridOptions;
  spacing?: SpacingOptions;
  breakpoints?: BreakpointOptions;
  optimization?: OptimizationOptions;
}

export interface LayoutMargins {
  top: number | string;
  right: number | string;
  bottom: number | string;
  left: number | string;
}

export interface GridOptions {
  enabled: boolean;
  columns?: number;
  rows?: number;
  gap?: number | string;
  alignItems?: 'start' | 'center' | 'end' | 'stretch';
  justifyContent?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
}

export interface SpacingOptions {
  lineHeight?: number;
  paragraphSpacing?: number | string;
  sectionSpacing?: number | string;
  itemSpacing?: number | string;
}

export interface BreakpointOptions {
  avoidBreakInside?: string[];  // CSS selectors to avoid breaking
  forceBreakBefore?: string[];  // CSS selectors to force break before
  forceBreakAfter?: string[];   // CSS selectors to force break after
  orphanControl?: boolean;
  widowControl?: boolean;
}

export interface OptimizationOptions {
  removeEmptyElements?: boolean;
  collapseWhitespace?: boolean;
  inlineStyles?: boolean;
  optimizeImages?: boolean;
  minifyCSS?: boolean;
  prefetchFonts?: boolean;
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions?: ValidationSuggestion[];
  metadata?: ValidationMetadata;
}

export interface ValidationError {
  type: 'syntax' | 'structure' | 'placeholder' | 'image' | 'layout' | 'permission';
  message: string;
  severity: 'error' | 'critical';
  position?: PlaceholderPosition;
  context?: string;
  suggestion?: string;
}

export interface ValidationWarning {
  type: 'performance' | 'compatibility' | 'best-practice' | 'deprecation';
  message: string;
  position?: PlaceholderPosition;
  impact?: 'low' | 'medium' | 'high';
  suggestion?: string;
}

export interface ValidationSuggestion {
  type: 'optimization' | 'accessibility' | 'maintainability';
  message: string;
  position?: PlaceholderPosition;
  autoFixAvailable?: boolean;
  autoFixFunction?: () => string;
}

export interface ValidationMetadata {
  totalPlaceholders: number;
  totalImages: number;
  totalConditionals: number;
  totalLoops: number;
  estimatedRenderTime?: number;
  estimatedMemoryUsage?: number;
  complexityScore?: number;
}

// Template compilation
export interface CompiledTemplate {
  id: string;
  originalId: string;
  content: string;
  placeholders: Placeholder[];
  images: ImageReference[];
  conditionals: ConditionalBlock[];
  loops: LoopBlock[];
  dependencies: string[];
  compiledAt: Date;
  version: string;
  checksum?: string;
}

export interface TemplateCache {
  get(id: string): CompiledTemplate | null;
  set(id: string, template: CompiledTemplate): void;
  has(id: string): boolean;
  clear(id?: string): void;
  size(): number;
  getStats(): CacheStats;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  avgCompileTime: number;
  lastCleared?: Date;
}

// Rendering context
export interface RenderContext {
  data: Record<string, unknown>;
  images?: Record<string, string | ProcessedImage>;
  locale?: string;
  timezone?: string;
  formatters?: Record<string, PlaceholderFormatter>;
  helpers?: Record<string, (...args: unknown[]) => unknown>;
  partials?: Record<string, string>;
  debug?: boolean;
}

export interface RenderOptions {
  template: PDFTemplate | string;
  context: RenderContext;
  layout?: LayoutOptions;
  validation?: boolean;
  fallbackTemplate?: PDFTemplate | string;
  timeout?: number;
  retryCount?: number;
  cacheResult?: boolean;
}

export interface RenderResult {
  success: boolean;
  html?: string;
  pdf?: Buffer;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
  metadata?: RenderMetadata;
}

export interface RenderMetadata {
  renderTime: number;
  templateId?: string;
  placeholdersResolved: number;
  placeholdersMissing: string[];
  imagesLoaded: number;
  imagesFailed: string[];
  memoryUsed?: number;
  pdfSize?: number;
  pageCount?: number;
}

// Engine configuration
export interface PDFTemplateEngineConfig {
  cacheEnabled?: boolean;
  cacheTTL?: number;
  cacheMaxSize?: number;
  validationStrict?: boolean;
  defaultLocale?: string;
  defaultTimezone?: string;
  imageOptimization?: boolean;
  layoutOptimization?: boolean;
  debugMode?: boolean;
  performanceTracking?: boolean;
  errorRecovery?: boolean;
  maxRenderTime?: number;
  puppeteerOpti: unknown;unknown;
}

// Error types
export class TemplateError extends Error {
  constructor(
    message: string,
    public code: string,
    public deta: unknown)
  ) {
    super(message);
    this.name = 'TemplateError';
  }
}

export class PlaceholderError extends TemplateError {
  constructor(message: string, det: unknown) unknown) {
    super(message, 'PLACEHOLDER_ERROR', details);
    this.name = 'PlaceholderError';
  }
}

export class ImageError extends TemplateError {
  constructor(message: string,: unknown)lunknown)unknown) {
    super(message, 'IMAGE_ERROR', details);
    this.name = 'ImageError';
  }
}

export class LayoutError extends TemplateError {
  constructor(message: str: unknown)eunknown)unknown any) {
    super(message, 'LAYOUT_ERROR', details);
    this.name = 'LayoutError';
  }
}

export class ValidationError extends TemplateError {
  constructor(message:: unknown)gunknown)unknownls?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

// LDM specific types
export interface LDMTemplateData {
  reference: string;
  client: {
    name: string;
    address?: string;
    contact?: string;
    email?: string;
    phone?: string;
  };
  project: {
    name: string;
    reference: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    location?: string;
  };
  supplier?: {
    name: string;
    address?: string;
    contact?: string;
    email?: string;
    phone?: string;
    siret?: string;
  };
  items: LDMItem[];
  totals: {
    ht: Decimal;
    tva: Decimal;
    ttc: Decimal;
    discount?: Decimal;
  };
  conditions?: string;
  notes?: string;
  validityDate?: Date;
}

export interface LDMItem {
  reference: string;
  designation: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: Decimal;
  discount?: Decimal;
  total: Decimal;
  category?: string;
  supplier?: string;
  image?: string;
  specifications?: Record<st, unknownnunknown>any>;
}