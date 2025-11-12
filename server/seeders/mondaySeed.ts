import { storage } from "../storage-poc";
import { withErrorHandling } from './utils/error-handler';
import { logger } from './utils/logger';
import type { 
  InsertTempsPose, InsertAo, InsertProject, InsertAoContacts, InsertProjectContacts, 
  InsertMetricsBusiness, InsertSupplierSpecializations
} from "@shared/schema";
import crypto from "crypto";

// ========================================
// CONFIGURATION DU SEEDER MONDAY.COM
// ========================================

interface MondaySeedConfig {
  tempsPose: { count: 40; priority: 1 };   // Critical pour planning automatique
  aos: { count: 911; priority: 2 };       // Core business gestion AO
  projects: { count: 1000; priority: 3 }; // Essential projets enrichis
  contacts: { count: 9; priority: 4 };    // Relations importantes
  metricsBusiness: { count: 48; priority: 5 }; // KPIs tableau bord
}

const MONDAY_SEED_CONFIG: MondaySeedConfig = {
  tempsPose: { count: 40, priority: 1 },
  aos: { count: 911, priority: 2 },
  projects: { count: 1000, priority: 3 },
  contacts: { count: 9, priority: 4 },
  metricsBusiness: { count: 48, priority: 5 }
};

// ========================================
// DONNÉES RÉALISTES POUR MENUISERIE FRANÇAISE - RÉGION NORD
// ========================================

// Données réelles Monday.com TEMPS_DE_POSE_JLM
const TEMPS_POSE_TASKS = [
  { name: "POSE BLOC PORTE 1 Vantail", category: "MINT", type: "porte", unit: "unité", timeMin: 120 },
  { name: "POSE BLOC PORTE 2 Vantaux", category: "MINT", type: "porte", unit: "unité", timeMin: 180 },
  { name: "POSE DE FERME PORTE", category: "MINT", type: "porte", unit: "unité", timeMin: 30 },
  { name: "POSE DE CREMONE POMPIER", category: "MINT", type: "porte", unit: "unité", timeMin: 45 },
  { name: "POSE DE BEQUILLE", category: "MINT", type: "porte", unit: "unité", timeMin: 15 },
  { name: "POSE DE CHANT PLAT", category: "MINT", type: "fenetre", unit: "ml", timeMin: 20 },
  { name: "POSE DE BUTEE DE PORTE", category: "MINT", type: "porte", unit: "unité", timeMin: 25 },
  { name: "POSE DE PLACARDS", category: "MINT", type: "autre", unit: "m2", timeMin: 240 },
  { name: "POSE ETAGERES sur cornieres", category: "MINT", type: "autre", unit: "ml", timeMin: 60 },
  { name: "POSE DE GAINE TECHNIQUES", category: "MINT", type: "autre", unit: "ml", timeMin: 40 },
  { name: "POSE DE TRAPPES", category: "MINT", type: "autre", unit: "unité", timeMin: 90 },
  { name: "POSE DE PLINTHES", category: "MINT", type: "autre", unit: "ml", timeMin: 12 },
  { name: "BARDAGE", category: "MEXT", type: "autre", unit: "m2", timeMin: 180 },
  { name: "POSE GRILLE ANTI RONGEUR", category: "MEXT", type: "autre", unit: "ml", timeMin: 25 },
  { name: "POSE DE PARE PLUIE", category: "MEXT", type: "autre", unit: "m2", timeMin: 30 },
  { name: "OSSATURE CHEVRONS SUR EQUERRE", category: "MEXT", type: "autre", unit: "ml", timeMin: 45 },
  { name: "FENETRE PVC 2 vantaux", category: "MEXT", type: "fenetre", unit: "unité", timeMin: 240 },
  { name: "FENETRE PVC 1 vantail", category: "MEXT", type: "fenetre", unit: "unité", timeMin: 180 },
  { name: "PORTE FENETRE 2 vantaux", category: "MEXT", type: "fenetre", unit: "unité", timeMin: 300 },
  { name: "VOLET BATTANT", category: "MEXT", type: "volet", unit: "unité", timeMin: 120 },
  { name: "VOLET ROULANT ELECTRIQUE", category: "MEXT", type: "volet", unit: "unité", timeMin: 180 },
  { name: "PORTAIL COULISSANT", category: "HALL", type: "portail", unit: "unité", timeMin: 480 },
  { name: "PORTAIL BATTANT", category: "HALL", type: "portail", unit: "unité", timeMin: 360 },
  { name: "CLOISON VITRÉE", category: "MINT", type: "cloison", unit: "m2", timeMin: 150 },
  { name: "VERRIERE INDUSTRIELLE", category: "MINT", type: "verriere", unit: "m2", timeMin: 210 }
];

