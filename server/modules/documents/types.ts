export interface OCROptions {
  language?: 'fra' | 'eng';
  mode?: 'fast' | 'accurate';
  extractFields?: boolean;
  extractTables?: boolean;
}

export interface OCRProcessRequest {
  file: Buffer;
  filename: string;
  mimeType: string;
  options?: OCROptions;
}

export interface ExtractedFields {
  reference?: string;
  deadline?: string;
  client?: string;
  [key: string]: unknown;
}

export interface ExtractedTable {
  headers?: string[];
  rows: string[][];
  confidence: number;
}

export interface OCRResult {
  extractedText: string;
  confidence: number;
  processedFields?: ExtractedFields;
  tables?: ExtractedTable[];
  warnings?: string[];
}

export interface PDFSection {
  type: 'text' | 'table' | 'image' | 'pagebreak';
  content?: unknown;
}

export interface PDFTemplate {
  id?: string;
  name: string;
  type: 'dpgf' | 'invoice' | 'quote' | 'report' | 'contract' | 'custom';
  content: string;
  sections?: PDFSection[];
}

export interface MarginOptions {
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
}

export interface PDFOptions {
  format?: 'A4' | 'A3' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  margins?: MarginOptions;
}

export interface PDFGenerationRequest {
  template: PDFTemplate | string;
  data: Record<string, unknown>;
  options?: PDFOptions;
}

export interface PdfGenerationResult {
  success: boolean;
  pdfBuffer: Buffer;
  contentType: string;
  fileName: string;
}

export interface PdfGenerationOptions extends PDFOptions {
  outputName?: string;
}
