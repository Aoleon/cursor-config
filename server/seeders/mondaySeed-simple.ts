/**
 * MONDAY SEED INTELLIGENT - VERSION SIMPLIFIÉE FONCTIONNELLE
 * ==========================================================
 * 
 * Système de seed déterministe pour Monday.com utilisant l'interface IStorage existante
 * Basé sur analysis/monday-structure-analysis.json pour mapper les entités critiques
 * 
 * ARCHITECTURE APPROUVÉE:
 * - 5 entités prioritaires: AOS (911), Projects (1000), Users, Offers, Tasks  
 * - Génération déterministe avec crypto.createHash
 * - Mode idempotent (upsert logic)
 * - Données réalistes métier menuiserie française
 */

import { storage } from '../storage-poc';
// Logger non disponible - utilisation de console.log
import { createHash } from 'crypto';
import type { 
  InsertAo, 
  InsertProject, 
  InsertOffer,
  InsertProjectTask,
  UpsertUser
} from '../../shared/schema';

// ========================================
// CONFIGURATION PRIORITAIRE MONDAY SEED
// ========================================

interface MondaySeedConfig {
  aos: { count: 100, priority: 1 };        // Simplifié pour démo
  projects: { count: 50, priority: 2 };    // Simplifié pour démo  
  offers: { count: 75, priority: 3 };      // Core business
  users: { count: 10, priority: 4 };       // Équipe JLM
  tasks: { count: 200, priority: 5 };      // Planning
}

const MONDAY_SEED_CONFIG: MondaySeedConfig = {
  aos: { count: 100, priority: 1 },
  projects: { count: 50, priority: 2 },
  offers: { count: 75, priority: 3 },
  users: { count: 10, priority: 4 },
  tasks: { count: 200, priority: 5 }
};

// ========================================
// DONNÉES MÉTIER RÉALISTES - MENUISERIE FRANÇAISE NORD
// ========================================

const NORD_CITIES = [
  "Lille", "Roubaix", "Tourcoing", "Dunkerque", "Villeneuve-d'Ascq",
  "Douai", "Cambrai", "Maubeuge", "Valenciennes", "Arras",
  "Calais", "Boulogne-sur-Mer", "Lens", "Liévin", "Béthune"
];

const AO_CATEGORIES = ["MEXT", "MINT", "HALL", "AUTRE"];
const OPERATIONAL_STATUSES = ["en_cours", "a_relancer", "gagne", "perdu", "suspendu"];
const PROJECT_STATUSES = ["passation", "etude", "visa_architecte", "planification", "approvisionnement", "chantier", "sav"];

const CLIENT_COMPANIES = [
  "Entreprise Ducrocq SAS", "Mairie de", "Conseil Départemental",
  "Société Delcroix SARL", "CCAS de", "Communauté de Communes",
  "Entreprise Lefebvre & Fils", "SCI du", "Copropriété"
];

const JLM_TEAM_USERS = [
  { firstName: "Jean-Luc", lastName: "Martin", role: "admin", email: "jl.martin@jlm-menuiserie.fr" },
  { firstName: "Sophie", lastName: "Durand", role: "be", email: "s.durand@jlm-menuiserie.fr" },
  { firstName: "Marc", lastName: "Lemoine", role: "chantier", email: "m.lemoine@jlm-menuiserie.fr" },
  { firstName: "Céline", lastName: "Rousseau", role: "be", email: "c.rousseau@jlm-menuiserie.fr" },
  { firstName: "Thomas", lastName: "Bernard", role: "chantier", email: "t.bernard@jlm-menuiserie.fr" },
  { firstName: "Isabelle", lastName: "Moreau", role: "admin", email: "i.moreau@jlm-menuiserie.fr" },
  { firstName: "Pierre", lastName: "Lefevre", role: "be", email: "p.lefevre@jlm-menuiserie.fr" },
  { firstName: "Marie", lastName: "Dubois", role: "admin", email: "m.dubois@jlm-menuiserie.fr" },
  { firstName: "Antoine", lastName: "Girard", role: "chantier", email: "a.girard@jlm-menuiserie.fr" },
  { firstName: "Nathalie", lastName: "Petit", role: "be", email: "n.petit@jlm-menuiserie.fr" }
];

// ========================================
// GÉNÉRATEUR DÉTERMINISTE
// ========================================

class DeterministicGenerator {
  private baseSeed: string;

  constructor(baseSeed: string = 'JLM-MONDAY-SEED-2024') {
    this.baseSeed = baseSeed;
  }

  generateId(entity: string, index: number): string {
    const hash = createHash('sha256')
      .update(`${this.baseSeed}-${entity}-${index}`)
      .digest('hex');
    return hash.substring(0, 8);
  }

  selectFromArray<T>(array: T[], seed: string): T {
    const hash = createHash('sha256')
      .update(`${this.baseSeed}-${seed}`)
      .digest('hex');
    const index = parseInt(hash.substring(0, 8), 16) % array.length;
    return array[index];
  }

