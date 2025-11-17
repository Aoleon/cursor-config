/**
 * Workspace Module
 * 
 * Provides workspace-specific data aggregation for different user roles
 */

import { Router } from 'express';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { createWorkspaceRouter } from './routes';

export function createWorkspaceModule(storage: IStorage, eventBus: EventBus): Router {
  return createWorkspaceRouter(storage, eventBus);
}

export { createWorkspaceRouter } from './routes';

