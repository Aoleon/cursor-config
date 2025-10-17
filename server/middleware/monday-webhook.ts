import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { mondayConfig } from '../config';
import { logger } from '../utils/logger';
import { getCorrelationId } from './correlation';

export function verifyMondaySignature(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const correlationId = getCorrelationId();
  const signature = req.headers['x-monday-signature'] as string;
  
  if (!signature) {
    logger.error('[Monday Webhook] Signature manquante', {
      metadata: {
        module: 'MondayWebhook',
        operation: 'verifySignature',
        correlationId,
        headers: Object.keys(req.headers)
      }
    });
    return res.status(401).json({ error: 'Missing signature' });
  }
  
  if (!mondayConfig.signingSecret) {
    logger.error('[Monday Webhook] Signing secret non configuré', {
      metadata: {
        module: 'MondayWebhook',
        operation: 'verifySignature',
        correlationId
      }
    });
    return res.status(500).json({ error: 'Webhook not configured' });
  }
  
  // Compute HMAC-SHA256
  const rawBody = req.body; // Buffer from express.raw()
  const hmac = crypto
    .createHmac('sha256', mondayConfig.signingSecret)
    .update(rawBody)
    .digest('base64');
  
  const expectedSignature = hmac;
  
  // Timing-safe compare
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
  
  if (!isValid) {
    logger.error('[Monday Webhook] Signature invalide', {
      metadata: {
        module: 'MondayWebhook',
        operation: 'verifySignature',
        correlationId,
        received: signature.substring(0, 20) + '...',
        expected: expectedSignature.substring(0, 20) + '...'
      }
    });
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  logger.info('[Monday Webhook] Signature validée', {
    metadata: {
      module: 'MondayWebhook',
      operation: 'verifySignature',
      correlationId
    }
  });
  
  // Parse JSON body pour le handler
  try {
    req.body = JSON.parse(rawBody.toString());
    next();
  } catch (error) {
    logger.error('[Monday Webhook] JSON invalide', {
      metadata: {
        module: 'MondayWebhook',
        operation: 'verifySignature',
        correlationId,
        error: error instanceof Error ? error.message : String(error)
      }
    });
    return res.status(400).json({ error: 'Invalid JSON' });
  }
}