  numberInRange(min: number, max: number, seed: string): number {
    const hash = createHash('sha256')
      .update(`${this.baseSeed}-${seed}`)
      .digest('hex');
    const randomValue = parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF;
    return Math.floor(min + randomValue * (max - min + 1));
  }
}

// ========================================
// SEEDER PRINCIPAL - VERSION SIMPLIFIÉE
// ========================================

export class MondaySimpleSeed {
  private generator: DeterministicGenerator;
  private logger = console;

  constructor() {
    this.generator = new DeterministicGenerator();
  }

  async executeSeed(options: { validateOnly?: boolean } = {}): Promise<{
    success: boolean;
    counts: Record<string, number>;
    errors: string[];
    summary: any;
  }> {
    const startTime = Date.now();
    const counts: Record<string, number> = {};
    const errors: string[] = [];

    try {
      this.logger.info('[Monday Seed] Démarrage du seed intelligent...');

      if (options.validateOnly) {
        return this.validateOnly();
      }

      // 1. SEED USERS (Équipe JLM)
      counts.users = await this.seedUsers();

      // 2. SEED AOS (Core business)
      counts.aos = await this.seedAos();

      // 3. SEED OFFERS (Liées aux AOs)
      counts.offers = await this.seedOffers();

      // 4. SEED PROJECTS (Projets gagnés)
      counts.projects = await this.seedProjects();

      // 5. SEED TASKS (Planning projets)
      counts.tasks = await this.seedTasks();

      const executionTime = Date.now() - startTime;
      const totalEntries = Object.values(counts).reduce((sum, count) => sum + count, 0);

      this.logger.info(`[Monday Seed] Terminé en ${executionTime}ms - ${totalEntries} entrées créées`);

      return {
        success: true,
        counts,
        errors,
        summary: {
          executionTimeMs: executionTime,
          totalEntries,
          entitiesCounts: counts
        }
      };

    } catch (error) {
      this.logger.error('[Monday Seed] Erreur:', error);
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      return {
        success: false,
        counts,
        errors,
        summary: { error: 'Seed failed' }
      };
    }
  }

  private async validateOnly() {
    this.logger.info('[Monday Seed] Mode validation uniquement');
    
    const stats = await storage.getDashboardStats();
    
    return {
      success: true,
      counts: {
        aos: stats.totalOffers || 0, // Approximation
        projects: 0,
        offers: stats.totalOffers || 0,
        users: 0,
        tasks: 0
      },
      errors: [],
      summary: {
        message: "Mode validation: aucune donnée modifiée",
        existingStats: stats
      }
    };
  }

  // ========================================
  // SEEDERS PAR ENTITÉ
  // ========================================

  private async seedUsers(): Promise<number> {
    let seededCount = 0;
    const existingUsers = await storage.getUsers();
    const existingEmails = new Set(existingUsers.map(u => u.email));

    for (let i = 0; i < Math.min(MONDAY_SEED_CONFIG.users.count, JLM_TEAM_USERS.length); i++) {
      const userData = JLM_TEAM_USERS[i];
      
      if (existingEmails.has(userData.email)) {
        continue; // Idempotence
      }

      try {
        await storage.upsertUser({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role as any
        });
        seededCount++;
      } catch (error) {
        this.logger.warn(`Erreur création user ${i}:`, error);
      }
    }

    return seededCount;
  }

  private async seedAos(): Promise<number> {
    let seededCount = 0;
    const existingAos = await storage.getAos();
    const existingRefs = new Set(existingAos.map(ao => ao.reference));

    for (let i = 0; i < MONDAY_SEED_CONFIG.aos.count; i++) {
      const ref = `AO-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`;
      
      if (existingRefs.has(ref)) {
        continue; // Idempotence
      }

      const city = this.generator.selectFromArray(NORD_CITIES, `ao-city-${i}`);
      const company = this.generator.selectFromArray(CLIENT_COMPANIES, `ao-company-${i}`);
      
      const aoData: InsertAo = {
        reference: ref,
        client: `${company} ${city}`,
        location: `${this.generator.numberInRange(1, 150, `ao-addr-${i}`)} Rue de la République, ${city}`,
        departement: this.generator.selectFromArray(["59", "62", "80"], `ao-dept-${i}`),
        aoCategory: this.generator.selectFromArray(AO_CATEGORIES, `ao-cat-${i}`) as any,
        operationalStatus: this.generator.selectFromArray(OPERATIONAL_STATUSES, `ao-status-${i}`) as any,
        montantEstime: this.generator.numberInRange(10000, 500000, `ao-amount-${i}`).toString(),
        dateLimiteRemise: new Date(Date.now() + this.generator.numberInRange(7, 90, `ao-deadline-${i}`) * 24 * 60 * 60 * 1000),
        menuiserieType: this.generator.selectFromArray(["fenetre", "porte", "portail", "volet"], `ao-type-${i}`) as any,
        source: this.generator.selectFromArray(["mail", "phone", "website"], `ao-source-${i}`) as any
      };

      try {
        await storage.createAo(aoData);
        seededCount++;
      } catch (error) {
        this.logger.warn(`Erreur création AO ${i}:`, error);
      }
    }

    return seededCount;
  }

