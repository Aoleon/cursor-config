import { pgTable, varchar, text, timestamp, decimal, boolean, integer, jsonb, pgEnum, index, uniqueIndex, type PgColumn } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ========================================
// ENUMS POUR POC UNIQUEMENT
// ========================================

// Départements français pour localisation
export const departementEnum = pgEnum("departement", [
  "01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
  "21", "22", "23", "24", "25", "26", "27", "28", "29", "30",
  "31", "32", "33", "34", "35", "36", "37", "38", "39", "40",
  "41", "42", "43", "44", "45", "46", "47", "48", "49", "50",
  "51", "52", "53", "54", "55", "56", "57", "58", "59", "60",
  "61", "62", "63", "64", "65", "66", "67", "68", "69", "70",
  "71", "72", "73", "74", "75", "76", "77", "78", "79", "80",
  "81", "82", "83", "84", "85", "86", "87", "88", "89", "90",
  "91", "92", "93", "94", "95"
]);

// Types de menuiserie pour JLM (entreprise de POSE)
export const menuiserieTypeEnum = pgEnum("menuiserie_type", [
  "fenetre", "porte", "portail", "volet", "cloison", "verriere", "autre"
]);

// Statuts des lots dans le workflow JLM
export const lotStatusEnum = pgEnum("lot_status", [
  "brouillon", "en_attente_fournisseur", "pre_devis_recu", "chiffrage_final_recu", 
  "chiffrage_valide", "commande_en_cours", "en_attente_livraison", "livre", "sav"
]);

// Sources des Appels d'Offres
export const aoSourceEnum = pgEnum("ao_source", [
  "mail", "phone", "website", "partner", "other"
]);

// Types de marché pour AO
export const marcheTypeEnum = pgEnum("marche_type", [
  "public", "prive", "ao_restreint", "ao_ouvert", "marche_negocie", "procedure_adaptee"
]);

// Statuts des dossiers d'offre (workflow POC)
export const offerStatusEnum = pgEnum("offer_status", [
  "brouillon",           // Création en cours
  "etude_technique",     // Étude technique en cours
  "en_attente_fournisseurs", // Demandes fournisseurs envoyées
  "en_cours_chiffrage",  // Chiffrage en cours (APRÈS réception prix fournisseurs)
  "en_attente_validation", // Validation BE
  "fin_etudes_validee",  // Jalon "Fin d'études" validé
  "valide",              // Offre validée
  "signe",               // Offre signée par le client
  "transforme_en_projet", // Transformée en projet
  "termine",             // Dossier terminé
  "archive"              // Archivé
]);

// Statuts des projets (6 étapes avec nouvelle Passation en premier)
export const projectStatusEnum = pgEnum("project_status", [
  "passation",          // Nouvelle première étape - Envoi dossier et obtention VIS (1 mois)
  "etude",              // Phase d'étude
  "visa_architecte",    // VISA Architecte (entre Étude et Planification)
  "planification",      // Planification
  "approvisionnement",  // Approvisionnement (simple)
  "chantier",           // Phase chantier
  "sav"                 // SAV (simple)
]);

// Statut charge BE (POC simplifié)
export const chargeStatusEnum = pgEnum("charge_status", [
  "disponible", "occupe", "surcharge"
]);

// Statut des tâches planning
export const taskStatusEnum = pgEnum("task_status", [
  "a_faire", "en_cours", "termine", "en_retard"
]);

// Types de postes pour les contacts
export const posteTypeEnum = pgEnum("poste_type", [
  "directeur", "responsable", "technicien", "assistant", "architecte", "ingenieur", "coordinateur", "autre"
]);

// Types d'espaces documentaires pour liaisons multiples
export const documentSpaceEnum = pgEnum("document_space", [
  "informations_generales", "chiffrage", "etude_technique", "planification", 
  "chantier", "sav", "fournisseurs", "administratif", "cctp", "plans", "photos"
]);

// Catégories de documents optimisées pour JLM
export const documentCategoryEnum = pgEnum("document_category", [
  "ao_pdf", "cctp", "plans", "devis_client", "devis_fournisseur", "bon_commande", 
  "facture", "photo_chantier", "rapport_avancement", "correspondance", 
  "certification", "notice_technique", "autre"
]);

// Niveaux d'accès documentaire
export const documentAccessEnum = pgEnum("document_access", [
  "public", "equipe", "responsables", "prive"
]);

// Types de bouclage (anciennement validation BE) - Points simplifiés
export const bouclageTypeEnum = pgEnum("bouclage_type", [
  "conformite_dtu", "conformite_technique_marche", "coherence_chiffrages"
]);

// Types de VISA Architecte - Nouveau workflow entre Étude et Planification
export const visaArchitecteTypeEnum = pgEnum("visa_architecte_type", [
  "visa_plans", "visa_technique", "visa_conformite"
]);

// Types de milestones pour projets - Jalons formels Phase 1
export const projectMilestoneTypeEnum = pgEnum("project_milestone_type", [
  "passation", "visa_architecte", "fin_etudes", "reception"
]);

// Statuts des milestones projet
export const milestoneStatusEnum = pgEnum("milestone_status", [
  "pending", "in_progress", "completed", "overdue", "cancelled"
]);

// Rôles des fournisseurs dans les projets - Phase 1
export const supplierRoleEnum = pgEnum("supplier_role", [
  "principal", "secondaire", "sous_traitant", "consultant"
]);

// Types de contrats de travail
export const contractTypeEnum = pgEnum("contract_type", [
  "cdi", "cdd", "interim", "apprentissage", "stage", "sous_traitance", "freelance"
]);

// Niveaux d'expérience
export const experienceLevelEnum = pgEnum("experience_level", [
  "debutant", "junior", "confirme", "senior", "expert"
]);

// Niveaux de criticité des contrôles BE
export const validationCriticalityEnum = pgEnum("validation_criticality", [
  "bloquant", "majeur", "mineur", "info"
]);

// Statuts des éléments de checklist
export const checklistStatusEnum = pgEnum("checklist_status", [
  "non_controle", "en_cours", "conforme", "non_conforme", "reserve", "na"
]);

// Statuts des fournisseurs
export const supplierStatusEnum = pgEnum("supplier_status", [
  "actif", "inactif", "suspendu", "blackliste"
]);

// Niveaux de priorité pour projets et offres
export const priorityLevelEnum = pgEnum("priority_level", [
  "tres_faible", "faible", "normale", "elevee", "critique"
]);

// Types de facteurs de priorité
export const priorityFactorEnum = pgEnum("priority_factor", [
  "montant", "delai", "type_client", "complexite", "charge_be", "risque", "strategique"
]);

// ========================================
// ENUMS MATÉRIAUX ET COULEURS - PATTERNS AVANCÉS OCR
// ========================================

// Enums matériaux pour détection OCR sophistiquée
export const materialEnum = pgEnum("material", [
  "pvc", "bois", "aluminium", "acier", "composite", 
  "mixte_bois_alu", "inox", "galva"
]);

// Enums finitions pour liaison matériaux-couleurs
export const finishEnum = pgEnum("finish", [
  "mat", "satine", "brillant", "texture", "sable", 
  "anodise", "thermolaque", "laque", "plaxe", "brosse"
]);

// ========================================
// NOUVEAUX ENUMS PHASE 2 - SYSTÈME DE PLANNING AVANCÉ
// ========================================

// Types de ressources pour allocations quotidiennes
export const resourceTypeEnum = pgEnum("resource_type", [
  "team", "employee", "equipment", "subcontractor"
]);

// Niveaux de sévérité pour contraintes planning
export const constraintSeverityEnum = pgEnum("constraint_severity", [
  "blocking", "warning", "info"
]);

// Statuts des contraintes planning
export const constraintStatusEnum = pgEnum("constraint_status", [
  "active", "resolved", "cancelled", "monitoring"
]);

// Types de dépendances entre tâches pour table de jonction - Phase 2
export const dependencyTypeEnum = pgEnum("dependency_type", [
  "finish_to_start",    // La tâche dépendante commence quand la tâche prérequise finit
  "start_to_start",     // La tâche dépendante commence quand la tâche prérequise commence
  "finish_to_finish",   // La tâche dépendante finit quand la tâche prérequise finit
  "start_to_finish"     // La tâche dépendante finit quand la tâche prérequise commence
]);

// ========================================
// ENUMS POUR SYSTÈME INTELLIGENT DE DATES ET ÉCHÉANCES - PHASE 2.1
// ========================================

// Types d'alertes dates spécialisées
export const dateAlertTypeEnum = pgEnum("date_alert_type", [
  "delay_risk",           // Risque de retard détecté
  "delay_confirmed",      // Retard confirmé
  "optimization",         // Optimisation possible
  "resource_conflict",    // Conflit ressources
  "deadline_critical",    // Échéance critique approche
  "phase_dependency",     // Dépendance phase non respectée
  "external_constraint",  // Contrainte externe (météo, livraison, etc.)
  "quality_gate"         // Point de contrôle qualité
]);

// Méthodes de calcul durées
export const calculationMethodEnum = pgEnum("calculation_method", [
  "automatic",    // Calcul automatique par règles
  "manual",       // Saisie manuelle utilisateur
  "hybrid",       // Combinaison auto + ajustements manuels
  "historical",   // Basé sur historique projets similaires
  "external"      // Import système externe (Batigest, etc.)
]);

// Types de contraintes planning
export const planningConstraintEnum = pgEnum("planning_constraint", [
  "resource_availability",  // Disponibilité équipe
  "material_delivery",      // Livraison matériaux
  "weather_dependent",      // Dépendant météo
  "client_validation",      // Validation client requise
  "regulatory_approval",    // Approbation réglementaire
  "subcontractor_schedule", // Planning sous-traitant
  "equipment_availability", // Disponibilité équipements
  "seasonal_restriction",   // Restriction saisonnière
  "budget_constraint",      // Contrainte budgétaire
  "quality_checkpoint",     // Point de contrôle qualité obligatoire
  "external_dependency"     // Dépendance externe générique
]);

// ========================================
// ENUMS ANALYTICS POUR DASHBOARD DÉCISIONNEL AVANCÉ - PHASE 3.1.2
// ========================================

// Types de métriques métier calculées
export const metricTypeEnum = pgEnum("metric_type", [
  "conversion_rate_ao_offer",
  "conversion_rate_offer_project", 
  "avg_delay_days",
  "revenue_forecast",
  "team_load_percentage",
  "margin_percentage",
  "project_duration",
  "supplier_response_time"
]);

// Types de benchmarks pour comparaisons de performance
export const benchmarkTypeEnum = pgEnum("benchmark_type", [
  "user_comparison",
  "historical_trend",
  "category_performance",
  "department_efficiency",
  "seasonal_analysis"
]);

// Niveaux de sévérité pour alertes business (nom unique pour éviter conflits)
export const alertSeverityBusinessEnum = pgEnum("alert_severity_business", [
  "info",
  "warning", 
  "critical",
  "urgent"
]);

// ========================================
// ENUMS SYSTÈME ALERTES MÉTIER - PHASE 3.1.7.1
// ========================================

// Types de seuils configurables business
export const thresholdKeyEnum = pgEnum("threshold_key", [
  "profitability_margin",        // Marge bénéficiaire %
  "team_utilization_rate",       // Taux utilisation équipes %
  "deadline_days_remaining",     // Jours restants échéance
  "predictive_risk_score",       // Score risque prédictif 0-100
  "revenue_forecast_confidence", // Confiance prévision CA %
  "project_delay_days",          // Retard projet en jours
  "budget_overrun_percentage"    // Dépassement budget %
]);

// Opérateurs de comparaison pour seuils
export const thresholdOperatorEnum = pgEnum("threshold_operator", [
  "less_than",           // <
  "less_than_equal",     // <=
  "greater_than",        // >
  "greater_than_equal",  // >=
  "equals",              // ==
  "not_equals"           // !=
]);

// Niveaux de sévérité pour alertes (enum dédié)
export const alertSeverityEnum = pgEnum("alert_severity", [
  "info",     // Information
  "warning",  // Avertissement 
  "error",    // Erreur
  "critical"  // Critique
]);

// Portée d'application des seuils
export const thresholdScopeEnum = pgEnum("threshold_scope", [
  "global",      // Applicable globalement
  "project",     // Spécifique projet
  "team",        // Spécifique équipe
  "period"       // Spécifique période
]);

// Types d'alertes business
export const businessAlertTypeEnum = pgEnum("business_alert_type", [
  "profitability",       // Rentabilité
  "team_overload",       // Surcharge équipe
  "deadline_critical",   // Échéance critique
  "predictive_risk",     // Risque prédictif
  "budget_overrun",      // Dépassement budget
  "revenue_forecast",    // Prévision CA
  "project_delay"        // Retard projet
]);

// Types d'entités concernées par alertes
export const alertEntityTypeEnum = pgEnum("alert_entity_type", [
  "project",      // Projet spécifique
  "offer",        // Offre commerciale
  "team",         // Équipe
  "global",       // Global organisation
  "forecast"      // Prévision
]);

// Statuts workflow des alertes
export const alertStatusEnum = pgEnum("alert_status", [
  "open",        // Nouvelle alerte
  "acknowledged", // Accusé réception
  "in_progress", // En cours traitement
  "resolved",    // Résolue
  "dismissed"    // Ignorée
]);

// ========================================
// ENUMS PHASE 3 - SYSTÈME DE CHECKLIST ADMINISTRATIVE AUTOMATISÉE
// ========================================

// Statuts des checklists administratives par projet
export const adminChecklistStatusEnum = pgEnum("admin_checklist_status", [
  "draft", "active", "completed", "archived"
]);

// Statuts des éléments de checklist administrative
export const checklistItemStatusEnum = pgEnum("checklist_item_status", [
  "not_started", "in_progress", "completed", "blocked", "not_applicable"
]);

// Types de dépendances pour checklist administrative (différent des tâches planning)
export const adminDependencyTypeEnum = pgEnum("admin_dependency_type", [
  "blocker",        // Document bloquant - doit être complété avant de commencer
  "prerequisite",   // Prérequis - doit être disponible avant traitement
  "trigger",        // Déclencheur - génère automatiquement le document dépendant
  "successor"       // Successeur - suit logiquement après completion
]);

// Types de documents administratifs français BTP (15+ types obligatoires)
export const adminDocumentTypeEnum = pgEnum("admin_document_type", [
  "PPSPS",                           // Plan Particulier de Sécurité et de Protection de la Santé
  "DOE",                             // Dossier des Ouvrages Exécutés
  "DICT",                            // Déclaration d'Intention de Commencement de Travaux
  "ASSURANCE_DECENNALE",             // Assurance Décennale
  "GARANTIE_PARFAIT_ACHEVEMENT",     // Garantie de Parfait Achèvement
  "GARANTIE_BON_FONCTIONNEMENT",     // Garantie de Bon Fonctionnement
  "DECLARATION_OUVERTURE_CHANTIER",  // Déclaration d'Ouverture de Chantier
  "AUTORISATION_VOIRIE",             // Autorisation de Voirie
  "PERMIS_CONSTRUIRE",               // Permis de Construire
  "DECLARATION_PREALABLE",           // Déclaration Préalable
  "ARRETE_MUNICIPAL",                // Arrêté Municipal
  "RAPPORT_SOL",                     // Rapport de Sol
  "DIAGNOSTIC_AMIANTE",              // Diagnostic Amiante
  "DIAGNOSTIC_PLOMB",                // Diagnostic Plomb
  "RAPPORT_ACCESSIBILITE",           // Rapport Accessibilité
  "CONFORMITE_RT2020",               // Conformité RT2020
  "CERTIFICATION_CE",                // Certification CE
  "ATTESTATION_FIN_TRAVAUX",         // Attestation de Fin de Travaux
  "PV_RECEPTION_TRAVAUX",            // PV de Réception des Travaux
  "CERTIFICAT_CONFORMITE"            // Certificat de Conformité
]);

// Types de validation pour workflow d'approbation multi-niveaux
export const validationTypeEnum = pgEnum("validation_type", [
  "technical_validation",    // Validation technique
  "legal_validation",        // Validation légale/réglementaire
  "quality_validation",      // Validation qualité
  "final_approval"           // Approbation finale
]);

// Statuts des validations dans le workflow d'approbation
export const validationStatusEnum = pgEnum("validation_status", [
  "pending",              // En attente de validation
  "approved",             // Approuvé
  "rejected",             // Rejeté
  "revision_requested"    // Révision demandée
]);

// ========================================
// ENUMS PHASE 4 - SYSTÈME DE GESTION DES RÉSERVES ET SAV
// ========================================

// Catégories de réserves pour classification fine
export const reserveCategoryEnum = pgEnum("reserve_category", [
  "structural",        // Défauts structurels
  "finishing",         // Défauts de finition
  "equipment",         // Problèmes équipements
  "safety",            // Questions de sécurité
  "compliance",        // Non-conformité réglementaire
  "aesthetic",         // Défauts esthétiques
  "functional"         // Défauts fonctionnels
]);

// Niveaux de sévérité des réserves
export const reserveSeverityEnum = pgEnum("reserve_severity", [
  "critical",          // Critique - travaux arrêtés
  "major",             // Majeur - impact significatif
  "minor",             // Mineur - peu d'impact
  "cosmetic"           // Cosmétique - défaut visible uniquement
]);

// Statuts workflow des réserves
export const reserveStatusEnum = pgEnum("reserve_status", [
  "detected",          // Détectée
  "acknowledged",      // Accusé réception
  "in_progress",       // En cours de résolution
  "resolved",          // Résolue
  "verified",          // Vérifiée/approuvée
  "closed"             // Fermée définitivement
]);

// Niveaux d'impact pour évaluation priorité
export const impactLevelEnum = pgEnum("impact_level", [
  "blocking",          // Bloquant - arrêt travaux
  "major",             // Majeur - retard projet
  "minor",             // Mineur - ajustement planning
  "negligible"         // Négligeable - aucun impact
]);

// Types d'interventions SAV
export const savInterventionTypeEnum = pgEnum("sav_intervention_type", [
  "maintenance",       // Maintenance préventive
  "repair",            // Réparation corrective
  "warranty",          // Intervention sous garantie
  "upgrade",           // Mise à niveau / amélioration
  "inspection",        // Inspection / contrôle
  "emergency"          // Intervention d'urgence
]);

// Statuts workflow des interventions SAV
export const savStatusEnum = pgEnum("sav_status", [
  "requested",         // Demandée
  "scheduled",         // Planifiée
  "in_progress",       // En cours
  "completed",         // Terminée
  "cancelled",         // Annulée
  "follow_up_required" // Suivi requis
]);

// Types de garanties applicables
export const warrantyTypeEnum = pgEnum("warranty_type", [
  "decennial",         // Garantie décennale
  "perfect_completion", // Garantie de parfait achèvement
  "good_functioning",  // Garantie de bon fonctionnement
  "materials",         // Garantie matériaux
  "workmanship"        // Garantie main d'œuvre
]);

// Statuts des réclamations garantie
export const warrantyStatusEnum = pgEnum("warranty_status", [
  "submitted",         // Soumise
  "under_review",      // En cours d'examen
  "approved",          // Approuvée
  "rejected",          // Rejetée
  "paid"               // Payée/réglée
]);

// ========================================
// NOUVEAUX ENUMS PHASE SAXIUM - EXTENSIONS MONDAY.COM
// ========================================

// Catégories d'AO identifiées dans Monday.com (MEXT, MINT, etc.)
export const aoCategoryEnum = pgEnum("ao_category", [
  "MEXT", "MINT", "HALL", "SERRURERIE", "AUTRE"
]);

// Statuts opérationnels AO identifiés dans Monday.com 
export const aoOperationalStatusEnum = pgEnum("ao_operational_status", [
  "en_cours", "a_relancer", "gagne", "perdu", "abandonne", "en_attente"
]);

// Types de liaisons contacts-projets/AO
export const contactLinkTypeEnum = pgEnum("contact_link_type", [
  "maitre_ouvrage", "maitre_oeuvre", "architecte", "controleur_technique", 
  "bureau_etudes", "client", "fournisseur", "sous_traitant"
]);

// ========================================
// NOUVEAUX ENUMS EXTENSIONS MONDAY.COM - MODULES RH ET MÉTIER
// ========================================

// Département type (Bureau vs Chantier)
export const departmentTypeEnum = pgEnum("department_type", [
  "BUREAU", "CHANTIER", "DIRECTION", "COMMERCIAL"
]);

// Compétences métier menuiserie JLM
export const competencyEnum = pgEnum("competency", [
  "MEXT", "MINT", "BARDAGE", "HALL", "SERRURERIE", 
  "CACES", "TRAVAIL_HAUTEUR", "SOUDURE", "GENERAL"
]);

// Types formation
export const trainingTypeEnum = pgEnum("training_type", [
  "formation_initiale", "perfectionnement", "habilitation_securite", 
  "certification_metier", "recyclage_obligatoire"
]);

// Statuts formation
export const trainingStatusEnum = pgEnum("training_status", [
  "planifie", "en_cours", "complete", "expire", "reporte", "annule"
]);

// Statuts équipement
export const equipmentStatusEnum = pgEnum("equipment_status", [
  "disponible", "assigne", "maintenance", "perdu", "reforme", "en_reparation"
]);

// Types équipement
export const equipmentTypeEnum = pgEnum("equipment_type", [
  "outillage_main", "electroportatif", "vehicule", "echafaudage", "autre"
]);

// Types document RH
export const documentTypeEnum = pgEnum("document_type", [
  "contrat_travail", "visite_medicale", "habilitation_caces", 
  "certification_hauteur", "formation_securite", "attestation_competence",
  "permis_conduire", "carte_identite", "attestation_assurance"
]);

// Statuts document RH
export const documentStatusEnum = pgEnum("document_status", [
  "valide", "expire", "a_renouveler", "en_attente", "non_fourni"
]);

// ========================================
// TABLES POC UNIQUEMENT
// ========================================

// Table des fournisseurs
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  contact: varchar("contact"),
  email: varchar("email"),
  phone: varchar("phone"),
  address: text("address"),
  siret: varchar("siret"),
  specialties: text("specialties").array().default(sql`'{}'::text[]`),
  status: supplierStatusEnum("status").default("actif"),
  
  // Extension Phase 1 : Capacités et performances
  capacities: jsonb("capacities").$type<Record<string, any>>().default(sql`'{}'::jsonb`), // Types menuiserie + délais
  avgResponseTime: integer("avg_response_time").default(0), // Temps de réponse moyen en heures
  
  paymentTerms: integer("payment_terms").default(30),
  deliveryDelay: integer("delivery_delay").default(15),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalOrders: integer("total_orders").default(0),
  
  // ========================================
  // EXTENSIONS SAXIUM - MONDAY.COM
  // ========================================
  coverageDepartements: departementEnum("coverage_departements").array(),
  responseTimeAvgDays: integer("response_time_avg_days"),
  mondayItemId: varchar("monday_item_id"),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table des jalons formels de projet - Phase 1
export const projectMilestones = pgTable("project_milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  type: projectMilestoneTypeEnum("type").notNull(), // passation, visa_architecte, fin_etudes, reception
  status: milestoneStatusEnum("status").default("pending"), // pending, in_progress, completed, overdue, cancelled
  
  // Dates et suivi
  dueAt: timestamp("due_at").notNull(), // Date d'échéance prévue
  completedAt: timestamp("completed_at"), // Date de completion effective
  
  // Validation et approbation
  approverId: varchar("approver_id").references(() => users.id), // Responsable approbation
  requiredDocuments: jsonb("required_documents").$type<string[]>().default(sql`'[]'::jsonb`), // Documents requis pour validation
  validationNotes: text("validation_notes"), // Notes de validation
  
  // Métadonnées
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    projectMilestoneIdx: index("project_milestones_project_id_idx").on(table.projectId),
    typeStatusIdx: index("project_milestones_type_status_idx").on(table.type, table.status),
    dueAtIdx: index("project_milestones_due_at_idx").on(table.dueAt),
  };
});

// ========================================
// NOUVELLES TABLES PHASE 2 - SYSTÈME DE PLANNING AVANCÉ
// ========================================

// Table des tâches de planning détaillé avec hiérarchie et dépendances - Phase 2
export const projectScheduleTasks = pgTable("project_schedule_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  parentTaskId: varchar("parent_task_id").references((): PgColumn => projectScheduleTasks.id, { onDelete: "set null" }), // Auto-référence pour hiérarchie de tâches
  
  // Informations de base de la tâche
  name: varchar("name").notNull(),
  description: text("description"),
  
  // Statut et avancement
  status: taskStatusEnum("status").default("a_faire"), // a_faire, en_cours, termine, en_retard
  percentComplete: integer("percent_complete").default(0), // Pourcentage d'avancement 0-100
  
  // Dates de planning
  plannedStartDate: timestamp("planned_start_date").notNull(), // Date début plannifiée
  plannedEndDate: timestamp("planned_end_date").notNull(), // Date fin plannifiée
  actualStartDate: timestamp("actual_start_date"), // Date début réelle
  actualEndDate: timestamp("actual_end_date"), // Date fin réelle
  
  // Heures et estimation
  estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }).notNull(), // Heures estimées
  actualHours: decimal("actual_hours", { precision: 8, scale: 2 }).default("0"), // Heures réalisées
  
  // Contraintes et méthodes
  constraint: planningConstraintEnum("constraint"), // resource_availability, material_delivery, weather_dependent, etc.
  calculationMethod: calculationMethodEnum("calculation_method").default("manual"), // automatic, manual, historical
  
  // Priorité (les dépendances sont gérées dans la table task_dependencies)
  priority: priorityLevelEnum("priority").default("normale"), // tres_faible, faible, normale, elevee, critique
  
  // Métadonnées
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    projectTaskIdx: index("project_schedule_tasks_project_id_idx").on(table.projectId),
    parentTaskIdx: index("project_schedule_tasks_parent_task_idx").on(table.parentTaskId),
    statusIdx: index("project_schedule_tasks_status_idx").on(table.status),
    plannedDatesIdx: index("project_schedule_tasks_planned_dates_idx").on(table.plannedStartDate, table.plannedEndDate),
    actualDatesIdx: index("project_schedule_tasks_actual_dates_idx").on(table.actualStartDate, table.actualEndDate),
    priorityIdx: index("project_schedule_tasks_priority_idx").on(table.priority),
    constraintIdx: index("project_schedule_tasks_constraint_idx").on(table.constraint),
  };
});

// Table des allocations quotidiennes de ressources sur tâches - Phase 2
export const projectResourceAllocations = pgTable("project_resource_allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }), // Ajout pour performance index composite
  scheduleTaskId: varchar("schedule_task_id").notNull().references(() => projectScheduleTasks.id, { onDelete: "cascade" }),
  
  // Type et identifiant de la ressource
  resourceType: resourceTypeEnum("resource_type").notNull(), // team, employee, equipment, subcontractor
  resourceId: varchar("resource_id").notNull(), // ID de l'équipe, employé ou équipement
  
  // Date et heures d'allocation
  allocationDate: timestamp("allocation_date").notNull(), // Date spécifique d'allocation
  plannedHours: decimal("planned_hours", { precision: 6, scale: 2 }).notNull(), // Heures planifiées
  actualHours: decimal("actual_hours", { precision: 6, scale: 2 }).default("0"), // Heures réalisées
  
  // Taux d'utilisation et notes
  utilizationRate: decimal("utilization_rate", { precision: 5, scale: 2 }), // Taux d'utilisation en %
  notes: text("notes"), // Commentaires sur l'allocation
  
  // Métadonnées
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    scheduleTaskIdx: index("project_resource_allocations_schedule_task_idx").on(table.scheduleTaskId),
    resourceTypeIdx: index("project_resource_allocations_resource_type_idx").on(table.resourceType),
    resourceIdIdx: index("project_resource_allocations_resource_id_idx").on(table.resourceId),
    allocationDateIdx: index("project_resource_allocations_allocation_date_idx").on(table.allocationDate),
    typeResourceDateIdx: index("project_resource_allocations_type_resource_date_idx").on(table.resourceType, table.resourceId, table.allocationDate),
    // Index composite unique critique pour performance - Architecture Phase 2
    projectResourceAllocationUnique: uniqueIndex("project_resource_allocations_unique_idx").on(table.projectId, table.resourceType, table.resourceId, table.allocationDate),
  };
});

// Table des contraintes externes de planning - Phase 2
export const planningConstraints = pgTable("planning_constraints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleTaskId: varchar("schedule_task_id").notNull().references(() => projectScheduleTasks.id, { onDelete: "cascade" }),
  
  // Type et description de la contrainte
  constraintType: planningConstraintEnum("constraint_type").notNull(), // resource_availability, material_delivery, weather_dependent, etc.
  description: text("description").notNull(), // Détail de la contrainte
  
  // Période d'effet de la contrainte
  effectiveFrom: timestamp("effective_from").notNull(), // Date début d'effet
  effectiveTo: timestamp("effective_to"), // Date fin d'effet (optionnelle pour contraintes permanentes)
  
  // Sévérité et statut
  severity: constraintSeverityEnum("severity").notNull(), // blocking, warning, info
  status: constraintStatusEnum("status").default("active"), // active, resolved, cancelled, monitoring
  
  // Informations spécifiques selon le type de contrainte
  weatherCondition: varchar("weather_condition"), // Condition météo si contrainte météo
  supplierReference: varchar("supplier_reference"), // Référence fournisseur si contrainte livraison
  
  // Métadonnées
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    scheduleTaskIdx: index("planning_constraints_schedule_task_idx").on(table.scheduleTaskId),
    constraintTypeIdx: index("planning_constraints_constraint_type_idx").on(table.constraintType),
    severityIdx: index("planning_constraints_severity_idx").on(table.severity),
    statusIdx: index("planning_constraints_status_idx").on(table.status),
    effectivePeriodIdx: index("planning_constraints_effective_period_idx").on(table.effectiveFrom, table.effectiveTo),
    typeStatusIdx: index("planning_constraints_type_status_idx").on(table.constraintType, table.status),
  };
});

// Table de jonction pour dépendances entre tâches - Phase 2 (Performance optimisée)
export const taskDependencies = pgTable("task_dependencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => projectScheduleTasks.id, { onDelete: "cascade" }),
  dependsOnTaskId: varchar("depends_on_task_id").notNull().references(() => projectScheduleTasks.id, { onDelete: "cascade" }),
  
  // Type de dépendance et délai
  dependencyType: dependencyTypeEnum("dependency_type").notNull().default("finish_to_start"), // finish_to_start, start_to_start, finish_to_finish, start_to_finish
  lagDays: integer("lag_days").default(0), // Délai en jours (peut être négatif pour avance)
  
  // Métadonnées
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    taskDependencyIdx: index("task_dependencies_task_id_idx").on(table.taskId),
    dependsOnTaskIdx: index("task_dependencies_depends_on_task_idx").on(table.dependsOnTaskId),
    dependencyTypeIdx: index("task_dependencies_dependency_type_idx").on(table.dependencyType),
    // Index composite pour requêtes de dépendances
    taskDependsOnIdx: index("task_dependencies_task_depends_on_idx").on(table.taskId, table.dependsOnTaskId),
    // Contrainte d'unicité pour éviter doublons
    taskDependencyUnique: uniqueIndex("task_dependencies_unique_idx").on(table.taskId, table.dependsOnTaskId),
  };
});