// Villes région Nord - données réelles Monday.com
const NORD_CITIES = [
  "GRANDE-SYNTHE", "DUNKERQUE", "LE CROTOY", "CALAIS", "BEUVRY", "HENIN BEAUMONT", 
  "WASQUEHAL", "CAMIERS", "LE TOUQUET", "RANG DU FLIERS", "LA MADELEINE", 
  "SAINS les MARQUIONS", "TETEGHEM", "BERCK", "LONGUENESSE", "DESVRES", 
  "MARCQ en BAROEUL", "CAMPIGNEULE LES PETITES", "DOUAI", "DOHEM", "CAMBRAI",
  "LOMME", "HARDELOT", "CLETY", "LAVENTIE", "RINXENT", "AIRE", "ST OMER",
  "ECQUES", "HAZEBROUCK", "BOULOGNE", "ARQUES", "BLENDECQUES", "WIZERNES",
  "FRUGES", "ETAPLES", "CAMPAGNE", "SYMPHONIE", "PERENCHIES", "BETHUNE"
];

// Noms d'entreprises réalistes Nord France
const CLIENT_COMPANIES = [
  "PARTENORD HABITAT", "NEXITY", "COGEDIM", "TMA", "NOVEBAT", "IMMO INVESTIM",
  "BASLY", "NOVALYS", "OGN Promotion", "THOMAS & PIRON", "REALITE",
  "AUDOLYS", "Septalia M&C", "ANGELLIER", "DELCLOY", "PHOENIX TISSERIN",
  "Commune de", "Mairie de", "SCI Les Jardins", "SAS", "SARL"
];

// Contacts réels Monday.com
const REAL_CONTACTS = [
  { name: "Laurent Fromentin", role: "directeur", company: "PARTENORD HABITAT" },
  { name: "Emmanuel Branque", role: "responsable", company: "NEXITY" },
  { name: "Aïcha Langot", role: "architecte", company: "Cabinet Nord Architectes" },
  { name: "Eric Rodin", role: "coordinateur", company: "COGEDIM" },
  { name: "Sylvie BAUDART", role: "responsable", company: "JLM MENUISERIE" },
  { name: "Ludivine COMBAZ", role: "assistant", company: "JLM MENUISERIE" },
  { name: "Nicolas LOVERGNE", role: "technicien", company: "JLM MENUISERIE" },
  { name: "Julien DUCROCQ", role: "ingenieur", company: "JLM MENUISERIE" },
  { name: "Stéphane VANBALEGHEM", role: "coordinateur", company: "BASLY" }
];

// ========================================
// GÉNÉRATEUR DE DONNÉES DÉTERMINISTE
// ========================================

class DeterministicGenerator {
  private seed: string;
  
  constructor(seed: string = "monday-seed-2025") {
    this.seed = seed;
  }

  // Générateur pseudo-aléatoire déterministe
  private hash(input: string): number {
    const hash = crypto.createHash('md5').update(`${this.seed}-${input}`).digest('hex');
    return parseInt(hash.substring(0, 8), 16);
  }

  // Sélection déterministe dans un array
  selectFromArray<T>(array: T[], identifier: string): T {
    const index = this.hash(identifier) % array.length;
    return array[index];
  }

  // Génération nombre dans une plage
  numberInRange(min: number, max: number, identifier: string): number {
    const hash = this.hash(identifier);
    return min + (hash % (max - min + 1));
  }

