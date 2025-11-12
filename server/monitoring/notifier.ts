/**
 * Service de notification pour l'envoi des alertes
 * Gère l'envoi d'emails, Slack et autres canaux de notification
 */

import sgMail from '@sendgrid/mail';
import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import { logger } from '../utils/logger';
import { Alert } from './alert-manager';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'log';
  enabled: boolean;
  config?: unknown;
}

export interface NotificationTemplate {
  subject: string;
  body: string;
  format: 'text' | 'html';
}

export interface NotificationResult {
  success: boolean;
  channel: string;
  timestamp: Date;
  error?: string;
}

// ========================================
// CLASSE PRINCIPALE NOTIFIER
// ========================================

export class Notifier {
  private emailEnabled: boolean = false;
  private slackEnabled: boolean = false;
  private webhookUrl?: string;
  private alertEmailRecipients: string[] = [];
  private emailFrom = 'alerts@saxium.app';
  
  constructor() {
    // Configurer SendGrid si disponible
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.emailEnabled = true;
      
      // Récupérer les destinataires d'alertes
      if (process.env.ALERT_EMAIL) {
        this.alertEmailRecipients = process.env.ALERT_EMAIL.split(',').map(e => e.trim());
      }
      
      logger.info('Service de notification email configuré', { metadata: {
          service: 'Notifier',
          recipients: this.alertEmailRecipients.length
              }

            });
    }
    
    // Configurer Slack si disponible
    if (process.env.SLACK_WEBHOOK_URL) {
      this.webhookUrl = process.env.SLACK_WEBHOOK_URL;
      this.slackEnabled = true;
      
      logger.info('Service de notification Slack configuré', { metadata: {
          service: 'Notifier'
              }

            });
    }

  /**
   * Envoie une alerte via tous les canaux configurés
   */
  async sendAlert(alert: Alert): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    const channels = this.determineChannels(alert);
    
    for (const channel of channels) {
      await withErrorHandling(
    async () => {

        const result = await this.sendViaChannel(channel, alert);
        results.push(result);
      
    },
    {
      operation: 'constructor',
      service: 'notifier',
      metadata: {}
    });
      }
    
