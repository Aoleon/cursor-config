import type { PDFTemplateEngineConfig } from './types';
import { PDFTemplateEngine } from './PDFTemplateEngine';

export async function createPDFEngine(config?: PDFTemplateEngineConfig): Promise<PDFTemplateEngine> {
  return PDFTemplateEngine.getInstance(config);
}
