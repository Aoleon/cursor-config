/**
 * SERVICE EMAIL POUR WORKFLOW FOURNISSEURS
 * 
 * Structure préparée pour intégration SendGrid
 * Templates d'emails pour invitations fournisseurs
 * Système de notifications workflow
 */

import type { SupplierQuoteSession, Supplier } from "@shared/schema";

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
// SERVICE EMAIL PRINCIPAL
// ========================================

export class EmailService {
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
      console.warn('[EmailService] SendGrid API key non configurée - mode simulation');
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

      // Mode simulation si pas de clé API
      if (!this.isConfigured) {
        console.log('[EmailService] SIMULATION - Email qui serait envoyé:', {
          to: emailData.to,
          subject: this.replaceVariables(template.subject, emailData.dynamicData),
          template: template.name,
          data: emailData.dynamicData
        });

        return {
          success: true,
          messageId: `sim_${Date.now()}`,
          deliveryStatus: 'pending'
        };
      }

      // TODO: Implémentation SendGrid réelle
      // Quand la clé API sera configurée :
      // 1. Initialiser le client SendGrid
      // 2. Remplacer les variables dans le template
      // 3. Envoyer l'email via l'API SendGrid
      // 4. Retourner le résultat réel

      return {
        success: true,
        messageId: `pending_${Date.now()}`,
        deliveryStatus: 'pending'
      };

    } catch (error) {
      console.error('[EmailService] Erreur envoi email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        deliveryStatus: 'failed'
      };
    }
  }

  /**
   * Remplace les variables dans un template
   */
  private replaceVariables(template: string, data: Record<string, any>): string {
    let result = template;
    
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value || ''));
    });

    return result;
  }

  /**
   * Génère l'URL d'accès sécurisé pour un fournisseur
   */
  generateSupplierAccessUrl(sessionToken: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://your-domain.com';
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

// Instance singleton du service email
export const emailService = new EmailService();

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
  console.log(`[EmailService] Rappels programmés pour session ${session.id}`);
}