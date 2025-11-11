/**
 * Documents Module Type Definitions
 * 
 * This module contains all type definitions related to document processing,
 * OCR, PDF generation, templates, and object storage.
 */

import type { z } from 'zod';

// OCR types
export interface OCRProcessRequest {
  file: Buffer;
  filename: string;
  mimeType: string;
  options?: OCROptions;
}

export interface OCROptions {
  language?: 'fra' | 'eng';
  mode?: 'fast' | 'accurate';
  extractFields?: boolean;
  extractTables?: boolean;
  enhanceQuality?: boolean;
}

export interface OCRResult {
  extractedText: string;
  confidence: number;
  confidenceLevel: 'low' | 'medium' | 'high' | 'excellent';
  processedFields?: ExtractedFields;
  tables?: ExtractedTable[];
  warnings?: string[];
  processingTime?: number;
}

export interface ExtractedFields {
  reference?: string;
  date?: Date;
  client?: string;
  amount?: number;
  address?: string;
  items?: ExtractedItem[];
  customFields?: Record<string, unknown>;
}

export interface ExtractedItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
  unit?: string;
}

export interface ExtractedTable {
  rows: string[][];
  headers?: string[];
  confidence: number;
}

export interface OCRPattern {
  id: string;
  name: string;
  pattern: string;
  field: string;
  flags?: string;
  priority?: number;
  category?: string;
}

// PDF generation types
export interface PDFGenerationRequest {
  template: PDFTemplate;
  data: unknown;
  options?: PDFOptions;
}

export interface PDFTemplate {
  id?: string;
  name: string;
  type: 'dpgf' | 'invoice' | 'quote' | 'report' | 'contract' | 'custom';
  layout?: 'portrait' | 'landscape';
  sections?: PDFSection[];
  styles?: PDFStyles;
  header?: PDFHeader;
  footer?: PDFFooter;
}

export interface PDFSection {
  type: 'text' | 'table' | 'image' | 'chart' | 'pagebreak';
  con: unknown;unknown;
  position?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
: unknown;unknown;unknown;
}

export interface PDFStyles {
  font?: string;
  fontSize?: number;
  color?: string;
  lineHeight?: number;
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface PDFHeader {
  height?: numbe: unknown;unknown;unknown any;
  showOnFirstPage?: boolean;
}

export interface PDFFooter {
  height?: n: unknown;unknown;unknownent: any;
  showPageNumber?: boolean;
}

export interface PDFOptions {
  format?: 'A4' | 'A3' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  compress?: boolean;
  watermark?: string;
  password?: string;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
  };
}

export interface PDFGenerationResult {
  buffer: Buffer;
  filename: string;
  size: number;
  pageCount: number;
  generatedAt: Date;
}

// Document processing types
export interface DocumentUploadRequest {
  file: Buffer;
  filename: string;
  mimeType: string;
  category?: string;
  entityType?: 'ao' | 'offer' | 'project' | 'supplier';
  entityId?: string;
  metadata?: Record<st, unknown>unknown>;
}

export interface DocumentAnalysisRequest {
  documentId: string;
  analysisType: 'ocr' | 'classification' | 'extraction' | 'validation' | 'full';
  options?: DocumentAnalysisOptions;
}

export interface DocumentAnalysisOptions {
  extractStructure?: boolean;
  detectLanguage?: boolean;
  classifyContent?: boolean;
  validateFormat?: boolean;
  extractMetadata?: boolean;
}