// Table de liaison lot-fournisseur pour devis - Phase 1
export const lotSupplierQuotes = pgTable("lot_supplier_quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  aoLotId: varchar("ao_lot_id").notNull().references(() => aoLots.id, { onDelete: "cascade" }),
  supplierId: varchar("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  
  // Informations de devis
  priceQuoted: decimal("price_quoted", { precision: 12, scale: 2 }), // Prix proposé par le fournisseur
  responseDate: timestamp("response_date"), // Date de réponse du fournisseur
  
  // Détails du devis
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }), // Prix unitaire proposé
  deliveryDelay: integer("delivery_delay"), // Délai livraison proposé (jours)
  validUntil: timestamp("valid_until"), // Date validité du devis
  
  // Statut et notes
  isSelected: boolean("is_selected").default(false), // Devis sélectionné
  notes: text("notes"), // Notes sur le devis
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    lotSupplierIdx: index("lot_supplier_quotes_lot_supplier_idx").on(table.aoLotId, table.supplierId),
    supplierIdx: index("lot_supplier_quotes_supplier_idx").on(table.supplierId),
    responseDateIdx: index("lot_supplier_quotes_response_date_idx").on(table.responseDate),
    // Contrainte d'unicité pour éviter doublons
    lotSupplierUnique: uniqueIndex("lot_supplier_quotes_unique_idx").on(table.aoLotId, table.supplierId),
  };
});

// Table de liaison projet-fournisseur - Phase 1
export const projectSuppliers = pgTable("project_suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  supplierId: varchar("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  
  // Rôle et responsabilités
  role: supplierRoleEnum("role").default("principal"), // principal, secondaire, sous_traitant, consultant
  
  // Dates d'engagement
  startDate: timestamp("start_date"), // Date début collaboration
  endDate: timestamp("end_date"), // Date fin prévue
  
  // Contractuel et financier
  contractAmount: decimal("contract_amount", { precision: 12, scale: 2 }), // Montant contractuel
  
  // Statut et suivi
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    projectSupplierIdx: index("project_suppliers_project_supplier_idx").on(table.projectId, table.supplierId),
    supplierIdx: index("project_suppliers_supplier_idx").on(table.supplierId),
    roleIdx: index("project_suppliers_role_idx").on(table.role),
  };
});

// Table des utilisateurs (simplifiée pour POC)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("technicien_be"), // POC : BE ou terrain
  isActive: boolean("is_active").default(true),
  chargeStatus: chargeStatusEnum("charge_status").default("disponible"),
  
  // ========================================
  // EXTENSIONS MONDAY.COM - MODULE RH
  // ========================================
  departmentType: departmentTypeEnum("department_type"),      // BUREAU, CHANTIER
  competencies: competencyEnum("competencies").array(),       // [MEXT, MINT, BARDAGE]
  vehicleAssigned: varchar("vehicle_assigned"),               // "COFFIN CAMION", "TRISTRAM CAMION"
  mondayPersonnelId: varchar("monday_personnel_id"),          // Migration Monday.com
  certificationExpiry: timestamp("certification_expiry"),     // Suivi habilitations
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Appels d'Offres - Base pour éviter double saisie
export const aos = pgTable("aos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reference: varchar("reference").notNull().unique(),
  client: varchar("client").notNull(),
  location: varchar("location").notNull(),
  departement: departementEnum("departement").notNull(),
  
  // Informations générales étendues
  intituleOperation: text("intitule_operation"),
  
  // Gestion des dates simplifiée
  dateLimiteRemise: timestamp("date_limite_remise"), // Date limite de remise (saisie manuelle)
  dateSortieAO: timestamp("date_sortie_ao"), // Date de sortie de l'AO (nouvelle)
  dateRenduAO: timestamp("date_rendu_ao"), // Calculée automatiquement
  dateAcceptationAO: timestamp("date_acceptation_ao"), // Gardée
  
  // Relations vers les maîtres d'ouvrage et d'œuvre
  maitreOuvrageId: varchar("maitre_ouvrage_id").references(() => maitresOuvrage.id),
  maitreOeuvreId: varchar("maitre_oeuvre_id").references(() => maitresOeuvre.id),
  
  // Contacts spécifiques à cet AO (si différents de la fiche principale)
  contactAONom: varchar("contact_ao_nom"), // Contact spécifique pour cet AO
  contactAOPoste: varchar("contact_ao_poste"),
  contactAOTelephone: varchar("contact_ao_telephone"),
  contactAOEmail: varchar("contact_ao_email"),
  
  // Informations techniques (lots gérés dans table séparée)
  menuiserieType: menuiserieTypeEnum("menuiserie_type").notNull(),
  montantEstime: decimal("montant_estime", { precision: 12, scale: 2 }),
  typeMarche: marcheTypeEnum("type_marche"),
  prorataEventuel: decimal("prorata_eventuel", { precision: 5, scale: 2 }),
  demarragePrevu: timestamp("demarrage_prevu"),
  dateLivraisonPrevue: timestamp("date_livraison_prevue"), // Date de livraison extraite par OCR
  
  // Éléments techniques et administratifs
  bureauEtudes: varchar("bureau_etudes"),
  bureauControle: varchar("bureau_controle"),
  sps: varchar("sps"), // Service Prévention Sécurité
  
  // Source et dates
  source: aoSourceEnum("source").notNull(),
  dateOS: timestamp("date_os"),
  description: text("description"),
  cctp: text("cctp"), // Cahier des Clauses Techniques Particulières
  delaiContractuel: integer("delai_contractuel"), // en jours
  
  // Sélection
  isSelected: boolean("is_selected").default(false),
  selectionComment: text("selection_comment"),
  
  // ========================================
  // EXTENSIONS SAXIUM - MONDAY.COM
  // ========================================
  clientName: varchar("client_name"),
  city: varchar("city"),
  aoCategory: aoCategoryEnum("ao_category"),
  operationalStatus: aoOperationalStatusEnum("operational_status"),
  dueDate: timestamp("due_date"),
  amountEstimate: decimal("amount_estimate", { precision: 12, scale: 2 }),
  priority: priorityLevelEnum("priority"),
  mondayItemId: varchar("monday_item_id"),
  tags: varchar("tags").array(),
  
  // ========================================
  // EXTENSIONS MONDAY.COM - AO PLANNING
  // ========================================
  projectSize: varchar("project_size"),              // "60 lgts", "85 lgts", "102 lgts"
  specificLocation: text("specific_location"),       // "Quartier des Ilot des Peintres"
  estimatedDelay: varchar("estimated_delay"),        // "->01/10/25" format parsing
  clientRecurrency: boolean("client_recurrency"),    // NEXITY/COGEDIM récurrents
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    referenceIdx: index("aos_reference_idx").on(table.reference),
  };
});

// Maîtres d'ouvrage - Base de données réutilisable
export const maitresOuvrage = pgTable("maitres_ouvrage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nom: varchar("nom").notNull(),
  typeOrganisation: varchar("type_organisation"), // Commune, Entreprise, Particulier, etc.
  adresse: text("adresse"),
  codePostal: varchar("code_postal"),
  ville: varchar("ville"),
  departement: departementEnum("departement"),
  telephone: varchar("telephone"),
  email: varchar("email"),
  siteWeb: varchar("site_web"),
  siret: varchar("siret"),
  
  // Contact principal
  contactPrincipalNom: varchar("contact_principal_nom"),
  contactPrincipalPoste: varchar("contact_principal_poste"),
  contactPrincipalTelephone: varchar("contact_principal_telephone"),
  contactPrincipalEmail: varchar("contact_principal_email"),
  
  // Informations complémentaires
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    nomIdx: index("maitres_ouvrage_nom_idx").on(table.nom),
    departementIdx: index("maitres_ouvrage_departement_idx").on(table.departement),
  };
});

// Maîtres d'œuvre - Base de données réutilisable avec multi-contacts
export const maitresOeuvre = pgTable("maitres_oeuvre", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nom: varchar("nom").notNull(), // Nom de la société
  typeOrganisation: varchar("type_organisation"), // Cabinet d'architecture, Bureau d'études, etc.
  adresse: text("adresse"),
  codePostal: varchar("code_postal"),
  ville: varchar("ville"),
  departement: departementEnum("departement"),
  telephone: varchar("telephone"),
  email: varchar("email"),
  siteWeb: varchar("site_web"),
  siret: varchar("siret"),
  
  // Spécialités
  specialites: text("specialites"), // Logement, Tertiaire, Industriel, etc.
  
  // Informations complémentaires
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    nomIdx: index("maitres_oeuvre_nom_idx").on(table.nom),
    departementIdx: index("maitres_oeuvre_departement_idx").on(table.departement),
  };
});

// Contacts des maîtres d'œuvre (relation 1-N)
export const contactsMaitreOeuvre = pgTable("contacts_maitre_oeuvre", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  maitreOeuvreId: varchar("maitre_oeuvre_id").notNull().references(() => maitresOeuvre.id, { onDelete: "cascade" }),
  
  nom: varchar("nom").notNull(),
  prenom: varchar("prenom"),
  poste: posteTypeEnum("poste").notNull(),
  posteLibre: varchar("poste_libre"), // Si poste = "autre"
  
  // Coordonnées
  telephone: varchar("telephone"),
  mobile: varchar("mobile"),
  email: varchar("email").notNull(),
  
  // Statut
  isContactPrincipal: boolean("is_contact_principal").default(false),
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    maitreOeuvreIdx: index("contacts_maitre_oeuvre_id_idx").on(table.maitreOeuvreId),
    emailIdx: index("contacts_maitre_oeuvre_email_idx").on(table.email),
  };
});

// Lots d'Appels d'Offres (gestion multiple des lots avec informations techniques détaillées)
export const aoLots = pgTable("ao_lots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  aoId: varchar("ao_id").notNull().references(() => aos.id, { onDelete: "cascade" }),
  numero: varchar("numero").notNull(), // Numéro du lot (ex: "Lot 01", "07.1", etc.)
  designation: text("designation").notNull(), // Description du lot
  menuiserieType: menuiserieTypeEnum("menuiserie_type"), // Type spécifique au lot
  montantEstime: decimal("montant_estime", { precision: 12, scale: 2 }), // Montant estimé du lot
  isSelected: boolean("is_selected").default(false), // Lot sélectionné pour réponse
  status: lotStatusEnum("status").default("brouillon"), // Statut du lot dans le workflow
  
  // Informations techniques détaillées extraites par OCR
  quantite: integer("quantite"), // Nombre d'éléments (ex: 45 fenêtres)
  materiau: varchar("materiau"), // Matériau principal (ex: "aluminium", "PVC", "bois")
  vitrage: varchar("vitrage"), // Type de vitrage (ex: "double vitrage", "triple vitrage")
  localisation: varchar("localisation"), // Localisation spécifique (ex: "Façade Sud", "Étage 1-3")
  dimensions: varchar("dimensions"), // Dimensions si spécifiées
  couleur: varchar("couleur"), // Couleur spécifiée
  performanceThermique: varchar("performance_thermique"), // Performances (ex: "Uw ≤ 1,4 W/m²K")
  performanceAcoustique: varchar("performance_acoustique"), // Isolation phonique
  normesReglementaires: text("normes_reglementaires").array(), // Normes à respecter
  accessoires: text("accessoires"), // Accessoires inclus
  specificitesTechniques: text("specificites_techniques"), // Autres spécificités
  
  // Infos contractuelles
  delaiLivraison: varchar("delai_livraison"), // Délai de livraison spécifique au lot
  uniteOeuvre: varchar("unite_oeuvre"), // Unité d'œuvre (ex: "à l'unité", "au m²")
  
  // Extension Phase 1 : Gestion workflow fournisseurs et pricing
  supplierChosenId: varchar("supplier_chosen_id").references(() => suppliers.id), // Fournisseur sélectionné pour ce lot
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }), // Prix unitaire négocié
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }), // Prix total calculé
  supplierQuotes: jsonb("supplier_quotes").$type<Record<string, any>>().default(sql`'{}'::jsonb`), // Devis fournisseurs reçus
  
  // Extension Phase 1 : Validations workflow
  technicalValidation: boolean("technical_validation").default(false), // Validation technique effectuée
  priceValidation: boolean("price_validation").default(false), // Validation prix effectuée  
  finalValidation: boolean("final_validation").default(false), // Validation finale effectuée
  
  comment: text("comment"), // Commentaire spécifique au lot
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    aoLotIdx: index("ao_lots_ao_id_idx").on(table.aoId),
  };
});

// Dossiers d'Offre & Chiffrage (cœur du POC)
export const offers = pgTable("offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reference: varchar("reference").notNull().unique(),
  aoId: varchar("ao_id").references(() => aos.id), // Récupération assistée des données AO
  
  // Informations héritées et complétées depuis AO
  client: varchar("client").notNull(),
  location: varchar("location").notNull(),
  menuiserieType: menuiserieTypeEnum("menuiserie_type").notNull(),
  montantEstime: decimal("montant_estime", { precision: 12, scale: 2 }),
  montantFinal: decimal("montant_final", { precision: 12, scale: 2 }),
  
  // Informations étendues pour dossier d'offre
  intituleOperation: text("intitule_operation"),
  
  // Relations vers les contacts (héritées de l'AO ou spécifiques à l'offre)
  maitreOuvrageId: varchar("maitre_ouvrage_id").references(() => maitresOuvrage.id),
  maitreOeuvreId: varchar("maitre_oeuvre_id").references(() => maitresOeuvre.id),
  
  // Contacts spécifiques à cette offre (si différents de l'AO)
  contactOffreNom: varchar("contact_offre_nom"),
  contactOffrePoste: varchar("contact_offre_poste"),
  contactOffreTelephone: varchar("contact_offre_telephone"),
  contactOffreEmail: varchar("contact_offre_email"),
  typeMarche: marcheTypeEnum("type_marche"),
  prorataEventuel: decimal("prorata_eventuel", { precision: 5, scale: 2 }),
  demarragePrevu: timestamp("demarrage_prevu"),
  
  // Source et réception (audit JLM : plateformes, contacts directs)
  source: aoSourceEnum("source").default("website"),
  plateformeSource: varchar("plateforme_source"), // BOMP, Marché Online, France Marché
  contactDirect: varchar("contact_direct"), // Contact Julien
  
  // Critères de sélection (audit JLM : départements 50/62, distance)  
  departement: varchar("departement"),
  distanceKm: varchar("distance_km"),
  
  // Dates souvent manquantes (audit JLM : problèmes date OS, délai contractuel)
  dateOS: timestamp("date_os"),
  delaiContractuel: varchar("delai_contractuel"), // En jours (souvent non précisé)
  dateLimiteRemise: timestamp("date_limite_remise"), // Date limite de remise (saisie manuelle)
  dateSortieAO: timestamp("date_sortie_ao"), // Date de sortie de l'AO (nouvelle)
  dateRenduAO: timestamp("date_rendu_ao"), // Calculée automatiquement
  dateAcceptationAO: timestamp("date_acceptation_ao"),
  
  // Éléments techniques et administratifs
  bureauEtudes: varchar("bureau_etudes"),
  bureauControle: varchar("bureau_controle"),
  sps: varchar("sps"),
  
  // Documents techniques (audit JLM : CCTP, études, plans, DPGF, DCE)
  cctpDisponible: boolean("cctp_disponible").default(false),
  cctpImprime: boolean("cctp_imprime").default(false), // Sylvie imprime CCTP
  etudesThermiquesDisponibles: boolean("etudes_thermiques_disponibles").default(false),
  etudesAcoustiquesDisponibles: boolean("etudes_acoustiques_disponibles").default(false),
  plansDisponibles: boolean("plans_disponibles").default(false),
  dpgfClientDisponible: boolean("dpgf_client_disponible").default(false),
  dceDisponible: boolean("dce_disponible").default(false),
  
  // Quantitatifs (audit JLM : portes, fenêtres, éléments)
  quantitatifRealise: boolean("quantitatif_realise").default(false),
  portesPrevues: varchar("portes_prevues"),
  fenetresPrevues: varchar("fenetres_prevues"),
  autresElementsPrevus: varchar("autres_elements_prevus"),
  
  // Consultation fournisseurs (audit JLM : K-Line, tableaux Excel)
  fournisseursConsultes: varchar("fournisseurs_consultes"), // K-Line et autres
  fournisseursRetenus: jsonb("fournisseurs_retenus"), // Liste des fournisseurs avec n° devis
  tableauxExcelGeneres: boolean("tableaux_excel_generes").default(false),
  devisDetailleEtabli: boolean("devis_detaille_etabli").default(false), // Sur Batigest
  fichesTechniquesTransmises: boolean("fiches_techniques_transmises").default(false),
  
  // Documents administratifs (audit JLM : DC1, DC2, références, KBIS, assurances, quitus)
  dc1Complete: boolean("dc1_complete").default(false),
  dc2Complete: boolean("dc2_complete").default(false),
  referencesTravauxFournies: boolean("references_travaux_fournies").default(false),
  kbisValide: boolean("kbis_valide").default(false),
  assurancesValides: boolean("assurances_valides").default(false),
  quitusLegalFourni: boolean("quitus_legal_fourni").default(false),
  
  // Pièces obligatoires (checklist)
  urssafValide: boolean("urssaf_valide").default(false),
  assuranceDecennaleValide: boolean("assurance_decennale_valide").default(false),
  ribValide: boolean("rib_valide").default(false),
  qualificationsValides: boolean("qualifications_valides").default(false),
  planAssuranceQualiteValide: boolean("plan_assurance_qualite_valide").default(false),
  
  // Gestion documentaire
  documentPassationGenere: boolean("document_passation_genere").default(false),
  pageGardeAOGeneree: boolean("page_garde_ao_generee").default(false),
  sousDocsiersGeneres: boolean("sous_dossiers_generes").default(false),
  
  // Workflow et suivi (audit JLM : réunion mardi matin, arborescence)
  pointOffrePrevu: varchar("point_offre_prevu"), // Réunion mardi matin Sylvie/Julien
  dossierEtudeAOCree: boolean("dossier_etude_ao_cree").default(false),
  arborescenceGeneree: boolean("arborescence_generee").default(false),
  
  // Workflow et statuts
  status: offerStatusEnum("status").default("brouillon"),
  responsibleUserId: varchar("responsible_user_id").references(() => users.id),
  isPriority: boolean("is_priority").default(false), // Marquage priorité
  
  // Chiffrage et suivi BE
  dpgfData: jsonb("dpgf_data"), // Document Provisoire de Gestion Financière
  batigestRef: varchar("batigest_ref"), // Connexion simulée Batigest
  finEtudesValidatedAt: timestamp("fin_etudes_validated_at"), // Jalon POC
  finEtudesValidatedBy: varchar("fin_etudes_validated_by").references(() => users.id),
  beHoursEstimated: decimal("be_hours_estimated", { precision: 8, scale: 2 }),
  beHoursActual: decimal("be_hours_actual", { precision: 8, scale: 2 }),
  deadline: timestamp("deadline"),
  
  // KPI Fields - Montants pour calculs KPIs
  montantPropose: decimal("montant_propose", { precision: 12, scale: 2 }), // Montant commercial proposé
  probabilite: decimal("probabilite", { precision: 3, scale: 2 }), // Probabilité 0-100 de signature (optionnel)
  tauxMarge: decimal("taux_marge", { precision: 5, scale: 2 }), // Taux de marge attendu (%) pour fallback
  
  // ========================================
  // INTELLIGENCE ÉCHÉANCES - PHASE 2.1 (NOUVEAUX CHAMPS)
  // ========================================
  deadlineBuffer: integer("deadline_buffer").default(2), // jours buffer avant deadline
  autoDeadlineCalc: boolean("auto_deadline_calc").default(true),
  deadlineRiskLevel: priorityLevelEnum("deadline_risk_level").default("normale"),
  
  // Historique versions échéances
  // deadlineHistory: jsonb("deadline_history"), // TEMPORAIREMENT COMMENTÉ - colonne n'existe pas en DB
  // deadlineSource: calculationMethodEnum("deadline_source").default("automatic"), // AUSSI COMMENTÉ - colonne n'existe pas en DB
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    referenceIdx: index("offers_reference_idx").on(table.reference),
    statusIdx: index("offers_status_idx").on(table.status),
  };
});

// Projets (transformation dossier d'offre validé)
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").references(() => offers.id), // Lien avec dossier d'offre
  
  // ========================================
  // INFORMATIONS DE BASE (EXISTANTES)
  // ========================================
  name: varchar("name").notNull(),
  client: varchar("client").notNull(),
  location: varchar("location").notNull(),
  status: projectStatusEnum("status").default("passation"), // 6 étapes POC - Commence par passation (SLA 1 mois)
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  responsibleUserId: varchar("responsible_user_id").references(() => users.id),
  chefTravaux: varchar("chef_travaux").references(() => users.id),
  progressPercentage: integer("progress_percentage").default(0),
  
  // ========================================
  // INFORMATIONS TECHNIQUES (héritées AO/Offers)
  // ========================================
  reference: varchar("reference"), // Référence projet héritée d'offre
  intituleOperation: text("intitule_operation"), // Intitulé complet opération
  description: text("description"), // Description détaillée du projet
  menuiserieType: menuiserieTypeEnum("menuiserie_type"), // Type menuiserie principal
  typeMarche: marcheTypeEnum("type_marche"), // Type de marché
  departement: departementEnum("departement"), // Département localisation
  
  // Montants et financier
  montantEstime: decimal("montant_estime", { precision: 12, scale: 2 }), // Montant initial estimé
  montantFinal: decimal("montant_final", { precision: 12, scale: 2 }), // Montant contractuel final
  prorataEventuel: decimal("prorata_eventuel", { precision: 5, scale: 2 }), // Prorata éventuel
  
  // ========================================
  // RELATIONS CONTACTS (héritées AO/Offers)
  // ========================================
  maitreOuvrageId: varchar("maitre_ouvrage_id").references(() => maitresOuvrage.id),
  maitreOeuvreId: varchar("maitre_oeuvre_id").references(() => maitresOeuvre.id),
  
  // Contacts spécifiques au projet (si différents d'AO/Offre)
  contactProjetNom: varchar("contact_projet_nom"),
  contactProjetPoste: varchar("contact_projet_poste"),
  contactProjetTelephone: varchar("contact_projet_telephone"),
  contactProjetEmail: varchar("contact_projet_email"),
  
  // ========================================
  // DATES CRITIQUES (héritées AO/Offers)
  // ========================================
  dateOS: timestamp("date_os"), // Date Ordre de Service
  delaiContractuel: integer("delai_contractuel"), // Délai contractuel en jours
  dateLimiteRemise: timestamp("date_limite_remise"), // Date limite remise originale AO
  dateLivraisonPrevue: timestamp("date_livraison_prevue"), // Date livraison contractuelle
  demarragePrevu: timestamp("demarrage_prevu"), // Date démarrage prévue
  dateLivraisonReelle: timestamp("date_livraison_reelle"), // Date livraison réelle
  
  // ========================================
  // ÉLÉMENTS ADMINISTRATIFS (hérités AO/Offers)
  // ========================================
  bureauEtudes: varchar("bureau_etudes"), // Bureau d'études associé
  bureauControle: varchar("bureau_controle"), // Bureau de contrôle
  sps: varchar("sps"), // Service Prévention Sécurité
  
  // ========================================
  // SOURCE ET WORKFLOW (hérités AO/Offers)
  // ========================================
  source: aoSourceEnum("source"), // Source originale AO
  plateformeSource: varchar("plateforme_source"), // Plateforme d'origine si applicable
  batigestRef: varchar("batigest_ref"), // Référence Batigest héritée
  
  // ========================================
  // VALIDATION ET JALONS (hérités Offers)
  // ========================================
  finEtudesValidatedAt: timestamp("fin_etudes_validated_at"), // Validation fin études
  finEtudesValidatedBy: varchar("fin_etudes_validated_by").references(() => users.id),
  
  // ========================================
  // GESTION CHANTIER (spécifique Projets)
  // ========================================
  dateDebutChantier: timestamp("date_debut_chantier"), // Date réelle début chantier
  dateFinChantier: timestamp("date_fin_chantier"), // Date réelle fin chantier
  coordinateurSPS: varchar("coordinateur_sps"), // Coordinateur SPS chantier
  
  // Suivi avancement chantier
  acompteVerse: decimal("acompte_verse", { precision: 12, scale: 2 }).default("0"), // Acomptes versés
  restantDu: decimal("restant_du", { precision: 12, scale: 2 }), // Restant dû
  retenuGarantie: decimal("retenu_garantie", { precision: 12, scale: 2 }), // Retenue de garantie
  
  // ========================================
  // INTELLIGENCE TEMPORELLE - PHASE 2.1 (NOUVEAUX CHAMPS)
  // ========================================
  autoScheduling: boolean("auto_scheduling").default(true),
  optimizationEnabled: boolean("optimization_enabled").default(true),
  planningSensitivity: priorityLevelEnum("planning_sensitivity").default("normale"),
  
  // Métadonnées planning intelligent
  lastOptimizedAt: timestamp("last_optimized_at"),
  optimizationScore: decimal("optimization_score", { precision: 3, scale: 2 }),
  planningNotes: text("planning_notes"),
  
  // Contraintes spécifiques projet
  planningConstraints: text("planning_constraints").array().default(sql`'{}'::text[]`),
  criticalPath: text("critical_path").array().default(sql`'{}'::text[]`),
  riskFactors: jsonb("risk_factors"), // Facteurs de risque JSON
  
  // Buffer et marges
  globalBuffer: integer("global_buffer").default(0), // jours buffer global
  qualityGates: jsonb("quality_gates"), // Points contrôle qualité

  // ========================================
  // EXTENSIONS SAXIUM - MONDAY.COM
  // ========================================
  siteAddress: varchar("site_address"),
  city: varchar("city"),
  startDatePlanned: timestamp("start_date_planned"),
  endDatePlanned: timestamp("end_date_planned"),
  contractAmount: decimal("contract_amount", { precision: 12, scale: 2 }),
  lotCount: integer("lot_count"),
  mondayItemId: varchar("monday_item_id"),
  
  // ========================================
  // EXTENSIONS MONDAY.COM - CHANTIERS
  // ========================================
  mondayProjectId: varchar("monday_project_id"),     // Migration Monday.com
  projectSubtype: varchar("project_subtype"),        // "men_ext", "men_int", "bardage"
  geographicZone: varchar("geographic_zone"),        // "BOULOGNE", "ETAPLES", "LONGUENESSE"
  buildingCount: integer("building_count"),          // Bât A/B/C organisation

  // ========================================
  // MÉTADONNÉES (existantes)
  // ========================================
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tâches de projet pour planning partagé
export const projectTasks = pgTable("project_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  name: varchar("name").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").default("a_faire"),
  assignedUserId: varchar("assigned_user_id").references(() => users.id),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 8, scale: 2 }),
  isJalon: boolean("is_jalon").default(false), // Jalon clé avec alertes
  position: integer("position"), // Pour glisser-déposer
  parentTaskId: varchar("parent_task_id"), // Self-reference will be added via foreign key
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Éléments de chiffrage pour le module de chiffrage et DPGF
export const chiffrageElements = pgTable("chiffrage_elements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").notNull().references(() => offers.id),
  
  // Classification de l'élément
  category: varchar("category").notNull(), // ex: "menuiseries_exterieures", "menuiseries_interieures", "main_oeuvre"
  subcategory: varchar("subcategory"), // ex: "fenetres", "portes", "pose"
  
  // Description de l'élément
  designation: text("designation").notNull(), // Description détaillée
  unit: varchar("unit").notNull(), // Unité (m², ml, u, etc.)
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  
  // Prix et coûts
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  
  // Coefficients et marges
  coefficient: decimal("coefficient", { precision: 5, scale: 2 }).default("1.00"),
  marginPercentage: decimal("margin_percentage", { precision: 5, scale: 2 }).default("20.00"),
  
  // Fournisseur (optionnel)
  supplier: varchar("supplier"),
  supplierRef: varchar("supplier_ref"),
  
  // Association avec les lots AO
  lotId: varchar("lot_id").references(() => aoLots.id), // Référence vers le lot AO
  lotNumber: integer("lot_number"), // Numéro de lot pour groupement DPGF
  
  // Métadonnées
  position: integer("position").default(0), // Ordre d'affichage
  isOptional: boolean("is_optional").default(false),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// DPGF (Document Provisoire de Gestion Financière) généré
export const dpgfDocuments = pgTable("dpgf_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").notNull().references(() => offers.id),
  
  // Informations générales
  version: varchar("version").default("1.0"),
  status: varchar("status").default("brouillon"), // brouillon, finalise, valide
  
  // Totaux calculés
  totalHT: decimal("total_ht", { precision: 12, scale: 2 }).notNull(),
  totalTVA: decimal("total_tva", { precision: 12, scale: 2 }).notNull(),
  totalTTC: decimal("total_ttc", { precision: 12, scale: 2 }).notNull(),
  
  // Données structurées pour l'affichage
  dpgfData: jsonb("dpgf_data"), // Structure complète du DPGF
  
  // Validation et suivi
  generatedBy: varchar("generated_by").references(() => users.id),
  validatedBy: varchar("validated_by").references(() => users.id),
  validatedAt: timestamp("validated_at"),
  
  // Intégration Batigest simulée
  batigestRef: varchar("batigest_ref"),
  batigestSyncedAt: timestamp("batigest_synced_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    offerVersionIdx: index("dpgf_offer_version_idx").on(table.offerId, table.version),
  };
});

// Demandes de prix fournisseurs (simplifiées POC)
export const supplierRequests = pgTable("supplier_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").references(() => offers.id),
  projectId: varchar("project_id").references(() => projects.id),
  supplierName: varchar("supplier_name").notNull(),
  supplierEmail: varchar("supplier_email"),
  supplierPhone: varchar("supplier_phone"),
  description: text("description"),
  requestedItems: jsonb("requested_items"), // Liste des éléments demandés
  status: varchar("status").default("envoyee"), // envoyee, recue, analysee
  sentAt: timestamp("sent_at").defaultNow(),
  responseAt: timestamp("response_at"),
  quotationAmount: decimal("quotation_amount", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ressources équipe (simplifiée POC)
export const teamResources = pgTable("team_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  userId: varchar("user_id").references(() => users.id), // Ressource interne
  externalName: varchar("external_name"), // Sous-traitant
  role: varchar("role"), // ex: "chef_equipe", "poseur", "sous_traitant"
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  chargeStatus: chargeStatusEnum("charge_status").default("disponible"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ========================================
// GESTION DES ÉQUIPES - POC
// ========================================

// Équipes de JLM Menuiserie
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // Nom de l'équipe (ex: "Équipe Pose Nord", "Équipe BE")
  description: text("description"), // Description de l'équipe
  teamLeaderId: varchar("team_leader_id").references(() => users.id), // Chef d'équipe
  type: varchar("type").notNull().default("pose"), // "pose", "be", "commercial", "support"
  specialization: varchar("specialization"), // Spécialisation (ex: "fenêtres", "portes", "verrières")
  location: varchar("location"), // Localisation principale
  isActive: boolean("is_active").default(true),
  maxMembers: integer("max_members").default(10), // Nombre max de membres
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    nameIdx: index("teams_name_idx").on(table.name),
    typeIdx: index("teams_type_idx").on(table.type),
    leaderIdx: index("teams_leader_idx").on(table.teamLeaderId),
  };
});

