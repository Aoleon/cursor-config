/**
 * MIGRATION STORAGE INTERFACE
 * 
 * Interface minimale pour les opérations de migration Monday → Saxium
 * Contient uniquement les méthodes nécessaires à MondayMigrationServiceEnhanced
 */

import type { Ao, InsertAo, Project, InsertProject, Supplier, InsertSupplier } from '@shared/schema';

/**
 * Interface limitée pour migration Monday
 * DatabaseStorage implémente ces méthodes, contrairement à IStorage complète
 */
export interface IMigrationStorage {
  // AOs - lecture et création
  getAos(): Promise<Ao[]>;
  createAo(data: InsertAo): Promise<Ao>;
  
  // Projects - lecture et création
  getProjects(): Promise<Project[]>;
  createProject(data: InsertProject): Promise<Project>;
  
  // Suppliers - lecture et création
  getSuppliers(): Promise<Supplier[]>;
  createSupplier(data: InsertSupplier): Promise<Supplier>;
}