    return results;
  }

  /**
   * Détermine les canaux de notification selon la sévérité
   */
  private determineChannels(alert: Alert): string[] {
    const channels: string[] = ['log'];  // Log toujours actif
    
    // Email pour les alertes critiques et hautes
    if (this.emailEnabled && (alert.severity === 'critical' || alert.severity === 'high')) {
      channels.push('email');
    }
    
    // Slack pour toutes les alertes sauf low
    if (this.slackEnabled && alert.severity !== 'low') {
      channels.push('slack');
    }
    
    return channels;
  }

  /**
   * Envoie via un canal spécifique
   */
  private async sendViaChannel(channel: string, alert: Alert): Promise<NotificationResult> {
    const timestamp = new Date();
    
    switch (channel) {
      case 'email':
        await this.sendEmail(alert);
        return { success: true, channel: 'email', timestamp };
        
      case 'slack':
        await this.sendToSlack(alert);
        return { success: true, channel: 'slack', timestamp };
        
      case 'webhook':
        await this.sendToWebhook(alert);
        return { success: true, channel: 'webhook', timestamp };
        
      case 'log':
      default:
        this.logAlert(alert);
        return { success: true, channel: 'log', timestamp };
    }

  /**
   * Envoie une alerte par email
   */
  async sendEmail(alert: Alert): Promise<void> {
    if (!this.emailEnabled || this.alertEmailRecipients.length === 0) {
      throw new AppError('Email non configuré ou pas de destinataires', 500);
    }
    
    const template = this.formatEmailTemplate(alert);
    
    const msg = {
      to: this.alertEmailRecipients,
      from: this.emailFrom,
      subject: template.subject,
      html: template.body,
      text: this.stripHtml(template.body)
    };
    
    return withErrorHandling(
    async () => {

      await sgMail.send(msg);
      
      logger.info('Alerte email envoyée', { metadata: {
          service: 'Notifier',
          alertId: alert.id,
          recipients: this.alertEmailRecipients.length

            });
    
    },
    {
      operation: 'constructor',
      service: 'notifier',
      metadata: {}
    });
  }

  /**
   * Envoie une alerte vers Slack
   */
  async sendToSlack(alert: Alert): Promise<void> {
    if (!this.slackEnabled || !this.webhookUrl) {
      throw new AppError('Slack non configuré', 500);
    }
    
    const payload = this.formatSlackMessage(alert);
    
    return withErrorHandling(
    async () => {

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new AppError(`Slack webhook error: ${response.status}`, 500);
      }
      
      logger.info('Alerte Slack envoyée', { metadata: {
          service: 'Notifier',
          alertId: alert.id
              }

            });
    
    },
    {
      operation: 'constructor',
      service: 'notifier',
      metadata: {}
    });
  }

  /**
   * Envoie vers un webhook générique
   */
  async sendToWebhook(alert: Alert): Promise<void> {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    
    if (!webhookUrl) {
      throw new AppError('Webhook non configuré', 500);
    }
    
    const payload = {
      id: alert.id,
      name: alert.name,
      severity: alert.severity,
      status: alert.status,
      message: alert.message,
      triggeredAt: alert.triggeredAt,
      metrics: alert.metrics,
      details: alert.details
    };
    
    return withErrorHandling(
    async () => {

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Alert-Severity': alert.severity,
          'X-Alert-Name': alert.name
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new AppError(`Webhook error: ${response.status}`, 500);
      }
      
      logger.info('Alerte webhook envoyée', { metadata: {
          service: 'Notifier',
          alertId: alert.id,
          url: webhookUrl
              }

            });
    
    },
    {
      operation: 'constructor',
      service: 'notifier',
      metadata: {}
    });
  }

  /**
   * Log l'alerte
   */
  private logAlert(alert: Alert): void {
    const emoji = this.getSeverityEmoji(alert.severity);
    const message = `${emoji} ALERTE [${alert.severity.toUpperCase()}]: ${alert.name}`;
    
    const context = {
      service: 'Notifier',
      metadata: {
        alertId: alert.id,
        severity: alert.severity,
        status: alert.status,
        message: alert.message,
        metrics: alert.details?.metrics
              }

                                                                                  });
    
    // Log selon la sévérité
    switch (alert.severity) {
case 'critical':;
        logger.fatal(message, undefined, context);
        break;
case 'high':;
        logger.error(message, undefined, context);
        break;
case 'medium':;
        logger.warn(message, context);
        break;
      default:
        logger.info(message, context);
    }

  /**
   * Formate le template email
   */
  private formatEmailTemplate(alert: Alert): NotificationTemplate {
    const emoji = this.getSeverityEmoji(alert.severity);
    const color = this.getSeverityColor(alert.severity);
    const timestamp = alert.triggeredAt.toLocaleString('fr-FR');
    
    const subject = `${emoji} [SAXIUM ${alert.severity.toUpperCase()}] ${alert.name}`;
    
    const metricsHtml = alert.details?.metrics ? 
      Object.entries(alert.details.metrics)
        .map(([key, value]) => `<li><strong>${this.formatMetricKey(key)}:</strong> ${value}</li>`)
        .join('') : '';
    
    const body = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { 
            background: ${color}; 
            color: white; 
            padding: 20px; 
            border-radius: 5px 5px 0 0; 
          }
          .content { 
            background: #f9f9f9; 
            padding: 20px; 
            border: 1px solid #ddd; 
            border-radius: 0 0 5px 5px; 
          }
          .metrics { 
            background: white; 
            padding: 15px; 
            border-radius: 5px; 
            margin-top: 15px; 
          }
          .footer { 
            margin-top: 20px; 
            padding-top: 20px; 
            border-top: 1px solid #ddd; 
            font-size: 0.9em; 
            color: #666; 
          }
          .severity-badge {
            display: inline-block;
            padding: 5px 10px;
            background: ${color};
            color: white;
            border-radius: 3px;
            font-weight: bold;
            text-transform: uppercase;
          }
          ul { margin: 10px 0; }
          li { margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${emoji} Alerte SAXIUM</h2>
            <p style="margin: 0;"><strong>${alert.name}</strong></p>
          </div>
          
          <div class="content">
            <p><span class="severity-badge">${alert.severity}</span></p>
            
            <p><strong>Message:</strong> ${alert.message}</p>
            
            <p><strong>Déclenchée le:</strong> ${timestamp}</p>
            
            ${metricsHtml ? `
              <div class="metrics">
                <h3>Métriques détaillées:</h3>
                <ul>
                  ${metricsHtml}
                </ul>
              </div>
            ` : ''}
            
            <div class="footer">
              <p>Cette alerte a été générée automatiquement par le système de monitoring SAXIUM.</p>
              <p>Pour modifier les paramètres d'alerte, accédez au dashboard de monitoring.</p>
            </div>
      </body>
      </html>
    `;
    
    return {
      subject,
      body,
      format: 'html'
    };
  }

  /**
   * Formate le message Slack
   */
  private formatSlackMessage(alert: Alert): unknown {
    const emoji = this.getSeverityEmoji(alert.severity);
    const color = this.getSeverityColor(alert.severity);
    const timestamp = Math.floor(alert.triggeredAt.getTime() / 1000);
    
    const fields = [];
    
    // Ajouter les métriques pertinentes
    if (alert.details?.metrics) {
      Object.entries(alert.details.metrics).forEach(([key, value]) => {
        fields.push({
          title: this.formatMetricKey(key),
          value: String(value),
          short: true
        });
    }
    
    return {
      text: `${emoji} Alerte SAXIUM: ${alert.name}`,
      attachments: [
        {
          color: color,
          fallback: `[${alert.severity.toUpperCase()}] ${alert.name}: ${alert.message}`,
          title: alert.name,
          text: alert.message,
          fields: fields,
          footer: 'SAXIUM Monitoring',
          ts: timestamp,
          mrkdwn_in: ['text', 'fields']
        }
      ]
    };
  }

  /**
   * Récupère l'emoji selon la sévérité
   */
  private getSeverityEmoji(severity: Alert['severity']): string {
    const emojis = {
      critical: '🚨',
      high: '⚠️',
      medium: '⏰',
      low: 'ℹ️'
    };
    return emojis[severity] || '📊';
  }

  /**
   * Récupère la couleur selon la sévérité
   */
  private getSeverityColor(severity: Alert['severity']): string {
    const colors = {
      critical: '#d32f2f',  // Rouge
      high: '#f57c00',      // Orange
      medium: '#fbc02d',    // Jaune
      low: '#388e3c'        // Vert
    };
    return colors[severity] || '#1976d2';
  }

  /**
   * Formate une clé de métrique pour l'affichage
   */
  private formatMetricKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  }

  /**
   * Supprime les balises HTML d'un texte
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Teste la configuration des notifications
   */
  async testNotifications(): Promise<{
    email: boolean;
    slack: boolean;
    webhook: boolean;
  }> {
    const testAlert: Alert = {
      id: 'test_' + Date.now(),
      ruleId: 'test',
      name: 'Test Alert',
      severity: 'low',
      status: 'active',
      triggeredAt: new Date(),
      metrics: {
        errorRate: 0,
        errorRateTrend: 'stable',
        totalErrors: 0,
        criticalErrors: 0,
        dbErrors: 0,
        apiErrors: 0,
        authErrors: 0,
        validationErrors: 0,
        aiFailures: 0,
        rateLimitHits: 0,
        circuitBreakersOpen: 0
      },
      message: 'Ceci est un test du système de notification',
      details: {
        test: true,
        timestamp: new Date().toISOString()
      },
      notificationsSent: 0
    };
    
    const results = {
      email: false,
      slack: false,
      webhook: false
    };
    
    // Test email
    if (this.emailEnabled) {
      return withErrorHandling(
    async () => {

        await this.sendEmail(testAlert);
        results.email = true;
      
    },
    {
      operation: 'constructor',
      service: 'notifier',
      metadata: {
      });
    }
    
    // Test Slack
    if (this.slackEnabled) {
      return withErrorHandling(
    async () => {

        await this.sendToSlack(testAlert);
        results.slack = true;
      
    },
    {
      operation: 'constructor',
      service: 'notifier',
      metadata: {
      });
    }
    
    // Test webhook
    if (process.env.ALERT_WEBHOOK_URL) {
      return withErrorHandling(
    async () => {

        await this.sendToWebhook(testAlert);
        results.webhook = true;
      
    },
    {
      operation: 'constructor',
      service: 'notifier',
      metadata: {
      });
    }
    
    logger.info('Tests de notification terminés', { metadata: {
        service: 'Notifier',
        results
            }

            });
    
    return results;
  }

// Instance singleton
let notifierInstance: Notifier | null = null;

export function getNotifier(): Notifier {
  if (!notifierInstance) {
    notifierInstance = new Notifier();
  }
  return notifierInstance;
}