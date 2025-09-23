// Routes API pour la gestion des équipes JLM
import type { Express } from "express";
import { db } from "./db";
import { teams, teamMembers, users, insertTeamSchema, insertTeamMemberSchema } from "../shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { z } from "zod";

export function registerTeamsRoutes(app: Express) {
  // ========================================
  // GESTION DES ÉQUIPES
  // ========================================

  /**
   * Récupérer toutes les équipes avec leurs membres
   */
  app.get("/api/teams", async (req, res) => {
    try {
      const allTeams = await db.query.teams.findMany({
        with: {
          teamLeader: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          members: {
            columns: {
              id: true,
              role: true,
              weeklyHours: true,
              contractType: true,
              experienceLevel: true,
              isActive: true,
              joinedAt: true,
              externalMemberName: true,
              externalMemberEmail: true,
              hourlyRate: true,
            },
            with: {
              user: {
                columns: {
                  id: true,
                  firstName: true,
              lastName: true,
                  email: true,
                  role: true,
                },
              },
            },
            where: eq(teamMembers.isActive, true),
          },
        },
        orderBy: [asc(teams.name)],
      });

      // Calculer les statistiques pour chaque équipe
      const teamsWithStats = allTeams.map((team: any) => ({
        ...team,
        memberCount: team.members ? team.members.length : 0,
        internalMembers: team.members ? team.members.filter((m: any) => m.userId !== null).length : 0,
        externalMembers: team.members ? team.members.filter((m: any) => m.userId === null).length : 0,
      }));

      res.json(teamsWithStats);
    } catch (error) {
      console.error("Erreur récupération équipes:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des équipes" });
    }
  });

  /**
   * Récupérer une équipe spécifique avec ses membres
   */
  app.get("/api/teams/:id", async (req, res) => {
    try {
      const team = await db.query.teams.findFirst({
        where: eq(teams.id, req.params.id),
        with: {
          teamLeader: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          members: {
            with: {
              user: {
                columns: {
                  id: true,
                  firstName: true,
              lastName: true,
                  email: true,
                  role: true,
                },
              },
            },
            orderBy: [asc(teamMembers.role), asc(teamMembers.joinedAt)],
          },
        },
      });

      if (!team) {
        return res.status(404).json({ message: "Équipe non trouvée" });
      }

      res.json(team);
    } catch (error) {
      console.error("Erreur récupération équipe:", error);
      res.status(500).json({ message: "Erreur lors de la récupération de l'équipe" });
    }
  });

  /**
   * Créer une nouvelle équipe
   */
  app.post("/api/teams", async (req, res) => {
    try {
      const validationResult = insertTeamSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Données invalides",
          errors: validationResult.error.errors,
        });
      }

      const teamData = validationResult.data;

      // Vérifier que le chef d'équipe existe s'il est spécifié
      if (teamData.teamLeaderId) {
        const leader = await db.query.users.findFirst({
          where: eq(users.id, teamData.teamLeaderId),
        });

        if (!leader) {
          return res.status(400).json({ message: "Chef d'équipe non trouvé" });
        }
      }

      const [newTeam] = await db.insert(teams).values(teamData).returning();

      // Récupérer l'équipe complète avec ses relations
      const createdTeam = await db.query.teams.findFirst({
        where: eq(teams.id, newTeam.id),
        with: {
          teamLeader: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          members: true,
        },
      });

      res.status(201).json(createdTeam);
    } catch (error) {
      console.error("Erreur création équipe:", error);
      res.status(500).json({ message: "Erreur lors de la création de l'équipe" });
    }
  });

  /**
   * Modifier une équipe
   */
  app.put("/api/teams/:id", async (req, res) => {
    try {
      const validationResult = insertTeamSchema.partial().safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Données invalides",
          errors: validationResult.error.errors,
        });
      }

      const teamData = validationResult.data;

      // Vérifier que l'équipe existe
      const existingTeam = await db.query.teams.findFirst({
        where: eq(teams.id, req.params.id),
      });

      if (!existingTeam) {
        return res.status(404).json({ message: "Équipe non trouvée" });
      }

      // Vérifier le chef d'équipe s'il est modifié
      if (teamData.teamLeaderId) {
        const leader = await db.query.users.findFirst({
          where: eq(users.id, teamData.teamLeaderId),
        });

        if (!leader) {
          return res.status(400).json({ message: "Chef d'équipe non trouvé" });
        }
      }

      const [updatedTeam] = await db
        .update(teams)
        .set({ 
          ...teamData,
          updatedAt: new Date(),
        })
        .where(eq(teams.id, req.params.id))
        .returning();

      // Récupérer l'équipe complète mise à jour
      const team = await db.query.teams.findFirst({
        where: eq(teams.id, updatedTeam.id),
        with: {
          teamLeader: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          members: {
            with: {
              user: {
                columns: {
                  id: true,
                  firstName: true,
              lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      res.json(team);
    } catch (error) {
      console.error("Erreur modification équipe:", error);
      res.status(500).json({ message: "Erreur lors de la modification de l'équipe" });
    }
  });

  /**
   * Supprimer une équipe (désactivation)
   */
  app.delete("/api/teams/:id", async (req, res) => {
    try {
      const existingTeam = await db.query.teams.findFirst({
        where: eq(teams.id, req.params.id),
      });

      if (!existingTeam) {
        return res.status(404).json({ message: "Équipe non trouvée" });
      }

      // Désactiver l'équipe plutôt que de la supprimer
      await db
        .update(teams)
        .set({ 
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(teams.id, req.params.id));

      // Désactiver tous les membres de l'équipe
      await db
        .update(teamMembers)
        .set({ 
          isActive: false,
          leftAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(teamMembers.teamId, req.params.id));

      res.json({ message: "Équipe désactivée avec succès" });
    } catch (error) {
      console.error("Erreur suppression équipe:", error);
      res.status(500).json({ message: "Erreur lors de la suppression de l'équipe" });
    }
  });

  // ========================================
  // GESTION DES MEMBRES D'ÉQUIPE
  // ========================================

  /**
   * Ajouter un membre à une équipe
   */
  app.post("/api/teams/:teamId/members", async (req, res) => {
    try {
      const teamId = req.params.teamId;
      
      const validationResult = insertTeamMemberSchema.extend({
        teamId: z.string(),
      }).safeParse({
        ...req.body,
        teamId,
      });
      
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Données invalides",
          errors: validationResult.error.errors,
        });
      }

      const memberData = validationResult.data;

      // Vérifier que l'équipe existe
      const team = await db.query.teams.findFirst({
        where: eq(teams.id, teamId),
        with: {
          members: {
            where: eq(teamMembers.isActive, true),
          },
        },
      });

      if (!team) {
        return res.status(404).json({ message: "Équipe non trouvée" });
      }

      // Vérifier la limite de membres
      if (team.members.length >= (team.maxMembers || 10)) {
        return res.status(400).json({ 
          message: `Équipe complète (maximum ${team.maxMembers} membres)` 
        });
      }

      // Vérifier que l'utilisateur interne existe s'il est spécifié
      if (memberData.userId) {
        const user = await db.query.users.findFirst({
          where: eq(users.id, memberData.userId),
        });

        if (!user) {
          return res.status(400).json({ message: "Utilisateur non trouvé" });
        }

        // Vérifier que l'utilisateur n'est pas déjà dans l'équipe
        const existingMembership = await db.query.teamMembers.findFirst({
          where: and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, memberData.userId),
            eq(teamMembers.isActive, true)
          ),
        });

        if (existingMembership) {
          return res.status(400).json({ message: "L'utilisateur fait déjà partie de cette équipe" });
        }
      }

      const [newMember] = await db.insert(teamMembers).values(memberData).returning();

      // Récupérer le membre complet avec ses relations
      const createdMember = await db.query.teamMembers.findFirst({
        where: eq(teamMembers.id, newMember.id),
        with: {
          user: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          team: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.status(201).json(createdMember);
    } catch (error) {
      console.error("Erreur ajout membre équipe:", error);
      res.status(500).json({ message: "Erreur lors de l'ajout du membre à l'équipe" });
    }
  });

  /**
   * Modifier un membre d'équipe
   */
  app.put("/api/teams/:teamId/members/:memberId", async (req, res) => {
    try {
      const { teamId, memberId } = req.params;
      
      const validationResult = insertTeamMemberSchema.partial().safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Données invalides",
          errors: validationResult.error.errors,
        });
      }

      const memberData = validationResult.data;

      // Vérifier que le membre existe
      const existingMember = await db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.id, memberId),
          eq(teamMembers.teamId, teamId)
        ),
      });

      if (!existingMember) {
        return res.status(404).json({ message: "Membre d'équipe non trouvé" });
      }

      const [updatedMember] = await db
        .update(teamMembers)
        .set({ 
          ...memberData,
          updatedAt: new Date(),
        })
        .where(eq(teamMembers.id, memberId))
        .returning();

      // Récupérer le membre complet mis à jour
      const member = await db.query.teamMembers.findFirst({
        where: eq(teamMembers.id, updatedMember.id),
        with: {
          user: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          team: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.json(member);
    } catch (error) {
      console.error("Erreur modification membre équipe:", error);
      res.status(500).json({ message: "Erreur lors de la modification du membre" });
    }
  });

  /**
   * Retirer un membre d'une équipe
   */
  app.delete("/api/teams/:teamId/members/:memberId", async (req, res) => {
    try {
      const { teamId, memberId } = req.params;

      const existingMember = await db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.id, memberId),
          eq(teamMembers.teamId, teamId)
        ),
      });

      if (!existingMember) {
        return res.status(404).json({ message: "Membre d'équipe non trouvé" });
      }

      // Désactiver le membre plutôt que de le supprimer
      await db
        .update(teamMembers)
        .set({ 
          isActive: false,
          leftAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(teamMembers.id, memberId));

      res.json({ message: "Membre retiré de l'équipe avec succès" });
    } catch (error) {
      console.error("Erreur suppression membre équipe:", error);
      res.status(500).json({ message: "Erreur lors de la suppression du membre" });
    }
  });

  /**
   * Récupérer les utilisateurs disponibles pour ajout à une équipe
   */
  app.get("/api/teams/:teamId/available-users", async (req, res) => {
    try {
      const teamId = req.params.teamId;

      // Récupérer tous les utilisateurs actifs
      const allUsers = await db.query.users.findMany({
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
        orderBy: [asc(users.firstName)],
      });

      // Récupérer les membres actuels de l'équipe
      const currentMembers = await db.query.teamMembers.findMany({
        where: and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.isActive, true)
        ),
        columns: {
          userId: true,
        },
      });

      const currentMemberIds = new Set(
        currentMembers.map(m => m.userId).filter(Boolean)
      );

      // Filtrer les utilisateurs disponibles
      const availableUsers = allUsers.filter(user => !currentMemberIds.has(user.id));

      res.json(availableUsers);
    } catch (error) {
      console.error("Erreur récupération utilisateurs disponibles:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des utilisateurs disponibles" });
    }
  });
}