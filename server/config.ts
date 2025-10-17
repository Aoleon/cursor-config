import { logger } from './utils/logger';

export const mondayConfig = {
  apiKey: process.env.MONDAY_API_KEY || '',
  signingSecret: process.env.MONDAY_SIGNING_SECRET || ''
};

// Validation startup
if (!mondayConfig.apiKey) {
  logger.warn('MONDAY_API_KEY not configured - Monday.com integration disabled', {
    metadata: {
      module: 'Config',
      operation: 'startup',
      service: 'Monday.com'
    }
  });
}

if (!mondayConfig.signingSecret) {
  logger.warn('MONDAY_SIGNING_SECRET not configured - webhook disabled', {
    metadata: {
      module: 'Config',
      operation: 'startup',
      service: 'Monday.com Webhook'
    }
  });
}
