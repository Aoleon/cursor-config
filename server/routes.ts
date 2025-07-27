import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertOfferSchema, insertProjectSchema, insertAoSchema, insertSupplierRequestSchema, insertQuotationSchema, insertProjectTaskSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // AO routes
  app.get('/api/aos', isAuthenticated, async (req, res) => {
    try {
      const aos = await storage.getAos();
      res.json(aos);
    } catch (error) {
      console.error("Error fetching AOs:", error);
      res.status(500).json({ message: "Failed to fetch AOs" });
    }
  });

  app.get('/api/aos/:id', isAuthenticated, async (req, res) => {
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

  app.post('/api/aos', isAuthenticated, async (req, res) => {
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
  app.get('/api/offers', isAuthenticated, async (req, res) => {
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

  app.get('/api/offers/:id', isAuthenticated, async (req, res) => {
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

  app.post('/api/offers', isAuthenticated, async (req, res) => {
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

  app.patch('/api/offers/:id', isAuthenticated, async (req, res) => {
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

  app.delete('/api/offers/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteOffer(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting offer:", error);
      res.status(500).json({ message: "Failed to delete offer" });
    }
  });

  // Project routes
  app.get('/api/projects', isAuthenticated, async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req, res) => {
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

  app.post('/api/projects', isAuthenticated, async (req, res) => {
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

  app.patch('/api/projects/:id', isAuthenticated, async (req, res) => {
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
  app.get('/api/projects/:projectId/tasks', isAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getProjectTasks(req.params.projectId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching project tasks:", error);
      res.status(500).json({ message: "Failed to fetch project tasks" });
    }
  });

  app.post('/api/projects/:projectId/tasks', isAuthenticated, async (req, res) => {
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

  app.patch('/api/tasks/:id', isAuthenticated, async (req, res) => {
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
  app.get('/api/supplier-requests', isAuthenticated, async (req, res) => {
    try {
      const { offerId } = req.query;
      const requests = await storage.getSupplierRequests(offerId as string);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching supplier requests:", error);
      res.status(500).json({ message: "Failed to fetch supplier requests" });
    }
  });

  app.post('/api/supplier-requests', isAuthenticated, async (req, res) => {
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

  app.patch('/api/supplier-requests/:id', isAuthenticated, async (req, res) => {
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
  app.get('/api/quotations', isAuthenticated, async (req, res) => {
    try {
      const { offerId } = req.query;
      const quotations = await storage.getQuotations(offerId as string);
      res.json(quotations);
    } catch (error) {
      console.error("Error fetching quotations:", error);
      res.status(500).json({ message: "Failed to fetch quotations" });
    }
  });

  app.post('/api/quotations', isAuthenticated, async (req, res) => {
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

  app.patch('/api/quotations/:id', isAuthenticated, async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
