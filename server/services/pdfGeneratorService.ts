import puppeteer, { Browser, Page, PDFOptions } from "puppeteer";
import { readFileSync } from "fs";
import { join } from "path";
import * as Handlebars from "handlebars";
import type { DpgfGroupedData } from "./dpgfComputeService";

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
    try {
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

        console.log("✅ Puppeteer browser started successfully");
      }

      // Compilation du template Handlebars
      if (!this.template) {
        const templatePath = join(__dirname, "../templates/dpgfTemplate.hbs");
        const templateContent = readFileSync(templatePath, "utf-8");
        
        // Registration des helpers Handlebars
        this.registerHandlebarsHelpers();
        
        this.template = Handlebars.compile(templateContent);
        console.log("✅ DPGF template compiled successfully");
      }
    } catch (error) {
      console.error("❌ Error initializing PDF generator service:", error);
      throw new Error(`Failed to initialize PDF generator: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      throw new Error("PDF generator service not properly initialized");
    }

    let page: Page | null = null;
    
    try {
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
      console.log("🔄 Generating DPGF PDF...");
      const pdfBuffer = Buffer.from(await page.pdf(pdfOptions));
      
      // Generation du nom de fichier
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `DPGF-${data.metadata.offerReference || 'Document'}-${timestamp}.pdf`;
      
      console.log(`✅ PDF generated successfully: ${filename} (${pdfBuffer.length} bytes)`);
      
      return {
        buffer: pdfBuffer,
        filename,
        mimeType: "application/pdf",
        size: pdfBuffer.length
      };

    } catch (error) {
      console.error("❌ Error generating PDF:", error);
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Nettoyage de la page
      if (page) {
        try {
          await page.close();
        } catch (error) {
          console.warn("Warning: Failed to close page:", error);
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
      throw new Error("Template not initialized");
    }

    try {
      const html = this.template(data);
      console.log("✅ DPGF preview HTML generated successfully");
      return html;
    } catch (error) {
      console.error("❌ Error generating preview HTML:", error);
      throw new Error(`Failed to generate preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Ferme le browser Puppeteer (nettoyage des ressources)
   */
  static async cleanup(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        console.log("✅ Puppeteer browser closed");
      } catch (error) {
        console.error("❌ Error closing browser:", error);
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

    console.log("✅ Handlebars helpers registered");
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
    console.log("🔄 Restarting PDF generator service...");
    await this.cleanup();
    this.template = null;
    await this.initialize();
    console.log("✅ PDF generator service restarted");
  }
}

// Gestion de l'arrêt propre du processus
process.on("SIGTERM", async () => {
  console.log("🔄 Received SIGTERM, cleaning up PDF generator...");
  await PdfGeneratorService.cleanup();
});

process.on("SIGINT", async () => {
  console.log("🔄 Received SIGINT, cleaning up PDF generator...");
  await PdfGeneratorService.cleanup();
});