// Membres des équipes (enrichi avec informations professionnelles complètes)
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  
  // Identification membre
  userId: varchar("user_id").references(() => users.id), // Membre interne
  externalMemberName: varchar("external_member_name"), // Sous-traitant externe
  externalMemberEmail: varchar("external_member_email"),
  externalMemberPhone: varchar("external_member_phone"),
  externalMemberAddress: text("external_member_address"), // Adresse complète
  
  // Informations professionnelles
  role: varchar("role").notNull(), // "chef_equipe", "poseur", "aide", "sous_traitant"
  poste: varchar("poste"), // Poste précis (ex: "Poseur fenêtres spécialisé aluminium")
  skills: text("skills").array(), // Compétences (ex: ["fenêtres", "portes", "aluminium"])
  experienceLevel: experienceLevelEnum("experience_level").default("confirme"),
  yearsExperience: integer("years_experience").default(0), // Années d'expérience
  certifications: text("certifications").array(), // Certifications (ex: ["QUALIBAT", "RGE"])
  
  // Contrat et conditions
  contractType: contractTypeEnum("contract_type").default("cdi"),
  contractStartDate: timestamp("contract_start_date"), // Date début contrat
  contractEndDate: timestamp("contract_end_date"), // Date fin (si CDD)
  weeklyHours: decimal("weekly_hours", { precision: 5, scale: 2 }).default("35.00"), // Heures hebdomadaires
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }), // Taux horaire (pour externes)
  socialSecurityNumber: varchar("social_security_number"), // Numéro Sécurité Sociale
  
  // Contact et urgence
  emergencyContactName: varchar("emergency_contact_name"), // Contact d'urgence
  emergencyContactPhone: varchar("emergency_contact_phone"),
  emergencyContactRelation: varchar("emergency_contact_relation"), // Relation (conjoint, parent, etc.)
  
  // Données administratives
  birthDate: timestamp("birth_date"), // Date de naissance
  nationalId: varchar("national_id"), // Carte d'identité / Passeport
  bankAccount: varchar("bank_account"), // IBAN (chiffré)
  
  // Équipements et permissions
  hasDriverLicense: boolean("has_driver_license").default(false), // Permis de conduire
  hasVehicle: boolean("has_vehicle").default(false), // Véhicule personnel
  vehicleDetails: text("vehicle_details"), // Détails véhicule (marque, modèle, plaque)
  equipmentProvided: text("equipment_provided").array(), // Équipements fournis
  accessPermissions: text("access_permissions").array(), // Permissions d'accès chantiers
  
  // Statuts et activité
  isActive: boolean("is_active").default(true),
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
  leftReason: varchar("left_reason"), // Raison de départ
  performanceRating: decimal("performance_rating", { precision: 3, scale: 2 }), // Note performance (0-5)
  
  // Notes et observations
  notes: text("notes"), // Notes générales
  medicalRestrictions: text("medical_restrictions"), // Restrictions médicales
  
  // Métadonnées
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    teamUserIdx: index("team_members_team_user_idx").on(table.teamId, table.userId),
    roleIdx: index("team_members_role_idx").on(table.role),
    activeIdx: index("team_members_active_idx").on(table.isActive),
    contractIdx: index("team_members_contract_idx").on(table.contractType),
    experienceIdx: index("team_members_experience_idx").on(table.experienceLevel),
    nameSearchIdx: index("team_members_name_search_idx").on(table.externalMemberName),
  };
});

// Indicateurs de charge BE (POC)
export const beWorkload = pgTable("be_workload", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  weekNumber: integer("week_number").notNull(),
  year: integer("year").notNull(),
  plannedHours: decimal("planned_hours", { precision: 8, scale: 2 }).default("35.00"),
  actualHours: decimal("actual_hours", { precision: 8, scale: 2 }).default("0.00"),
  dossierCount: integer("dossier_count").default(0),
  chargeLevel: chargeStatusEnum("charge_level").default("disponible"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    userWeekIdx: index("be_workload_user_week_idx").on(table.userId, table.weekNumber, table.year),
  };
});

// Table des jalons de validation (validation milestones) - Maintenant "Bouclage" 
export const validationMilestones = pgTable("validation_milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").references(() => offers.id),
  projectId: varchar("project_id").references(() => projects.id),
  milestoneType: bouclageTypeEnum("milestone_type").notNull(), // Utilise maintenant l'enum bouclage
  isCompleted: boolean("is_completed").default(false),
  completedBy: varchar("completed_by").references(() => users.id),
  completedAt: timestamp("completed_at"),
  comment: text("comment"),
  blockers: text("blockers"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    offerIdx: index("validation_milestones_offer_idx").on(table.offerId),
    projectIdx: index("validation_milestones_project_idx").on(table.projectId),
    typeIdx: index("validation_milestones_type_idx").on(table.milestoneType),
  };
});

// Table de priorisation intelligente des projets et offres
export const projectPriorities = pgTable("project_priorities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").references(() => offers.id),
  projectId: varchar("project_id").references(() => projects.id),
  
  // Score et niveau de priorité
  priorityLevel: priorityLevelEnum("priority_level").default("normale"),
  priorityScore: decimal("priority_score", { precision: 10, scale: 2 }).default("50.00"), // Score sur 100
  
  // Facteurs de scoring (valeurs 0-100 pour chaque facteur)
  montantScore: decimal("montant_score", { precision: 5, scale: 2 }).default("50.00"),
  delaiScore: decimal("delai_score", { precision: 5, scale: 2 }).default("50.00"),
  typeClientScore: decimal("type_client_score", { precision: 5, scale: 2 }).default("50.00"),
  complexiteScore: decimal("complexite_score", { precision: 5, scale: 2 }).default("50.00"),
  chargeBeScore: decimal("charge_be_score", { precision: 5, scale: 2 }).default("50.00"),
  risqueScore: decimal("risque_score", { precision: 5, scale: 2 }).default("50.00"),
  strategiqueScore: decimal("strategique_score", { precision: 5, scale: 2 }).default("50.00"),
  
  // Poids des facteurs (configurable, somme doit = 100)
  montantWeight: decimal("montant_weight", { precision: 5, scale: 2 }).default("25.00"),
  delaiWeight: decimal("delai_weight", { precision: 5, scale: 2 }).default("25.00"),
  typeClientWeight: decimal("type_client_weight", { precision: 5, scale: 2 }).default("15.00"),
  complexiteWeight: decimal("complexite_weight", { precision: 5, scale: 2 }).default("10.00"),
  chargeBeWeight: decimal("charge_be_weight", { precision: 5, scale: 2 }).default("10.00"),
  risqueWeight: decimal("risque_weight", { precision: 5, scale: 2 }).default("10.00"),
  strategiqueWeight: decimal("strategique_weight", { precision: 5, scale: 2 }).default("5.00"),
  
  // Règles et configuration
  autoCalculated: boolean("auto_calculated").default(true), // Si calculé automatiquement
  manualOverride: boolean("manual_override").default(false), // Si priorité forcée manuellement
  manualPriorityLevel: priorityLevelEnum("manual_priority_level"), // Priorité forcée
  overrideReason: text("override_reason"), // Raison du forçage
  overrideBy: varchar("override_by").references(() => users.id), // Qui a forcé
  overrideAt: timestamp("override_at"),
  
  // Notifications et alertes
  alertCritical: boolean("alert_critical").default(false), // Alerte critique activée
  alertSent: boolean("alert_sent").default(false), // Alerte déjà envoyée
  alertSentAt: timestamp("alert_sent_at"),
  
  // Historique et suivi
  lastCalculatedAt: timestamp("last_calculated_at").defaultNow(),
  calculationHistory: jsonb("calculation_history"), // Historique des changements de score
  
  // Métadonnées
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    offerIdx: index("project_priorities_offer_idx").on(table.offerId),
    projectIdx: index("project_priorities_project_idx").on(table.projectId),
    priorityLevelIdx: index("project_priorities_level_idx").on(table.priorityLevel),
    scoreIdx: index("project_priorities_score_idx").on(table.priorityScore),
    activeIdx: index("project_priorities_active_idx").on(table.isActive),
  };
});

// ========================================
// TABLES PHASE 3 - SYSTÈME DE CHECKLIST ADMINISTRATIVE AUTOMATISÉE
// ========================================

// Table des checklists administratives par projet
export const administrativeChecklists = pgTable("administrative_checklists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  
  // Informations de base de la checklist
  name: varchar("name").notNull(), // Nom de la checklist (ex: "Checklist Passation Projet ABC")
  description: text("description"), // Description détaillée de la checklist
  
  // Gestion et responsabilité
  createdBy: varchar("created_by").notNull().references(() => users.id), // Référence utilisateur créateur
  
  // Statut et progression
  status: adminChecklistStatusEnum("status").default("draft"), // draft, active, completed, archived
  priority: priorityLevelEnum("priority").default("normale"), // Niveau de priorité existant
  completionPercentage: integer("completion_percentage").default(0), // Pourcentage 0-100
  
  // Dates de suivi
  expectedCompletionDate: timestamp("expected_completion_date"), // Date d'achèvement prévue
  actualCompletionDate: timestamp("actual_completion_date"), // Date d'achèvement réelle (nullable)
  
  // Métadonnées
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    // Index de performance pour requêtes sur projets
    projectIdIdx: index("administrative_checklists_project_id_idx").on(table.projectId),
    // Index sur statut et priorité pour filtrage
    statusPriorityIdx: index("administrative_checklists_status_priority_idx").on(table.status, table.priority),
    // Index sur dates pour suivi temporel
    expectedDateIdx: index("administrative_checklists_expected_date_idx").on(table.expectedCompletionDate),
    actualDateIdx: index("administrative_checklists_actual_date_idx").on(table.actualCompletionDate),
    // Index sur créateur
    createdByIdx: index("administrative_checklists_created_by_idx").on(table.createdBy),
  };
});

// Table des éléments de checklist (documents/démarches)
export const administrativeChecklistItems = pgTable("administrative_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  checklistId: varchar("checklist_id").notNull().references(() => administrativeChecklists.id, { onDelete: "cascade" }),
  
  // Type et informations du document/démarche
  documentType: adminDocumentTypeEnum("document_type").notNull(), // Type de document BTP français
  name: varchar("name").notNull(), // Nom du document/démarche
  description: text("description"), // Description détaillée
  
  // Statut et caractéristiques
  status: checklistItemStatusEnum("status").default("not_started"), // not_started, in_progress, completed, blocked, not_applicable
  isRequired: boolean("is_required").default(true), // Obligatoire ou facultatif
  
  // Dates et échéances
  expectedDate: timestamp("expected_date"), // Date attendue pour ce document
  completedDate: timestamp("completed_date"), // Date de completion (nullable)
  
  // Assignation et validation
  assignedTo: varchar("assigned_to").references(() => users.id), // Responsable de la tâche
  validatedBy: varchar("validated_by").references(() => users.id), // Approbateur (nullable)
  validatedAt: timestamp("validated_at"), // Date de validation (nullable)
  
  // Lien vers document et informations
  documentUrl: varchar("document_url"), // Lien vers fichier (nullable)
  notes: text("notes"), // Notes et commentaires
  
  // Métadonnées
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    // Index de performance pour requêtes sur checklists
    checklistIdIdx: index("administrative_checklist_items_checklist_id_idx").on(table.checklistId),
    // Index sur type de document pour filtrage
    documentTypeIdx: index("administrative_checklist_items_document_type_idx").on(table.documentType),
    // Index sur statut pour workflow
    statusIdx: index("administrative_checklist_items_status_idx").on(table.status),
    // Index sur dates pour suivi temporel
    expectedDateIdx: index("administrative_checklist_items_expected_date_idx").on(table.expectedDate),
    completedDateIdx: index("administrative_checklist_items_completed_date_idx").on(table.completedDate),
    // Index sur assignation
    assignedToIdx: index("administrative_checklist_items_assigned_to_idx").on(table.assignedTo),
    validatedByIdx: index("administrative_checklist_items_validated_by_idx").on(table.validatedBy),
    // Index composé sur statut et assignation pour performance
    statusAssignedIdx: index("administrative_checklist_items_status_assigned_idx").on(table.status, table.assignedTo),
    
    // INDEX DE PERFORMANCE CIBLÉS - PHASE 3 ARCHITECTURE CRITIQUE
    // Index composite pour performance sur projet et statut
    projectStatusIdx: index("administrative_checklist_items_project_status_idx").on(table.checklistId, table.status),
    // Index composite pour assignation et statut
    assignedStatusIdx: index("administrative_checklist_items_assigned_status_idx").on(table.assignedTo, table.status),
    // Index sur date d'échéance pour suivi temporel critique
    dueDateIdx: index("administrative_checklist_items_due_date_idx").on(table.expectedDate),
    
    // CONTRAINTE D'INTÉGRITÉ CRITIQUE : Un seul document par type par checklist
    checklistDocumentTypeUnique: uniqueIndex("administrative_checklist_items_checklist_document_unique").on(table.checklistId, table.documentType),
  };
});

// Table des validations pour workflow d'approbation multi-niveaux
export const administrativeValidations = pgTable("administrative_validations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  checklistItemId: varchar("checklist_item_id").notNull().references(() => administrativeChecklistItems.id, { onDelete: "cascade" }),
  
  // Validateur et type de validation
  validatorId: varchar("validator_id").notNull().references(() => users.id), // Référence utilisateur validateur
  validationType: validationTypeEnum("validation_type").notNull(), // technical_validation, legal_validation, quality_validation, final_approval
  
  // Statut et résultat de validation
  status: validationStatusEnum("status").default("pending"), // pending, approved, rejected, revision_requested
  validatedAt: timestamp("validated_at"), // Date de validation
  
  // Commentaires et notes
  comments: text("comments"), // Commentaires de validation
  revisionNotes: text("revision_notes"), // Notes pour demande de révision
  
  // Niveau de priorité de la validation
  priority: priorityLevelEnum("priority").default("normale"), // Priorité de cette validation
  
  // Métadonnées
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    // Index de performance pour requêtes sur items de checklist
    checklistItemIdIdx: index("administrative_validations_checklist_item_id_idx").on(table.checklistItemId),
    // Index sur validateur pour suivi des tâches
    validatorIdIdx: index("administrative_validations_validator_id_idx").on(table.validatorId),
    // Index sur type et statut de validation pour workflow
    typeStatusIdx: index("administrative_validations_type_status_idx").on(table.validationType, table.status),
    // Index sur statut pour filtrage rapide
    statusIdx: index("administrative_validations_status_idx").on(table.status),
    // Index sur date de validation pour suivi temporel
    validatedAtIdx: index("administrative_validations_validated_at_idx").on(table.validatedAt),
    // Index composé pour performance sur workflow
    validatorStatusIdx: index("administrative_validations_validator_status_idx").on(table.validatorId, table.status),
  };
});

// Table de jonction pour dépendances normalisées entre éléments administratifs
export const administrativeItemDependencies = pgTable("administrative_item_dependencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id").notNull().references(() => administrativeChecklistItems.id, { onDelete: "cascade" }),
  dependsOnItemId: varchar("depends_on_item_id").notNull().references(() => administrativeChecklistItems.id, { onDelete: "cascade" }),
  
  // Type et paramètres de dépendance
  dependencyType: adminDependencyTypeEnum("dependency_type").notNull(), // blocker, prerequisite, trigger, successor
  lagDays: integer("lag_days").default(0), // Délai en jours (peut être négatif pour avance)
  
  // Métadonnées
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    // Index de performance pour requêtes sur dépendances
    itemIdIdx: index("administrative_item_dependencies_item_id_idx").on(table.itemId),
    dependsOnItemIdIdx: index("administrative_item_dependencies_depends_on_item_id_idx").on(table.dependsOnItemId),
    dependencyTypeIdx: index("administrative_item_dependencies_dependency_type_idx").on(table.dependencyType),
    
    // Contrainte d'unicité pour éviter dépendances dupliquées
    itemDependencyUnique: uniqueIndex("administrative_item_dependencies_unique_idx").on(table.itemId, table.dependsOnItemId),
  };
});

// Table des templates de checklist administrative pour automatisation
export const administrativeChecklistTemplates = pgTable("administrative_checklist_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Informations de base du template
  name: varchar("name").notNull(), // ex: "Template Marché Public"
  description: text("description"), // Description du template
  projectCategory: varchar("project_category"), // Catégorie de projet applicable
  
  // Configuration du template
  isDefault: boolean("is_default").default(false), // Template par défaut
  isActive: boolean("is_active").default(true), // Template actif
  
  // Métadonnées de création
  createdBy: varchar("created_by").notNull().references(() => users.id), // Créateur du template
  
  // Métadonnées
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    // Index pour requêtes sur catégorie et statut
    categoryDefaultIdx: index("administrative_checklist_templates_category_default_idx").on(table.projectCategory, table.isDefault),
    activeIdx: index("administrative_checklist_templates_active_idx").on(table.isActive),
    createdByIdx: index("administrative_checklist_templates_created_by_idx").on(table.createdBy),
  };
});

// Table des éléments de template pour automatisation
export const administrativeTemplateItems = pgTable("administrative_template_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => administrativeChecklistTemplates.id, { onDelete: "cascade" }),
  
  // Configuration de l'élément template
  documentType: adminDocumentTypeEnum("document_type").notNull(), // Type de document BTP français
  defaultAssigneeRole: varchar("default_assignee_role"), // Rôle par défaut pour assignation
  slaInDays: integer("sla_in_days").default(30), // SLA par défaut en jours
  weight: integer("weight").default(1), // Poids pour calcul progression (1-100)
  
  // Paramètres d'automatisation
  isRequired: boolean("is_required").default(true), // Élément obligatoire
  triggerCondition: varchar("trigger_condition"), // Condition pour génération auto (ex: "project_status=passation")
  
  // Ordre d'affichage et regroupement
  orderIndex: integer("order_index").default(0), // Ordre d'affichage
  
  // Métadonnées
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    // Index de performance pour requêtes sur templates
    templateIdIdx: index("administrative_template_items_template_id_idx").on(table.templateId),
    documentTypeIdx: index("administrative_template_items_document_type_idx").on(table.documentType),
    
    // Index composé pour performance
    templateDocumentTypeIdx: index("administrative_template_items_template_document_idx").on(table.templateId, table.documentType),
    
    // Index pour ordre d'affichage
    orderIdx: index("administrative_template_items_order_idx").on(table.orderIndex),
    
    // Contrainte d'unicité pour éviter doublons de documents par template
    templateDocumentUnique: uniqueIndex("administrative_template_items_unique_idx").on(table.templateId, table.documentType),
  };
});

// ========================================
// RELATIONS DRIZZLE
// ========================================

import { relations } from "drizzle-orm";

export const usersRelations = relations(users, ({ many }) => ({
  responsibleOffers: many(offers, { relationName: "responsible_user" }),
  validatedStudies: many(offers, { relationName: "fin_etudes_validator" }),
  responsibleProjects: many(projects, { relationName: "responsible_user" }),
  chefTravauxProjects: many(projects, { relationName: "chef_travaux" }),
  assignedTasks: many(projectTasks),
  teamResources: many(teamResources),
  beWorkload: many(beWorkload),
  generatedDpgf: many(dpgfDocuments, { relationName: "dpgf_generator" }),
  validatedDpgf: many(dpgfDocuments, { relationName: "dpgf_validator" }),
  ledTeams: many(teams, { relationName: "team_leader" }),
  teamMemberships: many(teamMembers),
  // Extension Phase 1 : Nouvelles relations
  approvedMilestones: many(projectMilestones, { relationName: "milestone_approver" }),
}));

export const aosRelations = relations(aos, ({ one, many }) => ({
  offers: many(offers),
  lots: many(aoLots),
  maitreOuvrage: one(maitresOuvrage, {
    fields: [aos.maitreOuvrageId],
    references: [maitresOuvrage.id],
  }),
  maitreOeuvre: one(maitresOeuvre, {
    fields: [aos.maitreOeuvreId],
    references: [maitresOeuvre.id],
  }),
}));

export const maitresOuvrageRelations = relations(maitresOuvrage, ({ many }) => ({
  aos: many(aos),
  offers: many(offers),
}));

export const maitresOeuvreRelations = relations(maitresOeuvre, ({ many }) => ({
  aos: many(aos),
  offers: many(offers),
  contacts: many(contactsMaitreOeuvre),
}));

export const contactsMaitreOeuvreRelations = relations(contactsMaitreOeuvre, ({ one }) => ({
  maitreOeuvre: one(maitresOeuvre, {
    fields: [contactsMaitreOeuvre.maitreOeuvreId],
    references: [maitresOeuvre.id],
  }),
}));

export const aoLotsRelations = relations(aoLots, ({ one, many }) => ({
  ao: one(aos, {
    fields: [aoLots.aoId],
    references: [aos.id],
  }),
  // Extension Phase 1 : Nouvelles relations
  supplierChosen: one(suppliers, {
    fields: [aoLots.supplierChosenId],
    references: [suppliers.id],
    relationName: "lot_chosen_supplier",
  }),
  supplierQuotes: many(lotSupplierQuotes),
}));

export const offersRelations = relations(offers, ({ one, many }) => ({
  ao: one(aos, {
    fields: [offers.aoId],
    references: [aos.id],
  }),
  maitreOuvrage: one(maitresOuvrage, {
    fields: [offers.maitreOuvrageId],
    references: [maitresOuvrage.id],
  }),
  maitreOeuvre: one(maitresOeuvre, {
    fields: [offers.maitreOeuvreId],
    references: [maitresOeuvre.id],
  }),
  responsibleUser: one(users, {
    fields: [offers.responsibleUserId],
    references: [users.id],
    relationName: "responsible_user",
  }),
  finEtudesValidator: one(users, {
    fields: [offers.finEtudesValidatedBy],
    references: [users.id],
    relationName: "fin_etudes_validator",
  }),
  projects: many(projects),
  supplierRequests: many(supplierRequests),
  chiffrageElements: many(chiffrageElements),
  dpgfDocuments: many(dpgfDocuments),
}));

export const chiffrageElementsRelations = relations(chiffrageElements, ({ one }) => ({
  offer: one(offers, {
    fields: [chiffrageElements.offerId],
    references: [offers.id],
  }),
}));

export const dpgfDocumentsRelations = relations(dpgfDocuments, ({ one }) => ({
  offer: one(offers, {
    fields: [dpgfDocuments.offerId],
    references: [offers.id],
  }),
  generatedByUser: one(users, {
    fields: [dpgfDocuments.generatedBy],
    references: [users.id],
    relationName: "dpgf_generator",
  }),
  validatedByUser: one(users, {
    fields: [dpgfDocuments.validatedBy],
    references: [users.id],
    relationName: "dpgf_validator",
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  offer: one(offers, {
    fields: [projects.offerId],
    references: [offers.id],
  }),
  responsibleUser: one(users, {
    fields: [projects.responsibleUserId],
    references: [users.id],
    relationName: "responsible_user",
  }),
  chefTravaux: one(users, {
    fields: [projects.chefTravaux],
    references: [users.id],
    relationName: "chef_travaux",
  }),
  tasks: many(projectTasks),
  teamResources: many(teamResources),
  supplierRequests: many(supplierRequests),
}));

export const projectTasksRelations = relations(projectTasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectTasks.projectId],
    references: [projects.id],
  }),
  assignedUser: one(users, {
    fields: [projectTasks.assignedUserId],
    references: [users.id],
  }),
  parentTask: one(projectTasks, {
    fields: [projectTasks.parentTaskId],
    references: [projectTasks.id],
    relationName: "parent_task",
  }),
  subtasks: many(projectTasks, { relationName: "parent_task" }),
}));

export const supplierRequestsRelations = relations(supplierRequests, ({ one }) => ({
  offer: one(offers, {
    fields: [supplierRequests.offerId],
    references: [offers.id],
  }),
  project: one(projects, {
    fields: [supplierRequests.projectId],
    references: [projects.id],
  }),
}));

export const teamResourcesRelations = relations(teamResources, ({ one }) => ({
  project: one(projects, {
    fields: [teamResources.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [teamResources.userId],
    references: [users.id],
  }),
}));

export const beWorkloadRelations = relations(beWorkload, ({ one }) => ({
  user: one(users, {
    fields: [beWorkload.userId],
    references: [users.id],
  }),
}));

// ========================================
// RELATIONS PHASE 1 - NOUVELLES TABLES
// ========================================

// Relations pour suppliers
export const suppliersRelations = relations(suppliers, ({ many }) => ({
  chosenForLots: many(aoLots, { relationName: "lot_chosen_supplier" }),
  quotes: many(lotSupplierQuotes),
  projectCollaborations: many(projectSuppliers),
}));

// Relations pour project_milestones  
export const projectMilestonesRelations = relations(projectMilestones, ({ one }) => ({
  project: one(projects, {
    fields: [projectMilestones.projectId],
    references: [projects.id],
  }),
  approver: one(users, {
    fields: [projectMilestones.approverId],
    references: [users.id],
    relationName: "milestone_approver",
  }),
}));

// Relations pour lot_supplier_quotes
export const lotSupplierQuotesRelations = relations(lotSupplierQuotes, ({ one }) => ({
  aoLot: one(aoLots, {
    fields: [lotSupplierQuotes.aoLotId],
    references: [aoLots.id],
  }),
  supplier: one(suppliers, {
    fields: [lotSupplierQuotes.supplierId],
    references: [suppliers.id],
  }),
}));

// Relations pour project_suppliers
export const projectSuppliersRelations = relations(projectSuppliers, ({ one }) => ({
  project: one(projects, {
    fields: [projectSuppliers.projectId],
    references: [projects.id],
  }),
  supplier: one(suppliers, {
    fields: [projectSuppliers.supplierId],
    references: [suppliers.id],
  }),
}));

// ========================================
// TYPES TYPESCRIPT POUR POC
// ========================================

export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

// ========================================
// TYPES POUR PRIORITÉS ET ALERTES
// ========================================

// Type pour les éléments de priorité (utilisé par SmartPrioritization)
export interface PriorityItem {
  id: string;
  name: string;
  type: 'offer' | 'project' | 'task';
  offerId?: string;
  projectId?: string;
  client: string;
  montant: number;
  delai: number; // en jours
  priorityScore: number;
  priorityLevel: 'tres_faible' | 'faible' | 'normale' | 'elevee' | 'critique';
  typeClient: 'particulier' | 'professionnel' | 'public';
  complexite: number; // 1-10
  chargeBeEstimee: number; // en heures
  risque: number; // 1-10
  isStrategic: boolean;
  lastUpdated: Date;
  isManualOverride: boolean;
  overrideReason?: string;
  trends?: {
    scoreEvolution: number;
    levelChange?: string;
  };
}

// Type pour les alertes critiques
export interface CriticalAlert {
  id: string;
  itemId: string;
  itemName: string;
  priorityLevel: 'critique' | 'elevee';
  priorityScore: number;
  alertType: 'deadline_approaching' | 'high_value_urgent' | 'resource_conflict' | 'quality_issue';
  message: string;
  createdAt: Date;
  isActive: boolean;
  isDismissed: boolean;
  severity: 'high' | 'medium' | 'low';
  metadata?: Record<string, any>;
}

// Type pour la configuration des poids de priorité (utilise le schéma Zod défini plus loin)

// Type pour les milestones du Gantt (utilisé dans GanttChart)
export interface GanttMilestone {
  id: string;
  name: string;
  date: Date | string;
  status: 'completed' | 'in-progress' | 'pending' | 'overdue';
  project: string;
  projectId?: string;
  priority?: 'tres_faible' | 'faible' | 'normale' | 'elevee' | 'critique';
  dependencies?: string[];
}

// Type enrichi pour les projets dans le contexte Gantt
export interface GanttProject extends Project {
  reference: string | null;
  client: string;
  location: string;
  montantTotal?: number;
  progressPercentage: number | null;
  priority?: 'tres_faible' | 'faible' | 'normale' | 'elevee' | 'critique';
  estimatedHours?: number;
  actualHours?: number;
  dependencies?: string[];
  isOverdue?: boolean;
}

// Type enrichi pour les tâches dans le contexte Gantt
export interface GanttTask extends ProjectTask {
  isJalon: boolean | null;
  priority?: 'tres_faible' | 'faible' | 'normale' | 'elevee' | 'critique';
  dependencies?: string[];
  estimatedHours: string | null;
  actualHours: string | null;
  isOverdue?: boolean;
  responsibleUser?: User;
}

export type Ao = typeof aos.$inferSelect;
export type InsertAo = typeof aos.$inferInsert;

export type AoLot = typeof aoLots.$inferSelect;
export type InsertAoLot = typeof aoLots.$inferInsert;

export type MaitreOuvrage = typeof maitresOuvrage.$inferSelect;
export type InsertMaitreOuvrage = typeof maitresOuvrage.$inferInsert;

export type MaitreOeuvre = typeof maitresOeuvre.$inferSelect;
export type InsertMaitreOeuvre = typeof maitresOeuvre.$inferInsert;

export type ContactMaitreOeuvre = typeof contactsMaitreOeuvre.$inferSelect;
export type InsertContactMaitreOeuvre = typeof contactsMaitreOeuvre.$inferInsert;

export type Offer = typeof offers.$inferSelect;
export type InsertOffer = typeof offers.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export type ProjectTask = typeof projectTasks.$inferSelect;
export type InsertProjectTask = typeof projectTasks.$inferInsert;

export type SupplierRequest = typeof supplierRequests.$inferSelect;
export type InsertSupplierRequest = typeof supplierRequests.$inferInsert;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

export type TeamResource = typeof teamResources.$inferSelect;
export type InsertTeamResource = typeof teamResources.$inferInsert;

export type BeWorkload = typeof beWorkload.$inferSelect;
export type InsertBeWorkload = typeof beWorkload.$inferInsert;

export type ValidationMilestone = typeof validationMilestones.$inferSelect;
export type InsertValidationMilestone = typeof validationMilestones.$inferInsert;

export type ChiffrageElement = typeof chiffrageElements.$inferSelect;
export type InsertChiffrageElement = typeof chiffrageElements.$inferInsert;

export type DpgfDocument = typeof dpgfDocuments.$inferSelect;
export type InsertDpgfDocument = typeof dpgfDocuments.$inferInsert;

// Types pour le système documentaire
export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

export type DocumentLink = typeof documentLinks.$inferSelect;
export type InsertDocumentLink = typeof documentLinks.$inferInsert;

export type DocumentCollection = typeof documentCollections.$inferSelect;
export type InsertDocumentCollection = typeof documentCollections.$inferInsert;

export type DocumentCollectionLink = typeof documentCollectionLinks.$inferSelect;
export type InsertDocumentCollectionLink = typeof documentCollectionLinks.$inferInsert;

// Types pour le système de validation BE enrichi
export type BeValidationTemplate = typeof beValidationTemplates.$inferSelect;
export type InsertBeValidationTemplate = typeof beValidationTemplates.$inferInsert;

export type BeChecklistItem = typeof beChecklistItems.$inferSelect;
export type InsertBeChecklistItem = typeof beChecklistItems.$inferInsert;

export type BeValidationSession = typeof beValidationSessions.$inferSelect;
export type InsertBeValidationSession = typeof beValidationSessions.$inferInsert;

export type BeValidationMeeting = typeof beValidationMeetings.$inferSelect;
export type InsertBeValidationMeeting = typeof beValidationMeetings.$inferInsert;

export type BeValidationMeetingParticipant = typeof beValidationMeetingParticipants.$inferSelect;
export type InsertBeValidationMeetingParticipant = typeof beValidationMeetingParticipants.$inferInsert;

export type BeChecklistResult = typeof beChecklistResults.$inferSelect;
export type InsertBeChecklistResult = typeof beChecklistResults.$inferInsert;

export type BeQualityControl = typeof beQualityControls.$inferSelect;
export type InsertBeQualityControl = typeof beQualityControls.$inferInsert;

// ========================================
// TYPES TYPESCRIPT PHASE 1 - NOUVELLES TABLES
// ========================================

export type ProjectMilestone = typeof projectMilestones.$inferSelect;
export type InsertProjectMilestone = typeof insertProjectMilestoneSchema._type;

export type LotSupplierQuote = typeof lotSupplierQuotes.$inferSelect;
export type InsertLotSupplierQuote = typeof insertLotSupplierQuoteSchema._type;

export type ProjectSupplier = typeof projectSuppliers.$inferSelect;
export type InsertProjectSupplier = typeof insertProjectSupplierSchema._type;

// ========================================
// SCHÉMAS ZOD POUR VALIDATION POC
// ========================================

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAoSchema = createInsertSchema(aos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  dateLimiteRemise: true, // Calculée automatiquement par le système
  dateRenduAO: true, // Calculée automatiquement (J-15)
}).extend({
  // Transform string dates from frontend to Date objects
  dateSortieAO: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  dateAcceptationAO: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  demarragePrevu: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  dateOS: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});

