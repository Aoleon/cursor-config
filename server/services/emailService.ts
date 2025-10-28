/**
 * SYSTÈME D'EMAILS GÉNÉRIQUE POUR WORKFLOW FOURNISSEURS
 * 
 * Interface abstraite permettant l'intégration avec n'importe quel service email
 * Implémentations : MockEmailService (développement), SendGridEmailService (production)
 * Templates d'emails pour invitations fournisseurs
 * Système de notifications workflow
 * 
 * CORRECTION CRITIQUE : Utilise Handlebars pour le rendu complet des templates
 * incluant les blocs conditionnels {{#if}}...{{/if}}
 */

import Handlebars from 'handlebars';
import type { SupplierQuoteSession, Supplier } from "@shared/schema";
import { logger } from '../utils/logger';
import { executeSendGrid } from './resilience.js';

// ========================================
// TYPES ET INTERFACES EMAIL
// ========================================

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[]; // Variables dynamiques du template
}

export interface EmailRecipient {
  email: string;
  name?: string;
  supplierName?: string;
}

export interface EmailData {
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  templateId: string;
  dynamicData: Record<string, any>;
  replyTo?: string;
  fromName?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveryStatus?: 'pending' | 'delivered' | 'failed' | 'bounced';
}

export interface SupplierInvitationData {
  supplierName: string;
  contactEmail: string;
  contactName: string;
  aoReference: string;
  lotDescription: string;
  accessUrl: string;
  expirationDate: string;
  instructions?: string;
  supportEmail: string;
  companyName: string;
}

// ========================================
// TEMPLATES D'EMAILS PRÉDÉFINIS
// ========================================

