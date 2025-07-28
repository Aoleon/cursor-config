import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertOfferSchema, 
  insertProjectSchema, 
  insertAoSchema, 
  insertSupplierRequestSchema, 
  insertQuotationSchema, 
  insertProjectTaskSchema, 
  insertBeWorkloadSchema, 
  insertValidationMilestoneSchema,
  aos,
  offers,
  projects,
  projectTasks,
  quotations,
  supplierRequests,
  validationMilestones,
  beWorkload,
  interventions,
  users
} from "@shared/schema";
import { db } from "./db";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes - Temporarily disabled authentication
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Return mock user for testing
      const mockUser = {
        id: "test-user-1",
        email: "sylvie.be@jlm-menuiserie.fr",
        firstName: "Sylvie",
        lastName: "Martin",
        role: "responsable_be",
        profileImageUrl: null
      };
      res.json(mockUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Validation Milestones routes
  app.get('/api/validation-milestones/:offerId?', async (req, res) => {
    try {
      const { offerId } = req.params;
      let milestones;
      
      if (offerId && offerId !== 'undefined') {
        milestones = await storage.getValidationMilestonesByOffer(offerId);
      } else {
        milestones = await storage.getAllValidationMilestones();
      }
      
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching validation milestones:", error);
      res.status(500).json({ message: "Failed to fetch validation milestones" });
    }
  });

  app.post('/api/validation-milestones/', async (req, res) => {
    try {
      const milestone = await storage.createValidationMilestone(req.body);
      res.status(201).json(milestone);
    } catch (error) {
      console.error("Error creating validation milestone:", error);
      res.status(500).json({ message: "Failed to create validation milestone" });
    }
  });

  app.patch('/api/validation-milestones/:id', async (req, res) => {
    try {
      const milestone = await storage.updateValidationMilestone(req.params.id, req.body);
      res.json(milestone);
    } catch (error) {
      console.error("Error updating validation milestone:", error);
      res.status(500).json({ message: "Failed to update validation milestone" });
    }
  });

  // AO routes
  app.get('/api/aos', async (req, res) => {
    try {
      const aos = await storage.getAos();
      res.json(aos);
    } catch (error) {
      console.error("Error fetching AOs:", error);
      res.status(500).json({ message: "Failed to fetch AOs" });
    }
  });

  app.get('/api/aos/:id', async (req, res) => {
    try {
      const ao = await storage.getAo(req.params.id);
      if (!ao) {
        return res.status(404).json({ message: "AO not found" });
      }
      res.json(ao);
    } catch (error) {
      console.error("Error fetching AO:", error);
      res.status(500).json({ message: "Failed to fetch AO" });
    }
  });

  app.post('/api/aos', async (req, res) => {
    try {
      const validatedData = insertAoSchema.parse(req.body);
      const ao = await storage.createAo(validatedData);
      res.status(201).json(ao);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating AO:", error);
      res.status(500).json({ message: "Failed to create AO" });
    }
  });

  // Offer routes
  app.get('/api/offers', async (req, res) => {
    try {
      const { search, status } = req.query;
      const offers = await storage.getOffers(
        search as string,
        status as string
      );
      res.json(offers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      res.status(500).json({ message: "Failed to fetch offers" });
    }
  });

  app.get('/api/offers/:id', async (req, res) => {
    try {
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }
      res.json(offer);
    } catch (error) {
      console.error("Error fetching offer:", error);
      res.status(500).json({ message: "Failed to fetch offer" });
    }
  });

  app.post('/api/offers', async (req, res) => {
    try {
      const validatedData = insertOfferSchema.parse(req.body);
      const offer = await storage.createOffer(validatedData);
      res.status(201).json(offer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating offer:", error);
      res.status(500).json({ message: "Failed to create offer" });
    }
  });

  app.patch('/api/offers/:id', async (req, res) => {
    try {
      const updateData = insertOfferSchema.partial().parse(req.body);
      const offer = await storage.updateOffer(req.params.id, updateData);
      res.json(offer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating offer:", error);
      res.status(500).json({ message: "Failed to update offer" });
    }
  });

  app.delete('/api/offers/:id', async (req, res) => {
    try {
      await storage.deleteOffer(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting offer:", error);
      res.status(500).json({ message: "Failed to delete offer" });
    }
  });

  // Project routes
  app.get('/api/projects', async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post('/api/projects', async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.patch('/api/projects/:id', async (req, res) => {
    try {
      const updateData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, updateData);
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Project task routes
  app.get('/api/projects/:projectId/tasks', async (req, res) => {
    try {
      const tasks = await storage.getProjectTasks(req.params.projectId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching project tasks:", error);
      res.status(500).json({ message: "Failed to fetch project tasks" });
    }
  });

  app.post('/api/projects/:projectId/tasks', async (req, res) => {
    try {
      const validatedData = insertProjectTaskSchema.parse({
        ...req.body,
        projectId: req.params.projectId,
      });
      const task = await storage.createProjectTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating project task:", error);
      res.status(500).json({ message: "Failed to create project task" });
    }
  });

  app.patch('/api/tasks/:id', async (req, res) => {
    try {
      const updateData = insertProjectTaskSchema.partial().parse(req.body);
      const task = await storage.updateProjectTask(req.params.id, updateData);
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating project task:", error);
      res.status(500).json({ message: "Failed to update project task" });
    }
  });

  // Supplier request routes
  app.get('/api/supplier-requests', async (req, res) => {
    try {
      const { offerId } = req.query;
      const requests = await storage.getSupplierRequests(offerId as string);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching supplier requests:", error);
      res.status(500).json({ message: "Failed to fetch supplier requests" });
    }
  });

  app.post('/api/supplier-requests', async (req, res) => {
    try {
      const validatedData = insertSupplierRequestSchema.parse(req.body);
      const request = await storage.createSupplierRequest(validatedData);
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating supplier request:", error);
      res.status(500).json({ message: "Failed to create supplier request" });
    }
  });

  app.patch('/api/supplier-requests/:id', async (req, res) => {
    try {
      const updateData = insertSupplierRequestSchema.partial().parse(req.body);
      const request = await storage.updateSupplierRequest(req.params.id, updateData);
      res.json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating supplier request:", error);
      res.status(500).json({ message: "Failed to update supplier request" });
    }
  });

  // Quotation routes
  app.get('/api/quotations', async (req, res) => {
    try {
      const { offerId } = req.query;
      const quotations = await storage.getQuotations(offerId as string);
      res.json(quotations);
    } catch (error) {
      console.error("Error fetching quotations:", error);
      res.status(500).json({ message: "Failed to fetch quotations" });
    }
  });

  app.post('/api/quotations', async (req, res) => {
    try {
      const validatedData = insertQuotationSchema.parse(req.body);
      const quotation = await storage.createQuotation(validatedData);
      res.status(201).json(quotation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating quotation:", error);
      res.status(500).json({ message: "Failed to create quotation" });
    }
  });

  app.patch('/api/quotations/:id', async (req, res) => {
    try {
      const updateData = insertQuotationSchema.partial().parse(req.body);
      const quotation = await storage.updateQuotation(req.params.id, updateData);
      res.json(quotation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating quotation:", error);
      res.status(500).json({ message: "Failed to update quotation" });
    }
  });

  // BE Workload routes - Solve "Aucune mesure de charge BE" issue from JLM audit
  app.get('/api/be-workload', async (req, res) => {
    try {
      const { weekNumber, year } = req.query;
      const workload = await storage.getBeWorkload(
        weekNumber ? parseInt(weekNumber as string) : undefined,
        year ? parseInt(year as string) : undefined
      );
      res.json(workload);
    } catch (error) {
      console.error("Error fetching BE workload:", error);
      res.status(500).json({ message: "Failed to fetch BE workload" });
    }
  });

  app.post('/api/be-workload', async (req, res) => {
    try {
      const validatedData = insertBeWorkloadSchema.parse(req.body);
      const workload = await storage.createOrUpdateBeWorkload(validatedData);
      res.status(201).json(workload);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating/updating BE workload:", error);
      res.status(500).json({ message: "Failed to create/update BE workload" });
    }
  });

  // Validation Milestones routes - Solve "Absence de jalon Fin d'études" issue from JLM audit
  app.get('/api/validation-milestones', async (req, res) => {
    try {
      const { offerId, projectId } = req.query;
      const milestones = await storage.getValidationMilestones(
        offerId as string,
        projectId as string
      );
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching validation milestones:", error);
      res.status(500).json({ message: "Failed to fetch validation milestones" });
    }
  });

  app.post('/api/validation-milestones', async (req, res) => {
    try {
      const validatedData = insertValidationMilestoneSchema.parse(req.body);
      const milestone = await storage.createValidationMilestone(validatedData);
      res.status(201).json(milestone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating validation milestone:", error);
      res.status(500).json({ message: "Failed to create validation milestone" });
    }
  });

  // Users route for BE member selection with more realistic JLM team
  app.get('/api/users', async (req, res) => {
    try {
      const { role } = req.query;
      // Return mock JLM team members based on audit findings
      const mockUsers = [
        {
          id: "user-sylvie",
          email: "sylvie.martin@jlm-menuiserie.fr", 
          firstName: "Sylvie",
          lastName: "Martin",
          role: "responsable_be",
          profileImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: "user-nicolas", 
          email: "nicolas.projeteur@jlm-menuiserie.fr",
          firstName: "Nicolas", 
          lastName: "Dupont",
          role: "technicien_be",
          profileImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: "user-julien",
          email: "julien.ceo@jlm-menuiserie.fr", 
          firstName: "Julien",
          lastName: "Moreau", 
          role: "admin",
          profileImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: "user-france",
          email: "france.chef@jlm-menuiserie.fr", 
          firstName: "France",
          lastName: "Leclerc", 
          role: "chef_travaux",
          profileImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Filter by role if specified
      if (role && role !== 'all' && typeof role === 'string') {
        const roleFilter = role.split(',');
        const filteredUsers = mockUsers.filter(user => roleFilter.includes(user.role));
        res.json(filteredUsers);
      } else {
        res.json(mockUsers);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Clean existing data route
  app.post('/api/clear-sample-data', async (req, res) => {
    try {
      // Delete in correct order to respect foreign key constraints
      await db.delete(interventions);
      await db.delete(projectTasks);
      await db.delete(projects);
      await db.delete(validationMilestones);
      await db.delete(quotations);
      await db.delete(supplierRequests);
      await db.delete(offers);
      await db.delete(beWorkload);
      await db.delete(aos);
      
      res.json({ message: "Sample data cleared successfully" });
    } catch (error) {
      console.error("Error clearing sample data:", error);
      res.status(500).json({ message: "Failed to clear sample data" });
    }
  });

  // Mock data initialization route for testing - Create sample offers and workload data
  app.post('/api/init-sample-data', async (req, res) => {
    try {
      // Check if force reload is requested
      if (req.body.force) {
        // Clear existing data first
        await db.delete(interventions);
        await db.delete(projectTasks);
        await db.delete(projects);
        await db.delete(validationMilestones);
        await db.delete(quotations);
        await db.delete(supplierRequests);
        await db.delete(offers);
        await db.delete(beWorkload);
        await db.delete(aos);
      } else {
        // Check if sample data already exists
        const existingAos = await storage.getAos();
        if (existingAos.length > 0) {
          return res.json({ 
            message: "Sample data already exists",
            data: {
              aos: existingAos.length,
              message: "Use POST with {\"force\": true} to recreate data"
            }
          });
        }
      }

      // First, create users in database (not just mock data)
      const sampleUsers = [
        {
          id: "user-sylvie", 
          email: "sylvie.martin@jlm-menuiserie.fr", 
          firstName: "Sylvie",
          lastName: "Martin",
          role: "responsable_be" as const,
          profileImageUrl: null
        },
        {
          id: "user-nicolas", 
          email: "nicolas.projeteur@jlm-menuiserie.fr",
          firstName: "Nicolas", 
          lastName: "Dupont",
          role: "technicien_be" as const,
          profileImageUrl: null
        },
        {
          id: "user-julien",
          email: "julien.ceo@jlm-menuiserie.fr", 
          firstName: "Julien",
          lastName: "Moreau", 
          role: "admin" as const,
          profileImageUrl: null
        },
        {
          id: "user-france",
          email: "france.chef@jlm-menuiserie.fr", 
          firstName: "France",
          lastName: "Leclerc", 
          role: "chef_travaux" as const,
          profileImageUrl: null
        }
      ];
      
      // Create users in database using direct insertion to ensure they exist
      try {
        for (const userData of sampleUsers) {
          // Try to create user, if exists it will be updated by upsert
          const user = await storage.upsertUser(userData);
          console.log(`Created/updated user: ${user.email}`);
        }
        
        // Verify users were created
        const createdUsersQuery = await storage.getUsers();
        console.log(`Total users in database: ${createdUsersQuery.length}`);
      } catch (userError) {
        console.error("Error creating users:", userError);
        throw userError;
      }

      // Create comprehensive sample AOs - JLM Menuiserie realistic projects
      const sampleAos = [
        {
          reference: "AO-2024-001",
          client: "Mairie de Caen",
          location: "Caen, Calvados (14)",
          departement: "14" as const,
          maitreOeuvre: "Cabinet Architecture Moderne",
          estimatedAmount: "185000",
          menuiserieType: "fenetres" as const,
          source: "BOMP" as const,
          submissionDeadline: new Date("2024-03-15"),
          description: "Rénovation complète des menuiseries de la mairie - 45 fenêtres PVC double vitrage RT2020, 12 portes d'entrée sécurisées avec contrôle d'accès, isolation thermique renforcée"
        },
        {
          reference: "AO-2024-002",
          client: "SCI Les Jardins de Bayeux",
          location: "Bayeux, Calvados (14)",
          departement: "14" as const,
          maitreOeuvre: "BET Construction Durable",
          estimatedAmount: "320000",
          menuiserieType: "portes" as const,
          source: "Marche_Online" as const,
          submissionDeadline: new Date("2024-04-01"),
          description: "Construction résidence 24 logements - Menuiseries complètes aluminium avec volets roulants intégrés, portes-fenêtres coulissantes, conformité RE2020"
        },
        {
          reference: "AO-2024-003",
          client: "Lycée Victor Hugo",
          location: "Lisieux, Calvados (14)",
          departement: "14" as const,
          maitreOeuvre: "Conseil Départemental du Calvados",
          estimatedAmount: "275000",
          menuiserieType: "bardage" as const,
          source: "BOMP" as const,
          submissionDeadline: new Date("2024-03-30"),
          description: "Rénovation énergétique - Remplacement de 120 fenêtres dans 3 bâtiments, portes coupe-feu EI30 conformes ERP, amélioration performances thermiques"
        },
        {
          reference: "AO-2024-004",
          client: "Résidence Seniors Le Clos Fleuri",
          location: "Honfleur, Calvados (14)",
          departement: "14" as const,
          maitreOeuvre: "SARL Architecture & Bien-Être",
          estimatedAmount: "145000",
          menuiserieType: "mur_rideau" as const,
          source: "Contact_Direct" as const,
          submissionDeadline: new Date("2024-04-20"),
          description: "Menuiseries pour 18 appartements seniors - Accessibilité PMR, fenêtres oscillo-battantes avec poignées ergonomiques, portes d'entrée sécurisées à serrure 3 points"
        },
        {
          reference: "AO-2024-005",
          client: "Centre Commercial Neptune",
          location: "Hérouville-Saint-Clair, Calvados (14)",
          departement: "14" as const,
          maitreOeuvre: "Groupe Immobilier Neptune",
          estimatedAmount: "89000",
          menuiserieType: "autre" as const,
          source: "Fournisseur" as const,
          submissionDeadline: new Date("2024-04-10"),
          description: "Rénovation façade commerciale - 8 vitrines aluminium avec double vitrage feuilleté, 4 portes d'entrée automatiques coulissantes, signalétique intégrée LED"
        }
      ];

      for (const aoData of sampleAos) {
        await storage.createAo(aoData);
      }

      // Create realistic sample offers - covering all workflow stages
      const sampleOfferData = [
        {
          reference: "OFF-2024-001",
          aoId: null,
          client: "Mairie de Caen", 
          location: "Caen, Calvados (14)",
          menuiserieType: "fenetres" as const,
          estimatedAmount: "185000",
          status: "en_chiffrage" as const,
          responsibleUserId: "user-sylvie",
          deadline: new Date("2024-03-15"),
          isPriority: true
        },
        {
          reference: "OFF-2024-002",
          aoId: null,
          client: "SCI Les Jardins de Bayeux",
          location: "Bayeux, Calvados (14)", 
          menuiserieType: "portes" as const,
          estimatedAmount: "320000",
          status: "nouveau" as const,
          responsibleUserId: "user-nicolas",
          deadline: new Date("2024-04-01"),
          isPriority: false
        },
        {
          reference: "OFF-2024-003",
          aoId: null,
          client: "Lycée Victor Hugo",
          location: "Lisieux, Calvados (14)",
          menuiserieType: "bardage" as const,
          estimatedAmount: "275000",
          status: "en_validation" as const,
          responsibleUserId: "user-sylvie", 
          deadline: new Date("2024-03-30"),
          isPriority: true
        },
        {
          reference: "OFF-2024-004",
          aoId: null,
          client: "Résidence Seniors Le Clos Fleuri",
          location: "Honfleur, Calvados (14)",
          menuiserieType: "mur_rideau" as const,
          estimatedAmount: "145000",
          status: "valide" as const,
          responsibleUserId: "user-nicolas",
          deadline: new Date("2024-04-20"),
          isPriority: false
        },
        {
          reference: "OFF-2024-005",
          aoId: null,
          client: "Centre Commercial Neptune",
          location: "Hérouville-Saint-Clair, Calvados (14)",
          menuiserieType: "autre" as const,
          estimatedAmount: "89000",
          status: "perdu" as const,
          responsibleUserId: "user-sylvie",
          deadline: new Date("2024-04-10"),
          isPriority: false
        },
        {
          reference: "OFF-2024-006",
          aoId: null,
          client: "Collège Jean Monnet",
          location: "Ouistreham, Calvados (14)",
          menuiserieType: "bardage" as const,
          estimatedAmount: "98000",
          status: "en_chiffrage" as const,
          responsibleUserId: "user-nicolas",
          deadline: new Date("2024-02-28"),
          isPriority: true
        }
      ];

      for (const offerData of sampleOfferData) {
        await storage.createOffer(offerData);
      }

      // Create realistic BE workload data
      const currentWeek = Math.ceil(((new Date()).getDate() - 1) / 7) + 1;
      const currentYear = new Date().getFullYear();

      const sampleWorkload = [
        {
          userId: "user-sylvie",
          weekNumber: currentWeek,
          year: currentYear,
          plannedHours: "42",
          actualHours: "38",
          capacityHours: "40"
        },
        {
          userId: "user-nicolas",
          weekNumber: currentWeek, 
          year: currentYear,
          plannedHours: "45",
          actualHours: "40",
          capacityHours: "40"
        },
        {
          userId: "user-julien",
          weekNumber: currentWeek, 
          year: currentYear,
          plannedHours: "20",
          actualHours: "18",
          capacityHours: "25"
        }
      ];

      for (const workloadData of sampleWorkload) {
        await storage.createOrUpdateBeWorkload(workloadData);
      }

      // Create realistic projects covering all stages
      const sampleProjects = [
        {
          name: "Rénovation Mairie Caen",
          client: "Mairie de Caen",
          location: "Caen, Calvados (14)",
          status: "etude" as const,
          budget: "125000",
          startDate: new Date("2024-02-01"),
          endDate: new Date("2024-05-15"),
          responsibleUserId: "user-sylvie",
          offerId: null,
          progress: 25
        },
        {
          name: "Résidence Les Jardins de Bayeux",
          client: "SCI Les Jardins de Bayeux", 
          location: "Bayeux, Calvados (14)",
          status: "planification" as const,
          budget: "320000",
          startDate: new Date("2024-03-01"),
          endDate: new Date("2024-08-30"),
          responsibleUserId: "user-nicolas",
          offerId: null,
          progress: 45
        },
        {
          name: "Lycée Victor Hugo - Rénovation énergétique",
          client: "Conseil Départemental du Calvados",
          location: "Lisieux, Calvados (14)",
          status: "approvisionnement" as const,
          budget: "275000",
          startDate: new Date("2024-01-15"),
          endDate: new Date("2024-06-30"),
          responsibleUserId: "user-sylvie",
          offerId: null,
          progress: 65
        },
        {
          name: "Centre Commercial Neptune - Vitrines",
          client: "Groupe Immobilier Neptune",
          location: "Hérouville-Saint-Clair, Calvados (14)",
          status: "sav" as const,
          budget: "89000",
          startDate: new Date("2023-11-01"),
          endDate: new Date("2024-01-31"),
          responsibleUserId: "user-france",
          offerId: null,
          progress: 100
        },
        {
          name: "École Primaire Pierre Corneille",
          client: "Mairie de Rouen",
          location: "Rouen, Seine-Maritime (76)",
          status: "realisation" as const,
          budget: "156000",
          startDate: new Date("2024-01-15"),
          endDate: new Date("2024-04-30"),
          responsibleUserId: "user-nicolas",
          offerId: null,
          progress: 75
        }
      ];

      for (const projectData of sampleProjects) {
        await storage.createProject(projectData);
      }

      res.json({ 
        message: "Sample data created successfully",
        data: {
          aos: sampleAos.length,
          offers: sampleOfferData.length, 
          workload: sampleWorkload.length,
          projects: sampleProjects.length,
          interventions: "Ready for creation via UI"
        }
      });

      // Test API endpoints for projects
      const projectsResult = await storage.getProjects();
      console.log(`Created ${projectsResult.length} projects successfully`);

      // Test validation milestones for first offer if exists
      const createdOffers = await storage.getOffers();
      if (createdOffers.length > 0) {
        try {
          await fetch(`http://localhost:5000/api/validation-milestones/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ offerId: createdOffers[0].id })
          });
          console.log('Validation milestones initialized successfully');
        } catch (error) {
          console.log('Validation milestones already exist or error occurred');
        }
      }
    } catch (error) {
      console.error("Error creating sample data:", error);
      res.status(500).json({ message: "Failed to create sample data" });
    }
  });

  // Validation milestones routes
  app.get('/api/validation-milestones/:offerId', async (req, res) => {
    try {
      const { offerId } = req.params
      const milestones = await storage.getValidationMilestones(offerId)
      res.json(milestones)
    } catch (error) {
      console.error('Error fetching validation milestones:', error)
      res.status(500).json({ message: 'Failed to fetch validation milestones' })
    }
  })

  app.post('/api/validation-milestones/init', async (req, res) => {
    try {
      const { offerId } = req.body
      
      if (!offerId) {
        return res.status(400).json({ message: 'offerId is required' })
      }

      // Vérifier si les jalons existent déjà
      const existing = await storage.getValidationMilestones(offerId)
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Milestones already exist for this offer' })
      }

      // Créer les jalons par défaut
      const milestoneTypes = ['fin_etudes', 'validation_technique', 'validation_commercial', 'preparation_production']
      const createdMilestones = []

      for (const milestoneType of milestoneTypes) {
        const milestone = await storage.createValidationMilestone({
          offerId,
          type: milestoneType,
          validatedBy: "user-nicolas"
        })
        createdMilestones.push(milestone)
      }

      res.status(201).json(createdMilestones)
    } catch (error) {
      console.error('Error creating validation milestones:', error)
      res.status(500).json({ message: 'Failed to create validation milestones' })
    }
  })

  app.patch('/api/validation-milestones/:milestoneId', async (req, res) => {
    try {
      const { milestoneId } = req.params
      const updateData = req.body

      // Validation des données
      const validatedData = insertValidationMilestoneSchema.partial().parse(updateData)

      // Validation des données - utiliser les propriétés correctes du schéma
      if (validatedData.validatedAt && !validatedData.validatedBy) {
        validatedData.validatedBy = 'user-nicolas' // En mode développement
      }

      const updatedMilestone = await storage.updateValidationMilestone(milestoneId, validatedData)
      res.json(updatedMilestone)
    } catch (error) {
      console.error('Error updating validation milestone:', error)
      res.status(500).json({ message: 'Failed to update validation milestone' })
    }
  })

  app.delete('/api/validation-milestones/:milestoneId', async (req, res) => {
    try {
      const { milestoneId } = req.params
      await storage.deleteValidationMilestone(milestoneId)
      res.status(204).send()
    } catch (error) {
      console.error('Error deleting validation milestone:', error)
      res.status(500).json({ message: 'Failed to delete validation milestone' })
    }
  })

  const httpServer = createServer(app);
  return httpServer;
}