export const insertAoLotSchema = createInsertSchema(aoLots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMaitreOuvrageSchema = createInsertSchema(maitresOuvrage).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMaitreOeuvreSchema = createInsertSchema(maitresOeuvre).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactMaitreOeuvreSchema = createInsertSchema(contactsMaitreOeuvre).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deadline: true, // Calculée automatiquement par le système (date limite remise)
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectTaskSchema = createInsertSchema(projectTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupplierRequestSchema = createInsertSchema(supplierRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamResourceSchema = createInsertSchema(teamResources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBeWorkloadSchema = createInsertSchema(beWorkload).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertValidationMilestoneSchema = createInsertSchema(validationMilestones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChiffrageElementSchema = createInsertSchema(chiffrageElements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDpgfDocumentSchema = createInsertSchema(dpgfDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ========================================
// SCHÉMAS ZOD PHASE 1 - NOUVELLES TABLES
// ========================================

export const insertProjectMilestoneSchema = createInsertSchema(projectMilestones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLotSupplierQuoteSchema = createInsertSchema(lotSupplierQuotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectSupplierSchema = createInsertSchema(projectSuppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ========================================
// SCHÉMAS ZOD PHASE 2 - SYSTÈME DE PLANNING AVANCÉ
// ========================================

// Schéma d'insertion pour les tâches de planning détaillé
export const insertProjectScheduleTaskSchema = createInsertSchema(projectScheduleTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schéma d'insertion pour les allocations de ressources
export const insertProjectResourceAllocationSchema = createInsertSchema(projectResourceAllocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schéma d'insertion pour les contraintes de planning
export const insertPlanningConstraintSchema = createInsertSchema(planningConstraints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ========================================
// TYPES TYPESCRIPT PHASE 2
// ========================================

// Types pour les tâches de planning détaillé
export type ProjectScheduleTask = typeof projectScheduleTasks.$inferSelect;
export type InsertProjectScheduleTask = z.infer<typeof insertProjectScheduleTaskSchema>;

// Types pour les allocations de ressources
export type ProjectResourceAllocation = typeof projectResourceAllocations.$inferSelect;
export type InsertProjectResourceAllocation = z.infer<typeof insertProjectResourceAllocationSchema>;

// Types pour les contraintes de planning
export type PlanningConstraint = typeof planningConstraints.$inferSelect;
export type InsertPlanningConstraint = z.infer<typeof insertPlanningConstraintSchema>;


// ========================================
// SYSTÈME DOCUMENTAIRE OPTIMISÉ
// ========================================

// Table principale des documents avec métadonnées enrichies
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Informations de base
  name: varchar("name").notNull(),
  originalName: varchar("original_name").notNull(), // Nom original du fichier
  description: text("description"),
  category: documentCategoryEnum("category").notNull(),
  
  // Stockage et métadonnées
  filePath: varchar("file_path").notNull(), // Chemin dans object storage
  mimeType: varchar("mime_type"),
  fileSize: integer("file_size"), // Taille en bytes
  checksum: varchar("checksum"), // Hash MD5 pour détection doublons
  
  // Versions et accès
  version: varchar("version").default("1.0"),
  accessLevel: documentAccessEnum("access_level").default("equipe"),
  
  // Tags pour recherche et organisation
  tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`), // Tags libres
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`), // Métadonnées flexibles
  
  // Informations utilisateur
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at"),
  
  // Archivage
  isArchived: boolean("is_archived").default(false),
  archivedAt: timestamp("archived_at"),
  archivedBy: varchar("archived_by").references(() => users.id),
  archiveReason: text("archive_reason"),
  
  // Statistiques d'utilisation
  downloadCount: integer("download_count").default(0),
  viewCount: integer("view_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    categoryIdx: index("documents_category_idx").on(table.category),
    uploadedByIdx: index("documents_uploaded_by_idx").on(table.uploadedBy),
    tagsIdx: index("documents_tags_idx").using('gin', table.tags),
    checksumIdx: index("documents_checksum_idx").on(table.checksum),
    archivedIdx: index("documents_archived_idx").on(table.isArchived),
  };
});

// Table de liaisons multiples documents-entités pour références croisées
export const documentLinks = pgTable("document_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => documents.id, { onDelete: "cascade" }).notNull(),
  
  // Espaces du dossier où le document apparaît
  documentSpace: documentSpaceEnum("document_space").notNull(),
  
  // Liens vers différentes entités (un seul par lien)
  aoId: varchar("ao_id").references(() => aos.id),
  offerId: varchar("offer_id").references(() => offers.id),
  projectId: varchar("project_id").references(() => projects.id),
  lotId: varchar("lot_id").references(() => aoLots.id),
  
  // Métadonnées spécifiques au lien
  linkMetadata: jsonb("link_metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  isPrimary: boolean("is_primary").default(false), // Lien principal pour cet espace
  displayOrder: integer("display_order").default(0), // Ordre d'affichage
  
  // Qui a créé ce lien
  linkedBy: varchar("linked_by").references(() => users.id).notNull(),
  linkedAt: timestamp("linked_at").defaultNow(),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    documentSpaceIdx: index("document_links_space_idx").on(table.documentSpace),
    aoLinkIdx: index("document_links_ao_idx").on(table.aoId),
    offerLinkIdx: index("document_links_offer_idx").on(table.offerId),
    projectLinkIdx: index("document_links_project_idx").on(table.projectId),
    lotLinkIdx: index("document_links_lot_idx").on(table.lotId),
    primaryIdx: index("document_links_primary_idx").on(table.isPrimary),
  };
});

// Table des collections de documents pour groupements logiques
export const documentCollections = pgTable("document_collections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  color: varchar("color").default("blue"), // Couleur pour l'interface
  icon: varchar("icon").default("folder"), // Icône pour l'interface
  
  // Lien vers l'entité parente
  aoId: varchar("ao_id").references(() => aos.id),
  offerId: varchar("offer_id").references(() => offers.id),
  projectId: varchar("project_id").references(() => projects.id),
  
  // Paramètres de la collection
  isSystemCollection: boolean("is_system_collection").default(false), // Collections créées automatiquement
  settings: jsonb("settings").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Lien entre documents et collections (many-to-many)
export const documentCollectionLinks = pgTable("document_collection_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => documents.id, { onDelete: "cascade" }).notNull(),
  collectionId: varchar("collection_id").references(() => documentCollections.id, { onDelete: "cascade" }).notNull(),
  
  addedBy: varchar("added_by").references(() => users.id).notNull(),
  addedAt: timestamp("added_at").defaultNow(),
}, (table) => {
  return {
    documentCollectionIdx: index("doc_collection_links_idx").on(table.documentId, table.collectionId),
  };
});

// ========================================
// SYSTÈME DE VALIDATION BE ENRICHI
// ========================================

// Template des checklists de validation BE (configuration système)
export const beValidationTemplates = pgTable("be_validation_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  validationType: bouclageTypeEnum("validation_type").notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  orderIndex: integer("order_index").default(0),
  
  // Paramètres de validation
  requiresAllItems: boolean("requires_all_items").default(true), // Tous les éléments obligatoires
  requiresMeeting: boolean("requires_meeting").default(false), // Réunion obligatoire
  minParticipants: integer("min_participants").default(1),
  
  // Métadonnées
  estimatedDuration: integer("estimated_duration"), // en minutes
  prerequisites: jsonb("prerequisites").$type<string[]>().default(sql`'[]'::jsonb`),
  
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    validationTypeIdx: index("be_validation_templates_type_idx").on(table.validationType),
    activeIdx: index("be_validation_templates_active_idx").on(table.isActive),
  };
});

// Éléments de checklist pour chaque template
export const beChecklistItems = pgTable("be_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => beValidationTemplates.id, { onDelete: "cascade" }).notNull(),
  
  // Définition de l'élément
  code: varchar("code").notNull(), // Code unique par template (ex: "TECH-01")
  title: varchar("title").notNull(),
  description: text("description"),
  criticality: validationCriticalityEnum("criticality").notNull(),
  
  // Organisation
  category: varchar("category"), // Regroupement (ex: "Documents", "Calculs", etc.)
  orderIndex: integer("order_index").default(0),
  
  // Contrôles
  isRequired: boolean("is_required").default(true),
  requiresEvidence: boolean("requires_evidence").default(false), // Document de preuve requis
  requiresComment: boolean("requires_comment").default(false),
  
  // Aide contextuelle
  helpText: text("help_text"),
  checkCriteria: text("check_criteria"), // Critères de vérification
  commonErrors: text("common_errors"), // Erreurs fréquentes à éviter
  
  // Liens vers documentation
  referenceDocuments: jsonb("reference_documents").$type<string[]>().default(sql`'[]'::jsonb`),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    templateCodeIdx: index("be_checklist_items_template_code_idx").on(table.templateId, table.code),
    criticalityIdx: index("be_checklist_items_criticality_idx").on(table.criticality),
    categoryIdx: index("be_checklist_items_category_idx").on(table.category),
  };
});

// Instances de validation BE (par offre)
export const beValidationSessions = pgTable("be_validation_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").references(() => offers.id, { onDelete: "cascade" }).notNull(),
  templateId: varchar("template_id").references(() => beValidationTemplates.id).notNull(),
  
  // État de la session
  status: varchar("status").notNull().default("en_preparation"), // en_preparation, en_cours, terminee, validee, rejetee
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  validatedAt: timestamp("validated_at"),
  
  // Responsables
  validatorId: varchar("validator_id").references(() => users.id).notNull(), // Responsable BE
  approvedBy: varchar("approved_by").references(() => users.id), // Approbateur final
  
  // Résultats globaux
  totalItems: integer("total_items").default(0),
  completedItems: integer("completed_items").default(0),
  conformeItems: integer("conforme_items").default(0),
  nonConformeItems: integer("non_conforme_items").default(0),
  reserveItems: integer("reserve_items").default(0),
  
  // Commentaires et notes
  validationNotes: text("validation_notes"),
  globalComment: text("global_comment"),
  nextSteps: text("next_steps"),
  
  // Métadonnées
  estimatedDuration: integer("estimated_duration"), // Durée prévue (min)
  actualDuration: integer("actual_duration"), // Durée réelle (min)
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    offerStatusIdx: index("be_validation_sessions_offer_status_idx").on(table.offerId, table.status),
    validatorIdx: index("be_validation_sessions_validator_idx").on(table.validatorId),
    templateIdx: index("be_validation_sessions_template_idx").on(table.templateId),
  };
});

// Réunions de validation BE (audit JLM)
export const beValidationMeetings = pgTable("be_validation_meetings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => beValidationSessions.id, { onDelete: "cascade" }).notNull(),
  
  // Informations de la réunion
  title: varchar("title").notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  
  // Lieu et modalités
  location: varchar("location"), // Bureau, salle, visio...
  meetingType: varchar("meeting_type").default("presentiel"), // presentiel, visio, mixte
  meetingUrl: varchar("meeting_url"), // Lien visio si applicable
  
  // Organisation
  organizerId: varchar("organizer_id").references(() => users.id).notNull(),
  
  // Comptes-rendus
  agenda: text("agenda"),
  meetingNotes: text("meeting_notes"),
  decisions: text("decisions"),
  actionItems: jsonb("action_items").$type<Array<{task: string, assignee: string, deadline: string}>>().default(sql`'[]'::jsonb`),
  
  // Résultats
  validationResult: varchar("validation_result"), // valide, rejete, reserve, reporte
  rejectionReasons: text("rejection_reasons"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    sessionDateIdx: index("be_validation_meetings_session_date_idx").on(table.sessionId, table.scheduledDate),
    organizerIdx: index("be_validation_meetings_organizer_idx").on(table.organizerId),
  };
});

// Participants aux réunions de validation
export const beValidationMeetingParticipants = pgTable("be_validation_meeting_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").references(() => beValidationMeetings.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  // Participation
  role: varchar("role").notNull(), // validateur, expert, observateur, client...
  isRequired: boolean("is_required").default(true),
  isPresent: boolean("is_present"),
  
  // Signature/Approbation
  hasApproved: boolean("has_approved"),
  approvalDate: timestamp("approval_date"),
  approvalComment: text("approval_comment"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    meetingUserIdx: index("be_meeting_participants_meeting_user_idx").on(table.meetingId, table.userId),
    userRoleIdx: index("be_meeting_participants_user_role_idx").on(table.userId, table.role),
  };
});

// Résultats détaillés de checklist par session
export const beChecklistResults = pgTable("be_checklist_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => beValidationSessions.id, { onDelete: "cascade" }).notNull(),
  checklistItemId: varchar("checklist_item_id").references(() => beChecklistItems.id).notNull(),
  
  // Résultat du contrôle
  status: checklistStatusEnum("status").notNull().default("non_controle"),
  checkedAt: timestamp("checked_at"),
  checkedBy: varchar("checked_by").references(() => users.id).notNull(),
  
  // Détails du contrôle
  comment: text("comment"),
  evidenceDocuments: jsonb("evidence_documents").$type<string[]>().default(sql`'[]'::jsonb`), // IDs des documents de preuve
  nonConformityReason: text("non_conformity_reason"),
  correctiveActions: text("corrective_actions"),
  
  // Validation hiérarchique
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewComment: text("review_comment"),
  
  // Suivi des corrections
  correctionDeadline: timestamp("correction_deadline"),
  correctionStatus: varchar("correction_status").default("pending"), // pending, in_progress, completed, verified
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    sessionItemIdx: index("be_checklist_results_session_item_idx").on(table.sessionId, table.checklistItemId),
    statusCheckedIdx: index("be_checklist_results_status_checked_idx").on(table.status, table.checkedAt),
    checkedByIdx: index("be_checklist_results_checked_by_idx").on(table.checkedBy),
  };
});

// Contrôles qualité automatisés (anti-erreurs)
export const beQualityControls = pgTable("be_quality_controls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => beValidationSessions.id, { onDelete: "cascade" }).notNull(),
  
  // Type de contrôle
  controlType: varchar("control_type").notNull(), // coherence_donnees, calculs, normes, etc.
  controlName: varchar("control_name").notNull(),
  description: text("description"),
  
  // Résultat du contrôle automatique
  status: varchar("status").notNull(), // passed, failed, warning, skipped
  executedAt: timestamp("executed_at").notNull(),
  
  // Détails
  expectedValue: varchar("expected_value"),
  actualValue: varchar("actual_value"),
  errorMessage: text("error_message"),
  warningMessage: text("warning_message"),
  
  // Données de contrôle (JSON flexible)
  controlData: jsonb("control_data").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  
  // Override manuel si nécessaire
  manualOverride: boolean("manual_override").default(false),
  overrideReason: text("override_reason"),
  overrideBy: varchar("override_by").references(() => users.id),
  overrideAt: timestamp("override_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    sessionControlIdx: index("be_quality_controls_session_control_idx").on(table.sessionId, table.controlType),
    statusExecutedIdx: index("be_quality_controls_status_executed_idx").on(table.status, table.executedAt),
  };
});

// Schémas d'insertion pour les nouvelles tables documentaires
export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
  lastAccessedAt: true,
  downloadCount: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentLinkSchema = createInsertSchema(documentLinks).omit({
  id: true,
  linkedAt: true,
  createdAt: true,
});

export const insertDocumentCollectionSchema = createInsertSchema(documentCollections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schémas d'insertion pour le système de validation BE
export const insertBeValidationTemplateSchema = createInsertSchema(beValidationTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBeChecklistItemSchema = createInsertSchema(beChecklistItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBeValidationSessionSchema = createInsertSchema(beValidationSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBeValidationMeetingSchema = createInsertSchema(beValidationMeetings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBeValidationMeetingParticipantSchema = createInsertSchema(beValidationMeetingParticipants).omit({
  id: true,
  createdAt: true,
});

export const insertBeChecklistResultSchema = createInsertSchema(beChecklistResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBeQualityControlSchema = createInsertSchema(beQualityControls).omit({
  id: true,
  createdAt: true,
});

// Relations pour les équipes
export const teamsRelations = relations(teams, ({ one, many }) => ({
  teamLeader: one(users, {
    fields: [teams.teamLeaderId],
    references: [users.id],
    relationName: "team_leader",
  }),
  members: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));


// Schémas d'insertion pour les équipes
export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  joinedAt: true,
  createdAt: true,
  updatedAt: true,
});

// Schéma pour la recherche de membres
export const searchTeamMembersSchema = z.object({
  query: z.string().optional(), // Recherche textuelle
  teamId: z.string().optional(), // Filtrer par équipe
  role: z.string().optional(), // Filtrer par rôle
  contractType: z.string().optional(), // Filtrer par type de contrat
  experienceLevel: z.string().optional(), // Filtrer par niveau d'expérience
  skills: z.array(z.string()).optional(), // Filtrer par compétences
  isActive: z.boolean().optional(), // Filtrer par statut actif
  hasDriverLicense: z.boolean().optional(), // Filtrer par permis
  minExperience: z.number().optional(), // Expérience minimum en années
  maxExperience: z.number().optional(), // Expérience maximum en années
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type Team = typeof teams.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;

// ========================================
// SYSTÈME VISA ARCHITECTE - Nouveau workflow entre Étude et Planification
// ========================================

// Table pour gérer les VISA Architecte - étape obligatoire entre Étude et Planification
export const visaArchitecte = pgTable("visa_architecte", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  
  // Type de VISA demandé
  visaType: visaArchitecteTypeEnum("visa_type").notNull(),
  
  // Statut du VISA
  status: varchar("status").notNull().default("en_attente"), // en_attente, valide, refuse, expire
  
  // Informations sur l'architecte
  architecteNom: varchar("architecte_nom"),
  architecteEmail: varchar("architecte_email"),
  architecteTelephone: varchar("architecte_telephone"),
  architecteOrdre: varchar("architecte_ordre"), // Numéro d'ordre des architectes
  
  // Suivi des dates
  demandeLe: timestamp("demande_le").defaultNow(),
  accordeLe: timestamp("accorde_le"),
  expireLe: timestamp("expire_le"),
  
  // Documents et commentaires
  documentsSoumis: jsonb("documents_soumis").$type<string[]>().default(sql`'[]'::jsonb`), // IDs des documents soumis
  commentaires: text("commentaires"),
  raisonRefus: text("raison_refus"),
  
  // Suivi utilisateur
  demandePar: varchar("demande_par").references(() => users.id).notNull(),
  validePar: varchar("valide_par").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    projectStatusIdx: index("visa_architecte_project_status_idx").on(table.projectId, table.status),
    visaTypeIdx: index("visa_architecte_type_idx").on(table.visaType),
    statusIdx: index("visa_architecte_status_idx").on(table.status),
  };
});

// Énumération pour statut de synchronisation Batigest (placé avec les autres enums)
export const batigestSyncStatusEnum = pgEnum('batigest_sync_status', [
  'pending',
  'synced', 
  'error',
  'manual_review'
]);

// ========================================
// INTÉGRATION SAGE BATIGEST - POC
// ========================================

// Schémas d'intégration Sage Batigest
export const batigestIntegrations = pgTable('batigest_integrations', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar('offer_id').references(() => offers.id),
  batigestRef: varchar('batigest_ref', { length: 100 }),
  numeroDevis: varchar('numero_devis', { length: 50 }),
  montantBatigest: decimal('montant_batigest', { precision: 12, scale: 2 }),
  tauxMarge: decimal('taux_marge', { precision: 5, scale: 2 }),
  statutBatigest: varchar('statut_batigest', { length: 50 }),
  lastSyncAt: timestamp('last_sync_at'),
  syncStatus: batigestSyncStatusEnum('sync_status').default('pending'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const batigestAnalytics = pgTable('batigest_analytics', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  periode: varchar('periode', { length: 20 }),
  chiffreAffairesRealise: decimal('ca_realise', { precision: 15, scale: 2 }),
  chiffreAffairesPrevu: decimal('ca_prevu', { precision: 15, scale: 2 }),
  tauxConversion: decimal('taux_conversion', { precision: 5, scale: 2 }),
  margeReelleMoyenne: decimal('marge_reelle_moyenne', { precision: 5, scale: 2 }),
  margePrevueMoyenne: decimal('marge_prevue_moyenne', { precision: 5, scale: 2 }),
  nombreDevis: integer('nombre_devis'),
  nombreFactures: integer('nombre_factures'),
  dataJson: jsonb('data_json'), // Stockage flexible pour données détaillées
  generatedAt: timestamp('generated_at').defaultNow(),
});

// Types d'insertion pour Batigest
export const insertBatigestIntegrationSchema = createInsertSchema(batigestIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBatigestAnalyticsSchema = createInsertSchema(batigestAnalytics).omit({
  id: true,
  generatedAt: true,
});

export type InsertBatigestIntegration = z.infer<typeof insertBatigestIntegrationSchema>;
export type InsertBatigestAnalytics = z.infer<typeof insertBatigestAnalyticsSchema>;
export type BatigestIntegration = typeof batigestIntegrations.$inferSelect;
export type BatigestAnalytics = typeof batigestAnalytics.$inferSelect;

// Schémas d'insertion pour VISA Architecte
export const insertVisaArchitecteSchema = createInsertSchema(visaArchitecte).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVisaArchitecte = z.infer<typeof insertVisaArchitecteSchema>;
export type VisaArchitecte = typeof visaArchitecte.$inferSelect;

// Schema d'insertion pour project_priorities
export const insertProjectPrioritySchema = createInsertSchema(projectPriorities).omit({
  id: true,
  lastCalculatedAt: true,
  createdAt: true,
  updatedAt: true,
});

// Schema pour la configuration des poids de priorité
export const priorityWeightsConfigSchema = z.object({
  montantWeight: z.number().min(0).max(100).default(25),
  delaiWeight: z.number().min(0).max(100).default(25),
  typeClientWeight: z.number().min(0).max(100).default(15),
  complexiteWeight: z.number().min(0).max(100).default(10),
  chargeBeWeight: z.number().min(0).max(100).default(10),
  risqueWeight: z.number().min(0).max(100).default(10),
  strategiqueWeight: z.number().min(0).max(100).default(5),
}).refine(data => {
  const total = Object.values(data).reduce((sum, weight) => sum + weight, 0);
  return Math.abs(total - 100) < 0.01; // Tolérance pour les erreurs de float
}, {
  message: "La somme des poids doit être égale à 100"
});

// Schema pour la recherche de priorités
export const searchProjectPrioritiesSchema = z.object({
  priorityLevel: z.array(z.string()).optional(), // Filtrer par niveau de priorité
  minScore: z.number().min(0).max(100).optional(),
  maxScore: z.number().min(0).max(100).optional(),
  onlyAlerts: z.boolean().optional(), // Seulement les alertes critiques
  manualOverride: z.boolean().optional(), // Seulement les priorités forcées
  isActive: z.boolean().optional().default(true),
  offerId: z.string().optional(),
  projectId: z.string().optional(),
});

// Types pour project_priorities
export type InsertProjectPriority = z.infer<typeof insertProjectPrioritySchema>;
export type ProjectPriority = typeof projectPriorities.$inferSelect;
export type PriorityWeightsConfig = z.infer<typeof priorityWeightsConfigSchema>;
export type SearchProjectPriorities = z.infer<typeof searchProjectPrioritiesSchema>;

// ========================================
// SCHÉMAS SCORING TECHNIQUE - SYSTÈME D'ALERTE JLM
// ========================================

// Configuration du scoring technique pour alerte automatique
export const technicalScoringConfigSchema = z.object({
  weights: z.object({
    batimentPassif: z.number().min(0).max(10),
    isolationRenforcee: z.number().min(0).max(10),
    precadres: z.number().min(0).max(10),
    voletsExterieurs: z.number().min(0).max(10),
    coupeFeu: z.number().min(0).max(10),
  }),
  threshold: z.number().min(0).max(50),
});

export type TechnicalScoringConfig = z.infer<typeof technicalScoringConfigSchema>;

// Résultat du scoring technique
export const technicalScoringResultSchema = z.object({
  totalScore: z.number(),
  triggeredCriteria: z.array(z.string()),
  shouldAlert: z.boolean(),
  details: z.record(z.string(), z.number()), // critère → contribution au score
});

export type TechnicalScoringResult = z.infer<typeof technicalScoringResultSchema>;

// Schema pour les critères spéciaux détectés par OCR
export const specialCriteriaSchema = z.object({
  batimentPassif: z.boolean().default(false),
  isolationRenforcee: z.boolean().default(false),
  precadres: z.boolean().default(false),
  voletsExterieurs: z.boolean().default(false),
  coupeFeu: z.boolean().default(false),
  evidences: z.record(z.string(), z.array(z.string())).optional(), // critère → extraits de texte
});

export type SpecialCriteria = z.infer<typeof specialCriteriaSchema>;

// Schema pour aperçu de scoring (frontend)
export const scoringPreviewRequestSchema = z.object({
  criteria: specialCriteriaSchema,
  config: technicalScoringConfigSchema.optional(), // Si non fourni, utilise config par défaut
});

export type ScoringPreviewRequest = z.infer<typeof scoringPreviewRequestSchema>;

// Valeurs par défaut pour le scoring technique
export const defaultTechnicalScoringConfig: TechnicalScoringConfig = {
  weights: {
    batimentPassif: 5,
    isolationRenforcee: 3,
    precadres: 2,
    voletsExterieurs: 1,
    coupeFeu: 4,
  },
  threshold: 5,
};

// ========================================
// SCHEMAS MATÉRIAUX ET COULEURS - PATTERNS AVANCÉS OCR
// ========================================

// Schema couleur avec finition et preuves
export const colorSpecSchema = z.object({
  ralCode: z.string().optional(),
  name: z.string().optional(),
  finish: z.enum(["mat", "satine", "brillant", "texture", "sable", "anodise", "thermolaque", "laque", "plaxe", "brosse"]).optional(),
  evidences: z.array(z.string()).default([])
});

// Schema matériau avec couleur associée et confiance
export const materialSpecSchema = z.object({
  material: z.enum(["pvc", "bois", "aluminium", "acier", "composite", "mixte_bois_alu", "inox", "galva"]),
  color: colorSpecSchema.optional(),
  evidences: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.8)
});

// Schema règles d'alerte matériau-couleur configurables
export const materialColorAlertRuleSchema = z.object({
  id: z.string(),
  materials: z.array(z.enum(["pvc", "bois", "aluminium", "acier", "composite", "mixte_bois_alu", "inox", "galva"])).optional(),
  ralCodes: z.array(z.string()).optional(),
  finishes: z.array(z.enum(["mat", "satine", "brillant", "texture", "sable", "anodise", "thermolaque", "laque", "plaxe", "brosse"])).optional(),
  specialCriteria: z.array(z.enum(["batiment_passif", "isolation_renforcee", "precadres", "volets_exterieurs", "coupe_feu"])).optional(),
  condition: z.enum(['allOf', 'anyOf']).default('anyOf'),
  severity: z.enum(['info', 'warning', 'critical']).default('warning'),
  message: z.string()
});

// Extension AOFieldsExtracted avec matériaux et couleurs
export const aoFieldsExtractedSchema = z.object({
  // Informations générales
  reference: z.string().optional(),
  intituleOperation: z.string().optional(),
  client: z.string().optional(),
  location: z.string().optional(),
  
  // Dates
  dateRenduAO: z.string().optional(),
  dateAcceptationAO: z.string().optional(),
  demarragePrevu: z.string().optional(),
  deadline: z.string().optional(),
  dateOS: z.string().optional(),
  delaiContractuel: z.string().optional(),
  dateLimiteRemise: z.string().optional(),
  
  // Contacts et maîtrise
  maitreOuvrageNom: z.string().optional(),
  maitreOuvrageAdresse: z.string().optional(),
  maitreOuvrageContact: z.string().optional(),
  maitreOuvrageEmail: z.string().optional(),
  maitreOuvragePhone: z.string().optional(),
  maitreOeuvreNom: z.string().optional(),
  maitreOeuvreContact: z.string().optional(),
  
  // Techniques
  lotConcerne: z.string().optional(),
  menuiserieType: z.string().optional(),
  montantEstime: z.string().optional(),
  typeMarche: z.string().optional(),
  
  // Source et contexte
  plateformeSource: z.string().optional(),
  departement: z.string().optional(),
  
  // Éléments techniques
  bureauEtudes: z.string().optional(),
  bureauControle: z.string().optional(),
  sps: z.string().optional(),
  
  // Détection automatique des documents
  cctpDisponible: z.boolean().optional(),
  plansDisponibles: z.boolean().optional(),
  dpgfClientDisponible: z.boolean().optional(),
  dceDisponible: z.boolean().optional(),
  
  // Critères techniques spéciaux existants
  specialCriteria: specialCriteriaSchema.optional(),
  
  // Nouveaux champs matériaux et couleurs
  materials: z.array(materialSpecSchema).optional(),
  colors: z.array(colorSpecSchema).optional()
});

// Types TypeScript dérivés
export type ColorSpec = z.infer<typeof colorSpecSchema>;
export type MaterialSpec = z.infer<typeof materialSpecSchema>;
export type MaterialColorAlertRule = z.infer<typeof materialColorAlertRuleSchema>;
export type AOFieldsExtracted = z.infer<typeof aoFieldsExtractedSchema>;

// ========================================
// SYSTÈME D'ALERTES TECHNIQUES POUR JULIEN LAMBOROT
// ========================================

// Statuts des alertes techniques
export const technicalAlertStatusEnum = pgEnum("technical_alert_status", [
  "pending", "acknowledged", "validated", "bypassed"
]);

// Actions historique
export const technicalAlertActionEnum = pgEnum("technical_alert_action", [
  "created", "acknowledged", "validated", "bypassed", "auto_expired", "suppressed"
]);

// Table alertes techniques
export const technicalAlerts = pgTable("technical_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  aoId: varchar("ao_id").notNull(),
  aoReference: varchar("ao_reference").notNull(),
  score: decimal("score", { precision: 5, scale: 2 }).notNull(),
  triggeredCriteria: text("triggered_criteria").array().default(sql`'{}'::text[]`),
  status: technicalAlertStatusEnum("status").default("pending"),
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  validatedAt: timestamp("validated_at"),
  validatedByUserId: varchar("validated_by_user_id").references(() => users.id),
  
  // Système bypass
  bypassUntil: timestamp("bypass_until"),
  bypassReason: text("bypass_reason"),
  
  // Métadonnées
  rawEventData: jsonb("raw_event_data"),
});

// Historique actions
export const technicalAlertHistory = pgTable("technical_alert_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alertId: varchar("alert_id").notNull().references(() => technicalAlerts.id, { onDelete: "cascade" }),
  action: technicalAlertActionEnum("action").notNull(),
  actorUserId: varchar("actor_user_id").references(() => users.id),
  timestamp: timestamp("timestamp").defaultNow(),
  note: text("note"),
  metadata: jsonb("metadata"),
});

// ========================================
// TABLES ANALYTICS POUR DASHBOARD DÉCISIONNEL AVANCÉ - PHASE 3.1.2
// ========================================

// Table des métriques métier calculées
export const businessMetrics = pgTable("business_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metricType: metricTypeEnum("metric_type").notNull(),
  periodType: varchar("period_type", { length: 20 }).notNull(), // 'daily', 'weekly', 'monthly', 'quarterly'
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  value: decimal("value", { precision: 15, scale: 4 }).notNull(),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`), // Contexte additionnel
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
  userId: varchar("user_id"), // Optionnel pour métriques par utilisateur
  projectType: varchar("project_type"), // Optionnel pour filtrage par type
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    metricTypePeriodIdx: index("idx_business_metrics_type_period").on(table.metricType, table.periodStart, table.periodEnd),
    periodStartIdx: index("idx_business_metrics_period_start").on(table.periodStart),
    userMetricsIdx: index("idx_business_metrics_user").on(table.userId),
  };
});

// Table des instantanés consolidés des KPIs
export const kpiSnapshots = pgTable("kpi_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  snapshotDate: timestamp("snapshot_date").notNull(),
  periodFrom: timestamp("period_from").notNull(),
  periodTo: timestamp("period_to").notNull(),
  
  // KPIs consolidés
  totalAos: integer("total_aos").default(0),
  totalOffers: integer("total_offers").default(0),
  totalProjects: integer("total_projects").default(0),
  conversionRateAoToOffer: decimal("conversion_rate_ao_to_offer", { precision: 5, scale: 2 }),
  conversionRateOfferToProject: decimal("conversion_rate_offer_to_project", { precision: 5, scale: 2 }),
  avgDelayDays: decimal("avg_delay_days", { precision: 8, scale: 2 }),
  totalRevenueForecast: decimal("total_revenue_forecast", { precision: 15, scale: 2 }),
  avgTeamLoadPercentage: decimal("avg_team_load_percentage", { precision: 5, scale: 2 }),
  criticalDeadlinesCount: integer("critical_deadlines_count").default(0),
  delayedProjectsCount: integer("delayed_projects_count").default(0),
  
  // Breakdown data (JSON pour flexibilité)
  conversionByUser: jsonb("conversion_by_user").default(sql`'{}'::jsonb`),
  loadByUser: jsonb("load_by_user").default(sql`'{}'::jsonb`),
  revenueByCategory: jsonb("revenue_by_category").default(sql`'{}'::jsonb`),
  marginByCategory: jsonb("margin_by_category").default(sql`'{}'::jsonb`),
  
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => {
  return {
    snapshotDateIdx: index("idx_kpi_snapshots_date").on(table.snapshotDate),
    periodIdx: index("idx_kpi_snapshots_period").on(table.periodFrom, table.periodTo),
  };
});

// Table des comparaisons et benchmarks de performance
export const performanceBenchmarks = pgTable("performance_benchmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  benchmarkType: benchmarkTypeEnum("benchmark_type").notNull(),
  entityId: varchar("entity_id"), // ID utilisateur, projet, ou catégorie
  entityType: varchar("entity_type", { length: 30 }), // 'user', 'project', 'category', 'department'
  
  // Métriques de performance
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }),
  avgDelay: decimal("avg_delay", { precision: 8, scale: 2 }),
  avgMargin: decimal("avg_margin", { precision: 5, scale: 2 }),
  totalRevenue: decimal("total_revenue", { precision: 15, scale: 2 }),
  workloadEfficiency: decimal("workload_efficiency", { precision: 5, scale: 2 }),
  
  // Période et contexte
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  comparisonPeriodStart: timestamp("comparison_period_start"), // Pour comparaisons temporelles
  comparisonPeriodEnd: timestamp("comparison_period_end"),
  
  // Métadonnées et insights
  performanceScore: decimal("performance_score", { precision: 5, scale: 2 }), // Score global 0-100
  insights: jsonb("insights").default(sql`'{}'::jsonb`), // Analyses automatiques
  recommendations: jsonb("recommendations").default(sql`'{}'::jsonb`), // Recommandations IA
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    benchmarkTypeEntityIdx: index("idx_performance_benchmarks_type_entity").on(table.benchmarkType, table.entityType, table.entityId),
    periodIdx: index("idx_performance_benchmarks_period").on(table.periodStart, table.periodEnd),
    performanceScoreIdx: index("idx_performance_benchmarks_score").on(table.performanceScore),
  };
});

// Table de configuration des alertes métier
export const businessAlertsConfig = pgTable("business_alerts_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alertType: varchar("alert_type", { length: 50 }).notNull(), // 'low_conversion', 'high_delays', 'overload_team', 'revenue_drop'
  metricName: varchar("metric_name", { length: 50 }).notNull(),
  thresholdValue: decimal("threshold_value", { precision: 15, scale: 4 }).notNull(),
  thresholdOperator: varchar("threshold_operator", { length: 10 }).notNull(), // '>', '<', '>=', '<=', '=', '!='
  severity: alertSeverityBusinessEnum("severity").notNull(),
  
  // Configuration
  isActive: boolean("is_active").default(true),
  notificationEnabled: boolean("notification_enabled").default(true),
  emailEnabled: boolean("email_enabled").default(false),
  checkFrequency: varchar("check_frequency", { length: 20 }).default("hourly"), // 'hourly', 'daily', 'weekly'
  
  // Métadonnées
  description: text("description"),
  createdBy: varchar("created_by"),
  assignedTo: varchar("assigned_to"), // Responsable des alertes
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    activeAlertsIdx: index("idx_business_alerts_active").on(table.isActive, table.alertType),
    metricNameIdx: index("idx_business_alerts_metric").on(table.metricName),
    assignedToIdx: index("idx_business_alerts_assigned").on(table.assignedTo),
  };
});

// ========================================
// SCHEMAS ZOD POUR ALERTES TECHNIQUES
// ========================================

// Schema d'insertion pour technicalAlerts
export const insertTechnicalAlertSchema = createInsertSchema(technicalAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema d'insertion pour technicalAlertHistory
export const insertTechnicalAlertHistorySchema = createInsertSchema(technicalAlertHistory).omit({
  id: true,
  timestamp: true,
});

// Schema pour bypass
export const bypassTechnicalAlertSchema = z.object({
  until: z.string().datetime(),
  reason: z.string().min(10, "La raison doit contenir au moins 10 caractères"),
});

// Schema pour filtrage des alertes
export const technicalAlertsFilterSchema = z.object({
  status: z.enum(["pending", "acknowledged", "validated", "bypassed"]).optional(),
  userId: z.string().optional(),
  aoId: z.string().optional(),
});

// ========================================
// TYPES TYPESCRIPT POUR ALERTES TECHNIQUES
// ========================================

export type TechnicalAlert = typeof technicalAlerts.$inferSelect;
export type InsertTechnicalAlert = z.infer<typeof insertTechnicalAlertSchema>;
export type TechnicalAlertHistory = typeof technicalAlertHistory.$inferSelect;
export type InsertTechnicalAlertHistory = z.infer<typeof insertTechnicalAlertHistorySchema>;
export type BypassTechnicalAlert = z.infer<typeof bypassTechnicalAlertSchema>;
export type TechnicalAlertsFilter = z.infer<typeof technicalAlertsFilterSchema>;

// ========================================
// SYSTÈME INTELLIGENT DE DATES ET ÉCHÉANCES - PHASE 2.1
// ========================================

// Table pour historique et prédictions des timelines projets
export const projectTimelines = pgTable("project_timelines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`), // Cohérent avec architecture existante
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }),
  phase: projectStatusEnum("phase").notNull(),
  
  // Dates planifiées vs réelles pour analyse écarts
  plannedStartDate: timestamp("planned_start_date"),
  plannedEndDate: timestamp("planned_end_date"),
  actualStartDate: timestamp("actual_start_date"),
  actualEndDate: timestamp("actual_end_date"),
  
  // Métadonnées calculs intelligents
  durationEstimate: integer("duration_estimate").default(0), // en jours
  confidence: decimal("confidence", { precision: 3, scale: 2 }).default("0.80"), // 0-1
  calculationMethod: calculationMethodEnum("calculation_method").default("automatic"),
  
  // Dépendances et contraintes
  dependsOn: text("depends_on").array().default(sql`'{}'::text[]`), // IDs phases précédentes
  riskLevel: priorityLevelEnum("risk_level").default("normale"),
  bufferDays: integer("buffer_days").default(0),
  
  // Métadonnées système
  autoCalculated: boolean("auto_calculated").default(true),
  lastCalculatedAt: timestamp("last_calculated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    projectTimelinesByProject: index("idx_project_timelines_project_id").on(table.projectId),
    projectTimelinesByPhase: index("idx_project_timelines_phase").on(table.phase),
  };
});

