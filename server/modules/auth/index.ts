/**
 * Authentication Module
 * 
 * This module handles all authentication-related functionality including:
 * - Basic authentication (development)
 * - OIDC authentication
 * - Session management
 * - User authentication status
 */

export { createAuthRouter, default as authRouter } from './routes';
export * from './types';