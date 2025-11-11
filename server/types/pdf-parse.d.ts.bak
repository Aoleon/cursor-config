// Type definitions for pdf-parse
// Déclaration de types pour le module pdf-parse

declare module 'pdf-parse' {
  interface PDFParseData {
    text: string;
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    version: string;
  }

  interface PDFParseOptions {
    // Options de configuration pour pdf-parse
    max_pages?: number;
    raw?: boolean;
    password?: string;
  }

  function pdfParse(buffer: Buffer, options?: PDFParseOptions): Promise<PDFParseData>;
  export = pdfParse;
}