// Table des règles métier intelligentes configurables
export const dateIntelligenceRules = pgTable("date_intelligence_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  
  // Ciblage règle
  phase: projectStatusEnum("phase"), // null = règle globale
  projectType: varchar("project_type"), // neuf|renovation|maintenance
  complexity: priorityLevelEnum("complexity"), // simple|normale|elevee
  
  // Conditions déclenchement
  baseConditions: jsonb("base_conditions"), // JSON conditions flexibles
  triggerEvents: text("trigger_events").array().default(sql`'{}'::text[]`), // évènements déclencheurs
  
  // Calculs durées
  durationFormula: text("duration_formula"), // Formule calcul (JSON ou expression)
  baseDuration: integer("base_duration").default(0), // durée base en jours
  multiplierFactor: decimal("multiplier_factor", { precision: 4, scale: 2 }).default("1.00"),
  bufferPercentage: decimal("buffer_percentage", { precision: 3, scale: 2 }).default("0.15"), // 15% buffer défaut
  
  // Contraintes métier
  minDuration: integer("min_duration").default(1),
  maxDuration: integer("max_duration").default(365),
  workingDaysOnly: boolean("working_days_only").default(true),
  excludeHolidays: boolean("exclude_holidays").default(true),
  
  // Gestion configuration
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(100), // ordre application règles
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),
  
  // Métadonnées
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    activeRulesIndex: index("idx_active_rules").on(table.isActive, table.priority),
    phaseRulesIndex: index("idx_rules_phase").on(table.phase),
  };
});

// Table alertes dates et échéances
export const dateAlerts = pgTable("date_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Entité concernée (project, offer, ou ao)
  entityType: varchar("entity_type").notNull(), // project|offer|ao
  entityId: varchar("entity_id").notNull(),
  entityReference: varchar("entity_reference"), // Référence affichable
  
  // Type et criticité alerte
  alertType: dateAlertTypeEnum("alert_type").notNull(),
  severity: varchar("severity").notNull().default("warning"), // info|warning|critical
  category: varchar("category").default("planning"), // planning|resource|quality
  
  // Détails alerte
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  phase: projectStatusEnum("phase"), // Phase concernée si applicable
  
  // Données temporelles
  targetDate: timestamp("target_date"), // Date cible originale
  predictedDate: timestamp("predicted_date"), // Date prédite
  delayDays: integer("delay_days").default(0), // Nombre jours de retard
  impactLevel: priorityLevelEnum("impact_level").default("normale"),
  
  // Actions suggérées
  suggestedActions: jsonb("suggested_actions"), // Actions correctives JSON
  actionTaken: text("action_taken"), // Action réellement prise
  actionBy: varchar("action_by").references(() => users.id),
  
  // Workflow gestion alerte
  status: varchar("status").default("pending"), // pending|acknowledged|resolved|dismissed
  assignedTo: varchar("assigned_to").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  
  // Métadonnées
  detectedAt: timestamp("detected_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    dateAlertsByEntity: index("idx_date_alerts_entity").on(table.entityType, table.entityId),
    dateAlertsByStatus: index("idx_date_alerts_status").on(table.status),
    dateAlertsByAssignee: index("idx_date_alerts_assignee").on(table.assignedTo),
  };
});

// ========================================
// TABLES SYSTÈME ALERTES MÉTIER - PHASE 3.1.7.1
// ========================================

// Table seuils configurables business
export const alertThresholds = pgTable('alert_thresholds', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  
  // TYPE SEUIL
  thresholdKey: thresholdKeyEnum('threshold_key').notNull(),
  
  // CONDITION DÉCLENCHEMENT
  operator: thresholdOperatorEnum('operator').notNull(),
  thresholdValue: decimal('threshold_value', { precision: 10, scale: 2 }).notNull(),
  
  // MÉTADONNÉES ALERTE
  severity: alertSeverityEnum('severity').notNull(),
  alertTitle: varchar('alert_title', { length: 200 }).notNull(),
  alertMessage: text('alert_message').notNull(),
  
  // SCOPE & ACTIVATION
  scopeType: thresholdScopeEnum('scope_type').notNull(),
  scopeEntityId: varchar('scope_entity_id', { length: 255 }), // ID entité scope (optionnel)
  isActive: boolean('is_active').default(true),
  
  // CANAUX NOTIFICATION
  notificationChannels: text('notification_channels')
    .array()
    .default(sql`ARRAY['dashboard']`),
  
  // MÉTADONNÉES CONFIGURABLES
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  
  // AUDIT
  createdBy: varchar('created_by', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => {
  return {
    // Index seuils actifs par type
    activeThresholdsByKey: index('idx_alert_thresholds_active_by_key')
      .on(table.thresholdKey, table.isActive),
    
    // Index scope
    scopeIndex: index('idx_alert_thresholds_scope_entity')
      .on(table.scopeType, table.scopeEntityId),
      
    // Index créateur
    createdByIndex: index('idx_alert_thresholds_created_by_user')
      .on(table.createdBy)
  };
});

// Table instances alertes déclenchées
export const businessAlerts = pgTable('business_alerts', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  
  // RÉFÉRENCE SEUIL
  thresholdId: varchar('threshold_id').references(() => alertThresholds.id, {
    onDelete: 'cascade'
  }),
  
  // CLASSIFICATION ALERTE
  alertType: businessAlertTypeEnum('alert_type').notNull(),
  
  // ENTITÉ CONCERNÉE
  entityType: alertEntityTypeEnum('entity_type').notNull(),
  entityId: varchar('entity_id', { length: 255 }).notNull(),
  entityName: varchar('entity_name', { length: 300 }),
  
  // CONTENU ALERTE
  title: varchar('title', { length: 200 }).notNull(),
  message: text('message').notNull(),
  severity: alertSeverityEnum('severity').notNull(),
  
  // VALEURS DÉCLENCHEMENT
  thresholdValue: decimal('threshold_value', { precision: 10, scale: 2 }),
  actualValue: decimal('actual_value', { precision: 10, scale: 2 }),
  variance: decimal('variance', { precision: 10, scale: 2 }),
  
  // STATUT WORKFLOW
  status: alertStatusEnum('status').default('open'),
  
  // ASSIGNATION & SUIVI
  assignedTo: varchar('assigned_to', { length: 255 }),
  acknowledgedBy: varchar('acknowledged_by', { length: 255 }),
  acknowledgedAt: timestamp('acknowledged_at'),
  resolvedBy: varchar('resolved_by', { length: 255 }),
  resolvedAt: timestamp('resolved_at'),
  
  // MÉTADONNÉES & CONTEXTE
  contextData: jsonb('context_data').default(sql`'{}'::jsonb`),
  resolutionNotes: text('resolution_notes'),
  
  // TIMESTAMPS
  triggeredAt: timestamp('triggered_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => {
  return {
    // Index alertes ouvertes par type
    openAlertsByType: index('idx_business_alerts_instance_open_type')
      .on(table.status, table.alertType),
    
    // Index entité
    entityIndex: index('idx_business_alerts_instance_entity')
      .on(table.entityType, table.entityId),
      
    // Index assignation
    assignedIndex: index('idx_business_alerts_instance_assigned')
      .on(table.assignedTo, table.status),
      
    // Index temporal
    triggeredAtIndex: index('idx_business_alerts_instance_triggered')
      .on(table.triggeredAt)
  };
});

// ========================================
// SCHEMAS ZOD POUR SYSTÈME INTELLIGENT DE DATES ET ÉCHÉANCES - PHASE 2.1
// ========================================

// Schemas validation pour nouvelles entités
export const insertProjectTimelineSchema = createInsertSchema(projectTimelines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastCalculatedAt: true
});

export const insertDateIntelligenceRuleSchema = createInsertSchema(dateIntelligenceRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertDateAlertSchema = createInsertSchema(dateAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  detectedAt: true
});

// ========================================
// TYPES TYPESCRIPT POUR SYSTÈME INTELLIGENT DE DATES ET ÉCHÉANCES - PHASE 2.1
// ========================================

// Types TypeScript pour utilisation
export type ProjectTimeline = typeof projectTimelines.$inferSelect;
export type InsertProjectTimeline = z.infer<typeof insertProjectTimelineSchema>;

export type DateIntelligenceRule = typeof dateIntelligenceRules.$inferSelect;
export type InsertDateIntelligenceRule = z.infer<typeof insertDateIntelligenceRuleSchema>;

export type DateAlert = typeof dateAlerts.$inferSelect;
export type InsertDateAlert = z.infer<typeof insertDateAlertSchema>;

// ========================================
// SCHEMAS ZOD POUR SYSTÈME ALERTES MÉTIER - PHASE 3.1.7.1
// ========================================

// Schema validation seuils
export const insertAlertThresholdSchema = createInsertSchema(alertThresholds)
  .omit({ 
    id: true, 
    createdAt: true, 
    updatedAt: true 
  })
  .extend({
    thresholdValue: z.number().min(0),
    alertTitle: z.string().min(3).max(200),
    alertMessage: z.string().min(10).max(1000),
    notificationChannels: z.array(z.enum(['email', 'dashboard', 'websocket'])).default(['dashboard'])
  });

export const updateAlertThresholdSchema = insertAlertThresholdSchema.partial();

// Schema validation alertes business
export const insertBusinessAlertSchema = createInsertSchema(businessAlerts)
  .omit({ 
    id: true, 
    createdAt: true, 
    updatedAt: true,
    triggeredAt: true 
  })
  .extend({
    title: z.string().min(3).max(200),
    message: z.string().min(10).max(2000),
    thresholdValue: z.number().optional(),
    actualValue: z.number().optional(),
    variance: z.number().optional()
  });

export const updateBusinessAlertSchema = z.object({
  status: z.enum(['acknowledged', 'in_progress', 'resolved', 'dismissed']),
  assignedTo: z.string().optional(),
  resolutionNotes: z.string().max(1000).optional()
});

// Schema query params
export const alertsQuerySchema = z.object({
  type: z.enum(['profitability', 'team_overload', 'deadline_critical', 'predictive_risk', 'budget_overrun', 'revenue_forecast', 'project_delay']).optional(),
  status: z.enum(['open', 'acknowledged', 'in_progress', 'resolved', 'dismissed']).optional(),
  severity: z.enum(['info', 'warning', 'error', 'critical']).optional(),
  entityType: z.enum(['project', 'offer', 'team', 'global', 'forecast']).optional(),
  assignedTo: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0)
});

// ========================================
// TYPES TYPESCRIPT POUR SYSTÈME ALERTES MÉTIER - PHASE 3.1.7.1
// ========================================

// Types pour application
export type AlertThreshold = typeof alertThresholds.$inferSelect;
export type InsertAlertThreshold = z.infer<typeof insertAlertThresholdSchema>;
export type UpdateAlertThreshold = z.infer<typeof updateAlertThresholdSchema>;

export type BusinessAlert = typeof businessAlerts.$inferSelect;
export type InsertBusinessAlert = z.infer<typeof insertBusinessAlertSchema>;
export type UpdateBusinessAlert = z.infer<typeof updateBusinessAlertSchema>;

export type AlertsQuery = z.infer<typeof alertsQuerySchema>;

// Types utilitaires
export type ThresholdKey = AlertThreshold['thresholdKey'];
export type AlertSeverity = AlertThreshold['severity'];
export type AlertStatus = BusinessAlert['status'];
export type AlertType = BusinessAlert['alertType'];

// ========================================
// SCHEMAS ZOD POUR DASHBOARD DÉCISIONNEL AVANCÉ - PHASE 3.1.2
// ========================================

// Schemas d'insertion pour les nouvelles tables analytics
export const insertBusinessMetricSchema = createInsertSchema(businessMetrics).omit({
  id: true,
  calculatedAt: true,
  createdAt: true,
  updatedAt: true
});

export const insertKpiSnapshotSchema = createInsertSchema(kpiSnapshots).omit({
  id: true,
  createdAt: true
});

export const insertPerformanceBenchmarkSchema = createInsertSchema(performanceBenchmarks).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertBusinessAlertConfigSchema = createInsertSchema(businessAlertsConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// ========================================
// TYPES TYPESCRIPT POUR DASHBOARD DÉCISIONNEL AVANCÉ - PHASE 3.1.2
// ========================================

// Types TypeScript pour utilisation
export type BusinessMetric = typeof businessMetrics.$inferSelect;
export type InsertBusinessMetric = z.infer<typeof insertBusinessMetricSchema>;

export type KpiSnapshot = typeof kpiSnapshots.$inferSelect;
export type InsertKpiSnapshot = z.infer<typeof insertKpiSnapshotSchema>;

export type PerformanceBenchmark = typeof performanceBenchmarks.$inferSelect;
export type InsertPerformanceBenchmark = z.infer<typeof insertPerformanceBenchmarkSchema>;

export type BusinessAlertConfig = typeof businessAlertsConfig.$inferSelect;
export type InsertBusinessAlertConfig = z.infer<typeof insertBusinessAlertConfigSchema>;

// ========================================
// SCHEMAS ZOD POUR SYSTÈME DE CHECKLIST ADMINISTRATIVE AUTOMATISÉE - PHASE 3
// ========================================

// Schémas d'insertion pour les nouvelles tables administratives
export const insertAdministrativeChecklistSchema = createInsertSchema(administrativeChecklists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(3, "Le nom de la checklist doit contenir au moins 3 caractères"),
  description: z.string().optional(),
  completionPercentage: z.number().min(0).max(100).default(0),
});

export const insertAdministrativeChecklistItemSchema = createInsertSchema(administrativeChecklistItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(3, "Le nom du document doit contenir au moins 3 caractères"),
  description: z.string().optional(),
  notes: z.string().optional(),
  documentUrl: z.string().url().optional().or(z.literal("")),
  dependencies: z.array(z.string()).default([]),
});

export const insertAdministrativeValidationSchema = createInsertSchema(administrativeValidations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  comments: z.string().optional(),
  revisionNotes: z.string().optional(),
});

// Schémas de mise à jour pour les entités administratives
export const updateAdministrativeChecklistSchema = insertAdministrativeChecklistSchema.partial().omit({
  projectId: true,
  createdBy: true,
});

export const updateAdministrativeChecklistItemSchema = insertAdministrativeChecklistItemSchema.partial().omit({
  checklistId: true,
});

export const updateAdministrativeValidationSchema = insertAdministrativeValidationSchema.partial().omit({
  checklistItemId: true,
  validatorId: true,
  validationType: true,
});

// Schémas pour requêtes et filtrage
export const administrativeChecklistsQuerySchema = z.object({
  projectId: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']).optional(),
  priority: z.enum(['tres_faible', 'faible', 'normale', 'elevee', 'critique']).optional(),
  createdBy: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const administrativeChecklistItemsQuerySchema = z.object({
  checklistId: z.string().optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'blocked', 'not_applicable']).optional(),
  documentType: z.string().optional(), // On accepte string car l'enum est long
  isRequired: z.boolean().optional(),
  assignedTo: z.string().optional(),
  validatedBy: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const administrativeValidationsQuerySchema = z.object({
  checklistItemId: z.string().optional(),
  validatorId: z.string().optional(),
  validationType: z.enum(['technical_validation', 'legal_validation', 'quality_validation', 'final_approval']).optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'revision_requested']).optional(),
  priority: z.enum(['tres_faible', 'faible', 'normale', 'elevee', 'critique']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// ========================================
// TYPES TYPESCRIPT POUR SYSTÈME DE CHECKLIST ADMINISTRATIVE AUTOMATISÉE - PHASE 3
// ========================================

// Types pour les tables administratives
export type AdministrativeChecklist = typeof administrativeChecklists.$inferSelect;
export type InsertAdministrativeChecklist = z.infer<typeof insertAdministrativeChecklistSchema>;
export type UpdateAdministrativeChecklist = z.infer<typeof updateAdministrativeChecklistSchema>;

export type AdministrativeChecklistItem = typeof administrativeChecklistItems.$inferSelect;
export type InsertAdministrativeChecklistItem = z.infer<typeof insertAdministrativeChecklistItemSchema>;
export type UpdateAdministrativeChecklistItem = z.infer<typeof updateAdministrativeChecklistItemSchema>;

export type AdministrativeValidation = typeof administrativeValidations.$inferSelect;
export type InsertAdministrativeValidation = z.infer<typeof insertAdministrativeValidationSchema>;
export type UpdateAdministrativeValidation = z.infer<typeof updateAdministrativeValidationSchema>;

// Types pour les requêtes
export type AdministrativeChecklistsQuery = z.infer<typeof administrativeChecklistsQuerySchema>;
export type AdministrativeChecklistItemsQuery = z.infer<typeof administrativeChecklistItemsQuerySchema>;
export type AdministrativeValidationsQuery = z.infer<typeof administrativeValidationsQuerySchema>;

// Types utilitaires pour l'administration
export type AdminChecklistStatus = AdministrativeChecklist['status'];
export type ChecklistItemStatus = AdministrativeChecklistItem['status'];
export type AdminDocumentType = AdministrativeChecklistItem['documentType'];
export type ValidationType = AdministrativeValidation['validationType'];
export type ValidationStatus = AdministrativeValidation['status'];

// Interface pour statistiques de checklist
export interface ChecklistStatistics {
  totalItems: number;
  completedItems: number;
  pendingItems: number;
  blockedItems: number;
  overdue: number;
  completionPercentage: number;
  expectedCompletionDate?: Date;
  estimatedDelay?: number; // jours
}

// Interface pour rapport de validation
export interface ValidationReport {
  checklistId: string;
  projectId: string;
  projectName: string;
  totalValidations: number;
  approvedValidations: number;
  rejectedValidations: number;
  pendingValidations: number;
  criticalBlocking: number;
  averageValidationTime: number; // heures
  validationCompletionRate: number; // pourcentage
}

// ========================================
// SCHEMAS ZOD POUR API ANALYTICS - PHASE 3.1.4
// ========================================

// Schemas validation API Analytics pour Dashboard Décisionnel

export const analyticsFiltersSchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year']).optional(),
  department: z.string().optional(),
  userId: z.string().optional(),
  projectType: z.string().optional(),
  dateFrom: z.string().transform(str => new Date(str))
    .refine(date => !isNaN(date.getTime()), {
      message: "Date de début invalide"
    }).optional(),
  dateTo: z.string().transform(str => new Date(str))
    .refine(date => !isNaN(date.getTime()), {
      message: "Date de fin invalide"
    }).optional()
});

export const snapshotRequestSchema = z.object({
  period: z.object({
    from: z.string().transform(str => new Date(str))
      .refine(date => !isNaN(date.getTime()), {
        message: "Date de début invalide"
      }),
    to: z.string().transform(str => new Date(str))
      .refine(date => !isNaN(date.getTime()), {
        message: "Date de fin invalide"
      })
  }),
  includeForecasting: z.boolean().default(true),
  includeBenchmarks: z.boolean().default(true)
});

export const metricQuerySchema = z.object({
  metricType: z.enum(['conversion', 'delay', 'revenue', 'team_load', 'margin']),
  groupBy: z.enum(['user', 'department', 'project_type', 'month', 'phase']).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
});

export const benchmarkQuerySchema = z.object({
  entityType: z.enum(['user', 'team', 'department']),
  entityId: z.string().optional(),
  metricTypes: z.array(z.string()).optional(),
  period: z.string().optional()
});

// ========================================
// SCHEMAS ZOD POUR MOTEUR PRÉDICTIF - PHASE 3.1.6.1
// ========================================

// 1. Prévisions revenus mensuelle avec confiance
export const predictiveRevenueForecastSchema = z.object({
  id: z.string(),                    // forecast_YYYYMMDD_ID
  forecast_date: z.string(),         // Date génération
  target_period: z.string(),         // Période ciblée (2025-Q1, 2025-03)
  revenue_forecast: z.number(),      // CA prévu (€)
  confidence_level: z.number().min(0).max(100), // % confiance
  method_used: z.enum(['exp_smoothing', 'moving_average', 'trend_analysis']),
  underlying_factors: z.array(z.string()), // Facteurs explicatifs
  created_at: z.string()
});

// 2. Évaluation risques projet individuel
export const projectRiskAssessmentSchema = z.object({
  id: z.string(),                    // risk_YYYYMMDD_ID
  project_id: z.string(),            // Référence projet
  risk_score: z.number().min(0).max(100), // Score risque global
  risk_factors: z.array(z.object({
    category: z.enum(['budget', 'deadline', 'quality', 'team', 'external']),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string(),
    impact_probability: z.number().min(0).max(100)
  })),
  predicted_delay_days: z.number().optional(), // Retard prévu (jours)
  predicted_budget_overrun: z.number().optional(), // Dépassement budget (€)
  recommended_actions: z.array(z.string()), // Actions préventives
  assessment_date: z.string()
});

// 3. Recommandations actionables dirigeants
export const businessRecommendationSchema = z.object({
  id: z.string(),                    // rec_YYYYMMDD_ID
  category: z.enum(['revenue', 'cost', 'planning', 'team', 'process']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  title: z.string(),                 // Titre recommandation
  description: z.string(),           // Détail contexte
  expected_impact: z.object({
    financial: z.number().optional(), // Impact financier (€)
    timeline: z.string().optional(),  // Délai implémentation
    roi_percentage: z.number().optional() // ROI estimé
  }),
  action_items: z.array(z.string()), // Actions concrètes
  generated_date: z.string(),
  expires_at: z.string().optional()  // Date expiration si temporaire
});

// ========================================
// QUERY SCHEMAS POUR MOTEUR PRÉDICTIF - PHASE 3.1.6.1
// ========================================

// 4. Query pour requêtes de prévision avec horizon temporel
export const predictiveRangeQuerySchema = z.object({
  start_date: z.string(),            // Date début analyse
  end_date: z.string(),              // Date fin analyse  
  forecast_months: z.number().min(1).max(12).default(6), // Horizon prévision
  method: z.enum(['exp_smoothing', 'moving_average', 'trend_analysis']).optional(),
  confidence_threshold: z.number().min(70).max(95).default(80)
});

// 5. Query pour filtrage évaluations risques
export const riskQueryParamsSchema = z.object({
  risk_level: z.enum(['all', 'medium', 'high', 'critical']).default('medium'),
  project_status: z.array(z.enum(['study', 'planning', 'construction', 'delivery'])).optional(),
  limit: z.number().min(1).max(50).default(20),
  sort_by: z.enum(['risk_score', 'deadline', 'budget']).default('risk_score')
});

// ========================================
// TYPES TYPESCRIPT POUR MOTEUR PRÉDICTIF - PHASE 3.1.6.1
// ========================================

// Types inférés pour TypeScript - Contrats de données moteur prédictif
export type PredictiveRevenueForecast = z.infer<typeof predictiveRevenueForecastSchema>;
export type ProjectRiskAssessment = z.infer<typeof projectRiskAssessmentSchema>;
export type BusinessRecommendation = z.infer<typeof businessRecommendationSchema>;
export type PredictiveRangeQuery = z.infer<typeof predictiveRangeQuerySchema>;
export type RiskQueryParams = z.infer<typeof riskQueryParamsSchema>;

// ========================================
// ENUMS POUR SYSTÈME RBAC GRANULAIRE - CHATBOT IA SAXIUM
// ========================================

// Rôles utilisateurs pour permissions granulaires
export const rbacRoleEnum = pgEnum("rbac_role", [
  "admin", 
  "chef_projet", 
  "technicien_be", 
  "responsable_be", 
  "chef_travaux",
  "commercial",
  "financier",
  "direction"
]);

// Actions possibles sur les données
export const rbacActionEnum = pgEnum("rbac_action", [
  "read",
  "write", 
  "delete",
  "create",
  "export"
]);

// Contextes d'accès dynamiques
export const permissionContextEnum = pgEnum("permission_context", [
  "all",                    // Accès global
  "own_only",              // Ses propres données seulement
  "team_projects",         // Projets de son équipe
  "assigned_projects",     // Projets assignés
  "department_data",       // Données de son département
  "financial_restricted",  // Données financières restreintes
  "current_month",         // Données du mois courant seulement
  "public_data"           // Données publiques seulement
]);

// Niveaux de sensibilité des données
export const dataSensitivityEnum = pgEnum("data_sensitivity", [
  "public",      // Données publiques
  "internal",    // Données internes
  "confidential", // Données confidentielles
  "restricted"   // Données très sensibles
]);

// ========================================
// TABLES RBAC GRANULAIRE - CHATBOT IA SAXIUM
// ========================================

// Table principale des permissions granulaires
export const permissions = pgTable("permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: rbacRoleEnum("role").notNull(),
  tableName: varchar("table_name").notNull(),
  allowedColumns: text("allowed_columns").array().default(sql`'{}'::text[]`),
  deniedColumns: text("denied_columns").array().default(sql`'{}'::text[]`),
  conditions: jsonb("conditions"), // WHERE conditions JSON
  canRead: boolean("can_read").default(false),
  canWrite: boolean("can_write").default(false),
  canDelete: boolean("can_delete").default(false),
  canCreate: boolean("can_create").default(false),
  canExport: boolean("can_export").default(false),
  contextRequired: permissionContextEnum("context_required").default("all"),
  dataSensitivity: dataSensitivityEnum("data_sensitivity").default("internal"),
  priority: integer("priority").default(100), // Priorité pour résolution conflits
  isActive: boolean("is_active").default(true),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Index composite pour performance
  roleTableIndex: index("idx_permissions_role_table").on(table.role, table.tableName),
  activePermissionsIndex: index("idx_permissions_active").on(table.isActive, table.priority),
}));

