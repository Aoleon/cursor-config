import puppeteer, { Browser, Page, PDFOptions } from "puppeteer";
import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import { readFileSync } from "fs";
import { join } from "path";
import * as Handlebars from "handlebars";
import type { DpgfGroupedData } from "./dpgfComputeService";
import { logger } from '../utils/logger';
import { 
  PDFTemplateEngine,
  type PDFTemplate,
  type RenderOptions,
  type RenderResult,
  type LDMTemplateData,
  createLDMData,
  loadTemplate,
  TEMPLATES
} from '../modules/documents/pdf';

export interface PdfGenerationOptions {
  format?: "A4" | "A3" | "Letter";
  orientation?: "portrait" | "landscape";
  includeBackground?: boolean;
  margins?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  scale?: number;
  displayHeaderFooter?: boolean;
}

export interface PdfGenerationResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
}

export class PdfGeneratorService {
  private static browser: Browser | null = null;
  private static template: HandlebarsTemplateDelegate | null = null;

  /**
   * Initialise le service PDF (démarre Puppeteer et compile le template)
   */
  static async initialize(): Promise<void> {
    return withErrorHandling(
    async () => {

      // Démarrage de Puppeteer avec configuration optimisée
      if (!this.browser) {
        this.browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-default-apps',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-translate',
            '--disable-web-security',
          ]
        });

        logger.info('Puppeteer browser started successfully', {
          metadata: {
            service: 'PDFGeneratorService',
            operation: 'initialize'
          }
        });
      }

