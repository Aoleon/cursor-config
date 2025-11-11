/**
 * Chatbot Module Types
 * 
 * Type definitions specific to the chatbot module.
 * Most types are imported from @shared/schema.
 */

export interface ChatbotHealthCheck {
  chatbot_orchestration: string;
  ai_service: string;
  rbac_service: string;
  sql_engine: string;
  business_context: string;
  database: string;
  cache: string;
  overall_status: string;
  response_time_ms: number;
  services_available: number;
  services_total: number;
  uptime_info: {
    ai_models: string[];
    rbac_active: boolean;
    sql_security_enabled: boolean;
    business_context_loaded: boolean;
    cache_operational: boolean;
  };
}

export interface ChatbotErrorResponse {
  success: false;
  error: {
    type: string;
    message: string;
  };
  debug_info?: unknown;
}
