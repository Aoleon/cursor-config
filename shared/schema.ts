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
  paymentTerms: integer("payment_terms").default(30),
  deliveryDelay: integer("delivery_delay").default(15),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalOrders: integer("total_orders").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  tags: jsonb("tags").$type<string[]>().default([]), // Tags libres
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}), // Métadonnées flexibles
  
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
  linkMetadata: jsonb("link_metadata").$type<Record<string, any>>().default({}),
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
  settings: jsonb("settings").$type<Record<string, any>>().default({}),
  
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
  prerequisites: jsonb("prerequisites").$type<string[]>().default([]),
  
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
  referenceDocuments: jsonb("reference_documents").$type<string[]>().default([]),
  
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
  actionItems: jsonb("action_items").$type<Array<{task: string, assignee: string, deadline: string}>>().default([]),
  
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
  evidenceDocuments: jsonb("evidence_documents").$type<string[]>().default([]), // IDs des documents de preuve
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
  controlData: jsonb("control_data").$type<Record<string, any>>().default({}),
  
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
  documentsSoumis: jsonb("documents_soumis").$type<string[]>().default([]), // IDs des documents soumis
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