// Table des contextes de permissions dynamiques
export const permissionContexts = pgTable("permission_contexts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contextName: varchar("context_name").notNull().unique(),
  description: text("description").notNull(),
  sqlCondition: text("sql_condition").notNull(), // Template SQL avec placeholders
  requiredParameters: text("required_parameters").array().default(sql`'{}'::text[]`),
  appliesTo: text("applies_to").array().default(sql`'{}'::text[]`), // Tables concernées
  isSystemContext: boolean("is_system_context").default(false),
  isActive: boolean("is_active").default(true),
  examples: jsonb("examples"), // Exemples d'utilisation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  contextNameIndex: index("idx_permission_contexts_name").on(table.contextName),
  activeContextsIndex: index("idx_permission_contexts_active").on(table.isActive),
}));

// Table de mappage utilisateur-contexte dynamique
export const userPermissionContexts = pgTable("user_permission_contexts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  contextName: varchar("context_name").notNull(),
  contextValues: jsonb("context_values").notNull(), // Valeurs spécifiques pour ce contexte
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").default(true),
  grantedBy: varchar("granted_by").references(() => users.id),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userContextIndex: index("idx_user_permission_contexts_user").on(table.userId, table.contextName),
  activeUserContextsIndex: index("idx_user_permission_contexts_active").on(table.isActive, table.validUntil),
}));

// Table d'audit des accès aux données sensibles
export const rbacAuditLog = pgTable("rbac_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  userRole: rbacRoleEnum("user_role").notNull(),
  action: rbacActionEnum("action").notNull(),
  tableName: varchar("table_name").notNull(),
  recordId: varchar("record_id"),
  accessedColumns: text("accessed_columns").array(),
  success: boolean("success").notNull(),
  denialReason: text("denial_reason"),
  contextUsed: varchar("context_used"),
  sensitivityLevel: dataSensitivityEnum("sensitivity_level"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id"),
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => ({
  userActionIndex: index("idx_rbac_audit_user_action").on(table.userId, table.action, table.timestamp),
  tableAccessIndex: index("idx_rbac_audit_table").on(table.tableName, table.timestamp),
  sensitivityIndex: index("idx_rbac_audit_sensitivity").on(table.sensitivityLevel, table.timestamp),
}));

// ========================================
// SCHÉMAS ZOD POUR RBAC - CHATBOT IA SAXIUM  
// ========================================

// Schema pour validation des permissions
export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPermissionContextSchema = createInsertSchema(permissionContexts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserPermissionContextSchema = createInsertSchema(userPermissionContexts).omit({
  id: true,
  createdAt: true,
});

export const insertRbacAuditLogSchema = createInsertSchema(rbacAuditLog).omit({
  id: true,
  timestamp: true,
});

// Schema pour requête de permissions utilisateur
export const userPermissionsQuerySchema = z.object({
  userId: z.string(),
  tableName: z.string().optional(),
  action: z.enum(["read", "write", "delete", "create", "export"]).optional(),
  includeInactive: z.boolean().default(false),
});

// Schema pour validation d'accès
export const accessValidationRequestSchema = z.object({
  userId: z.string(),
  role: z.enum(["admin", "chef_projet", "technicien_be", "responsable_be", "chef_travaux", "commercial", "financier", "direction"]),
  tableName: z.string(),
  action: z.enum(["read", "write", "delete", "create", "export"]),
  columns: z.array(z.string()).optional(),
  recordId: z.string().optional(),
  contextValues: z.record(z.any()).optional(),
});

// Schema pour requête d'audit
export const auditQuerySchema = z.object({
  userId: z.string().optional(),
  tableName: z.string().optional(),
  action: z.enum(["read", "write", "delete", "create", "export"]).optional(),
  dateFrom: z.string().transform(str => new Date(str))
    .refine(date => !isNaN(date.getTime()), {
      message: "Date de début invalide"
    }).optional(),
  dateTo: z.string().transform(str => new Date(str))
    .refine(date => !isNaN(date.getTime()), {
      message: "Date de fin invalide"
    }).optional(),
  sensitivityLevel: z.enum(["public", "internal", "confidential", "restricted"]).optional(),
  successOnly: z.boolean().default(false),
  limit: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0),
});

// Schema pour création de contexte dynamique
export const createContextSchema = z.object({
  contextName: z.string().min(3).max(50),
  description: z.string().min(10).max(500),
  sqlCondition: z.string().min(10),
  requiredParameters: z.array(z.string()).default([]),
  appliesTo: z.array(z.string()).default([]),
  examples: z.record(z.any()).optional(),
});

// ========================================
// ENUMS POUR SERVICE IA MULTI-MODÈLES - CHATBOT TEXT-TO-SQL SAXIUM
// ========================================

// Modèles IA disponibles
export const aiModelEnum = pgEnum("ai_model", [
  "claude_sonnet_4", "gpt_5"
]);

// Types de complexité pour routing intelligent
export const queryComplexityEnum = pgEnum("query_complexity", [
  "simple", "complex", "expert"
]);

// Statuts de cache IA
export const cacheStatusEnum = pgEnum("cache_status", [
  "hit", "miss", "expired", "invalid"
]);

// Types de requêtes IA
export const aiQueryTypeEnum = pgEnum("ai_query_type", [
  "text_to_sql", "data_analysis", "business_insight", "validation", "optimization"
]);

// ========================================
// TABLES POUR SERVICE IA MULTI-MODÈLES
// ========================================

// Cache intelligent pour requêtes IA
export const aiQueryCache = pgTable("ai_query_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  queryHash: varchar("query_hash").notNull().unique(), // Hash de la requête + contexte
  query: text("query").notNull(),
  context: text("context").notNull(),
  userRole: varchar("user_role").notNull(),
  modelUsed: aiModelEnum("model_used").notNull(),
  response: text("response").notNull(),
  tokensUsed: integer("tokens_used").default(0),
  responseTimeMs: integer("response_time_ms").default(0),
  cacheHits: integer("cache_hits").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
});

// Métriques d'usage par modèle IA
export const aiModelMetrics = pgTable("ai_model_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  userRole: varchar("user_role").notNull(),
  modelUsed: aiModelEnum("model_used").notNull(),
  queryType: aiQueryTypeEnum("query_type").notNull(),
  complexity: queryComplexityEnum("complexity").notNull(),
  tokensUsed: integer("tokens_used").default(0),
  responseTimeMs: integer("response_time_ms").default(0),
  success: boolean("success").default(true),
  errorType: varchar("error_type"),
  cacheStatus: cacheStatusEnum("cache_status").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  costEstimate: decimal("cost_estimate", { precision: 10, scale: 6 }).default("0"), // En euros
});

// Logs des requêtes IA pour audit et debug
export const aiQueryLogs = pgTable("ai_query_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  sessionId: varchar("session_id"),
  queryHash: varchar("query_hash").notNull(),
  originalQuery: text("original_query").notNull(),
  processedQuery: text("processed_query"),
  modelSelected: aiModelEnum("model_selected").notNull(),
  fallbackUsed: boolean("fallback_used").default(false),
  fallbackReason: varchar("fallback_reason"),
  contextSize: integer("context_size").default(0),
  validationPassed: boolean("validation_passed").default(true),
  sanitizedInput: boolean("sanitized_input").default(false),
  timestamp: timestamp("timestamp").defaultNow(),
  ipAddress: varchar("ip_address"),
});

// Configuration des seuils et règles de routing IA
export const aiRoutingRules = pgTable("ai_routing_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleName: varchar("rule_name").notNull(),
  description: text("description"),
  priority: integer("priority").default(100),
  conditions: jsonb("conditions").notNull(), // Conditions pour appliquer la règle
  targetModel: aiModelEnum("target_model").notNull(),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ========================================
// INDEXES POUR PERFORMANCE IA
// ========================================

// Note: Les index seront créés directement dans les tables pour éviter les erreurs de référence

// ========================================
// SCHEMAS ZOD POUR VALIDATION IA
// ========================================

export const insertAiQueryCacheSchema = createInsertSchema(aiQueryCache).omit({
  id: true,
  createdAt: true,
  lastAccessedAt: true,
});

export const insertAiModelMetricsSchema = createInsertSchema(aiModelMetrics).omit({
  id: true,
  timestamp: true,
});

export const insertAiQueryLogsSchema = createInsertSchema(aiQueryLogs).omit({
  id: true,
  timestamp: true,
});

export const insertAiRoutingRulesSchema = createInsertSchema(aiRoutingRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema pour requête IA unifiée
export const aiQueryRequestSchema = z.object({
  query: z.string().min(1).max(8000),
  context: z.string().max(32000).optional().default(""),
  userRole: z.string().min(1),
  complexity: queryComplexityEnum.enumValues[0] ? z.enum(queryComplexityEnum.enumValues as [string, ...string[]]) : z.enum(["simple", "complex", "expert"]),
  forceModel: aiModelEnum.enumValues[0] ? z.enum(aiModelEnum.enumValues as [string, ...string[]]) : z.enum(["claude_sonnet_4", "gpt_5"]),
  queryType: aiQueryTypeEnum.enumValues[0] ? z.enum(aiQueryTypeEnum.enumValues as [string, ...string[]]) : z.enum(["text_to_sql", "data_analysis", "business_insight", "validation", "optimization"]),
  useCache: z.boolean().default(true),
  maxTokens: z.number().min(100).max(8192).default(2048),
}).partial({
  forceModel: true,
  complexity: true,
  queryType: true,  // Rendre queryType optionnel
});

// Schema pour configuration de routing
export const aiRoutingConfigSchema = z.object({
  ruleName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  priority: z.number().min(1).max(1000).default(100),
  conditions: z.object({
    queryLength: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
    }).optional(),
    complexity: z.array(z.enum(["simple", "complex", "expert"])).optional(),
    userRoles: z.array(z.string()).optional(),
    queryTypes: z.array(z.enum(["text_to_sql", "data_analysis", "business_insight", "validation", "optimization"])).optional(),
    keywordMatches: z.array(z.string()).optional(),
  }),
  targetModel: z.enum(["claude_sonnet_4", "gpt_5"]),
});

// ========================================
// TYPES TYPESCRIPT POUR RBAC - CHATBOT IA SAXIUM
// ========================================

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

export type PermissionContext = typeof permissionContexts.$inferSelect;
export type InsertPermissionContext = z.infer<typeof insertPermissionContextSchema>;

export type UserPermissionContext = typeof userPermissionContexts.$inferSelect;
export type InsertUserPermissionContext = z.infer<typeof insertUserPermissionContextSchema>;

export type RbacAuditLog = typeof rbacAuditLog.$inferSelect;
export type InsertRbacAuditLog = z.infer<typeof insertRbacAuditLogSchema>;

export type UserPermissionsQuery = z.infer<typeof userPermissionsQuerySchema>;
export type AccessValidationRequest = z.infer<typeof accessValidationRequestSchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;
export type CreateContext = z.infer<typeof createContextSchema>;

// Types pour réponses API
export type PermissionCheckResult = {
  allowed: boolean;
  denialReason?: string;
  allowedColumns?: string[];
  deniedColumns?: string[];
  conditions?: any;
  contextRequired?: string;
  auditRequired?: boolean;
};

export type UserPermissionsResponse = {
  userId: string;
  role: string;
  permissions: {
    [tableName: string]: {
      read: PermissionCheckResult;
      write: PermissionCheckResult;
      delete: PermissionCheckResult;
      create: PermissionCheckResult;
      export: PermissionCheckResult;
    };
  };
  contexts: UserPermissionContext[];
  lastUpdated: Date;
};

// ========================================
// TYPES TYPESCRIPT POUR SERVICE IA MULTI-MODÈLES
// ========================================

export type AiQueryCache = typeof aiQueryCache.$inferSelect;
export type InsertAiQueryCache = z.infer<typeof insertAiQueryCacheSchema>;

export type AiModelMetrics = typeof aiModelMetrics.$inferSelect;
export type InsertAiModelMetrics = z.infer<typeof insertAiModelMetricsSchema>;

export type AiQueryLogs = typeof aiQueryLogs.$inferSelect;
export type InsertAiQueryLogs = z.infer<typeof insertAiQueryLogsSchema>;

export type AiRoutingRules = typeof aiRoutingRules.$inferSelect;
export type InsertAiRoutingRules = z.infer<typeof insertAiRoutingRulesSchema>;

export type AiQueryRequest = z.infer<typeof aiQueryRequestSchema>;
export type AiRoutingConfig = z.infer<typeof aiRoutingConfigSchema>;

// Types pour réponses du service IA
export interface AiQueryResponse {
  success: boolean;
  data?: {
    query: string;
    sqlGenerated?: string;
    explanation?: string;
    modelUsed: "claude_sonnet_4" | "gpt_5";
    tokensUsed: number;
    responseTimeMs: number;
    fromCache: boolean;
    confidence?: number;
    warnings?: string[];
  };
  error?: {
    type: "validation_error" | "model_error" | "rate_limit" | "timeout" | "unknown";
    message: string;
    details?: any;
    fallbackAttempted: boolean;
  };
}

// Types pour métriques et analytics IA
export interface AiUsageStats {
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  totalTokensUsed: number;
  estimatedCost: number;
  cacheHitRate: number;
  modelDistribution: {
    claude_sonnet_4: number;
    gpt_5: number;
  };
  complexityDistribution: {
    simple: number;
    complex: number;
    expert: number;
  };
}

// Types pour configuration et routing
export interface ModelSelectionResult {
  selectedModel: "claude_sonnet_4" | "gpt_5";
  reason: string;
  confidence: number;
  appliedRules: string[];
  fallbackAvailable: boolean;
}

// ========================================
// SCHEMAS ZOD POUR MOTEUR SQL SÉCURISÉ - CHATBOT SAXIUM
// ========================================

// Schéma pour requête SQL en langage naturel
export const sqlQueryRequestSchema = z.object({
  naturalLanguageQuery: z.string()
    .min(1, "La requête ne peut pas être vide")
    .max(5000, "La requête ne peut pas dépasser 5000 caractères"),
  context: z.string().max(10000).optional(),
  dryRun: z.boolean().default(false).optional(),
  maxResults: z.number().min(1).max(10000).optional(),
  timeoutMs: z.number().min(1000).max(120000).optional() // 1s à 2 minutes
});

// Schéma pour validation SQL directe
export const sqlValidationRequestSchema = z.object({
  sql: z.string()
    .min(1, "Le SQL ne peut pas être vide")
    .max(50000, "Le SQL ne peut pas dépasser 50000 caractères"),
  parameters: z.array(z.any()).optional()
});

// Types pour les réponses du moteur SQL
export interface SQLQueryResult {
  success: boolean;
  sql?: string;
  parameters?: any[];
  results?: any[];
  executionTime?: number;
  rbacFiltersApplied?: string[];
  confidence?: number;
  warnings?: string[];
  error?: {
    type: "validation" | "security" | "rbac" | "execution" | "parsing" | "timeout";
    message: string;
    details?: any;
  };
  metadata?: {
    tablesAccessed: string[];
    columnsAccessed: string[];
    securityChecks: string[];
    aiModelUsed: string;
    cacheHit: boolean;
  };
}

export interface SQLValidationResult {
  isValid: boolean;
  isSecure: boolean;
  allowedTables: string[];
  deniedTables: string[];
  allowedColumns: string[];
  deniedColumns: string[];
  securityViolations: string[];
  rbacViolations: string[];
  suggestions?: string[];
}

// Types pour requêtes
export type SQLQueryRequest = z.infer<typeof sqlQueryRequestSchema> & {
  userId: string;
  userRole: string;
};

export type SQLValidationRequest = z.infer<typeof sqlValidationRequestSchema> & {
  userId: string;
  userRole: string;
};

// ========================================
// TYPES POUR BUSINESS CONTEXT SERVICE - CONSTRUCTEUR CONTEXTE MÉTIER INTELLIGENT SAXIUM
// ========================================

// Types de base pour la base de connaissances menuiserie
export interface MenuiserieMaterial {
  name: string;
  aliases: string[];
  properties: {
    thermal: number; // Coefficient thermique
    durability: number; // Durabilité (1-10)
    cost_category: "economique" | "standard" | "premium";
    installation_complexity: "simple" | "moyenne" | "complexe";
  };
  suppliers: string[];
  seasonal_constraints?: string[];
  technical_specs: Record<string, any>;
}

export interface MenuiserieProcess {
  phase: "passation" | "etude" | "visa_architecte" | "planification" | "approvisionnement" | "chantier" | "sav";
  name: string;
  description: string;
  typical_duration_days: {
    min: number;
    max: number;
    average: number;
  };
  critical_checkpoints: string[];
  required_roles: string[];
  dependencies: string[];
  seasonal_factors?: Record<string, number>; // Facteurs saisonniers (multiplicateurs)
}

export interface MenuiserieNorm {
  name: string;
  code: string;
  description: string;
  applicable_materials: string[];
  applicable_types: string[];
  mandatory: boolean;
  check_points: string[];
  compliance_requirements: string[];
}

export interface MenuiserieDomain {
  materials: MenuiserieMaterial[];
  processes: MenuiserieProcess[];
  norms: MenuiserieNorm[];
  seasonal_calendar: {
    btp_holidays: { start: string; end: string; impact: string }[];
    weather_constraints: { months: number[]; affected_phases: string[]; impact_factor: number }[];
    peak_seasons: { months: number[]; demand_factor: number; lead_time_factor: number }[];
  };
  terminology: {
    technical_terms: Record<string, string[]>; // terme -> synonymes
    sql_to_business: Record<string, string>; // colonne SQL -> terme métier
    business_to_sql: Record<string, string>; // terme métier -> colonne SQL
  };
}

// Types pour les schémas de base de données enrichis
export interface SchemaWithDescriptions {
  tableName: string;
  businessName: string;
  description: string;
  columns: {
    name: string;
    businessName: string;
    type: string;
    description: string;
    isSensitive: boolean;
    businessExamples?: string[];
  }[];
  relationships: {
    table: string;
    type: "one_to_many" | "many_to_one" | "many_to_many";
    description: string;
  }[];
  common_queries: string[];
  access_patterns: {
    role: string;
    typical_queries: string[];
    restrictions: string[];
  }[];
}

// Types pour les exemples de requêtes métier
export interface QueryExample {
  id: string;
  category: "planning" | "finances" | "ressources" | "qualite" | "performance" | "alertes";
  user_query: string;
  sql_example: string;
  explanation: string;
  applicable_roles: string[];
  complexity: "simple" | "complex" | "expert";
  business_value: string;
  typical_results: string;
  variations?: string[];
}

// Types pour le contexte RBAC spécialisé
export interface RBACContext {
  user_role: string;
  accessible_tables: string[];
  restricted_columns: string[];
  row_level_filters: Record<string, string>; // table -> condition SQL
  data_scope: {
    projects: "own" | "team" | "all";
    offers: "own" | "team" | "all";
    financial_data: boolean;
    sensitive_data: boolean;
  };
  context_variables: Record<string, any>; // Variables pour filtres dynamiques
}

// Interface principale du contexte métier
export interface BusinessContext {
  databaseSchemas: SchemaWithDescriptions[];
  businessExamples: QueryExample[];
  domainKnowledge: MenuiserieDomain;
  roleSpecificConstraints: RBACContext;
  suggestedQueries: string[];
  temporal_context: {
    current_season: string;
    active_constraints: string[];
    upcoming_deadlines: { type: string; date: Date; impact: string }[];
    peak_periods: { start: Date; end: Date; factor: number }[];
  };
  cache_metadata: {
    generated_at: Date;
    expires_at: Date;
    cache_key: string;
    version: string;
  };
}

// Schémas Zod pour validation

export const businessContextRequestSchema = z.object({
  user_role: z.string(),
  query_hint: z.string().optional(),
  complexity_preference: z.enum(["simple", "complex", "expert"]).optional(),
  focus_areas: z.array(z.enum(["planning", "finances", "ressources", "qualite", "performance", "alertes"])).optional(),
  include_temporal: z.boolean().default(true),
  cache_duration_minutes: z.number().min(1).max(120).default(60),
  personalization_level: z.enum(["basic", "advanced", "expert"]).default("basic")
});

export const contextEnrichmentRequestSchema = z.object({
  original_query: z.string(),
  user_role: z.string(),
  current_context: z.string().optional(),
  enhancement_mode: z.enum(["schema_only", "examples_only", "full", "adaptive"]).default("adaptive"),
  max_examples: z.number().min(1).max(20).default(5),
  include_explanations: z.boolean().default(true),
  domain_focus: z.array(z.string()).optional()
});

export const adaptiveLearningUpdateSchema = z.object({
  user_role: z.string(),
  query_pattern: z.string(),
  success_rating: z.number().min(0).max(5),
  execution_time_ms: z.number(),
  result_relevance: z.number().min(0).max(1),
  feedback_notes: z.string().optional(),
  improvement_suggestions: z.array(z.string()).optional()
});

// Types TypeScript pour les requêtes/réponses

export type BusinessContextRequest = z.infer<typeof businessContextRequestSchema> & {
  userId: string;
  sessionId?: string;
};

export type ContextEnrichmentRequest = z.infer<typeof contextEnrichmentRequestSchema> & {
  userId: string;
};

export type AdaptiveLearningUpdate = z.infer<typeof adaptiveLearningUpdateSchema> & {
  userId: string;
  timestamp: Date;
};

// Types pour les réponses du service
export interface BusinessContextResponse {
  success: boolean;
  context?: BusinessContext;
  enriched_query?: string;
  performance_metrics: {
    generation_time_ms: number;
    cache_hit: boolean;
    schemas_loaded: number;
    examples_included: number;
  };
  error?: {
    type: "validation" | "rbac" | "cache" | "domain_knowledge" | "unknown";
    message: string;
    details?: any;
  };
}

export interface ContextEnrichmentResponse {
  success: boolean;
  enriched_context?: string;
  suggested_refinements?: string[];
  confidence_score?: number;
  performance_metrics: {
    enrichment_time_ms: number;
    tokens_added: number;
    complexity_increased: boolean;
  };
  error?: {
    type: "validation" | "enrichment" | "domain_matching" | "unknown";
    message: string;
    details?: any;
  };
}

export interface AdaptiveLearningResponse {
  success: boolean;
  learning_applied: boolean;
  updated_patterns: string[];
  optimization_suggestions?: string[];
  error?: {
    type: "validation" | "learning" | "persistence" | "unknown";
    message: string;
    details?: any;
  };
}

// Types pour les métriques et analytics du service contexte métier
export interface BusinessContextMetrics {
  total_requests: number;
  cache_hit_rate: number;
  avg_generation_time_ms: number;
  role_distribution: Record<string, number>;
  most_requested_domains: Record<string, number>;
  context_effectiveness: {
    avg_confidence_score: number;
    user_satisfaction_rate: number;
    query_success_rate: number;
  };
  adaptive_learning_stats: {
    patterns_learned: number;
    improvements_applied: number;
    personalization_level: Record<string, number>;
  };
}

// ========================================
// TABLES POUR STOCKAGE ET CACHE DU BUSINESS CONTEXT SERVICE
// ========================================

// Table pour cache du contexte métier
export const businessContextCache = pgTable("business_context_cache", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  userRole: varchar("user_role", { length: 50 }).notNull(),
  contextKey: varchar("context_key", { length: 500 }).notNull(),
  contextData: jsonb("context_data").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  accessCount: integer("access_count").default(0).notNull(),
  lastAccessed: timestamp("last_accessed").defaultNow().notNull()
});

// Table pour les patterns d'apprentissage adaptatif
export const adaptiveLearningPatterns = pgTable("adaptive_learning_patterns", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userRole: varchar("user_role", { length: 50 }).notNull(),
  queryPattern: text("query_pattern").notNull(),
  successRate: decimal("success_rate", { precision: 5, scale: 2 }).notNull(),
  avgExecutionTime: integer("avg_execution_time_ms").notNull(),
  usageCount: integer("usage_count").default(1).notNull(),
  lastUsed: timestamp("last_used").defaultNow().notNull(),
  optimizationSuggestions: jsonb("optimization_suggestions"),
  contextEnhancements: jsonb("context_enhancements"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Table pour métriques du service contexte métier
export const businessContextMetricsLog = pgTable("business_context_metrics_log", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  userRole: varchar("user_role", { length: 50 }).notNull(),
  requestType: varchar("request_type", { length: 100 }).notNull(),
  generationTimeMs: integer("generation_time_ms").notNull(),
  cacheHit: boolean("cache_hit").notNull(),
  schemasLoaded: integer("schemas_loaded").notNull(),
  examplesIncluded: integer("examples_included").notNull(),
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }),
  contextSize: integer("context_size_chars").notNull(),
  domainFocus: jsonb("domain_focus"),
  queryComplexity: varchar("query_complexity", { length: 20 }),
  timestamp: timestamp("timestamp").defaultNow().notNull()
});

// Schémas Zod pour les tables
export const insertBusinessContextCacheSchema = createInsertSchema(businessContextCache);
export const insertAdaptiveLearningPatternsSchema = createInsertSchema(adaptiveLearningPatterns);
export const insertBusinessContextMetricsLogSchema = createInsertSchema(businessContextMetricsLog);

// Types TypeScript pour les tables
export type BusinessContextCache = typeof businessContextCache.$inferSelect;
export type InsertBusinessContextCache = z.infer<typeof insertBusinessContextCacheSchema>;

export type AdaptiveLearningPatterns = typeof adaptiveLearningPatterns.$inferSelect;
export type InsertAdaptiveLearningPatterns = z.infer<typeof insertAdaptiveLearningPatternsSchema>;

export type BusinessContextMetricsLog = typeof businessContextMetricsLog.$inferSelect;
export type InsertBusinessContextMetricsLog = z.infer<typeof insertBusinessContextMetricsLogSchema>;

// ========================================
// SCHEMAS ET TYPES POUR ENDPOINTS CHATBOT ORCHESTRÉS - SAXIUM
// ========================================

// ========================================
// TABLES POUR HISTORIQUE ET MÉTRIQUES CHATBOT
// ========================================