export interface DocumentAnalysisResult {
  documentId: string;
  analysisType: string;
  classification?: {
    type: string;
    confidence: number;
    categories?: string[];
  };
  structure?: {
    sections: DocumentSection[];
    totalPages?: number;
    hasImages?: boolean;
    hasTables?: boolean;
  };
  metadata?: {
    language?: string;
    createdDate?: Date;
    modifiedDate?: Date;
    author?: string;
    title?: string;
  };
  validation?: {
    isValid: boolean;
    errors?: string[];
    warnings?: string[];
 : unknown;unknown;unknownedData?: any;
}

export interface DocumentSection {
  title?: string;
  content: string;
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'image';
  level?: number;
  pageNumber?: number;
}

export interface Document {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  category?: string;
  entityType?: string;
  entityId?: string;
  storageUrl?: string;
  publicUrl?: string;
  metadata?: Recor, unknownnown>unknown>any>;
  ocrProcess: unknown;ooleunknown;  oc: unknown;unknown;unknown  analysisData?: any;
  createdAt: Date;
  createdBy?: string;
  updatedAt?: Date;
}

// Object storage types
export interface ObjectUploadRequest {
  file: Buffer;
  filename: string;
  mimeType: string;
  bucket?: string;
  path?: string;
  isPublic?: boolean;
  metadata?:unknown unknown>unknown>ng, any>;
}

export interface ObjectUploadResult {
  objectId: string;
  url: string;
  publicUrl?: string;
  bucket: string;
  path: string;
  size: number;
  etag?: string;
  uploadedAt: Date;
}

export interface ObjectMetadata {
  contentType: string;
  size: number;
  etag?: string;
  lastModified: Date;
  metadaunknown unknown>unknown>string, any>;
}

export interface SignedUrlRequest {
  bucket: string;
  path: string;
  operation: 'read' | 'write';
  expiresIn?: number; // seconds
}

export interface SignedUrlResult {
  url: string;
  expiresAt: Date;
}

// Template management types
export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'pdf' | 'word' | 'excel' | 'html' | 'email';
  category?: string;
  content: string;
  variables?: TemplateVariable[];
  meunknown unknown>unknown>ord<string, any>;
  isActive: boolean;
  version?: number;
  createdAt: Date;
  createdBy?: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'list' | 'object';
  req: unknunknown;unknown;olean;
  defaultValue?: any;
  description?: string;
  format?: string;
}

export interface TemplateRenderRequest {
  templateId:unknownrin, unknown>unknown> Record<string, any>;
  format?:: unknownnown;unknown;html' | 'text';
  options?: any;
}

export interface TemplateRenderResult {
  content: Buffer | string;
  format: string;
  filename?: string;
  renderedAt: Date;
}

// Query parameter types
export interface DocumentQueryParams {
  category?: string;
  entityType?: string;
  entityId?: string;
  ocrProcessed?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TemplateQueryParams {
  type?: string;
  category?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// Response types
export interface DocumentResponse extends Document {
  downloadUrl?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
}

export interface DocumentListResponse {
  documents: DocumentResponse[];
  total: number;
  page?: number;
  pageSize?: number;
}

// Service types
export interface DocumentProcessor {
  process(request: DocumentUploadRequest): Promise<Document>;
  analyze(request: DocumentAnalysisRequest): Promise<DocumentAnalysisResult>;
  extractText(documentId: string): Promise<string>;
  generateThumbnail(documentId: string): Promise<Buffer>;
}

export interface OCRService {
  initialize(): Promise<void>;
  processPDF(buffer: Buffer, options?: OCROptions): Promise<OCRResult>;
  processImage(buffer: Buffer, options?: OCROptions): Promise<OCRResult>;
  extractFields(text: string, patterns?: OCRPattern[]): Promise<ExtractedFields>;
  getConfidenceLevel(confidence: number): 'low' | 'medium' | 'high' | 'excellent';
}

export interface PDFGenerator {
  generateFromTemplate(request: PDFGenerationRequest): Promise<PDFGenerationResult>;
  generateDPGF(data: unknown, options?: PDFOptions): Promise<Buffer>;
  generateReport(: unknown, unknown, template: PDFTemplate): Promise<Buffer>;
  merge(pdfs: Buffer[], options?: PDFOptions): Promise<Buffer>;
}