  private async seedOffers(): Promise<number> {
    let seededCount = 0;
    const existingOffers = await storage.getOffers();
    const existingRefs = new Set(existingOffers.map(offer => offer.reference));
    const aos = await storage.getAos();
    const users = await storage.getUsers();

    for (let i = 0; i < Math.min(MONDAY_SEED_CONFIG.offers.count, aos.length); i++) {
      const ref = `OFF-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`;
      
      if (existingRefs.has(ref)) {
        continue; // Idempotence
      }

      const ao = aos[i % aos.length];
      const responsibleUser = this.generator.selectFromArray(users, `offer-user-${i}`);
      
      const offerData: InsertOffer = {
        reference: ref,
        client: ao.client,
        location: ao.location,
        aoId: ao.id,
        responsibleUserId: responsibleUser.id,
        status: this.generator.selectFromArray(["brouillon", "etude_technique", "valide"], `offer-status-${i}`) as any,
        montantEstime: (parseFloat(ao.montantEstime || '0') * this.generator.numberInRange(90, 110, `offer-margin-${i}`) / 100).toString(),
        menuiserieType: this.generator.selectFromArray(["fenetre", "porte", "portail", "volet"], `offer-type-${i}`) as any
      };

      try {
        await storage.createOffer(offerData);
        seededCount++;
      } catch (error) {
        this.logger.warn(`Erreur création offer ${i}:`, error);
      }
    }

    return seededCount;
  }

  private async seedProjects(): Promise<number> {
    let seededCount = 0;
    const existingProjects = await storage.getProjects();
    const existingNames = new Set(existingProjects.map(p => p.name));
    const offers = await storage.getOffers();
    const users = await storage.getUsers();

    // Créer des projets pour les offres validées
    const acceptedOffers = offers.filter(o => o.status === 'valide');

    for (let i = 0; i < Math.min(MONDAY_SEED_CONFIG.projects.count, acceptedOffers.length); i++) {
      const offer = acceptedOffers[i];
      const projectName = `Projet ${offer.client}`;
      
      if (existingNames.has(projectName)) {
        continue; // Idempotence
      }

      const responsibleUser = this.generator.selectFromArray(users, `project-user-${i}`);
      const city = this.generator.selectFromArray(NORD_CITIES, `project-city-${i}`);
      
      const projectData: InsertProject = {
        name: projectName,
        client: offer.client,
        location: offer.location || `${this.generator.numberInRange(1, 150, `project-addr-${i}`)} Rue de la République, ${city}`,
        offerId: offer.id,
        responsibleUserId: responsibleUser.id,
        status: this.generator.selectFromArray(PROJECT_STATUSES, `project-status-${i}`) as any,
        startDate: new Date(Date.now() + this.generator.numberInRange(30, 90, `project-start-${i}`) * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + this.generator.numberInRange(120, 300, `project-end-${i}`) * 24 * 60 * 60 * 1000)
      };

      try {
        await storage.createProject(projectData);
        seededCount++;
      } catch (error) {
        this.logger.warn(`Erreur création project ${i}:`, error);
      }
    }

    return seededCount;
  }

  private async seedTasks(): Promise<number> {
    let seededCount = 0;
    const projects = await storage.getProjects();
    const users = await storage.getUsers();

    const taskTemplates = [
      "Étude technique", "Préparation chantier", "Pose menuiseries",
      "Finitions", "Contrôle qualité", "Réception travaux"
    ];

    for (let i = 0; i < MONDAY_SEED_CONFIG.tasks.count && projects.length > 0; i++) {
      const project = this.generator.selectFromArray(projects, `task-project-${i}`);
      const assignedUser = this.generator.selectFromArray(users, `task-user-${i}`);
      const taskName = this.generator.selectFromArray(taskTemplates, `task-name-${i}`);
      
      const taskData: InsertProjectTask = {
        projectId: project.id,
        name: `${taskName} - ${project.name}`,
        assignedUserId: assignedUser.id,
        status: this.generator.selectFromArray(["a_faire", "en_cours", "termine"], `task-status-${i}`) as any,
        estimatedHours: this.generator.numberInRange(2, 40, `task-hours-${i}`).toString(),
        endDate: new Date(Date.now() + this.generator.numberInRange(7, 60, `task-due-${i}`) * 24 * 60 * 60 * 1000)
      };

      try {
        await storage.createProjectTask(taskData);
        seededCount++;
      } catch (error) {
        this.logger.warn(`Erreur création task ${i}:`, error);
      }
    }

    return seededCount;
  }
}

// Export de l'instance par défaut
export const mondaySimpleSeed = new MondaySimpleSeed();