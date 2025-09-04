import { pgTable, varchar, text, timestamp, decimal, boolean, integer, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
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
  "en_cours_chiffrage",  // Chiffrage en cours
  "en_attente_validation", // Validation BE
  "fin_etudes_validee",  // Jalon "Fin d'études" validé
  "valide",              // Offre validée
  "signe",               // Offre signée par le client
  "transforme_en_projet", // Transformée en projet
  "termine",             // Dossier terminé
  "archive"              // Archivé
]);

// Statuts des projets (5 étapes POC)
export const projectStatusEnum = pgEnum("project_status", [
  "etude",              // Phase d'étude
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

// ========================================
// TABLES POC UNIQUEMENT
// ========================================

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

// Lots d'Appels d'Offres (gestion multiple des lots)
export const aoLots = pgTable("ao_lots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  aoId: varchar("ao_id").notNull().references(() => aos.id, { onDelete: "cascade" }),
  numero: varchar("numero").notNull(), // Numéro du lot (ex: "Lot 01", "Lot A", etc.)
  designation: text("designation").notNull(), // Description du lot
  menuiserieType: menuiserieTypeEnum("menuiserie_type"), // Type spécifique au lot
  montantEstime: decimal("montant_estime", { precision: 12, scale: 2 }), // Montant estimé du lot
  isSelected: boolean("is_selected").default(false), // Lot sélectionné pour réponse
  status: lotStatusEnum("status").default("brouillon"), // Statut du lot dans le workflow
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
  name: varchar("name").notNull(),
  client: varchar("client").notNull(),
  location: varchar("location").notNull(),
  status: projectStatusEnum("status").default("etude"), // 5 étapes POC
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  responsibleUserId: varchar("responsible_user_id").references(() => users.id),
  chefTravaux: varchar("chef_travaux").references(() => users.id),
  progressPercentage: integer("progress_percentage").default(0),
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

export const aoLotsRelations = relations(aoLots, ({ one }) => ({
  ao: one(aos, {
    fields: [aoLots.aoId],
    references: [aos.id],
  }),
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
// TYPES TYPESCRIPT POUR POC
// ========================================

export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

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

export type TeamResource = typeof teamResources.$inferSelect;
export type InsertTeamResource = typeof teamResources.$inferInsert;

export type BeWorkload = typeof beWorkload.$inferSelect;
export type InsertBeWorkload = typeof beWorkload.$inferInsert;

export type ChiffrageElement = typeof chiffrageElements.$inferSelect;
export type InsertChiffrageElement = typeof chiffrageElements.$inferInsert;

export type DpgfDocument = typeof dpgfDocuments.$inferSelect;
export type InsertDpgfDocument = typeof dpgfDocuments.$inferInsert;

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