      // Compilation du template Handlebars
      if (!this.template) {
        const templatePath = join(__dirname, "../templates/dpgfTemplate.hbs");
        const templateContent = readFileSync(templatePath, "utf-8");
        
        // Registration des helpers Handlebars
        this.registerHandlebarsHelpers();
        
        this.template = Handlebars.compile(templateContent);
        logger.info('DPGF template compiled successfully', {
          metadata: {
            service: 'PDFGeneratorService',
            operation: 'initialize'
          }
        });
      }
    
    },
    {
      operation: 'PDF',
      service: 'pdfGeneratorService',
      metadata: {}
    }
  );
      });
      throw new AppError(`Failed to initialize PDF generator: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Génère un PDF DPGF depuis les données calculées
   */
  static async generateDpgfPdf(
    data: DpgfGroupedData,
    options: PdfGenerationOptions = {}
  ): Promise<PdfGenerationResult> {
    await this.initialize();
    
    if (!this.browser || !this.template) {
      throw new AppError("PDF generator service not properly initialized", 500);
    }

    let page: Page | null = null;
    
    return withErrorHandling(
    async () => {

      // Création d'une nouvelle page
      page = await this.browser.newPage();
      
      // Configuration de la page
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: options.scale || 1,
      });

      // Generation du HTML depuis le template Handlebars
      const html = this.template(data);
      
      // Chargement du HTML dans la page
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Options par défaut pour le PDF
      const pdfOptions: PDFOptions = {
        format: options.format || "A4",
        printBackground: options.includeBackground ?? true,
        margin: {
          top: options.margins?.top || "2cm",
          right: options.margins?.right || "1.5cm",
          bottom: options.margins?.bottom || "3cm",
          left: options.margins?.left || "1.5cm",
        },
        displayHeaderFooter: options.displayHeaderFooter ?? false,
        scale: options.scale || 0.8,
        preferCSSPageSize: true,
      };

      // Génération du PDF
      logger.info('Generating DPGF PDF', {
        metadata: {
          service: 'PDFGeneratorService',
          operation: 'generateDpgfPdf',
          offerReference: data.metadata.offerReference
        }
      });
      const pdfBuffer = Buffer.from(await page.pdf(pdfOptions));
      
      // Generation du nom de fichier
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `DPGF-${data.metadata.offerReference || 'Document'}-${timestamp}.pdf`;
      
      logger.info('PDF generated successfully', {
        metadata: {
          service: 'PDFGeneratorService',
          operation: 'generateDpgfPdf',
          filename,
          size: pdfBuffer.length
        }
      });
      
      return {
        buffer: pdfBuffer,
        filename,
        mimeType: "application/pdf",
        size: pdfBuffer.length
      };

    
    },
    {
      operation: 'PDF',
      service: 'pdfGeneratorService',
      metadata: {}
    }
  );
      });
      throw new AppError(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    } finally {
      // Nettoyage de la page
      if (page) {
        return withErrorHandling(
    async () => {

          await page.close();
        
    },
    {
      operation: 'PDF',
      service: 'pdfGeneratorService',
      metadata: {}
    }
  );
          });
        }
      }
    }
  }

  /**
   * Génère le HTML de prévisualisation (sans PDF)
   */
  static async generateDpgfPreview(data: DpgfGroupedData): Promise<string> {
    await this.initialize();
    
    if (!this.template) {
      throw new AppError("Template not initialized", 500);
    }

    return withErrorHandling(
    async () => {

      const html = this.template(data);
      logger.info('DPGF preview HTML generated successfully', {
        metadata: {
          service: 'PDFGeneratorService',
          operation: 'generateDpgfPreview'
        }
      });
      return html;
    
    },
    {
      operation: 'PDF',
      service: 'pdfGeneratorService',
      metadata: {}
    }
  );
      });
      throw new AppError(`Failed to generate preview: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Ferme le browser Puppeteer (nettoyage des ressources)
   */
  static async cleanup(): Promise<void> {
    if (this.browser) {
      return withErrorHandling(
    async () => {

        await this.browser.close();
        this.browser = null;
        logger.info('Puppeteer browser closed', {
          metadata: {
            service: 'PDFGeneratorService',
            operation: 'cleanup'
          }
        });
      
    },
    {
      operation: 'PDF',
      service: 'pdfGeneratorService',
      metadata: {}
    }
  );
        });
      }
    }
  }

  /**
   * Enregistre les helpers Handlebars personnalisés
   */
  private static registerHandlebarsHelpers(): void {
    // Helper pour formater les montants en euros
    Handlebars.registerHelper("formatCurrency", function(amount: string | number) {
      const num = typeof amount === "string" ? parseFloat(amount) : amount;
      if (isNaN(num)) return "0,00";
      
      return new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    });

    // Helper pour formater les quantités
    Handlebars.registerHelper("formatQuantity", function(quantity: string | number, decimals: number = 3) {
      const num = typeof quantity === "string" ? parseFloat(quantity) : quantity;
      if (isNaN(num)) return "0";
      
      return new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
      }).format(num);
    });

    // Helper pour formater les dates
    Handlebars.registerHelper("formatDate", function(date: string | Date) {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return "";
      
      return new Intl.DateTimeFormat("fr-FR", {
        year: "numeric",
        month: "2-digit", 
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(dateObj);
    });

    // Helper pour formater les dates (date seule)
    Handlebars.registerHelper("formatDateOnly", function(date: string | Date) {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return "";
      
      return new Intl.DateTimeFormat("fr-FR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(dateObj);
    });

    // Helper pour conditions (if equal)
    Handlebars.registerHelper("ifEquals", function(this: any, arg1: any, arg2: any, options: any) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    // Helper pour conditions (if greater than)
    Handlebars.registerHelper("ifGreaterThan", function(this: any, arg1: any, arg2: any, options: any) {
      const num1 = typeof arg1 === "string" ? parseFloat(arg1) : arg1;
      const num2 = typeof arg2 === "string" ? parseFloat(arg2) : arg2;
      return (num1 > num2) ? options.fn(this) : options.inverse(this);
    });

    // Helper pour capitaliser le premier caractère
    Handlebars.registerHelper("capitalize", function(str: string) {
      if (!str || typeof str !== "string") return "";
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    // Helper pour tronquer le texte
    Handlebars.registerHelper("truncate", function(str: string, length: number = 50) {
      if (!str || typeof str !== "string") return "";
      if (str.length <= length) return str;
      return str.substring(0, length) + "...";
    });

    logger.info('Handlebars helpers registered', {
      metadata: {
        service: 'PDFGeneratorService',
        operation: 'registerHandlebarsHelpers'
      }
    });
  }

  /**
   * Vérifie si le service est initialisé
   */
  static isInitialized(): boolean {
    return this.browser !== null && this.template !== null;
  }

  /**
   * Redémarre le service (utile en cas de problème)
   */
  static async restart(): Promise<void> {
    logger.info('Restarting PDF generator service', {
      metadata: {
        service: 'PDFGeneratorService',
        operation: 'restart'
      }
    });
    await this.cleanup();
    this.template = null;
    await this.initialize();
    logger.info('PDF generator service restarted', {
      metadata: {
        service: 'PDFGeneratorService',
        operation: 'restart'
      }
    });
  }

  // ========================================
  // INTEGRATION WITH NEW TEMPLATE ENGINE
  // ========================================

  private static templateEngine: PDFTemplateEngine | null = null;

  /**
   * Get or create template engine instance
   */
  private static getTemplateEngine(): PDFTemplateEngine {
    if (!this.templateEngine) {
      this.templateEngine = PDFTemplateEngine.getInstance({
        cacheEnabled: true,
        cacheTTL: 3600,
        cacheMaxSize: 50,
        validationStrict: true,
        defaultLocale: 'fr-FR',
        imageOptimization: true,
        layoutOptimization: true,
        errorRecovery: true
      });
    }
    return this.templateEngine;
  }

  /**
   * Generate PDF from template with advanced features
   */
  static async generateFromTemplate(
    templateOrPath: PDFTemplate | string,
    data: Record<string, any>,
    options?: PdfGenerationOptions
  ): Promise<PdfGenerationResult> {
    await this.initialize();

    return withErrorHandling(
    async () => {

      const engine = this.getTemplateEngine();

      // Load template if path provided
      let template: PDFTemplate;
      if (typeof templateOrPath === 'string') {
        const content = await loadTemplate(templateOrPath);
        template = {
          id: templateOrPath,
          name: templateOrPath,
          type: 'handlebars',
          content
        };
      } else {
        template = templateOrPath;
      }

      // Render template
      const renderResult = await engine.render({
        template,
        context: {
          data,
          locale: 'fr-FR',
          timezone: 'Europe/Paris'
        },
        layout: {
          pageSize: options?.format || 'A4',
          orientation: options?.orientation || 'portrait',
          margins: options?.margins
        }
      });

      if (!renderResult.success || !renderResult.html) {
        throw new AppError('Template rendering failed', 500);
      }

      // Generate PDF from HTML
      const pdfResult = await this.generatePdfFromHtml(
        renderResult.html,
        options
      );

      return pdfResult;
    
    },
    {
      operation: 'PDF',
      service: 'pdfGeneratorService',
      metadata: {}
    }
  );
  }

  /**
   * Generate LDM PDF with template engine
   */
  static async generateLDMPdf(
    data: Partial<LDMTemplateData>,
    templateType: 'basic' | 'complex' | 'visual' = 'basic',
    options?: PdfGenerationOptions
  ): Promise<PdfGenerationResult> {
    return withErrorHandling(
    async () => {

      // Select template path
      const templatePath = 
        templateType === 'basic' ? TEMPLATES.LDM.BASIC :
        templateType === 'complex' ? TEMPLATES.LDM.COMPLEX :
        TEMPLATES.LDM.VISUAL;

      // Prepare LDM data
      const ldmData = createLDMData(data);

      // Generate PDF
      return await this.generateFromTemplate(
        templatePath,
        ldmData,
        options
      );
    
    },
    {
      operation: 'PDF',
      service: 'pdfGeneratorService',
      metadata: {}
    }
  ););
      throw error;
    }
  }

  /**
   * Validate template before use
   */
  static async validateTemplate(
    templateOrPath: PDFTemplate | string
  ): Promise<{ valid: boolean; errors?: any[]; warnings?: any[] }> {
    return withErrorHandling(
    async () => {

      const engine = this.getTemplateEngine();

      let template: PDFTemplate;
      if (typeof templateOrPath === 'string') {
        const content = await loadTemplate(templateOrPath);
        template = {
          id: templateOrPath,
          name: templateOrPath,
          type: 'handlebars',
          content
        };
      } else {
        template = templateOrPath;
      }

      const validation = await engine.validateTemplate(template);
      
      return {
        valid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings
      };
    
    },
    {
      operation: 'PDF',
      service: 'pdfGeneratorService',
      metadata: {}
    }
  );]
      };
    }
  }

  /**
   * Clear template cache
   */
  static clearTemplateCache(templateId?: string): void {
    const engine = this.getTemplateEngine();
    engine.clearCache(templateId);
    logger.info('Template cache cleared', { templateId });
  }

  /**
   * Get template cache statistics
   */
  static getTemplateCacheStats(): any {
    const engine = this.getTemplateEngine();
    return engine.getCacheStats();
  }

  /**
   * Generate PDF from HTML content (public method)
   */
  static async generatePdfFromHtml(
    html: string,
    options?: PdfGenerationOptions
  ): Promise<PdfGenerationResult> {
    await this.initialize();

    if (!this.browser) {
      throw new AppError("PDF generator not initialized", 500);
    }

    let page: Page | null = null;

    return withErrorHandling(
    async () => {

      page = await this.browser.newPage();

      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: options?.scale || 1,
      });

      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      const pdfOptions: PDFOptions = {
        format: options?.format || "A4",
        printBackground: options?.includeBackground ?? true,
        margin: {
          top: options?.margins?.top || "2cm",
          right: options?.margins?.right || "1.5cm",
          bottom: options?.margins?.bottom || "2cm",
          left: options?.margins?.left || "1.5cm",
        },
        displayHeaderFooter: options?.displayHeaderFooter ?? false,
        scale: options?.scale || 0.8,
        preferCSSPageSize: true,
      };

      const pdfBuffer = await page.pdf(pdfOptions);

      const filename = `document_${Date.now()}.pdf`;

      logger.info('PDF generated from HTML successfully', {
        metadata: {
          service: 'PDFGeneratorService',
          operation: 'generatePdfFromHtml',
          filename,
          size: pdfBuffer.length
        }
      });

      return {
        buffer: pdfBuffer,
        filename,
        mimeType: 'application/pdf',
        size: pdfBuffer.length
      };
    
    },
    {
      operation: 'PDF',
      service: 'pdfGeneratorService',
      metadata: {}
    }
  ); finally {
      if (page) {
        await page.close();
      }
    }
  }
}

// Gestion de l'arrêt propre du processus
process.on("SIGTERM", async () => {
  logger.info('Received SIGTERM, cleaning up PDF generator', {
    metadata: {
      service: 'PDFGeneratorService',
      operation: 'SIGTERM handler'
    }
  });
  await PdfGeneratorService.cleanup();
});

process.on("SIGINT", async () => {
  logger.info('Received SIGINT, cleaning up PDF generator', {
    metadata: {
      service: 'PDFGeneratorService',
      operation: 'SIGINT handler'
    }
  });
  await PdfGeneratorService.cleanup();
});