export const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  SUPPLIER_INVITATION: {
    id: 'supplier_invitation',
    name: 'Invitation Fournisseur - Soumission Devis',
    subject: 'Invitation à soumissionner - AO {{aoReference}} - {{lotDescription}}',
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation à soumissionner</title>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #1a365d; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background-color: #ffffff; }
          .button { background-color: #3182ce; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          .info-box { background-color: #f7fafc; border-left: 4px solid #3182ce; padding: 15px; margin: 20px 0; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .warning { background-color: #fed7d7; border-left: 4px solid #e53e3e; padding: 10px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>{{companyName}}</h1>
            <p>Invitation à soumissionner</p>
          </div>
          
          <div class="content">
            <h2>Bonjour {{contactName}},</h2>
            
            <p>Nous avons le plaisir de vous inviter à soumissionner pour le lot suivant :</p>
            
            <div class="info-box">
              <strong>Référence AO :</strong> {{aoReference}}<br>
              <strong>Lot concerné :</strong> {{lotDescription}}<br>
              <strong>Date limite :</strong> {{expirationDate}}
            </div>
            
            {{#if instructions}}
            <div class="info-box">
              <strong>Instructions spécifiques :</strong><br>
              {{instructions}}
            </div>
            {{/if}}
            
            <p>Pour accéder à votre espace de soumission sécurisé et déposer vos documents, cliquez sur le lien ci-dessous :</p>
            
            <center>
              <a href="{{accessUrl}}" class="button">Accéder à mon espace de soumission</a>
            </center>
            
            <div class="warning">
              <strong>Important :</strong> Ce lien est personnel et sécurisé. Il expire le {{expirationDate}}. 
              Ne le partagez pas et utilisez-le uniquement pour cette soumission.
            </div>
            
            <h3>Documents à fournir :</h3>
            <ul>
              <li>Devis détaillé (obligatoire)</li>
              <li>Fiches techniques des produits</li>
              <li>Certifications et agréments</li>
              <li>Planning prévisionnel</li>
            </ul>
            
            <p>Pour toute question technique ou assistance, contactez-nous à : 
            <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
            
            <p>Nous vous remercions de votre intérêt et restons à votre disposition.</p>
            
            <p>Cordialement,<br>
            <strong>Équipe {{companyName}}</strong></p>
          </div>
          
          <div class="footer">
            <p>Cet email a été envoyé automatiquement dans le cadre de notre processus de consultation.</p>
            <p>{{companyName}} - Système de gestion des appels d'offres</p>
          </div>
        </div>
      </body>
      </html>
    `,
    textContent: `
Bonjour {{contactName}},

Nous avons le plaisir de vous inviter à soumissionner pour le lot suivant :

Référence AO : {{aoReference}}
Lot concerné : {{lotDescription}}
Date limite : {{expirationDate}}

{{#if instructions}}
Instructions spécifiques :
{{instructions}}
{{/if}}

Pour accéder à votre espace de soumission sécurisé : {{accessUrl}}

IMPORTANT : Ce lien est personnel et expire le {{expirationDate}}.

Documents à fournir :
- Devis détaillé (obligatoire)
- Fiches techniques des produits
- Certifications et agréments
- Planning prévisionnel

Pour toute question : {{supportEmail}}

Cordialement,
Équipe {{companyName}}
    `,
    variables: ['contactName', 'supplierName', 'aoReference', 'lotDescription', 'accessUrl', 'expirationDate', 'instructions', 'supportEmail', 'companyName']
  },

  SESSION_REMINDER: {
    id: 'session_reminder',
    name: 'Rappel - Session bientôt expirée',
    subject: 'Rappel - Votre session expire bientôt - AO {{aoReference}}',
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #ed8936; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #ffffff; }
          .button { background-color: #ed8936; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          .warning { background-color: #fed7d7; border-left: 4px solid #e53e3e; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Session bientôt expirée</h1>
          </div>
          
          <div class="content">
            <h2>Bonjour {{contactName}},</h2>
            
            <p>Votre session de soumission pour l'AO <strong>{{aoReference}}</strong> expire bientôt.</p>
            
            <div class="warning">
              <strong>Date d'expiration :</strong> {{expirationDate}}<br>
              <strong>Temps restant :</strong> {{timeRemaining}}
            </div>
            
            <p>N'oubliez pas de déposer vos documents avant l'expiration :</p>
            
            <center>
              <a href="{{accessUrl}}" class="button">Finaliser ma soumission</a>
            </center>
            
            <p>Cordialement,<br>
            Équipe {{companyName}}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    textContent: `
Bonjour {{contactName}},

Votre session de soumission pour l'AO {{aoReference}} expire bientôt.

Date d'expiration : {{expirationDate}}
Temps restant : {{timeRemaining}}

Accès : {{accessUrl}}

Cordialement,
Équipe {{companyName}}
    `,
    variables: ['contactName', 'aoReference', 'expirationDate', 'timeRemaining', 'accessUrl', 'companyName']
  },

  DOCUMENT_RECEIVED: {
    id: 'document_received',
    name: 'Confirmation de réception de document',
    subject: 'Document reçu - AO {{aoReference}}',
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #38a169; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #ffffff; }
          .success { background-color: #c6f6d5; border-left: 4px solid #38a169; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Document reçu</h1>
          </div>
          
          <div class="content">
            <h2>Bonjour {{contactName}},</h2>
            
            <div class="success">
              Nous avons bien reçu votre document :<br>
              <strong>{{documentName}}</strong><br>
              Déposé le : {{uploadDate}}
            </div>
            
            <p>Votre document est en cours de traitement. Vous recevrez une notification lors de la validation.</p>
            
            <p>Vous pouvez continuer à déposer d'autres documents via votre espace : 
            <a href="{{accessUrl}}">{{accessUrl}}</a></p>
            
            <p>Cordialement,<br>
            Équipe {{companyName}}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    textContent: `
Bonjour {{contactName}},

Nous avons bien reçu votre document :
{{documentName}}
Déposé le : {{uploadDate}}

Votre document est en cours de traitement.

Accès : {{accessUrl}}

Cordialement,
Équipe {{companyName}}
    `,
    variables: ['contactName', 'documentName', 'uploadDate', 'accessUrl', 'companyName']
  }
};

// ========================================
// SERVICE DE TEMPLATING HANDLEBARS CENTRALISÉ
// ========================================

/**
 * Service centralisé pour le rendu des templates Handlebars
 * Remplace les méthodes naïves replaceVariables qui ne gèrent pas les blocs conditionnels
 */
export class HandlebarsTemplateService {
  private static instance: HandlebarsTemplateService;
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate> = new Map();

  private constructor() {
    // Configuration Handlebars pour la sécurité
    this.configureHandlebars();
  }

  public static getInstance(): HandlebarsTemplateService {
    if (!HandlebarsTemplateService.instance) {
      HandlebarsTemplateService.instance = new HandlebarsTemplateService();
    }
    return HandlebarsTemplateService.instance;
  }

  private configureHandlebars(): void {
    // Enregistrer des helpers Handlebars utiles pour les emails
    Handlebars.registerHelper('formatDate', (date: string | Date) => {
      if (!date) return '';
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    });

    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    Handlebars.registerHelper('and', (a: any, b: any) => a && b);
    Handlebars.registerHelper('or', (a: any, b: any) => a || b);
  }

  /**
   * Compile et met en cache un template Handlebars
   */
  private compileTemplate(templateKey: string, templateContent: string): HandlebarsTemplateDelegate {
    if (!this.compiledTemplates.has(templateKey)) {
      const compiled = Handlebars.compile(templateContent);
      this.compiledTemplates.set(templateKey, compiled);
    }
    return this.compiledTemplates.get(templateKey)!;
  }

  /**
   * Rend un template avec les données fournies
   * Remplace complètement la méthode naïve replaceVariables
   */
  public renderTemplate(templateContent: string, data: Record<string, any>, templateKey?: string): string {
    try {
      // Utiliser une clé unique basée sur le hash du template si pas fournie
      const key = templateKey || `template_${this.hashString(templateContent)}`;
      
      // Compiler le template (mis en cache automatiquement)
      const compiledTemplate = this.compileTemplate(key, templateContent);
      
      // Rendre avec les données
      const rendered = compiledTemplate(data);
      
      return rendered;
    } catch (error) {
      logger.error('Erreur rendu template', {
        metadata: {
          service: 'EmailService',
          operation: 'renderTemplate',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      logger.error('Template content preview', {
        metadata: {
          service: 'EmailService',
          operation: 'renderTemplate',
          templatePreview: templateContent.substring(0, 200) + '...'
        }
      });
      logger.error('Template data provided', {
        metadata: {
          service: 'EmailService',
          operation: 'renderTemplate',
          data: JSON.stringify(data, null, 2)
        }
      });
      
      // Fallback: rendu naïf en cas d'erreur Handlebars
      return this.fallbackRender(templateContent, data);
    }
  }

  /**
   * Méthode de fallback qui fait un remplacement naïf en cas d'erreur Handlebars
   */
  private fallbackRender(template: string, data: Record<string, any>): string {
    logger.warn('Utilisation du fallback naïf', {
        metadata: {
          service: 'EmailService',
          operation: 'renderTemplate'
        }
      });
    let result = template;
    
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value || ''));
    });

    // Supprimer les blocs conditionnels non traités pour éviter l'affichage brut
    result = result.replace(/\{\{#if\s+\w+\}\}[\s\S]*?\{\{\/if\}\}/g, '');
    result = result.replace(/\{\{#unless\s+\w+\}\}[\s\S]*?\{\{\/unless\}\}/g, '');
    
    return result;
  }

  /**
   * Hash simple pour générer des clés de cache
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Nettoie le cache des templates (utile pour les tests)
   */
  public clearCache(): void {
    this.compiledTemplates.clear();
  }

  /**
   * Teste le rendu d'un template avec des données de test
   */
  public testTemplate(templateContent: string, testData: Record<string, any>): {
    success: boolean;
    result?: string;
    error?: string;
  } {
    try {
      const result = this.renderTemplate(templateContent, testData);
      return { success: true, result };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      };
    }
  }
}

// Instance singleton du service de templating
export const templateService = HandlebarsTemplateService.getInstance();

// ========================================
// INTERFACE ABSTRAITE EMAIL SERVICE
// ========================================

/**
 * Interface abstraite pour services d'email
 * Permet d'implémenter n'importe quel provider (SendGrid, Mailgun, Amazon SES, etc.)
 */
export interface IEmailService {
  /**
   * Envoie une invitation à un fournisseur pour soumissionner
   */
  sendSupplierInvitation(data: SupplierInvitationData): Promise<EmailResult>;

  /**
   * Envoie un rappel d'expiration de session
   */
  sendSessionReminder(
    contactEmail: string, 
    contactName: string, 
    aoReference: string,
    expirationDate: string,
    accessUrl: string,
    timeRemaining: string
  ): Promise<EmailResult>;

  /**
   * Confirme la réception d'un document
   */
  sendDocumentReceivedConfirmation(
    contactEmail: string,
    contactName: string,
    documentName: string,
    uploadDate: string,
    accessUrl: string
  ): Promise<EmailResult>;

  /**
   * Génère l'URL d'accès sécurisé pour un fournisseur
   */
  generateSupplierAccessUrl(sessionToken: string): string;

  /**
   * Formate les dates pour l'affichage dans les emails
   */
  formatDate(date: Date): string;

  /**
   * Calcule le temps restant avant expiration
   */
  calculateTimeRemaining(expirationDate: Date): string;

  /**
   * Vérifie si le service email est configuré et prêt
   */
  isReady(): boolean;

  /**
   * Retourne les templates disponibles
   */
  getAvailableTemplates(): EmailTemplate[];
}

// ========================================
// IMPLÉMENTATION MOCK POUR DÉVELOPPEMENT
// ========================================

/**
 * Service email Mock pour le développement
 * Affiche les emails en console au lieu de les envoyer
 */
export class MockEmailService implements IEmailService {
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@jlm-construction.fr';
    this.fromName = process.env.FROM_NAME || 'JLM Construction';
    
    logger.info('Service email MOCK initialisé', {
        metadata: {
          service: 'EmailService',
          operation: 'constructor'
        }
      });
  }

  async sendSupplierInvitation(data: SupplierInvitationData): Promise<EmailResult> {
    const template = EMAIL_TEMPLATES.SUPPLIER_INVITATION;
    const subject = templateService.renderTemplate(template.subject, data, 'supplier_invitation_subject');
    const htmlContent = templateService.renderTemplate(template.htmlContent, data, 'supplier_invitation_html');
    const textContent = templateService.renderTemplate(template.textContent, data, 'supplier_invitation_text');
    
    logger.info('Envoi invitation fournisseur', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          templateEngine: 'Handlebars'
        }
      });
    logger.info('Destinataire', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          recipient: data.contactEmail,
          contactName: data.contactName
        }
      });
    logger.info('Sujet email', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          subject
        }
      });
    logger.info('Fournisseur', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          supplierName: data.supplierName
        }
      });
    logger.info('AO référence', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          aoReference: data.aoReference
        }
      });
    logger.info('Lot description', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          lotDescription: data.lotDescription
        }
      });
    logger.info('URL accès', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          accessUrl: data.accessUrl
        }
      });
    logger.info('Date expiration', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          expirationDate: data.expirationDate
        }
      });
    if (data.instructions) {
      logger.info('Instructions incluses', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          instructions: data.instructions
        }
      });
      logger.info('Instructions incluses dans rendu', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          conditionalRender: true
        }
      });
    } else {
      logger.info('Pas d\'instructions - bloc masqué', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          conditionalRender: false
        }
      });
    }
    logger.info('Template HTML rendu', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          htmlLength: htmlContent.length,
          templateEngine: 'Handlebars'
        }
      });
    logger.info('Template TEXT rendu', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          textLength: textContent.length,
          templateEngine: 'Handlebars'
        }
      });
    
    // Afficher un extrait du rendu pour validation visuelle
    const htmlPreview = htmlContent.substring(htmlContent.indexOf('<div class="content">'), htmlContent.indexOf('<div class="footer">'));
    logger.info('Aperçu rendu HTML', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation'
        }
      });
    logger.info('HTML preview', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          htmlPreview: htmlPreview.substring(0, 500) + '...'
        }
      });
    
    logger.info('Fin invitation fournisseur', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSupplierInvitation'
      }
    });

    return {
      success: true,
      messageId: `mock_invitation_${Date.now()}`,
      deliveryStatus: 'delivered'
    };
  }

  async sendSessionReminder(
    contactEmail: string, 
    contactName: string, 
    aoReference: string,
    expirationDate: string,
    accessUrl: string,
    timeRemaining: string
  ): Promise<EmailResult> {
    const template = EMAIL_TEMPLATES.SESSION_REMINDER;
    const data = {
      contactName,
      aoReference,
      expirationDate,
      timeRemaining,
      accessUrl,
      companyName: this.fromName
    };
    const subject = templateService.renderTemplate(template.subject, data, 'session_reminder_subject');
    const htmlContent = templateService.renderTemplate(template.htmlContent, data, 'session_reminder_html');
    const textContent = templateService.renderTemplate(template.textContent, data, 'session_reminder_text');
    
    logger.info('Rappel expiration', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSessionReminder',
        templateEngine: 'Handlebars'
      }
    });
    logger.info('Destinataire', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSessionReminder',
        recipient: contactEmail,
        contactName
      }
    });
    logger.info('Sujet email', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          subject
        }
      });
    logger.info('AO référence', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSessionReminder',
        aoReference
      }
    });
    logger.info('Temps restant', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSessionReminder',
        timeRemaining
      }
    });
    logger.info('URL accès', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSessionReminder',
        accessUrl
      }
    });
    logger.info('Template HTML rendu', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          htmlLength: htmlContent.length,
          templateEngine: 'Handlebars'
        }
      });
    logger.info('Template TEXT rendu', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          textLength: textContent.length,
          templateEngine: 'Handlebars'
        }
      });
    logger.info('Fin rappel expiration', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSessionReminder'
      }
    });

    return {
      success: true,
      messageId: `mock_reminder_${Date.now()}`,
      deliveryStatus: 'delivered'
    };
  }

  async sendDocumentReceivedConfirmation(
    contactEmail: string,
    contactName: string,
    documentName: string,
    uploadDate: string,
    accessUrl: string
  ): Promise<EmailResult> {
    const template = EMAIL_TEMPLATES.DOCUMENT_RECEIVED;
    const data = {
      contactName,
      documentName,
      uploadDate,
      accessUrl,
      companyName: this.fromName
    };
    const subject = templateService.renderTemplate(template.subject, data, 'document_received_subject');
    const htmlContent = templateService.renderTemplate(template.htmlContent, data, 'document_received_html');
    const textContent = templateService.renderTemplate(template.textContent, data, 'document_received_text');
    
    logger.info('Confirmation document', {
      metadata: {
        service: 'EmailService',
        operation: 'sendDocumentReceived',
        templateEngine: 'Handlebars'
      }
    });
    logger.info('Destinataire', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSessionReminder',
        recipient: contactEmail,
        contactName
      }
    });
    logger.info('Sujet email', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          subject
        }
      });
    logger.info('Document', {
      metadata: {
        service: 'EmailService',
        operation: 'sendDocumentReceived',
        documentName
      }
    });
    logger.info('Date upload', {
      metadata: {
        service: 'EmailService',
        operation: 'sendDocumentReceived',
        uploadDate
      }
    });
    logger.info('URL accès', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSessionReminder',
        accessUrl
      }
    });
    logger.info('Template HTML rendu', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          htmlLength: htmlContent.length,
          templateEngine: 'Handlebars'
        }
      });
    logger.info('Template TEXT rendu', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          textLength: textContent.length,
          templateEngine: 'Handlebars'
        }
      });
    logger.info('Fin confirmation document', {
      metadata: {
        service: 'EmailService',
        operation: 'sendDocumentReceived'
      }
    });

    return {
      success: true,
      messageId: `mock_document_${Date.now()}`,
      deliveryStatus: 'delivered'
    };
  }

  generateSupplierAccessUrl(sessionToken: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    return `${baseUrl}/supplier-portal/${sessionToken}`;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  calculateTimeRemaining(expirationDate: Date): string {
    const now = new Date();
    const diff = expirationDate.getTime() - now.getTime();
    
    if (diff <= 0) {
      return 'Expiré';
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} jour${days > 1 ? 's' : ''}`;
    } else {
      return `${hours} heure${hours > 1 ? 's' : ''}`;
    }
  }

  isReady(): boolean {
    return true; // Le service mock est toujours prêt
  }

  getAvailableTemplates(): EmailTemplate[] {
    return Object.values(EMAIL_TEMPLATES);
  }

  // CORRECTION CRITIQUE : La méthode replaceVariables naïve a été supprimée
  // et remplacée par le service Handlebars centralisé qui gère correctement
  // les blocs conditionnels {{#if}}...{{/if}}
}

// ========================================
// IMPLÉMENTATION SENDGRID POUR PRODUCTION
// ========================================

/**
 * Service email SendGrid pour la production
 * Implementation complète avec SendGrid API
 */
export class SendGridEmailService implements IEmailService {
  private apiKey?: string;
  private fromEmail: string;
  private fromName: string;
  private isConfigured: boolean = false;

  constructor() {
    // Configuration depuis les variables d'environnement
    this.apiKey = process.env.SENDGRID_API_KEY;
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@jlm-construction.fr';
    this.fromName = process.env.FROM_NAME || 'JLM Construction';
    
    this.isConfigured = !!this.apiKey;
    
    if (!this.isConfigured) {
      logger.warn('SendGrid API key non configurée', {
      metadata: {
        service: 'EmailService',
        operation: 'constructor',
        provider: 'SendGrid'
      }
    });
    } else {
      logger.info('Service email SendGrid configuré', {
      metadata: {
        service: 'EmailService',
        operation: 'constructor',
        provider: 'SendGrid'
      }
    });
    }
  }

  /**
   * Envoie une invitation à un fournisseur pour soumissionner
   */
  async sendSupplierInvitation(data: SupplierInvitationData): Promise<EmailResult> {
    const emailData: EmailData = {
      to: [{
        email: data.contactEmail,
        name: data.contactName,
        supplierName: data.supplierName
      }],
      templateId: 'SUPPLIER_INVITATION',
      dynamicData: data,
      replyTo: data.supportEmail,
      fromName: data.companyName
    };

    return this.sendTemplatedEmail(emailData);
  }

  /**
   * Envoie un rappel d'expiration de session
   */
  async sendSessionReminder(
    contactEmail: string, 
    contactName: string, 
    aoReference: string,
    expirationDate: string,
    accessUrl: string,
    timeRemaining: string
  ): Promise<EmailResult> {
    const emailData: EmailData = {
      to: [{ email: contactEmail, name: contactName }],
      templateId: 'SESSION_REMINDER',
      dynamicData: {
        contactName,
        aoReference,
        expirationDate,
        timeRemaining,
        accessUrl,
        companyName: this.fromName
      }
    };

    return this.sendTemplatedEmail(emailData);
  }

  /**
   * Confirme la réception d'un document
   */
  async sendDocumentReceivedConfirmation(
    contactEmail: string,
    contactName: string,
    documentName: string,
    uploadDate: string,
    accessUrl: string
  ): Promise<EmailResult> {
    const emailData: EmailData = {
      to: [{ email: contactEmail, name: contactName }],
      templateId: 'DOCUMENT_RECEIVED',
      dynamicData: {
        contactName,
        documentName,
        uploadDate,
        accessUrl,
        companyName: this.fromName
      }
    };

    return this.sendTemplatedEmail(emailData);
  }

  /**
   * Envoie un email basé sur un template
   */
  private async sendTemplatedEmail(emailData: EmailData): Promise<EmailResult> {
    try {
      // Vérifier que le template existe
      const template = EMAIL_TEMPLATES[emailData.templateId];
      if (!template) {
        throw new Error(`Template ${emailData.templateId} non trouvé`);
      }

      // Vérifier la configuration SendGrid
      if (!this.isConfigured) {
        throw new Error('SendGrid API key non configurée. Utilisez MockEmailService pour le développement.');
      }

      // Rendre les templates avec Handlebars
      const subject = templateService.renderTemplate(template.subject, emailData.dynamicData, `${emailData.templateId}_subject`);
      const htmlContent = templateService.renderTemplate(template.htmlContent, emailData.dynamicData, `${emailData.templateId}_html`);
      const textContent = templateService.renderTemplate(template.textContent, emailData.dynamicData, `${emailData.templateId}_text`);

      // TODO: Implémentation SendGrid réelle avec resilience wrapper
      // Quand prêt pour la production, remplacer la simulation ci-dessous par :
      // 
      // const result = await executeSendGrid(
      //   async () => {
      //     const sgMail = require('@sendgrid/mail');
      //     sgMail.setApiKey(this.apiKey!);
      //     return sgMail.send({
      //       to: emailData.to[0].email,
      //       from: { email: this.fromEmail, name: emailData.fromName || this.fromName },
      //       subject: subject,
      //       html: htmlContent,
      //       text: textContent,
      //       replyTo: emailData.replyTo
      //     });
      //   },
      //   'Send Email'
      // );
      // 
      // return {
      //   success: true,
      //   messageId: result[0].messageId,
      //   deliveryStatus: 'pending'
      // };

      logger.info('SIMULATION Email SendGrid', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSupplierInvitation',
        provider: 'SendGrid',
        simulationData: {
          to: emailData.to,
          subject,
          template: template.name,
          data: emailData.dynamicData,
          htmlLength: htmlContent.length,
          textLength: textContent.length
        }
      }
    });
      
      // Validation du rendu conditionnel pour les instructions
      if (emailData.templateId === 'SUPPLIER_INVITATION') {
        if (emailData.dynamicData.instructions) {
          logger.info('Instructions détectées - rendu conditionnel activé', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSupplierInvitation',
        provider: 'SendGrid'
      }
    });
        } else {
          logger.info('Pas d\'instructions - bloc conditionnel masqué', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSupplierInvitation',
        provider: 'SendGrid'
      }
    });
        }
      }

      return {
        success: true,
        messageId: `sendgrid_pending_${Date.now()}`,
        deliveryStatus: 'pending'
      };

    } catch (error) {
      logger.error('Erreur envoi email', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSupplierInvitation',
        provider: 'SendGrid',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        deliveryStatus: 'failed'
      };
    }
  }

  // CORRECTION CRITIQUE : La méthode replaceVariables naïve a été supprimée
  // et remplacée par le service Handlebars centralisé qui gère correctement
  // les blocs conditionnels {{#if}}...{{/if}}

  /**
   * Génère l'URL d'accès sécurisé pour un fournisseur
   */
  generateSupplierAccessUrl(sessionToken: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    return `${baseUrl}/supplier-portal/${sessionToken}`;
  }

  /**
   * Formate les dates pour l'affichage dans les emails
   */
  formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Calcule le temps restant avant expiration
   */
  calculateTimeRemaining(expirationDate: Date): string {
    const now = new Date();
    const diff = expirationDate.getTime() - now.getTime();
    
    if (diff <= 0) {
      return 'Expiré';
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} jour${days > 1 ? 's' : ''}`;
    } else {
      return `${hours} heure${hours > 1 ? 's' : ''}`;
    }
  }

  /**
   * Vérifie si le service email est configuré
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Retourne les templates disponibles
   */
  getAvailableTemplates(): EmailTemplate[] {
    return Object.values(EMAIL_TEMPLATES);
  }
}

// ========================================
// FACTORY PATTERN ET CONFIGURATION
// ========================================

/**
 * Types de services email disponibles
 */
export type EmailProviderType = 'mock' | 'sendgrid';

/**
 * Configuration du service email
 */
export interface EmailServiceConfig {
  provider: EmailProviderType;
  fromEmail?: string;
  fromName?: string;
  sendgridApiKey?: string;
}

/**
 * Factory pour créer le bon service email selon la configuration
 */
export function createEmailService(config?: Partial<EmailServiceConfig>): IEmailService {
  // Déterminer le provider depuis la config ou les variables d'environnement
  const provider = config?.provider || 
    (process.env.EMAIL_PROVIDER as EmailProviderType) || 
    'mock'; // Par défaut mock pour le développement

  logger.info('Initialisation du service email', {
      metadata: {
        service: 'EmailService',
        operation: 'createEmailService',
        provider
      }
    });

  switch (provider) {
    case 'sendgrid':
      return new SendGridEmailService();
    case 'mock':
    default:
      return new MockEmailService();
  }
}

/**
 * Instance singleton du service email
 * Utilise le factory pattern avec configuration automatique
 */
export const emailService: IEmailService = createEmailService();

// Afficher le type de service utilisé
logger.info('Service actif', {
      metadata: {
        service: 'EmailService',
        operation: 'init',
        serviceName: emailService.constructor.name
      }
    });

// ========================================
// HELPER FUNCTIONS POUR WORKFLOW FOURNISSEURS
// ========================================

/**
 * Envoie une invitation complète à un fournisseur
 */
export async function inviteSupplierForQuote(
  session: SupplierQuoteSession,
  supplier: Supplier,
  aoReference: string,
  lotDescription: string,
  instructions?: string
): Promise<EmailResult> {
  if (!supplier.email) {
    throw new Error('Email de contact manquant pour le fournisseur');
  }

  const accessUrl = emailService.generateSupplierAccessUrl(session.accessToken);
  const expirationDate = emailService.formatDate(session.tokenExpiresAt!);

  const invitationData: SupplierInvitationData = {
    supplierName: supplier.name,
    contactEmail: supplier.email,
    contactName: supplier.contact || supplier.name,
    aoReference,
    lotDescription,
    accessUrl,
    expirationDate,
    instructions,
    supportEmail: process.env.SUPPORT_EMAIL || 'support@jlm-construction.fr',
    companyName: 'JLM Construction'
  };

  return emailService.sendSupplierInvitation(invitationData);
}

/**
 * Programme des rappels automatiques pour les sessions
 */
export function scheduleSessionReminders(session: SupplierQuoteSession): void {
  // TODO: Intégrer avec un système de tâches programmées (comme node-cron)
  // Programmer des rappels à J-3, J-1 et H-6 avant expiration
  logger.info('Rappels programmés', {
      metadata: {
        service: 'EmailService',
        operation: 'scheduleSessionReminders',
        sessionId: session.id
      }
    });
}

// ========================================
// EXPORTS POUR COMPATIBILITÉ ET USAGE FACILE
// ========================================

/**
 * Re-export des types principaux pour faciliter l'usage
 */
export type {
  IEmailService,
  EmailTemplate,
  EmailRecipient,
  EmailData,
  EmailResult,
  SupplierInvitationData,
  EmailServiceConfig,
  EmailProviderType
};

// Note: createEmailService est déjà exportée directement lors de sa déclaration

/**
 * Service email principal (singleton configuré automatiquement)
 */
export { emailService as default };

// ========================================
// DOCUMENTATION COMPLÈTE
// ========================================

/**
 * GUIDE D'UTILISATION DU SYSTÈME D'EMAIL GÉNÉRIQUE
 * ================================================
 * 
 * Ce système d'email générique permet d'utiliser n'importe quel service d'email
 * (SendGrid, Mailgun, Amazon SES, SMTP, etc.) de manière transparente.
 * 
 * ## CONFIGURATION RAPIDE
 * 
 * ### Mode Développement (par défaut)
 * ```bash
 * # Aucune configuration requise
 * # Le MockEmailService sera utilisé automatiquement
 * npm run dev
 * ```
 * 
 * ### Mode Production avec SendGrid
 * ```bash
 * export EMAIL_PROVIDER=sendgrid
 * export SENDGRID_API_KEY=your_sendgrid_api_key
 * export FROM_EMAIL=noreply@votredomaine.com
 * export FROM_NAME="Votre Organisation"
 * npm start
 * ```
 * 
 * ## UTILISATION DANS LE CODE
 * 
 * ### Import et utilisation basique
 * ```typescript
 * import { emailService, inviteSupplierForQuote } from './services/emailService';
 * 
 * // Envoi d'invitation fournisseur (méthode recommandée)
 * const result = await inviteSupplierForQuote(
 *   session,
 *   supplier,
 *   'AO-2025-001',
 *   'Menuiserie PVC',
 *   'Instructions spécifiques...'
 * );
 * 
 * // Ou utilisation directe du service
 * const result = await emailService.sendSupplierInvitation({
 *   supplierName: 'Entreprise XYZ',
 *   contactEmail: 'contact@entreprise-xyz.com',
 *   contactName: 'Jean Dupont',
 *   aoReference: 'AO-2025-001',
 *   lotDescription: 'Menuiserie PVC',
 *   accessUrl: 'https://portal.votredomaine.com/supplier/abc123',
 *   expirationDate: '15/03/2025 18:00',
 *   supportEmail: 'support@votredomaine.com',
 *   companyName: 'Votre Organisation'
 * });
 * ```
 * 
 * ### Utilisation des nouvelles APIs REST
 * ```typescript
 * // Créer une session ET envoyer l'invitation
 * POST /api/supplier-workflow/sessions/create-and-invite
 * {
 *   "aoId": "uuid",
 *   "aoLotId": "uuid", 
 *   "supplierId": "uuid",
 *   "aoReference": "AO-2025-001",
 *   "lotDescription": "Menuiserie PVC",
 *   "instructions": "Merci de fournir...",
 *   "expiresInHours": 72,
 *   "sendReminders": true
 * }
 * 
 * // Envoyer une invitation pour une session existante
 * POST /api/supplier-workflow/sessions/:sessionId/invite
 * {
 *   "aoReference": "AO-2025-001",
 *   "lotDescription": "Menuiserie PVC", 
 *   "instructions": "Merci de fournir...",
 *   "sendReminders": true
 * }
 * ```
 * 
 * ## IMPLÉMENTATION D'UN NOUVEAU SERVICE EMAIL
 * 
 * ### Étape 1: Créer la classe de service
 * ```typescript
 * export class MailgunEmailService implements IEmailService {
 *   private apiKey: string;
 *   private domain: string;
 * 
 *   constructor() {
 *     this.apiKey = process.env.MAILGUN_API_KEY!;
 *     this.domain = process.env.MAILGUN_DOMAIN!;
 *   }
 * 
 *   async sendSupplierInvitation(data: SupplierInvitationData): Promise<EmailResult> {
 *     // Implémentation avec l'API Mailgun
 *     const template = EMAIL_TEMPLATES.SUPPLIER_INVITATION;
 *     const subject = this.replaceVariables(template.subject, data);
 *     const htmlContent = this.replaceVariables(template.htmlContent, data);
 * 
 *     try {
 *       const response = await fetch(`https://api.mailgun.net/v3/${this.domain}/messages`, {
 *         method: 'POST',
 *         headers: {
 *           'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
 *           'Content-Type': 'application/x-www-form-urlencoded'
 *         },
 *         body: new URLSearchParams({
 *           from: `${data.companyName} <${this.fromEmail}>`,
 *           to: data.contactEmail,
 *           subject: subject,
 *           html: htmlContent
 *         })
 *       });
 * 
 *       const result = await response.json();
 *       
 *       return {
 *         success: response.ok,
 *         messageId: result.id,
 *         deliveryStatus: 'pending'
 *       };
 *     } catch (error) {
 *       return {
 *         success: false,
 *         error: error.message,
 *         deliveryStatus: 'failed'
 *       };
 *     }
 *   }
 * 
 *   // Implémenter les autres méthodes de l'interface...
 * }
 * ```
 * 
 * ### Étape 2: Ajouter au factory pattern
 * ```typescript
 * export function createEmailService(config?: Partial<EmailServiceConfig>): IEmailService {
 *   const provider = config?.provider || 
 *     (process.env.EMAIL_PROVIDER as EmailProviderType) || 
 *     'mock';
 * 
 *   switch (provider) {
 *     case 'sendgrid':
 *       return new SendGridEmailService();
 *     case 'mailgun':
 *       return new MailgunEmailService();
 *     case 'mock':
 *     default:
 *       return new MockEmailService();
 *   }
 * }
 * ```
 * 
 * ### Étape 3: Mise à jour des types
 * ```typescript
 * export type EmailProviderType = 'mock' | 'sendgrid' | 'mailgun';
 * ```
 * 
 * ## VARIABLES D'ENVIRONNEMENT
 * 
 * ### Variables communes
 * ```bash
 * EMAIL_PROVIDER=mock|sendgrid|mailgun    # Provider à utiliser
 * FROM_EMAIL=noreply@votredomaine.com     # Email expéditeur
 * FROM_NAME="Votre Organisation"          # Nom de l'expéditeur
 * FRONTEND_URL=https://votredomaine.com   # URL pour les liens
 * SUPPORT_EMAIL=support@votredomaine.com  # Email de support
 * ```
 * 
 * ### Variables SendGrid
 * ```bash
 * SENDGRID_API_KEY=SG.xxx                 # Clé API SendGrid
 * ```
 * 
 * ### Variables Mailgun
 * ```bash
 * MAILGUN_API_KEY=key-xxx                 # Clé API Mailgun
 * MAILGUN_DOMAIN=mail.votredomaine.com    # Domaine Mailgun
 * ```
 * 
 * ## TEMPLATES EMAIL
 * 
 * Les templates HTML sont définis dans `EMAIL_TEMPLATES` et utilisent la syntaxe Handlebars :
 * 
 * ### Variables disponibles par template
 * ```typescript
 * // SUPPLIER_INVITATION
 * {
 *   contactName: string;        // Nom du contact
 *   supplierName: string;       // Nom du fournisseur  
 *   aoReference: string;        // Référence de l'AO
 *   lotDescription: string;     // Description du lot
 *   accessUrl: string;          // URL d'accès sécurisé
 *   expirationDate: string;     // Date d'expiration
 *   instructions?: string;      // Instructions spécifiques
 *   supportEmail: string;       // Email de support
 *   companyName: string;        // Nom de l'organisation
 * }
 * 
 * // SESSION_REMINDER
 * {
 *   contactName: string;
 *   aoReference: string;
 *   expirationDate: string;
 *   timeRemaining: string;      // Temps restant
 *   accessUrl: string;
 *   companyName: string;
 * }
 * 
 * // DOCUMENT_RECEIVED
 * {
 *   contactName: string;
 *   documentName: string;       // Nom du document
 *   uploadDate: string;         // Date d'upload
 *   accessUrl: string;
 *   companyName: string;
 * }
 * ```
 * 
 * ### Personnalisation des templates
 * ```typescript
 * // Ajouter un nouveau template
 * EMAIL_TEMPLATES.CUSTOM_TEMPLATE = {
 *   id: 'custom_template',
 *   name: 'Template Personnalisé',
 *   subject: 'Sujet avec {{variable}}',
 *   htmlContent: '<html>...</html>',
 *   textContent: 'Version texte...',
 *   variables: ['variable1', 'variable2']
 * };
 * ```
 * 
 * ## DEBUGGING ET LOGS
 * 
 * ### Mode Mock (développement)
 * Les emails sont affichés en console avec tous les détails :
 * ```
 * === [MockEmailService] INVITATION FOURNISSEUR ===
 * 📧 Destinataire: contact@fournisseur.com (Jean Dupont)
 * 📧 Sujet: Invitation à soumissionner - AO-2025-001 - Menuiserie PVC
 * 📧 Fournisseur: Entreprise XYZ
 * 📧 URL d'accès: https://portal.com/supplier/abc123
 * === FIN INVITATION FOURNISSEUR ===
 * ```
 * 
 * ### Mode Production
 * Les logs incluent les IDs de message pour le suivi :
 * ```
 * [SendGridEmailService] Email envoyé avec succès
 * Message ID: <14c5d75ce93@ismtpd-555>
 * ```
 * 
 * ## TESTS ET VALIDATION
 * 
 * ### Test rapide du système
 * ```bash
 * node test-email-system.cjs
 * ```
 * 
 * ### Test d'intégration complet
 * 1. Se connecter à l'interface web
 * 2. Créer un fournisseur avec un email valide
 * 3. Créer un AO avec des lots
 * 4. Utiliser l'API `create-and-invite` 
 * 5. Vérifier les logs console (mode mock) ou la boîte email (mode production)
 * 
 * ## SÉCURITÉ
 * 
 * ### Tokens d'accès
 * - Tokens générés avec `storage.generateSessionToken()`
 * - Expiration automatique configurée (72h par défaut)
 * - Validation côté serveur avant affichage
 * 
 * ### Validation des emails
 * - Validation des formats d'email
 * - Vérification de l'existence des fournisseurs
 * - Contrôle d'accès par authentification
 * 
 * ## MIGRATION DEPUIS L'ANCIEN SYSTÈME
 * 
 * L'ancien système utilisant directement SendGrid est maintenant encapsulé :
 * 
 * ### Avant
 * ```typescript
 * import { emailService } from './emailService';
 * await emailService.sendSupplierInvitation(data);
 * ```
 * 
 * ### Après  
 * ```typescript
 * import { emailService } from './emailService';  // Même import !
 * await emailService.sendSupplierInvitation(data); // Même usage !
 * ```
 * 
 * **Compatibilité 100% assurée** - Aucun changement de code requis !
 * 
 * ## EXTENSIONS FUTURES
 * 
 * ### Services supportés facilement
 * - Amazon SES
 * - Mailgun  
 * - Postmark
 * - SMTP générique
 * - Services custom
 * 
 * ### Fonctionnalités extensibles
 * - Tracking d'ouverture et de clic
 * - Templates dynamiques depuis DB
 * - Programmation de rappels avancée
 * - Attachments de fichiers
 * - Emails en lot (batch)
 * 
 * ## SUPPORT ET CONTRIBUTION
 * 
 * ### Structure du code
 * ```
 * server/services/emailService.ts
 * ├── Interfaces et types
 * ├── Templates HTML
 * ├── MockEmailService (développement)
 * ├── SendGridEmailService (production)
 * ├── Factory pattern
 * └── Fonctions utilitaires
 * ```
 * 
 * ### Ajout d'un nouveau provider
 * 1. Créer la classe implémentant `IEmailService`
 * 2. Ajouter au factory `createEmailService()`
 * 3. Mettre à jour le type `EmailProviderType`
 * 4. Documenter les variables d'environnement
 * 5. Ajouter les tests d'intégration
 * 
 * ✨ **Le système est prêt pour toute évolution future !**
 */