// Table pour l'historique des conversations chatbot
export const chatbotConversations = pgTable("chatbot_conversations", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  userRole: varchar("user_role", { length: 50 }).notNull(),
  sessionId: varchar("session_id", { length: 255 }),
  query: text("query").notNull(),
  response: jsonb("response").notNull(),
  sql: text("sql"),
  results: jsonb("results"),
  executionTimeMs: integer("execution_time_ms").notNull(),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  modelUsed: varchar("model_used", { length: 50 }),
  cacheHit: boolean("cache_hit").default(false),
  errorOccurred: boolean("error_occurred").default(false),
  errorType: varchar("error_type", { length: 100 }),
  dryRun: boolean("dry_run").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Table pour le feedback utilisateur sur les réponses chatbot
export const chatbotFeedback = pgTable("chatbot_feedback", {
  id: varchar("id", { length: 255 }).primaryKey(),
  conversationId: varchar("conversation_id", { length: 255 }).notNull().references(() => chatbotConversations.id),
  userId: varchar("user_id", { length: 255 }).notNull(),
  rating: integer("rating").notNull(), // 1-5 ou simple 1/-1 pour like/dislike
  feedbackType: varchar("feedback_type", { length: 50 }).notNull(), // "thumbs_up", "thumbs_down", "detailed"
  feedbackText: text("feedback_text"),
  improvementSuggestions: jsonb("improvement_suggestions"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Table pour les suggestions intelligentes par rôle
export const chatbotSuggestions = pgTable("chatbot_suggestions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userRole: varchar("user_role", { length: 50 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // "planning", "finances", "ressources", etc.
  suggestionText: text("suggestion_text").notNull(),
  priority: integer("priority").default(0).notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  successRate: decimal("success_rate", { precision: 3, scale: 2 }).default("0.00"),
  contextConditions: jsonb("context_conditions"), // Conditions pour afficher la suggestion
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Table pour les métriques d'usage du chatbot
export const chatbotUsageMetrics = pgTable("chatbot_usage_metrics", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  userRole: varchar("user_role", { length: 50 }).notNull(),
  endpoint: varchar("endpoint", { length: 100 }).notNull(), // "query", "suggestions", "validate", etc.
  date: timestamp("date").defaultNow().notNull(),
  requestCount: integer("request_count").default(1).notNull(),
  successCount: integer("success_count").default(0).notNull(),
  errorCount: integer("error_count").default(0).notNull(),
  avgResponseTimeMs: integer("avg_response_time_ms").notNull(),
  totalTokensUsed: integer("total_tokens_used").default(0).notNull(),
  estimatedCost: decimal("estimated_cost", { precision: 8, scale: 4 }).default("0.0000").notNull()
});

// ========================================
// NOUVELLES TABLES PHASE SAXIUM - EXTENSIONS MONDAY.COM
// ========================================

// Table des contacts - Nécessaire pour les tables de liaison
export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  company: varchar("company"),
  poste: posteTypeEnum("poste"),
  address: text("address"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => {
  return {
    emailIdx: index("contacts_email_idx").on(table.email),
    companyIdx: index("contacts_company_idx").on(table.company),
  };
});

// Table temps_pose (support planning automatique)
export const tempsPose = pgTable("temps_pose", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  work_scope: aoCategoryEnum("work_scope").notNull(),
  component_type: menuiserieTypeEnum("component_type").notNull(),
  unit: varchar("unit").notNull(), // "m2", "ml", "unité"
  time_per_unit_min: integer("time_per_unit_min").notNull(),
  calculation_method: calculationMethodEnum("calculation_method").notNull(),
  conditions: jsonb("conditions").default(sql`'{}'::jsonb`),
  notes: text("notes"),
  is_active: boolean("is_active").default(true),
  monday_item_id: varchar("monday_item_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => {
  return {
    workScopeComponentIdx: index("temps_pose_work_scope_component_idx").on(table.work_scope, table.component_type),
    isActiveIdx: index("temps_pose_is_active_idx").on(table.is_active),
    mondayItemIdx: index("temps_pose_monday_item_idx").on(table.monday_item_id),
  };
});

// Table metrics_business (tableau de bord)
export const metricsBusiness = pgTable("metrics_business", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metric_type: metricTypeEnum("metric_type").notNull(),
  entity_type: alertEntityTypeEnum("entity_type").notNull(),
  entity_id: varchar("entity_id").notNull(),
  period_start: timestamp("period_start").notNull(),
  period_end: timestamp("period_end"),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  severity: alertSeverityBusinessEnum("severity"),
  benchmark_type: benchmarkTypeEnum("benchmark_type"),
  calculation_method: calculationMethodEnum("calculation_method").notNull(),
  context: jsonb("context").default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => {
  return {
    metricTypeEntityIdx: index("metrics_business_metric_type_entity_idx").on(table.metric_type, table.entity_type),
    entityIdIdx: index("metrics_business_entity_id_idx").on(table.entity_id),
    periodIdx: index("metrics_business_period_idx").on(table.period_start, table.period_end),
    severityIdx: index("metrics_business_severity_idx").on(table.severity),
  };
});

// ========================================
// TABLES DE LIAISON PHASE SAXIUM - EXTENSIONS MONDAY.COM
// ========================================

// Table de liaison AO-Contacts
export const aoContacts = pgTable("ao_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ao_id: varchar("ao_id").notNull().references(() => aos.id, { onDelete: "cascade" }),
  contact_id: varchar("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  link_type: contactLinkTypeEnum("link_type").notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  uniqueAoContact: uniqueIndex("unique_ao_contact").on(table.ao_id, table.contact_id, table.link_type),
  aoIdIdx: index("ao_contacts_ao_id_idx").on(table.ao_id),
  contactIdIdx: index("ao_contacts_contact_id_idx").on(table.contact_id),
  linkTypeIdx: index("ao_contacts_link_type_idx").on(table.link_type),
}));

// Table de liaison Project-Contacts
export const projectContacts = pgTable("project_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  project_id: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  contact_id: varchar("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  link_type: contactLinkTypeEnum("link_type").notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  uniqueProjectContact: uniqueIndex("unique_project_contact").on(table.project_id, table.contact_id, table.link_type),
  projectIdIdx: index("project_contacts_project_id_idx").on(table.project_id),
  contactIdIdx: index("project_contacts_contact_id_idx").on(table.contact_id),
  linkTypeIdx: index("project_contacts_link_type_idx").on(table.link_type),
}));

// Table de liaison Supplier-Spécialisations
export const supplierSpecializations = pgTable("supplier_specializations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supplier_id: varchar("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  component_type: menuiserieTypeEnum("component_type").notNull(),
  capacity_per_week: integer("capacity_per_week"),
  lead_time_days: integer("lead_time_days"),
  coverage_departements: departementEnum("coverage_departements").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  uniqueSupplierComponent: uniqueIndex("unique_supplier_component").on(table.supplier_id, table.component_type),
  supplierIdIdx: index("supplier_specializations_supplier_id_idx").on(table.supplier_id),
  componentTypeIdx: index("supplier_specializations_component_type_idx").on(table.component_type),
}));

// ========================================
// TABLES PHASE 4 - GESTION DES RÉSERVES ET SAV
// ========================================

// Table des réserves par projet - Gestion structurée des défauts/non-conformités
export const projectReserves = pgTable("project_reserves", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  
  // Identification et numérotation unique
  reserveNumber: varchar("reserve_number").notNull().unique(), // Format: RES-2024-001
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  
  // Catégorisation et criticité
  category: reserveCategoryEnum("category").notNull(), // structural, finishing, equipment, safety, compliance, aesthetic, functional
  severity: reserveSeverityEnum("severity").notNull(), // critical, major, minor, cosmetic  
  status: reserveStatusEnum("status").default("detected"), // detected, acknowledged, in_progress, resolved, verified, closed
  impact: impactLevelEnum("impact").default("minor"), // blocking, major, minor, negligible
  
  // Dates et échéances
  detectedDate: timestamp("detected_date").notNull(),
  expectedResolutionDate: timestamp("expected_resolution_date").notNull(),
  actualResolutionDate: timestamp("actual_resolution_date"), // nullable
  
  // Responsabilités et validation
  detectedBy: varchar("detected_by").notNull(), // Référence utilisateur qui a détecté
  assignedTo: varchar("assigned_to").notNull(), // Responsable de la résolution
  validatedBy: varchar("validated_by"), // Approbateur (nullable)
  
  // Coûts et localisation  
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }).default("0.00"),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }), // nullable
  location: varchar("location"), // Localisation précise sur chantier
  
  // Documentation et photos
  photos: jsonb("photos").$type<string[]>().default(sql`'[]'::jsonb`), // URLs des photos
  
  // Métadonnées
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    projectReservesIdx: index("project_reserves_project_id_idx").on(table.projectId),
    reserveNumberIdx: uniqueIndex("project_reserves_number_idx").on(table.reserveNumber),
    categoryStatusIdx: index("project_reserves_category_status_idx").on(table.category, table.status),
    severityIdx: index("project_reserves_severity_idx").on(table.severity),
    detectedDateIdx: index("project_reserves_detected_date_idx").on(table.detectedDate),
    assignedToIdx: index("project_reserves_assigned_to_idx").on(table.assignedTo),
    impactIdx: index("project_reserves_impact_idx").on(table.impact),
  };
});

// Table des interventions SAV - Gestion complète du service après-vente
export const savInterventions = pgTable("sav_interventions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }), // Projet d'origine
  reserveId: varchar("reserve_id").references(() => projectReserves.id, { onDelete: "set null" }), // Lié à une réserve (optionnel)
  
  // Identification et numérotation unique
  interventionNumber: varchar("intervention_number").notNull().unique(), // Format: SAV-2024-001
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  
  // Type et priorité
  interventionType: savInterventionTypeEnum("intervention_type").notNull(), // maintenance, repair, warranty, upgrade, inspection, emergency
  priority: priorityLevelEnum("priority").default("normale"), // Réutilise enum existant
  status: savStatusEnum("status").default("requested"), // requested, scheduled, in_progress, completed, cancelled, follow_up_required
  
  // Dates et planning
  requestDate: timestamp("request_date").notNull(),
  plannedDate: timestamp("planned_date").notNull(),
  completedDate: timestamp("completed_date"), // nullable
  
  // Responsabilités
  requestedBy: varchar("requested_by").notNull(), // Client/utilisateur demandeur
  assignedTechnician: varchar("assigned_technician").notNull(), // Technicien assigné
  
  // Durées et matériaux
  estimatedDuration: integer("estimated_duration").notNull(), // Heures estimées
  actualDuration: integer("actual_duration"), // Heures réelles (nullable)
  materials: jsonb("materials").$type<Record<string, any>[]>().default(sql`'[]'::jsonb`), // Matériaux utilisés
  
  // Coût et satisfaction
  cost: decimal("cost", { precision: 10, scale: 2 }).default("0.00"),
  customerSatisfaction: integer("customer_satisfaction"), // 1-5, nullable
  followUpRequired: boolean("follow_up_required").default(false),
  
  // Notes et documentation
  notes: text("notes"),
  
  // Métadonnées
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    projectInterventionsIdx: index("sav_interventions_project_id_idx").on(table.projectId),
    reserveInterventionsIdx: index("sav_interventions_reserve_id_idx").on(table.reserveId),
    interventionNumberIdx: uniqueIndex("sav_interventions_number_idx").on(table.interventionNumber),
    typeStatusIdx: index("sav_interventions_type_status_idx").on(table.interventionType, table.status),
    priorityIdx: index("sav_interventions_priority_idx").on(table.priority),
    plannedDateIdx: index("sav_interventions_planned_date_idx").on(table.plannedDate),
    assignedTechnicianIdx: index("sav_interventions_technician_idx").on(table.assignedTechnician),
    requestDateIdx: index("sav_interventions_request_date_idx").on(table.requestDate),
  };
});

// Table des réclamations garantie - Suivi des demandes d'indemnisation
export const savWarrantyClaims = pgTable("sav_warranty_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  interventionId: varchar("intervention_id").notNull().references(() => savInterventions.id, { onDelete: "cascade" }),
  
  // Identification unique de la réclamation
  claimNumber: varchar("claim_number").notNull().unique(), // Format: GARAN-2024-001
  warrantyType: warrantyTypeEnum("warranty_type").notNull(), // decennial, perfect_completion, good_functioning, materials, workmanship
  
  // Dates et description
  claimDate: timestamp("claim_date").notNull(),
  claimDescription: text("claim_description").notNull(),
  
  // Statut et résolution
  status: warrantyStatusEnum("status").default("submitted"), // submitted, under_review, approved, rejected, paid
  resolution: text("resolution"), // nullable
  
  // Montants et traitement
  approvedAmount: decimal("approved_amount", { precision: 10, scale: 2 }).default("0.00"),
  processedBy: varchar("processed_by"), // Responsable traitement (nullable)
  processedDate: timestamp("processed_date"), // nullable
  
  // Métadonnées
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    interventionClaimsIdx: index("sav_warranty_claims_intervention_id_idx").on(table.interventionId),
    claimNumberIdx: uniqueIndex("sav_warranty_claims_number_idx").on(table.claimNumber),
    warrantyTypeIdx: index("sav_warranty_claims_warranty_type_idx").on(table.warrantyType),
    statusIdx: index("sav_warranty_claims_status_idx").on(table.status),
    claimDateIdx: index("sav_warranty_claims_claim_date_idx").on(table.claimDate),
    processedByIdx: index("sav_warranty_claims_processed_by_idx").on(table.processedBy),
  };
});

// ========================================
// SCHÉMAS ZOD PHASE 4 - GESTION DES RÉSERVES ET SAV
// ========================================

// Schéma d'insertion pour les réserves de projet
export const insertProjectReserveSchema = createInsertSchema(projectReserves).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Transform string dates from frontend to Date objects
  detectedDate: z.string().transform((val) => new Date(val)),
  expectedResolutionDate: z.string().transform((val) => new Date(val)),
  actualResolutionDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});

// Schéma d'insertion pour les interventions SAV
export const insertSavInterventionSchema = createInsertSchema(savInterventions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Transform string dates from frontend to Date objects
  requestDate: z.string().transform((val) => new Date(val)),
  plannedDate: z.string().transform((val) => new Date(val)),
  completedDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  // Validation customer satisfaction range
  customerSatisfaction: z.number().min(1).max(5).optional(),
});

// Schéma d'insertion pour les réclamations garantie
export const insertSavWarrantyClaimSchema = createInsertSchema(savWarrantyClaims).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Transform string dates from frontend to Date objects
  claimDate: z.string().transform((val) => new Date(val)),
  processedDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});

// ========================================
// TYPES TYPESCRIPT PHASE 4 - GESTION DES RÉSERVES ET SAV
// ========================================

// Types pour les réserves de projet
export type ProjectReserve = typeof projectReserves.$inferSelect;
export type InsertProjectReserve = z.infer<typeof insertProjectReserveSchema>;

// Types pour les interventions SAV
export type SavIntervention = typeof savInterventions.$inferSelect;
export type InsertSavIntervention = z.infer<typeof insertSavInterventionSchema>;

// Types pour les réclamations garantie
export type SavWarrantyClaim = typeof savWarrantyClaims.$inferSelect;
export type InsertSavWarrantyClaim = z.infer<typeof insertSavWarrantyClaimSchema>;

// ========================================
// SCHEMAS ZOD POUR VALIDATION DES ENDPOINTS CHATBOT
// ========================================

// Schéma pour POST /api/chatbot/query
export const chatbotQueryRequestSchema = z.object({
  query: z.string()
    .min(1, "La requête ne peut pas être vide")
    .max(5000, "La requête ne peut pas dépasser 5000 caractères"),
  context: z.string().max(10000).optional(),
  options: z.object({
    dryRun: z.boolean().default(false),
    explainQuery: z.boolean().default(true),
    includeDebugInfo: z.boolean().default(false),
    maxResults: z.number().min(1).max(10000).optional(),
    timeoutMs: z.number().min(1000).max(120000).optional()
  }).optional()
});

// Schéma pour GET /api/chatbot/suggestions
export const chatbotSuggestionsRequestSchema = z.object({
  userRole: z.string().optional(), // Optionnel car peut être extrait de la session
  recentQueries: z.array(z.string()).max(10).optional(),
  currentContext: z.string().max(1000).optional(),
  category: z.enum(["planning", "finances", "ressources", "qualite", "performance", "alertes", "all"]).default("all"),
  limit: z.number().min(1).max(50).default(10)
});

// Schéma pour POST /api/chatbot/validate
export const chatbotValidateRequestSchema = z.object({
  query: z.string()
    .min(1, "La requête ne peut pas être vide")
    .max(5000, "La requête ne peut pas dépasser 5000 caractères"),
  context: z.string().max(10000).optional(),
  checkSecurity: z.boolean().default(true),
  checkRBAC: z.boolean().default(true),
  generateSQL: z.boolean().default(true)
});

// Schéma pour GET /api/chatbot/history  
export const chatbotHistoryRequestSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sessionId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  includeErrors: z.boolean().default(false),
  includeSQL: z.boolean().default(false)
});

// Schéma pour POST /api/chatbot/feedback
export const chatbotFeedbackRequestSchema = z.object({
  conversationId: z.string().min(1, "ID de conversation requis"),
  rating: z.number().min(1).max(5), // 1-5 rating ou 1/-1 pour like/dislike
  feedbackType: z.enum(["thumbs_up", "thumbs_down", "detailed", "bug_report"]),
  feedbackText: z.string().max(2000).optional(),
  improvementSuggestions: z.array(z.string()).max(10).optional(),
  categories: z.array(z.enum(["accuracy", "speed", "relevance", "usability", "completeness"])).optional()
});

// Schéma pour GET /api/chatbot/stats (admin uniquement)
export const chatbotStatsRequestSchema = z.object({
  period: z.enum(["1h", "24h", "7d", "30d", "90d", "1y"]).default("24h"),
  groupBy: z.enum(["hour", "day", "week", "month", "user", "role"]).default("day"),
  includeDetails: z.boolean().default(false),
  userRole: z.string().optional(),
  breakdown: z.array(z.enum(["success_rate", "response_time", "token_usage", "cost", "errors", "feedback"])).optional()
});

// ========================================
// TYPES TYPESCRIPT POUR LES ENDPOINTS CHATBOT
// ========================================

// Types pour requêtes
export type ChatbotQueryRequest = z.infer<typeof chatbotQueryRequestSchema> & {
  userId: string;
  userRole: string;
  sessionId?: string;
};

export type ChatbotSuggestionsRequest = z.infer<typeof chatbotSuggestionsRequestSchema> & {
  userId: string;
  userRole: string;
};

export type ChatbotValidateRequest = z.infer<typeof chatbotValidateRequestSchema> & {
  userId: string;
  userRole: string;
};

export type ChatbotHistoryRequest = z.infer<typeof chatbotHistoryRequestSchema> & {
  userId: string;
};

export type ChatbotFeedbackRequest = z.infer<typeof chatbotFeedbackRequestSchema> & {
  userId: string;
};

export type ChatbotStatsRequest = z.infer<typeof chatbotStatsRequestSchema>;

// ========================================
// INTERFACES POUR LES RÉPONSES CHATBOT
// ========================================

// Réponse principale du chatbot 
export interface ChatbotQueryResponse {
  success: boolean;
  conversation_id: string;
  query: string;
  explanation: string;
  sql?: string; // Masqué selon les permissions
  results: any[];
  suggestions: string[];
  confidence: number;
  execution_time_ms: number;
  model_used?: string;
  cache_hit: boolean;
  debug_info?: {
    rbac_filters_applied: string[];
    business_context_loaded: boolean;
    ai_routing_decision: string;
    security_checks_passed: string[];
    performance_metrics: {
      context_generation_ms: number;
      sql_generation_ms: number;
      query_execution_ms: number;
      total_orchestration_ms: number;
    };
  };
  error?: {
    type: "validation" | "security" | "rbac" | "execution" | "ai_error" | "timeout" | "unknown";
    message: string;
    user_friendly_message: string;
    suggestions?: string[];
  };
}

// Réponse pour les suggestions intelligentes
export interface ChatbotSuggestionsResponse {
  success: boolean;
  suggestions: {
    id: string;
    text: string;
    category: string;
    priority: number;
    success_rate: number;
    estimated_complexity: "simple" | "complex" | "expert";
    context_dependent: boolean;
  }[];
  personalized: boolean;
  total_available: number;
  context_info: {
    current_role: string;
    temporal_context: string[];
    recent_patterns: string[];
  };
}

// Réponse pour la validation de requête
export interface ChatbotValidateResponse {
  success: boolean;
  validation_results: {
    query_valid: boolean;
    security_passed: boolean;
    rbac_passed: boolean;
    sql_generatable: boolean;
    estimated_complexity: "simple" | "complex" | "expert";
    estimated_execution_time_ms: number;
    warnings: string[];
    suggestions: string[];
  };
  preview_sql?: string;
  accessible_tables: string[];
  restricted_columns: string[];
  error?: {
    type: "validation" | "security" | "rbac" | "ai_error";
    message: string;
    details: any;
  };
}

// Réponse pour l'historique
export interface ChatbotHistoryResponse {
  success: boolean;
  conversations: {
    id: string;
    query: string;
    summary: string;
    success: boolean;
    execution_time_ms: number;
    confidence?: number;
    created_at: Date;
    has_feedback: boolean;
  }[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

// Réponse pour le feedback
export interface ChatbotFeedbackResponse {
  success: boolean;
  feedback_id: string;
  learning_applied: boolean;
  improvements_suggested: string[];
  thank_you_message: string;
}

// Réponse pour les statistiques (admin)
export interface ChatbotStatsResponse {
  success: boolean;
  period: string;
  overall_metrics: {
    total_queries: number;
    success_rate: number;
    avg_response_time_ms: number;
    total_tokens_used: number;
    estimated_total_cost: number;
    unique_users: number;
    avg_queries_per_user: number;
  };
  breakdown_data: {
    timestamp: Date;
    queries: number;
    success_rate: number;
    avg_response_time_ms: number;
    error_rate: number;
  }[];
  top_queries: {
    query: string;
    count: number;
    avg_success_rate: number;
  }[];
  role_distribution: Record<string, number>;
  error_analysis: {
    type: string;
    count: number;
    percentage: number;
  }[];
  feedback_summary: {
    total_feedback: number;
    avg_rating: number;
    satisfaction_rate: number;
    top_improvement_areas: string[];
  };
}

// ========================================
// SCHEMAS ZOD POUR LES TABLES CHATBOT
// ========================================

export const insertChatbotConversationSchema = createInsertSchema(chatbotConversations);
export const insertChatbotFeedbackSchema = createInsertSchema(chatbotFeedback);
export const insertChatbotSuggestionSchema = createInsertSchema(chatbotSuggestions);
export const insertChatbotUsageMetricsSchema = createInsertSchema(chatbotUsageMetrics);

// ========================================
// TYPES TYPESCRIPT POUR LES TABLES CHATBOT
// ========================================

export type ChatbotConversation = typeof chatbotConversations.$inferSelect;
export type InsertChatbotConversation = z.infer<typeof insertChatbotConversationSchema>;

export type ChatbotFeedback = typeof chatbotFeedback.$inferSelect;
export type InsertChatbotFeedback = z.infer<typeof insertChatbotFeedbackSchema>;

export type ChatbotSuggestion = typeof chatbotSuggestions.$inferSelect;
export type InsertChatbotSuggestion = z.infer<typeof insertChatbotSuggestionSchema>;

export type ChatbotUsageMetrics = typeof chatbotUsageMetrics.$inferSelect;
export type InsertChatbotUsageMetrics = z.infer<typeof insertChatbotUsageMetricsSchema>;

// ========================================
// SYSTÈME D'AUDIT ET MONITORING SÉCURITÉ SAXIUM - SUPERVISION COMPLÈTE
// ========================================

// ========================================
// ENUMS POUR SYSTÈME D'AUDIT COMPLET
// ========================================

// Types d'événements d'audit
export const auditEventTypeEnum = pgEnum("audit_event_type", [
  "login",                      // Connexion utilisateur
  "logout",                     // Déconnexion utilisateur
  "chatbot.query",              // Requête chatbot
  "chatbot.feedback",           // Feedback chatbot
  "rbac.access_granted",        // Accès RBAC accordé
  "rbac.access_denied",         // Accès RBAC refusé
  "rbac.violation",             // Violation RBAC détectée
  "sql.query_executed",         // Requête SQL exécutée
  "sql.query_blocked",          // Requête SQL bloquée
  "security.alert",             // Alerte sécurité
  "security.rate_limit",        // Rate limiting déclenché
  "admin.action",               // Action admin sensible
  "data.export",                // Export de données
  "data.modification",          // Modification de données
  "session.expired",            // Session expirée
  "session.hijack_attempt",     // Tentative de hijack de session
  "api.unauthorized_access",    // Tentative d'accès non autorisé API
  "system.error",               // Erreur système
  "system.performance"          // Événement de performance
]);

// Sévérité des événements d'audit
export const auditSeverityEnum = pgEnum("audit_severity", [
  "low",        // Information normale
  "medium",     // Événement notable
  "high",       // Événement important
  "critical"    // Événement critique nécessitant attention immédiate
]);

// Résultat de l'événement audité
export const auditResultEnum = pgEnum("audit_result", [
  "success",    // Opération réussie
  "error",      // Erreur lors de l'opération
  "blocked",    // Opération bloquée par sécurité/RBAC
  "timeout",    // Timeout de l'opération
  "partial"     // Opération partiellement réussie
]);

// Types d'alertes de sécurité automatisées
export const securityAlertTypeEnum = pgEnum("security_alert_type", [
  "rbac_violation",             // Violation RBAC détectée
  "sql_injection_attempt",     // Tentative d'injection SQL
  "rate_limit_exceeded",       // Dépassement de limite de taux
  "suspicious_query",          // Requête suspecte détectée
  "multiple_failed_logins",    // Multiples tentatives de connexion échouées
  "unusual_activity_pattern",  // Pattern d'activité inhabituel
  "unauthorized_admin_access", // Tentative d'accès admin non autorisé
  "data_exfiltration_risk",   // Risque d'exfiltration de données
  "session_anomaly",          // Anomalie de session
  "performance_degradation",  // Dégradation de performance
  "system_overload",          // Surcharge système
  "security_configuration_change" // Changement de configuration sécurité
]);

// Sévérité des alertes de sécurité
export const securitySeverityEnum = pgEnum("security_severity", [
  "low",        // Alerte informative
  "medium",     // Alerte modérée
  "high",       // Alerte importante
  "critical"    // Alerte critique nécessitant action immédiate
]);

// Statut des alertes de sécurité
export const securityAlertStatusEnum = pgEnum("security_alert_status", [
  "open",           // Alerte ouverte
  "acknowledged",   // Alerte prise en compte
  "investigating",  // Investigation en cours
  "resolved",       // Alerte résolue
  "false_positive", // Faux positif
  "suppressed"      // Alerte supprimée
]);

// ========================================
// TABLES D'AUDIT ET SÉCURITÉ
// ========================================

// Table principale des logs d'audit - Centralise tous les événements système
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Identification de l'utilisateur et contexte
  userId: varchar("user_id").notNull(), // ID utilisateur (peut être 'system' pour événements automatiques)
  userRole: varchar("user_role").notNull(), // Rôle de l'utilisateur au moment de l'événement
  sessionId: varchar("session_id"), // ID de session si applicable
  
  // Type et classification de l'événement
  eventType: auditEventTypeEnum("event_type").notNull(),
  severity: auditSeverityEnum("severity").default("low").notNull(),
  result: auditResultEnum("result").notNull(),
  
  // Détails de l'événement
  resource: varchar("resource"), // Table/endpoint/ressource accédée
  action: varchar("action"), // Action effectuée (SELECT/INSERT/UPDATE/DELETE/GET/POST...)
  entityType: varchar("entity_type"), // Type d'entité concernée (project, offer, user...)
  entityId: varchar("entity_id"), // ID de l'entité concernée
  
  // Contexte technique et métadonnées
  ipAddress: varchar("ip_address"), // Adresse IP de l'utilisateur
  userAgent: text("user_agent"), // User agent du navigateur
  requestPath: varchar("request_path"), // Chemin de la requête HTTP
  requestMethod: varchar("request_method"), // Méthode HTTP (GET, POST, etc.)
  
  // Données de performance
  executionTimeMs: integer("execution_time_ms"), // Temps d'exécution en millisecondes
  responseSize: integer("response_size"), // Taille de la réponse en bytes
  
  // Détails spécifiques et traces
  payload: jsonb("payload"), // Données sanitisées de la requête
  response: jsonb("response"), // Données sanitisées de la réponse
  errorDetails: jsonb("error_details"), // Détails d'erreur si applicable
  
  // Traçabilité et métadonnées
  tags: text("tags").array().default(sql`'{}'::text[]`), // Tags pour catégorisation
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`), // Métadonnées additionnelles flexibles
  
  // Gestion de la rétention
  isArchived: boolean("is_archived").default(false), // Marquage pour archivage
  archiveDate: timestamp("archive_date"), // Date d'archivage prévue
  
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => {
  return {
    // Index principaux pour performance des requêtes
    userEventIdx: index("audit_logs_user_event_idx").on(table.userId, table.eventType, table.timestamp),
    severityIdx: index("audit_logs_severity_idx").on(table.severity, table.timestamp),
    resourceActionIdx: index("audit_logs_resource_action_idx").on(table.resource, table.action),
    timestampIdx: index("audit_logs_timestamp_idx").on(table.timestamp),
    sessionIdx: index("audit_logs_session_idx").on(table.sessionId),
    entityIdx: index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    performanceIdx: index("audit_logs_performance_idx").on(table.executionTimeMs),
    archiveIdx: index("audit_logs_archive_idx").on(table.isArchived, table.archiveDate),
  };
});

// Table des alertes de sécurité - Alertes automatisées et notifications
export const securityAlerts = pgTable("security_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Classification de l'alerte
  type: securityAlertTypeEnum("type").notNull(),
  severity: securitySeverityEnum("severity").notNull(),
  status: securityAlertStatusEnum("status").default("open").notNull(),
  
  // Entité concernée par l'alerte
  userId: varchar("user_id"), // Utilisateur concerné (peut être null pour alertes système)
  entityType: varchar("entity_type"), // Type d'entité (user, session, query, system...)
  entityId: varchar("entity_id"), // ID de l'entité concernée
  
  // Détails de l'alerte
  title: varchar("title").notNull(), // Titre court de l'alerte
  description: text("description").notNull(), // Description détaillée
  recommendation: text("recommendation"), // Recommandation d'action
  
  // Contexte technique
  sourceComponent: varchar("source_component"), // Composant source (chatbot, rbac, sql_engine...)
  ruleId: varchar("rule_id"), // ID de la règle qui a déclenché l'alerte
  triggerData: jsonb("trigger_data"), // Données qui ont déclenché l'alerte
  
  // Données de détection
  detectionMethod: varchar("detection_method"), // Méthode de détection (pattern, threshold, ml...)
  confidence: decimal("confidence", { precision: 3, scale: 2 }), // Niveau de confiance 0.00-1.00
  falsePositiveRisk: decimal("false_positive_risk", { precision: 3, scale: 2 }), // Risque de faux positif
  
  // Seuils et métriques
  thresholdValue: decimal("threshold_value", { precision: 15, scale: 4 }), // Valeur seuil déclenchée
  currentValue: decimal("current_value", { precision: 15, scale: 4 }), // Valeur actuelle mesurée
  historicalBaseline: decimal("historical_baseline", { precision: 15, scale: 4 }), // Ligne de base historique
  
  // Gestion et résolution
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id), // Assigné à quel admin
  investigatedByUserId: varchar("investigated_by_user_id").references(() => users.id), // Investigué par quel admin
  resolutionNote: text("resolution_note"), // Note de résolution
  resolutionAction: varchar("resolution_action"), // Action prise pour résoudre
  
  // Auto-suppression et gestion
  autoResolveAt: timestamp("auto_resolve_at"), // Date de résolution automatique
  suppressUntil: timestamp("suppress_until"), // Suppression temporaire jusqu'à cette date
  suppressReason: text("suppress_reason"), // Raison de la suppression
  
  // Impact et criticité
  impactLevel: varchar("impact_level"), // Impact estimé (low, medium, high, critical)
  affectedUsers: integer("affected_users").default(0), // Nombre d'utilisateurs affectés
  affectedSystems: text("affected_systems").array().default(sql`'{}'::text[]`), // Systèmes affectés
  
  // Métadonnées et traçabilité
  correlationId: varchar("correlation_id"), // ID de corrélation pour grouper les alertes liées
  parentAlertId: varchar("parent_alert_id").references((): PgColumn => securityAlerts.id), // Alerte parente si cascade
  tags: text("tags").array().default(sql`'{}'::text[]`), // Tags pour catégorisation
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`), // Métadonnées flexibles
  