  // Génération ID déterministe
  generateId(prefix: string, index: number): string {
    const hash = crypto.createHash('md5')
      .update(`${this.seed}-${prefix}-${index}`)
      .digest('hex')
      .substring(0, 12);
    return `${prefix}-${hash}`;
  }

  // Génération date dans le futur (2-6 mois)
  futureDateInRange(identifier: string, minMonths: number = 2, maxMonths: number = 6): Date {
    const today = new Date();
    const monthsToAdd = this.numberInRange(minMonths, maxMonths, identifier);
    const daysOffset = this.numberInRange(0, 30, `${identifier}-days`);
    
    const futureDate = new Date(today);
    futureDate.setMonth(futureDate.getMonth() + monthsToAdd);
    futureDate.setDate(futureDate.getDate() + daysOffset);
    
    return futureDate;
  }
}

// ========================================
// SEEDER MONDAY.COM INTELLIGENT
// ========================================

export class MondaySeed {
  private generator: DeterministicGenerator;
  private logger = {
    info: (message: string, data?: unknown) => logger.info(`[MondaySeed] ${message}`, data || ''),
    warn: (message: string, d: unknown)unknown) => logger.warn($1),
    error: (message: string: unknown)unknown)unknown) => logger.error('Erreur', `[MondaySeed] ${message}`, error || '')
  };

  constructor() {
    this.generator = new DeterministicGenerator();
  }

  // ========================================
  // MÉTHODE PRINCIPALE : SEED TOUTES LES ENTITÉS
  // ========================================

  async seedAll(): Promise<{
    success: boolean;
    counts: Record<string, number>;
    errors: string[];
    executionTimeMs: number;
  }> {
    const startTime = Date.now();
    this.logger.info('🌱 Démarrage du seeding Monday.com déterministe...');
    
    const counts: Record<string, number> = {};
    const errors: string[] = [];

    return withErrorHandling(
    async () => {

      // Ordre par priorité (tempsPose en premier car critique pour planning)
      const entities = [
        { name: 'tempsPose', method: () => this.seedTempsPose() },
        { name: 'contacts', method: () => this.seedContacts() },
        { name: 'aos', method: () => this.seedAos() },
        { name: 'projects', method: () => this.seedProjects() },
        { name: 'metricsBusiness', method: () => this.seedMetricsBusiness() }
      ];

      for (const entity of entities) {
        try {
          this.logger.info(`Seeding ${entity.name}...`);
          const count = await entity.method();
          counts[entity.name] = count;
          this.logger.info(`✅ ${entity.name}: ${count} entrées seedées`);
        
    },
    {
      operation: 'constructor',
service: 'mondaySeed',;
      metadata: {
                                                                                      }

                                                                                    });
      }

      // Seeder les relations après les entités principales
      return withErrorHandling(
    async () => {

        this.logger.info('Seeding relations ao_contacts...');
        const aoContactsCount = await this.seedAoContacts();
        counts['aoContacts'] = aoContactsCount;
        this.logger.info(`✅ aoContacts: ${aoContactsCount} relations seedées`);
      
    },
    {
      operation: 'constructor',
      service: 'mondaySeed',
      metadata: {
      });

      return withErrorHandling(
    async () => {

        this.logger.info('Seeding relations project_contacts...');
        const projectContactsCount = await this.seedProjectContacts();
        counts['projectContacts'] = projectContactsCount;
        this.logger.info(`✅ projectContacts: ${projectContactsCount} relations seedées`);
      
    },
    {
      operation: 'constructor',
      service: 'mondaySeed',
      metadata: {
      });

      const executionTimeMs = Date.now() - startTime;
      const totalEntries = Object.values(counts).reduce((sum, count) => sum + count, 0);
      
      this.logger.info(`🎯 Seeding terminé: ${totalEntries} entrées créées en ${executionTimeMs}ms`);
      this.logger.info('📊 Détail par entité:', counts);
      
      if (errors.length > 0) {
        this.logger.warn(`⚠️ ${errors.length} erreurs détectées:`, errors);
      }

      return {
        success: errors.length === 0,
        counts,
        errors,
        executionTimeMs
      };

    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      this.logger.error('❌ Erreur critique durante seeding:', error);
      
      return {
        success: false,
        counts,
        errors: [...errors, `Erreur critique: ${error instanceof Error ? error.message : 'Unknown error'}`],
        executionTimeMs
      };
    }
  }

  // ========================================
  // SEEDER TEMPS POSE (40 entrées - CRITIQUE)
  // ========================================

  private async seedTempsPose(): Promise<number> {
    const targetCount = MONDAY_SEED_CONFIG.tempsPose.count;
    let seededCount = 0;

    // Vérifier les entrées existantes pour éviter doublons
    const existingTempsPose = await storage.getTempsPose();
    const existingMap = new Map(existingTempsPose.map(tp => [`${tp.work_scope}-$) {tp.component_type}`, tp]));

    // Générer les données complètes (25 prédéfinies + 15 générées)
    const allTasks = [...TEMPS_POSE_TASKS];
    
    // Compléter avec des tâches générées pour atteindre 40
    while (allTasks.length < targetCount) {
      const categories = ["MEXT", "MINT", "HALL"];
      const types = ["fenetre", "porte", "volet", "portail", "cloison", "autre"];
      const units = ["unité", "m2", "ml"];
      
      const index = allTasks.length;
      const task = {
        name: `TÂCHE_GÉNÉRÉE_${index}`,
        category: this.generator.selectFromArray(categories, `task-cat-${index}`),
        type: this.generator.selectFromArray(types, `task-type-${index}`),
        unit: this.generator.selectFromArray(units, `task-unit-${index}`),
        timeMin: this.generator.numberInRange(15, 300, `task-time-${index}`)
      };
      allTasks.push(task);
    }

    // Prendre seulement les 40 premières
    const tasksToSeed = allTasks.slice(0, targetCount);

    for (let i = 0; i < tasksToSeed.length; i++) {
      const task = tasksToSeed[i];
      const uniqueKey = `${task.category}-${task.type}`;
      
      // Mode idempotent : skip si existe déjà
      if (existingMap.has(uniqueKey)) {
        continue;
      }

      const tempsPoseData: InsertTempsPose = {
        work_scope: task.category as unknown,
        component_type: task.tas unknown, unknown,
        unit: task.unit,
        time_per_unit_min: task.timeMin,
        calculation_method: "manual",
        notes: `Temps de pose pour ${task.name}`,
        is_active: true,
        monday_item_id: `monday-temps-${i}`
      };

      return withErrorHandling(
    async () => {

        await storage.createTempsPose(tempsPoseData);
        seededCount++;
      
    },
    {
      operation: 'constructor',
      service: 'mondaySeed',
      metadata: {
      });
    }

    return seededCount;
  }

  // ========================================
  // SEEDER CONTACTS (9 entrées) - Via maîtres d'œuvre 
  // ========================================

  private async seedContacts(): Promise<number> {
    const targetCount = MONDAY_SEED_CONFIG.contacts.count;
    let seededCount = 0;

    // Utiliser les maîtres d'œuvre existants ou créer d'abord des entreprises
    const existingMaitresOeuvre = await storage.getMaitresOeuvre();
    
    // Si pas assez de maîtres d'œuvre, créer d'abord des entreprises
    if (existingMaitresOeuvre.length < 5) {
      for (let i = 0; i < 5; i++) {
        const company = this.generator.selectFromArray(CLIENT_COMPANIES, `company-${i}`);
        const city = this.generator.selectFromArray(NORD_CITIES, `city-${i}`);
        
      await withErrorHandling(
    async () => {

          await storage.createMaitreOeuvre({
            name: `${company} ${city}`,
            siret: `${this.generator.numberInRange(10000000000000, 99999999999999, `siret-${i}`)}`,
            address: `${this.generator.numberInRange(1, 150, `addr-${i}`)} Rue du Commerce, ${city}`,
            phone: `03 ${this.generator.numberInRange(20, 29, `phone-${i}`)} ${this.generator.numberInRange(10, 99, `phone2-${i}`)} ${this.generator.numberInRange(10, 99, `phone3-${i}`)}`,
            email: `contact@${company.toLowerCase().replace(/\s+/g, '-')}.fr`
          });
        
    },
    {
      operation: 'constructor',
      service: 'mondaySeed',
      metadata: {
                                                                                      }

                                                                                    });
      }
    }

    // Récupérer les maîtres d'œuvre (nouveaux + existants)
    const maitresOeuvre = await storage.getMaitresOeuvre();
    
    // Créer des contacts pour les premiers maîtres d'œuvre
    for (let i = 0; i < Math.min(targetCount, REAL_CONTACTS.length, maitresOeuvre.length); i++) {
      const contactData = REAL_CONTACTS[i];
      const maitreOeuvre = maitresOeuvre[i % maitresOeuvre.length];
      
      await withErrorHandling(
    async () => {

        await storage.createContactMaitreOeuvre({
          maitreOeuvreId: maitreOeuvre.id,
          firstName: contactData.name.split(' ')[0],
          lastName: contactData.name.split(' ').slice(1).join(' '),
          email: `${contactData.name.toLowerCase().replace(/\s+/g, '.')}@${contactData.company.toLowerCase().replace(/\s+/g, '-')}.fr`,
          phone: `03 ${this.generator.numberInRange(20, 29, `phone-${i}`)} ${this.generator.numberInRange(10, 99, `phone2-${i}`)} ${this.generator.numberInRange(10, 99, `phone3-${i}`)}`,
          poste: contactData.role as unknown});
        seededCount++;
      
    },
    {
      operation: 'constructor',
      service: 'mondaySeed',
      metadata: {
                                                                                      }

                                                                                    });
    }

    return seededCount;
  }

  // ========================================
  // SEEDER AOS (911 entrées - CORE BUSINESS)
  // ========================================

  private async seedAos(): Promise<number> {
    const targetCount = MONDAY_SEED_CONFIG.aos.count;
    let seededCount = 0;

    const existingAos = await storage.getAos();
    const existingRefs = new Set(existingAos.map(ao => ao.reference));

    const aoCategoriesDistribution = ["MEXT", "MINT", "HALL"];
    const operationalStatuses = ["en_cours", "a_relancer", "gagne", "perdu"];

    for (let i = 0; i < targetCount; i++) {
      const reference = `AO-MND-${String(i + 1).padStart(4, '0')}`;
      
      // Mode idempotent
      if (existingRefs.has(reference)) {
        continue;
      }

      const city = this.generator.selectFromArray(NORD_CITIES, `ao-city-${i}`);
      const clientCompany = this.generator.selectFromArray(CLIENT_COMPANIES, `ao-client-${i}`);
      const category = this.generator.selectFromArray(aoCategoriesDistribution, `ao-cat-${i}`);
      
      const aoData: InsertAo = {
        id: this.generator.generateId('ao', i),
        reference,
        client: `${clientCompany} ${city}`,
        location: city,
        departement: this.generator.selectFromArray(["59", "62", "80"], `ao-dep-${i}`),
        description: `Projet ${category} - ${city}`,
        menuiserieType: this.generator.selectFromArray(["fenetre", "porte", "portail"], `ao-menu-${i}`),
        estimatedAmount: this.generator.numberInRange(10000, 500000, `ao-amount-${i}`),
        maitreOeuvre: `Cabinet ${this.generator.selectFromArray(["Architecte", "Technique", "Études"], `ao-mo-${i}`)} ${city}`,
        source: this.generator.selectFromArray(["website", "partner", "mail"], `ao-source-${i}`),
        operationalStatus: this.generator.selectFromArray(operationalStatuses, `ao-statusas unknown, as unknown,
        aoCategoras unknown,gas unknown unknown,
        dateOS: this.generator.futureDateInRange(`ao-date-${i}`, 0, 3),
        delaiContractuel: this.generator.numberInRange(30, 180, `ao-delai-${i}`).toString(),
        selectionComment: `AO importé depuis Monday.com - Référence originale: monday-ao-${i}`,
        monday_item_id: `monday-ao-${i}`
      };

      return withErrorHandling(
    async () => {

        await storage.createAo(aoData);
        seededCount++;
      
    },
    {
      operation: 'constructor',
      service: 'mondaySeed',
      metadata: {
      });
    }

    return seededCount;
  }

  // ========================================
  // SEEDER PROJECTS (1000 entrées)
  // ========================================

  private async seedProjects(): Promise<number> {
    const targetCount = MONDAY_SEED_CONFIG.projects.count;
    let seededCount = 0;

    const existingProjects = await storage.getProjects();
    const existingNames = new Set(existingProjects.map(p => p.name));

    const projectStatuses = ["passation", "etude", "planification", "approvisionnement", "chantier"];

    for (let i = 0; i < targetCount; i++) {
      const city = this.generator.selectFromArray(NORD_CITIES, `proj-city-${i}`);
      const projectName = `Projet ${city} - Chantier ${String(i + 1).padStart(4, '0')}`;
      
      // Mode idempotent
      if (existingNames.has(projectName)) {
        continue;
      }

      const startDate = this.generator.futureDateInRange(`proj-start-${i}`, 1, 4);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + this.generator.numberInRange(2, 8, `proj-duration-${i}`));

      const projectData: InsertProject = {
        id: this.generator.generateId('proj', i),
        name: projectName,
        description: `Projet de menuiserie ${city}`,
        siteAddress: `${this.generator.numberInRange(1, 150, `proj-addr-${i}`)} Rue ${this.generator.selectFromArray(["de la Paix", "du Commerce", "de l'Église", "des Tilleuls"], `proj-street-${i}`)}, ${city}`,
        startDatePlanned: startDate,
        endDatePlanned: endDate,
        contractAmount: this.generator.numberInRange(25000, 750000, `proj-amount-${i}`).toString(),
        status: this.generator.selectFromArray(projectStatuses, `proas unknown,sas unknown)unknunknown,any,
        lotCount: this.generator.numberInRange(1, 12, `proj-lots-${i}`),
        notes: `Projet généré depuis Monday.com - Référence: monday-proj-${i}`,
        monday_item_id: `monday-proj-${i}`
      };

      return withErrorHandling(
    async () => {

        await storage.createProject(projectData);
        seededCount++;
      
    },
    {
      operation: 'constructor',
      service: 'mondaySeed',
      metadata: {
      });
    }

    return seededCount;
  }

  // ========================================
  // SEEDER MÉTRIQUES BUSINESS (48 entrées)
  // ========================================

  private async seedMetricsBusiness(): Promise<number> {
    const targetCount = MONDAY_SEED_CONFIG.metricsBusiness.count;
    let seededCount = 0;

    const metricTypes = [
      "conversion_rate_ao_offer", "conversion_rate_offer_project", 
      "avg_delay_days", "revenue_forecast", "team_load_percentage", 
      "margin_percentage", "project_duration", "supplier_response_time"
    ];

    const entityTypes = ["ao", "project", "offer", "team"];

    for (let i = 0; i < targetCount; i++) {
      const metricData: InsertMetricsBusiness = {
        metric_type: this.generator.selectFromArray(metricTypes, as unknown,-as unknown{unknunknown, as any,
        entity_type: this.generator.selectFromArray(entityTypesas unknown,ias unknowntunknunknown,i}`) as any,
        entity_id: this.generator.generateId('entity', i),
        period_start: this.generator.futureDateInRange(`metric-start-${i}`, -3, -1),
        period_end: this.generator.futureDateInRange(`metric-end-${i}`, 0, 1),
        value: this.generator.numberInRange(1, 100, `metric-value-${i}`).toString(),
        calculation_method: "automatic"
      };

      await withErrorHandling(
    async () => {

        await storage.createMetricsBusiness(metricData);
        seededCount++;
      
    },
    {
      operation: 'constructor',
      service: 'mondaySeed',
      metadata: {
      });
    }

    return seededCount;
  }

  // ========================================
  // SEEDER RELATIONS AO-CONTACTS
  // ========================================

  private async seedAoContacts(): Promise<number> {
    let seededCount = 0;

    return withErrorHandling(
    async () => {

      const aos = await storage.getAos();
      const maitresOeuvre = await storage.getMaitresOeuvre();
      
      // Récupérer tous les contacts via maîtres d'œuvre
      const allContacts = [];
      for (const mo of maitresOeuvre) {
        const contacts = await storage.getContactsMaitreOeuvre(mo.id);
        allContacts.push(...contacts);
      }
      
      const existingRelations: unknown[] = []; // Simplified for now
      
      const existingPairs = new Set(existingRelati: unknunknown)unknown)el: any) => `${rel.ao_id}-${rel.contact_id}`));

      // Créer 1-3 contacts par AO (seulement pour les premiers 300 AO pour limiter)
      const limitedAos = aos.slice(0, 300);
      
      for (const ao of limitedAos) {
        const contactsPerAo = this.generator.numberInRange(1, 3, `ao-contacts-${ao.id}`);
        
        for (let i = 0; i < contactsPerAo && i < allContacts.length; i++) {
          const contact = this.generator.selectFromArray(allContacts, `ao-contact-${ao.id}-${i}`);
          const pairKey = `${ao.id}-${contact.id}`;
          
          if (existingPairs.has(pairKey)) {
            continue;
          }

          const relationData: InsertAoContacts = {
            ao_id: ao.id,
            contact_id: contact.id,
            link_type: this.generator.selectFromArray(["maitre_ouvrage", "maitre_oeuvre", "autre"], `link-type-${seededCount}`) as anas unknown}        try {
            await storage.createAoContact(relationData);
            seededCount++;
          
    },
    {
      operation: 'constructor',
service: 'mondaySeed',;
      metadata: {
                                                                                      }

                                                                                    });

    return seededCount;
  }

  // ========================================
  // SEEDER RELATIONS PROJECT-CONTACTS
  // ========================================

  private async seedProjectContacts(): Promise<number> {
    let seededCount = 0;

    return withErrorHandling(
    async () => {

      const projects = await storage.getProjects();
      const maitresOeuvre = await storage.getMaitresOeuvre();
      
      // Récupérer tous les contacts via maîtres d'œuvre
      const allContacts = [];
      for (const mo of maitresOeuvre) {
        const contacts = await storage.getContactsMaitreOeuvre(mo.id);
        allContacts.push(...contacts);
      }
      
      const existingRelat: unknown[]ny[] = []; // Simplified for now
      
      const existingPairs = new Set(existingRe: unknunknown)unknown)p((rel: any) => `${rel.project_id}-${rel.contact_id}`));

      // Créer 1-2 contacts par projet (seulement premiers 200 projets)
      const limitedProjects = projects.slice(0, 200);
      
      for (const project of limitedProjects) {
        const contactsPerProject = this.generator.numberInRange(1, 2, `proj-contacts-${project.id}`);
        
        for (let i = 0; i < contactsPerProject && i < allContacts.length; i++) {
          const contact = this.generator.selectFromArray(allContacts, `proj-contact-${project.id}-${i}`);
          const pairKey = `${project.id}-${contact.id}`;
          
          if (existingPairs.has(pairKey)) {
            continue;
          }

          const relationData: InsertProjectContacts = {
            project_id: project.id,
            contact_id: contact.id,
            link_type: this.generator.selectFromArray(["maitre_ouvrage", "maitre_oeuvre", "autre"], `proj-link-type-${seededCount}`) as unknown
     as unknown} try {
            await storage.createProjectContact(relationData);
            seededCount++;
          
    },
    {
      operation: 'constructor',
service: 'mondaySeed',;
      metadata: {
                                                                                      }

                                                                                    });

    return seededCount;
  }

  // ========================================
  // MÉTHODES DE VALIDATION ET RÉCONCILIATION
  // ========================================

  async validateSeedData(): Promise<{
    isValid: boolean;
    summary: Record<string, number>;
    issues: string[];
  }> {
    const issues: string[] = [];
    const summary: Record<string, number> = {};

    try {
      // Vérifier chaque entité
      const tempsPose = await storage.getAllTempsPose();
      summary.tempsPose = tempsPose.length;
      if (tempsPose.length < 35) {
        issues.push(`Temps pose insuffisant: ${tempsPose.length}/40 attendu`);
      }

      const aos = await storage.getAos();
      summary.aos = aos.length;
      if (aos.length < 800) {
        issues.push(`AOs insuffisants: ${aos.length}/911 attendu`);
      }

      const projects = await storage.getProjects();
      summary.projects = projects.length;
      if (projects.length < 900) {
        issues.push(`Projets insuffisants: ${projects.length}/1000 attendu`);
      }

      // Compter tous les contacts via maîtres d'œuvre
      const allMaitresOeuvre = await storage.getMaitresOeuvre();
      let contactsCount = 0;
      for (const mo of allMaitresOeuvre) {
        const contacts = await storage.getContactsMaitreOeuvre(mo.id);
        contactsCount += contacts.length;
      }
      summary.contacts = contactsCount;
      if (contactsCount < 8) {
        issues.push(`Contacts insuffisants: ${contactsCount}/9 attendu`);
      }

      return {
        isValid: issues.length === 0,
        summary,
        issues
      };

    } catch (error) {
      return {
        isValid: false,
        summary,
        issues: [`Erreur validation: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  // Réconciliation avec analysis JSON (mode lecture seule pour validation)
  static async reconcileWithAnalysisJson(): Promise<{
    expectedCounts: Record<string, number>;
    actualCounts: Record<string, number>;
    discrepancies: string[];
  }> {
    // Basé sur l'analyse JSON Monday.com réelle
    const expectedCounts = {
      tempsPose: 40,     // TEMPS_DE_POSE_JLM_1758620739.xlsx : 40 lignes
      aos: 911,          // AO_Planning_1758620539.xlsx : 911 lignes  
      projects: 1000,    // Copie_de_CHANTIERS_PROJET_1758620682.xlsx : 1000 lignes
      contacts: 9,       // Contacts_1758620760.xlsx : 9 lignes
      metricsBusiness: 48 // Distribution calculée pour KPIs
    };

    const actualCounts: Record<string, number> = {};
    const discrepancies: string[] = [];

    try {
      actualCounts.tempsPose = (await storage.getTempsPose()).length;
      actualCounts.aos = (await storage.getAos()).length;
      actualCounts.projects = (await storage.getProjects()).length;
      
      // Compter tous les contacts via maîtres d'œuvre
      const allMaitresOeuvre = await storage.getMaitresOeuvre();
      let contactsCount = 0;
      for (const mo of allMaitresOeuvre) {
        const contacts = await storage.getContactsMaitreOeuvre(mo.id);
        contactsCount += contacts.length;
      }
      actualCounts.contacts = contactsCount;
      
      // Métriques business - utiliser méthode existante ou compter par type
      actualCounts.metricsBusiness = 0; // Simplified for now

      // Détecter les écarts
      for (const [entity, expected] of Object.entries(expectedCounts)) {
        const actual = actualCounts[entity] || 0;
        const variance = Math.abs(expected - actual);
        const variancePercent = (variance / expected) * 100;
        
        if (variancePercent > 10) { // Tolérance 10%
          discrepancies.push(`${entity}: attendu ${expected}, trouvé ${actual} (écart ${variancePercent.toFixed(1)}%)`);
        }
      }

    } catch (error) {
      discrepancies.push(`Erreur réconciliation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { expectedCounts, actualCounts, discrepancies };
  }
}

// ========================================
// FONCTION D'EXPORT POUR UTILISATION
// ========================================

export async function runMondaySeed(): Promise<{
  success: boolean;
  counts: Record<string, number>;
  errors: string[];
  executionTimeMs: number;
  validation?: unknown;
  reconciliat: unknown;unknown;
}> {
  const seeder = new MondaySeed();
  
  const result = await seeder.seedAll();
  
  // Validation post-seed
  const validation = await seeder.validateSeedData();
  
  // Réconciliation avec analyse JSON
  const reconciliation = await MondaySeed.reconcileWithAnalysisJson();
  
  return {
    ...result,
    validation,
    reconciliation
  };
}