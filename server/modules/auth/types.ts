/**
 * Authentication Module Type Definitions
 * 
 * This module contains all type definitions related to authentication,
 * including session management, OIDC, and basic auth.
 */

// Extension du type Session pour inclure la propriété user
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      profileImageUrl: string | null;
      role: string;
      isBasicAuth?: boolean;
    };
  }
}

// Extension du type Express Request pour inclure la propriété user
// Support pour BOTH basic auth ET OIDC authentication
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      // Basic auth fields (optional car OIDC les extrait de claims)
      id?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      profileImageUrl?: string | null;
      role?: string;
      isBasicAuth?: boolean;
      // OIDC-specific fields
      claims?: {
        sub?: string;
        email?: string;
        first_name?: string;
        last_name?: string;
        profile_image_url?: string | null;
        [key: string]: unknown;
      };
      isOIDC?: boolean;
    };
  }
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  role: string;
  isBasicAuth?: boolean;
  isOIDC?: boolean;
  claims?: unknown;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

export interface BasicAuthRequest {
  username: string;
  password: string;
}

export interface AuthHealthStatus {
  timestamp: string;
  session: {
    exists: boolean;
    hasUser: boolean;
    userType: 'basic_auth' | 'oidc' | 'none';
  };
  auth: {
    isAuthenticated: boolean;
    hasPassportUser: boolean;
    middlewareReady: boolean;
  };
  services: {
    auditService: boolean;
    eventBus: boolean;
    storage: boolean;
  };
}