  // Timestamps
  firstDetectedAt: timestamp("first_detected_at").defaultNow().notNull(),
  lastDetectedAt: timestamp("last_detected_at").defaultNow().notNull(),
  acknowledgedAt: timestamp("acknowledged_at"),
  investigatedAt: timestamp("investigated_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    // Index pour performance et recherche
    typeStatusIdx: index("security_alerts_type_status_idx").on(table.type, table.status),
    severityStatusIdx: index("security_alerts_severity_status_idx").on(table.severity, table.status),
    userAlertsIdx: index("security_alerts_user_idx").on(table.userId),
    assignedIdx: index("security_alerts_assigned_idx").on(table.assignedToUserId),
    createdAtIdx: index("security_alerts_created_at_idx").on(table.createdAt),
    entityIdx: index("security_alerts_entity_idx").on(table.entityType, table.entityId),
    correlationIdx: index("security_alerts_correlation_idx").on(table.correlationId),
    detectionTimeIdx: index("security_alerts_detection_time_idx").on(table.firstDetectedAt, table.lastDetectedAt),
    autoResolveIdx: index("security_alerts_auto_resolve_idx").on(table.autoResolveAt),
    parentChildIdx: index("security_alerts_parent_child_idx").on(table.parentAlertId),
  };
});

// Table des règles d'alerte configurables - Configuration dynamique des seuils
export const alertRules = pgTable("alert_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Identification de la règle
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // security, performance, business...
  
  // Configuration de détection
  alertType: securityAlertTypeEnum("alert_type").notNull(),
  severity: securitySeverityEnum("severity").notNull(),
  detectionMethod: varchar("detection_method").notNull(), // threshold, pattern, ml, statistical
  
  // Seuils et conditions
  conditions: jsonb("conditions").notNull(), // Conditions de déclenchement flexibles
  thresholdValue: decimal("threshold_value", { precision: 15, scale: 4 }),
  thresholdOperator: varchar("threshold_operator"), // >, <, >=, <=, =, !=
  timeWindow: integer("time_window"), // Fenêtre temporelle en secondes
  minimumOccurrences: integer("minimum_occurrences").default(1), // Nombre minimum d'occurrences
  
  // Gestion et contrôle
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(5), // Priorité 1-10
  cooldownPeriod: integer("cooldown_period").default(300), // Période de refroidissement en secondes
  maxAlertsPerDay: integer("max_alerts_per_day").default(100), // Limite quotidienne
  
  // Actions automatiques
  autoAssignTo: varchar("auto_assign_to").references(() => users.id), // Auto-assignation
  autoActions: jsonb("auto_actions").default(sql`'{}'::jsonb`), // Actions automatiques à déclencher
  notificationChannels: text("notification_channels").array().default(sql`'{}'::text[]`), // Canaux de notification
  
  // Suppression et exceptions
  suppressionRules: jsonb("suppression_rules").default(sql`'{}'::jsonb`), // Règles de suppression
  whitelistConditions: jsonb("whitelist_conditions").default(sql`'{}'::jsonb`), // Conditions de liste blanche
  
  // Métadonnées et audit
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  lastModifiedBy: varchar("last_modified_by").references(() => users.id),
  lastTriggeredAt: timestamp("last_triggered_at"),
  triggerCount: integer("trigger_count").default(0),
  falsePositiveCount: integer("false_positive_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    categoryActiveIdx: index("alert_rules_category_active_idx").on(table.category, table.isActive),
    typeActiveIdx: index("alert_rules_type_active_idx").on(table.alertType, table.isActive),
    priorityIdx: index("alert_rules_priority_idx").on(table.priority),
    lastTriggeredIdx: index("alert_rules_last_triggered_idx").on(table.lastTriggeredAt),
    createdByIdx: index("alert_rules_created_by_idx").on(table.createdBy),
  };
});

// ========================================
// SCHÉMAS ZOD POUR VALIDATION
// ========================================

// Schéma pour insertion d'événement d'audit
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
  createdAt: true,
});

// Schéma pour insertion d'alerte de sécurité
export const insertSecurityAlertSchema = createInsertSchema(securityAlerts).omit({
  id: true,
  firstDetectedAt: true,
  lastDetectedAt: true,
  createdAt: true,
  updatedAt: true,
});

// Schéma pour insertion de règle d'alerte
export const insertAlertRuleSchema = createInsertSchema(alertRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  triggerCount: true,
  falsePositiveCount: true,
  lastTriggeredAt: true,
});

// Schémas pour mise à jour
export const updateSecurityAlertSchema = createInsertSchema(securityAlerts).omit({
  id: true,
  firstDetectedAt: true,
  createdAt: true,
}).partial();

export const updateAlertRuleSchema = createInsertSchema(alertRules).omit({
  id: true,
  createdAt: true,
  createdBy: true,
  triggerCount: true,
  falsePositiveCount: true,
  lastTriggeredAt: true,
}).partial();

// Schémas pour requêtes et filtres
export const auditLogsQuerySchema = z.object({
  userId: z.string().optional(),
  userRole: z.string().optional(),
  eventType: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  result: z.enum(["success", "error", "blocked", "timeout", "partial"]).optional(),
  resource: z.string().optional(),
  action: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  ipAddress: z.string().optional(),
  sessionId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(1000).default(50),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(["timestamp", "severity", "eventType", "userId"]).default("timestamp"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  includeArchived: z.boolean().default(false),
});

export const securityAlertsQuerySchema = z.object({
  type: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  status: z.enum(["open", "acknowledged", "investigating", "resolved", "false_positive", "suppressed"]).optional(),
  userId: z.string().optional(),
  assignedToUserId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  correlationId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(1000).default(50),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(["createdAt", "severity", "type", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  includeResolved: z.boolean().default(false),
});

// Schéma pour création d'événement d'audit (API)
export const createAuditEventSchema = z.object({
  eventType: z.enum([
    "login", "logout", "chatbot.query", "chatbot.feedback", "rbac.access_granted",
    "rbac.access_denied", "rbac.violation", "sql.query_executed", "sql.query_blocked",
    "security.alert", "security.rate_limit", "admin.action", "data.export",
    "data.modification", "session.expired", "session.hijack_attempt",
    "api.unauthorized_access", "system.error", "system.performance"
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]).default("low"),
  result: z.enum(["success", "error", "blocked", "timeout", "partial"]),
  resource: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  payload: z.any().optional(),
  response: z.any().optional(),
  errorDetails: z.any().optional(),
  executionTimeMs: z.number().optional(),
  responseSize: z.number().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

// Schéma pour création d'alerte de sécurité (API)
export const createSecurityAlertSchema = z.object({
  type: z.enum([
    "rbac_violation", "sql_injection_attempt", "rate_limit_exceeded", "suspicious_query",
    "multiple_failed_logins", "unusual_activity_pattern", "unauthorized_admin_access",
    "data_exfiltration_risk", "session_anomaly", "performance_degradation",
    "system_overload", "security_configuration_change"
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  recommendation: z.string().optional(),
  userId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  sourceComponent: z.string().optional(),
  ruleId: z.string().optional(),
  triggerData: z.any().optional(),
  detectionMethod: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  thresholdValue: z.number().optional(),
  currentValue: z.number().optional(),
  assignedToUserId: z.string().optional(),
  correlationId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

// ========================================
// TYPES TYPESCRIPT
// ========================================

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLogsQuery = z.infer<typeof auditLogsQuerySchema>;
export type CreateAuditEvent = z.infer<typeof createAuditEventSchema>;

export type SecurityAlert = typeof securityAlerts.$inferSelect;
export type InsertSecurityAlert = z.infer<typeof insertSecurityAlertSchema>;
export type UpdateSecurityAlert = z.infer<typeof updateSecurityAlertSchema>;
export type SecurityAlertsQuery = z.infer<typeof securityAlertsQuerySchema>;
export type CreateSecurityAlert = z.infer<typeof createSecurityAlertSchema>;

export type AlertRule = typeof alertRules.$inferSelect;
export type InsertAlertRule = z.infer<typeof insertAlertRuleSchema>;
export type UpdateAlertRule = z.infer<typeof updateAlertRuleSchema>;

// Interface pour les événements d'audit (utilisée par AuditService)
export interface AuditEvent {
  id?: string;
  userId: string;
  userRole: string;
  sessionId?: string;
  eventType: 'login' | 'logout' | 'chatbot.query' | 'chatbot.feedback' | 'rbac.access_granted' | 
             'rbac.access_denied' | 'rbac.violation' | 'sql.query_executed' | 'sql.query_blocked' |
             'security.alert' | 'security.rate_limit' | 'admin.action' | 'data.export' |
             'data.modification' | 'session.expired' | 'session.hijack_attempt' |
             'api.unauthorized_access' | 'system.error' | 'system.performance';
  resource?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  result: 'success' | 'error' | 'blocked' | 'timeout' | 'partial';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  payload?: any;
  response?: any;
  errorDetails?: any;
  metadata?: {
    ip?: string;
    userAgent?: string;
    executionTimeMs?: number;
    responseSize?: number;
    [key: string]: any;
  };
  tags?: string[];
  timestamp?: Date;
}

// Interface pour les alertes de sécurité (utilisée par SecurityNotificationService)
export interface SecurityAlertEvent {
  id?: string;
  type: 'rbac_violation' | 'sql_injection_attempt' | 'rate_limit_exceeded' | 'suspicious_query' |
        'multiple_failed_logins' | 'unusual_activity_pattern' | 'unauthorized_admin_access' |
        'data_exfiltration_risk' | 'session_anomaly' | 'performance_degradation' |
        'system_overload' | 'security_configuration_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  sourceComponent?: string;
  detectionMethod?: string;
  confidence?: number;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

// ========================================
// SYSTÈME D'ACTIONS SÉCURISÉES POUR CHATBOT IA SAXIUM
// ========================================

// Types d'actions supportées par le système
export const actionTypeEnum = pgEnum("action_type", [
  "create",          // Création d'entités
  "update",          // Mise à jour d'entités
  "delete",          // Suppression/archivage
  "business_action"  // Actions métier spécialisées
]);

// Entités sur lesquelles les actions peuvent être effectuées
export const actionEntityEnum = pgEnum("chatbot_entity", [
  "offer",           // Offres commerciales
  "project",         // Projets
  "ao",              // Appels d'offres
  "contact",         // Contacts (maîtres d'ouvrage/œuvre)
  "task",            // Tâches de projet
  "supplier",        // Fournisseurs
  "team_member",     // Membres d'équipe
  "document",        // Documents
  "validation",      // Validations BE
  "milestone"        // Jalons
]);

// Niveaux de risque des actions
export const actionRiskLevelEnum = pgEnum("action_risk_level", [
  "low",             // Faible risque - Confirmation optionnelle
  "medium",          // Risque modéré - Confirmation recommandée
  "high"             // Haut risque - Confirmation obligatoire
]);

// Statuts des actions
export const actionStatusEnum = pgEnum("action_status", [
  "proposed",        // Action proposée à l'utilisateur
  "confirmed",       // Action confirmée par l'utilisateur
  "executing",       // Action en cours d'exécution
  "completed",       // Action exécutée avec succès
  "failed",          // Action échouée
  "cancelled",       // Action annulée
  "timeout"          // Action expirée
]);

// Statuts des confirmations d'actions
export const confirmationStatusEnum = pgEnum("confirmation_status", [
  "pending",         // En attente de confirmation
  "confirmed",       // Confirmé par l'utilisateur
  "rejected",        // Rejeté par l'utilisateur
  "expired"          // Demande expirée
]);

// Table principale des actions sécurisées
export const actions = pgTable("actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Classification de l'action
  type: actionTypeEnum("type").notNull(),
  entity: actionEntityEnum("entity").notNull(),
  operation: varchar("operation").notNull(), // create_offer, update_status, delete_project, etc.
  
  // Utilisateur et session
  userId: varchar("user_id").notNull().references(() => users.id),
  userRole: varchar("user_role").notNull(),
  sessionId: varchar("session_id"),
  conversationId: varchar("conversation_id").references(() => chatbotConversations.id),
  
  // Paramètres de l'action
  parameters: jsonb("parameters").notNull(), // Paramètres de l'action (valeurs, IDs, etc.)
  targetEntityId: varchar("target_entity_id"), // ID de l'entité cible (si applicable)
  
  // Validation et sécurité
  riskLevel: actionRiskLevelEnum("risk_level").notNull(),
  confirmationRequired: boolean("confirmation_required").default(true).notNull(),
  rbacValidated: boolean("rbac_validated").default(false).notNull(),
  
  // État d'exécution
  status: actionStatusEnum("status").default("proposed").notNull(),
  executionResult: jsonb("execution_result"), // Résultat de l'exécution
  errorDetails: text("error_details"), // Détails d'erreur si échec
  
  // Métadonnées de sécurité
  requiredPermissions: jsonb("required_permissions"), // Permissions requises
  securityContext: jsonb("security_context"), // Contexte de sécurité au moment de l'action
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  
  // Timing et expiration
  proposedAt: timestamp("proposed_at").defaultNow().notNull(),
  confirmedAt: timestamp("confirmed_at"),
  executedAt: timestamp("executed_at"),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"), // Expiration de la demande de confirmation
  
  // Performance et audit
  executionTimeMs: integer("execution_time_ms"),
  retryCount: integer("retry_count").default(0).notNull(),
  maxRetries: integer("max_retries").default(3).notNull(),
  
  // Relations et dépendances
  parentActionId: varchar("parent_action_id").references((): PgColumn => actions.id), // Action parente (batch)
  dependsOnActionId: varchar("depends_on_action_id").references((): PgColumn => actions.id), // Dépendance
  
  // Métadonnées et tags
  tags: text("tags").array().default(sql`'{}'::text[]`),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    // Index pour performance
    userStatusIdx: index("actions_user_status_idx").on(table.userId, table.status),
    typeEntityIdx: index("actions_type_entity_idx").on(table.type, table.entity),
    statusIdx: index("actions_status_idx").on(table.status),
    proposedAtIdx: index("actions_proposed_at_idx").on(table.proposedAt),
    riskLevelIdx: index("actions_risk_level_idx").on(table.riskLevel),
    conversationIdx: index("actions_conversation_idx").on(table.conversationId),
    expiresAtIdx: index("actions_expires_at_idx").on(table.expiresAt),
    parentActionIdx: index("actions_parent_action_idx").on(table.parentActionId),
    targetEntityIdx: index("actions_target_entity_idx").on(table.entity, table.targetEntityId),
  };
});

// Table d'historique des actions pour audit complet
export const actionHistory = pgTable("action_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  actionId: varchar("action_id").notNull().references(() => actions.id, { onDelete: "cascade" }),
  
  // État de transition
  fromStatus: actionStatusEnum("from_status"),
  toStatus: actionStatusEnum("to_status").notNull(),
  changeReason: text("change_reason"), // Raison du changement d'état
  
  // Contexte de changement
  changedBy: varchar("changed_by").references(() => users.id), // Qui a fait le changement
  changeType: varchar("change_type").notNull(), // automatic, user_action, system_timeout, etc.
  
  // Détails du changement
  oldValues: jsonb("old_values"), // Valeurs avant changement
  newValues: jsonb("new_values"), // Valeurs après changement
  changeMetadata: jsonb("change_metadata"), // Métadonnées du changement
  
  // Performance et résultats
  executionTimeMs: integer("execution_time_ms"),
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  
  // Audit et traçabilité
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  securityContext: jsonb("security_context"),
  
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => {
  return {
    actionIdIdx: index("action_history_action_id_idx").on(table.actionId),
    statusTransitionIdx: index("action_history_status_transition_idx").on(table.fromStatus, table.toStatus),
    changedByIdx: index("action_history_changed_by_idx").on(table.changedBy),
    createdAtIdx: index("action_history_created_at_idx").on(table.createdAt),
    successIdx: index("action_history_success_idx").on(table.success),
  };
});

// Table des confirmations d'actions utilisateur
export const actionConfirmations = pgTable("action_confirmations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  actionId: varchar("action_id").notNull().references(() => actions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // État de la confirmation
  status: confirmationStatusEnum("status").default("pending").notNull(),
  
  // Détails de confirmation
  confirmationMessage: text("confirmation_message").notNull(), // Message affiché à l'utilisateur
  warningMessage: text("warning_message"), // Avertissements sur les risques
  recommendedActions: jsonb("recommended_actions"), // Actions recommandées avant confirmation
  
  // Réponse utilisateur
  userDecision: boolean("user_decision"), // true = confirmé, false = rejeté, null = en attente
  userComment: text("user_comment"), // Commentaire optionnel de l'utilisateur
  rejectionReason: text("rejection_reason"), // Raison du rejet si applicable
  
  // Contexte de présentation
  presentationMode: varchar("presentation_mode").default("chatbot"), // chatbot, modal, email, etc.
  uiContext: jsonb("ui_context"), // Contexte d'interface utilisateur
  
  // Timing
  presentedAt: timestamp("presented_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
  expiresAt: timestamp("expires_at").notNull(), // Expiration de la demande
  remindersSent: integer("reminders_sent").default(0).notNull(),
  
  // Audit
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    actionUserIdx: index("action_confirmations_action_user_idx").on(table.actionId, table.userId),
    statusIdx: index("action_confirmations_status_idx").on(table.status),
    expiresAtIdx: index("action_confirmations_expires_at_idx").on(table.expiresAt),
    presentedAtIdx: index("action_confirmations_presented_at_idx").on(table.presentedAt),
    userDecisionIdx: index("action_confirmations_user_decision_idx").on(table.userDecision),
  };
});

// ========================================
// NOUVELLES TABLES EXTENSIONS MONDAY.COM - MODULES RH ET MÉTIER
// ========================================

// P1 - Table Formation Employés (Priority P1)
export const employeeTraining = pgTable("employee_training", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => users.id).notNull(),
  trainingType: trainingTypeEnum("training_type").notNull(),
  competencyType: competencyEnum("competency_type"),
  plannedDate: timestamp("planned_date"),
  completedDate: timestamp("completed_date"),
  certificationExpiry: timestamp("certification_expiry"),
  status: trainingStatusEnum("status").default("planifie"),
  trainingProvider: varchar("training_provider"),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  notes: text("notes"),
  mondayItemId: varchar("monday_item_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => {
  return {
    trainingEmployeeIdx: index("employee_training_employee_idx").on(table.employeeId),
    trainingDateIdx: index("employee_training_date_idx").on(table.plannedDate),
    trainingStatusIdx: index("employee_training_status_idx").on(table.status),
    mondayItemIdx: index("employee_training_monday_idx").on(table.mondayItemId),
  };
});

// P2 - Table Inventaire Équipements (Priority P2)
export const equipmentInventory = pgTable("equipment_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  equipmentName: varchar("equipment_name").notNull(),
  equipmentType: equipmentTypeEnum("equipment_type").notNull(),
  brand: varchar("brand").default("MAKITA"),
  model: varchar("model"),
  serialNumber: varchar("serial_number"),
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  assignedToTeam: varchar("assigned_to_team").references(() => teams.id),
  vehicleAssignment: varchar("vehicle_assignment"), // "COFFIN CAMION"
  status: equipmentStatusEnum("status").default("disponible"),
  purchaseDate: timestamp("purchase_date"),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }),
  lastMaintenanceDate: timestamp("last_maintenance_date"),
  nextMaintenanceDate: timestamp("next_maintenance_date"),
  warrantyExpiry: timestamp("warranty_expiry"),
  location: varchar("location"),
  notes: text("notes"),
  mondayItemId: varchar("monday_item_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => {
  return {
    equipmentStatusIdx: index("equipment_inventory_status_idx").on(table.status),
    assignedUserIdx: index("equipment_inventory_assigned_user_idx").on(table.assignedToUserId),
    assignedTeamIdx: index("equipment_inventory_assigned_team_idx").on(table.assignedToTeam),
    nextMaintenanceIdx: index("equipment_inventory_next_maintenance_idx").on(table.nextMaintenanceDate),
    mondayItemIdx: index("equipment_inventory_monday_idx").on(table.mondayItemId),
  };
});

// P3 - Table Documents Employés (Priority P3)
export const employeeDocuments = pgTable("employee_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => users.id).notNull(),
  documentType: documentTypeEnum("document_type").notNull(),
  documentName: varchar("document_name").notNull(),
  documentNumber: varchar("document_number"),
  issuedDate: timestamp("issued_date"),
  expiryDate: timestamp("expiry_date"),
  issuingAuthority: varchar("issuing_authority"),
  status: documentStatusEnum("status").default("valide"),
  filePath: varchar("file_path"),
  reminderDays: integer("reminder_days").default(30), // Alerte avant expiration
  isRequired: boolean("is_required").default(false),
  notes: text("notes"),
  mondayItemId: varchar("monday_item_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => {
  return {
    documentEmployeeIdx: index("employee_documents_employee_idx").on(table.employeeId),
    documentExpiryIdx: index("employee_documents_expiry_idx").on(table.expiryDate),
    documentStatusIdx: index("employee_documents_status_idx").on(table.status),
    mondayItemIdx: index("employee_documents_monday_idx").on(table.mondayItemId),
  };
});

// P4 - Table Migration Monday.com (Priority P4)
export const mondayMigrationLog = pgTable("monday_migration_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mondayBoardId: varchar("monday_board_id").notNull(),
  mondayItemId: varchar("monday_item_id").notNull(),
  saxiumTableName: varchar("saxium_table_name").notNull(),
  saxiumRecordId: varchar("saxium_record_id").notNull(),
  migrationDate: timestamp("migration_date").defaultNow(),
  migrationStatus: varchar("migration_status").default("completed"), // completed, error, pending
  errorMessage: text("error_message"),
  sourceData: jsonb("source_data"), // Données Monday.com originales
  createdAt: timestamp("created_at").defaultNow()
}, (table) => {
  return {
    mondayBoardIdx: index("monday_migration_board_idx").on(table.mondayBoardId),
    mondayItemIdx: index("monday_migration_item_idx").on(table.mondayItemId),
    saxiumTableIdx: index("monday_migration_saxium_table_idx").on(table.saxiumTableName),
    migrationStatusIdx: index("monday_migration_status_idx").on(table.migrationStatus),
  };
});

// ========================================
// RELATIONS POUR NOUVELLES TABLES MONDAY.COM 
// ========================================

// Relations employeeTraining
export const employeeTrainingRelations = relations(employeeTraining, ({ one }) => ({
  employee: one(users, { 
    fields: [employeeTraining.employeeId], 
    references: [users.id] 
  })
}));

// Relations equipmentInventory
export const equipmentInventoryRelations = relations(equipmentInventory, ({ one }) => ({
  assignedUser: one(users, { 
    fields: [equipmentInventory.assignedToUserId], 
    references: [users.id] 
  }),
  assignedTeam: one(teams, { 
    fields: [equipmentInventory.assignedToTeam], 
    references: [teams.id] 
  })
}));

// Relations employeeDocuments
export const employeeDocumentsRelations = relations(employeeDocuments, ({ one }) => ({
  employee: one(users, { 
    fields: [employeeDocuments.employeeId], 
    references: [users.id] 
  })
}));

// ========================================
// SCHÉMAS ZOD POUR VALIDATION DES ACTIONS
// ========================================

// Schéma pour proposer une action
export const proposeActionSchema = z.object({
  type: z.enum(["create", "update", "delete", "business_action"]),
  entity: z.enum(["offer", "project", "ao", "contact", "task", "supplier", "team_member", "document", "validation", "milestone"]),
  operation: z.string().min(1).max(100),
  parameters: z.record(z.any()),
  targetEntityId: z.string().optional(),
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
  confirmationRequired: z.boolean().default(true),
  expirationMinutes: z.number().min(1).max(1440).default(30), // 1 minute à 24 heures
  metadata: z.record(z.any()).optional(),
});

// Schéma pour exécuter une action
export const executeActionSchema = z.object({
  actionId: z.string(),
  userConfirmation: z.boolean().default(false),
  userComment: z.string().optional(),
  overrideRiskCheck: z.boolean().default(false), // Pour les admins seulement
});

// Schéma pour requête d'historique d'actions
export const actionHistoryRequestSchema = z.object({
  userId: z.string().optional(),
  actionType: z.enum(["create", "update", "delete", "business_action"]).optional(),
  entity: z.enum(["offer", "project", "ao", "contact", "task", "supplier", "team_member", "document", "validation", "milestone"]).optional(),
  status: z.enum(["proposed", "confirmed", "executing", "completed", "failed", "cancelled", "timeout"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  includeParameters: z.boolean().default(false),
  includeResults: z.boolean().default(false),
});

// Schéma pour mise à jour de confirmation
export const updateConfirmationSchema = z.object({
  confirmationId: z.string(),
  decision: z.boolean(), // true = confirmé, false = rejeté
  comment: z.string().optional(),
  rejectionReason: z.string().optional(),
});

// ========================================
// SCHÉMAS D'INSERTION POUR LES TABLES MONDAY.COM (CRITIQUE)
// ========================================

// Schémas Zod pour les tables Monday.com - intégration critique
export const insertMetricsBusinessSchema = createInsertSchema(metricsBusiness).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTempsPoseSchema = createInsertSchema(tempsPose).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAoContactsSchema = createInsertSchema(aoContacts).omit({
  id: true,
  createdAt: true,
});

export const insertProjectContactsSchema = createInsertSchema(projectContacts).omit({
  id: true,
  createdAt: true,
});

export const insertSupplierSpecializationsSchema = createInsertSchema(supplierSpecializations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ========================================
// SCHÉMAS D'INSERTION POUR LES NOUVELLES TABLES MONDAY.COM  
// ========================================

// Schema formation employés
export const insertEmployeeTrainingSchema = createInsertSchema(employeeTraining).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Schema inventaire équipements
export const insertEquipmentInventorySchema = createInsertSchema(equipmentInventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Schema documents employés
export const insertEmployeeDocumentSchema = createInsertSchema(employeeDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Schema migration Monday.com
export const insertMondayMigrationLogSchema = createInsertSchema(mondayMigrationLog).omit({
  id: true,
  createdAt: true
});

// ========================================
// SCHÉMAS D'INSERTION POUR LES AUTRES TABLES
// ========================================

export const insertActionSchema = createInsertSchema(actions).omit({
  id: true,
  proposedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActionHistorySchema = createInsertSchema(actionHistory).omit({
  id: true,
  createdAt: true,
});

export const insertActionConfirmationSchema = createInsertSchema(actionConfirmations).omit({
  id: true,
  presentedAt: true,
  createdAt: true,
  updatedAt: true,
});

// ========================================
// TYPES TYPESCRIPT POUR LES ACTIONS
// ========================================

export type Action = typeof actions.$inferSelect;
export type InsertAction = z.infer<typeof insertActionSchema>;

export type ActionHistory = typeof actionHistory.$inferSelect;
export type InsertActionHistory = z.infer<typeof insertActionHistorySchema>;

export type ActionConfirmation = typeof actionConfirmations.$inferSelect;
export type InsertActionConfirmation = z.infer<typeof insertActionConfirmationSchema>;

// ========================================
// TYPES TYPESCRIPT POUR TABLES MONDAY.COM (CRITIQUE)
// ========================================

export type MetricsBusiness = typeof metricsBusiness.$inferSelect;
export type InsertMetricsBusiness = z.infer<typeof insertMetricsBusinessSchema>;

export type TempsPose = typeof tempsPose.$inferSelect;
export type InsertTempsPose = z.infer<typeof insertTempsPoseSchema>;

// ========================================
// TYPES TYPESCRIPT POUR NOUVELLES TABLES MONDAY.COM
// ========================================

// Types formation employés
export type EmployeeTraining = typeof employeeTraining.$inferSelect;
export type InsertEmployeeTraining = z.infer<typeof insertEmployeeTrainingSchema>;

// Types inventaire équipements  
export type EquipmentInventory = typeof equipmentInventory.$inferSelect;
export type InsertEquipmentInventory = z.infer<typeof insertEquipmentInventorySchema>;

// Types documents employés
export type EmployeeDocument = typeof employeeDocuments.$inferSelect;
export type InsertEmployeeDocument = z.infer<typeof insertEmployeeDocumentSchema>;

// Types migration Monday.com
export type MondayMigrationLog = typeof mondayMigrationLog.$inferSelect;
export type InsertMondayMigrationLog = z.infer<typeof insertMondayMigrationLogSchema>;

export type AoContacts = typeof aoContacts.$inferSelect;
export type InsertAoContacts = z.infer<typeof insertAoContactsSchema>;

export type ProjectContacts = typeof projectContacts.$inferSelect;
export type InsertProjectContacts = z.infer<typeof insertProjectContactsSchema>;

export type SupplierSpecializations = typeof supplierSpecializations.$inferSelect;
export type InsertSupplierSpecializations = z.infer<typeof insertSupplierSpecializationsSchema>;

// Types pour les requêtes API
export type ProposeActionRequest = z.infer<typeof proposeActionSchema> & {
  userId: string;
  userRole: string;
  sessionId?: string;
  conversationId?: string;
};

export type ExecuteActionRequest = z.infer<typeof executeActionSchema> & {
  userId: string;
  userRole: string;
};

export type ActionHistoryRequest = z.infer<typeof actionHistoryRequestSchema>;
export type UpdateConfirmationRequest = z.infer<typeof updateConfirmationSchema>;

// Interface pour définition d'action
export interface ActionDefinition {
  type: 'create' | 'update' | 'delete' | 'business_action';
  entity: string;
  operation: string;
  parameters: Record<string, any>;
  targetEntityId?: string;
  confirmation_required: boolean;
  risk_level: 'low' | 'medium' | 'high';
  estimated_execution_time?: number;
  required_permissions?: string[];
  validation_rules?: string[];
  rollback_possible?: boolean;
  side_effects?: string[];
}

// Interface pour résultats d'action
export interface ActionExecutionResult {
  success: boolean;
  entityId?: string;
  affectedRows?: number;
  executionTime?: number;
  warnings?: string[];
  sideEffects?: {
    entity: string;
    action: string;
    details: any;
  }[];
  error?: {
    type: 'validation' | 'permission' | 'execution' | 'rollback';
    message: string;
    details?: any;
  };
}

// Interface pour réponses API
export interface ProposeActionResponse {
  success: boolean;
  actionId?: string;
  confirmationRequired: boolean;
  confirmationId?: string;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedTime?: number;
  warnings?: string[];
  error?: {
    type: 'validation' | 'permission' | 'security' | 'business_rule';
    message: string;
    details?: any;
  };
}

export interface ExecuteActionResponse {
  success: boolean;
  result?: ActionExecutionResult;
  actionId: string;
  executionTime?: number;
  error?: {
    type: 'confirmation' | 'permission' | 'execution' | 'timeout';
    message: string;
    details?: any;
  };
}

export interface ActionHistoryResponse {
  success: boolean;
  actions: Action[];
  total: number;
  hasMore: boolean;
  error?: {
    type: 'validation' | 'permission' | 'query';
    message: string;
    details?: any;
  };
}