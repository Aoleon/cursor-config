CREATE TYPE "public"."ao_source" AS ENUM('mail', 'phone', 'website', 'partner', 'other');--> statement-breakpoint
CREATE TYPE "public"."charge_status" AS ENUM('disponible', 'occupe', 'surcharge');--> statement-breakpoint
CREATE TYPE "public"."departement" AS ENUM('01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '90', '91', '92', '93', '94', '95');--> statement-breakpoint
CREATE TYPE "public"."marche_type" AS ENUM('public', 'prive', 'ao_restreint', 'ao_ouvert', 'marche_negocie', 'procedure_adaptee');--> statement-breakpoint
CREATE TYPE "public"."menuiserie_type" AS ENUM('fenetre', 'porte', 'portail', 'volet', 'cloison', 'verriere', 'autre');--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('brouillon', 'en_cours_chiffrage', 'en_attente_validation', 'fin_etudes_validee', 'valide', 'signe', 'transforme_en_projet', 'termine', 'archive');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('etude', 'planification', 'approvisionnement', 'chantier', 'sav');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('a_faire', 'en_cours', 'termine', 'en_retard');--> statement-breakpoint
CREATE TABLE "ao_lots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ao_id" varchar NOT NULL,
	"numero" varchar NOT NULL,
	"designation" text NOT NULL,
	"menuiserie_type" "menuiserie_type",
	"montant_estime" numeric(12, 2),
	"is_selected" boolean DEFAULT false,
	"comment" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "aos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar NOT NULL,
	"client" varchar NOT NULL,
	"location" varchar NOT NULL,
	"departement" "departement" NOT NULL,
	"intitule_operation" text,
	"date_limite_remise" timestamp,
	"date_sortie_ao" timestamp,
	"date_rendu_ao" timestamp,
	"date_acceptation_ao" timestamp,
	"maitre_ouvrage_nom" varchar,
	"maitre_ouvrage_adresse" text,
	"maitre_ouvrage_contact" varchar,
	"maitre_ouvrage_email" varchar,
	"maitre_ouvrage_phone" varchar,
	"maitre_oeuvre" varchar,
	"maitre_oeuvre_contact" varchar,
	"menuiserie_type" "menuiserie_type" NOT NULL,
	"montant_estime" numeric(12, 2),
	"type_marche" "marche_type",
	"prorata_eventuel" numeric(5, 2),
	"demarrage_prevu" timestamp,
	"bureau_etudes" varchar,
	"bureau_controle" varchar,
	"sps" varchar,
	"source" "ao_source" NOT NULL,
	"date_os" timestamp,
	"description" text,
	"cctp" text,
	"delai_contractuel" integer,
	"is_selected" boolean DEFAULT false,
	"selection_comment" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "aos_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "be_workload" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"week_number" integer NOT NULL,
	"year" integer NOT NULL,
	"planned_hours" numeric(8, 2) DEFAULT '35.00',
	"actual_hours" numeric(8, 2) DEFAULT '0.00',
	"dossier_count" integer DEFAULT 0,
	"charge_level" charge_status DEFAULT 'disponible',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chiffrage_elements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" varchar NOT NULL,
	"category" varchar NOT NULL,
	"subcategory" varchar,
	"designation" text NOT NULL,
	"unit" varchar NOT NULL,
	"quantity" numeric(10, 3) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(12, 2) NOT NULL,
	"coefficient" numeric(5, 2) DEFAULT '1.00',
	"margin_percentage" numeric(5, 2) DEFAULT '20.00',
	"supplier" varchar,
	"supplier_ref" varchar,
	"position" integer DEFAULT 0,
	"is_optional" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dpgf_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" varchar NOT NULL,
	"version" varchar DEFAULT '1.0',
	"status" varchar DEFAULT 'brouillon',
	"total_ht" numeric(12, 2) NOT NULL,
	"total_tva" numeric(12, 2) NOT NULL,
	"total_ttc" numeric(12, 2) NOT NULL,
	"dpgf_data" jsonb,
	"generated_by" varchar,
	"validated_by" varchar,
	"validated_at" timestamp,
	"batigest_ref" varchar,
	"batigest_synced_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar NOT NULL,
	"ao_id" varchar,
	"client" varchar NOT NULL,
	"location" varchar NOT NULL,
	"menuiserie_type" "menuiserie_type" NOT NULL,
	"montant_estime" numeric(12, 2),
	"montant_final" numeric(12, 2),
	"intitule_operation" text,
	"maitre_ouvrage_nom" varchar,
	"maitre_ouvrage_adresse" text,
	"maitre_ouvrage_contact" varchar,
	"maitre_ouvrage_email" varchar,
	"maitre_ouvrage_phone" varchar,
	"maitre_oeuvre" varchar,
	"maitre_oeuvre_contact" varchar,
	"type_marche" "marche_type",
	"prorata_eventuel" numeric(5, 2),
	"demarrage_prevu" timestamp,
	"source" "ao_source" DEFAULT 'website',
	"plateforme_source" varchar,
	"contact_direct" varchar,
	"departement" varchar,
	"distance_km" varchar,
	"date_os" timestamp,
	"delai_contractuel" varchar,
	"date_limite_remise" timestamp,
	"date_sortie_ao" timestamp,
	"date_rendu_ao" timestamp,
	"date_acceptation_ao" timestamp,
	"bureau_etudes" varchar,
	"bureau_controle" varchar,
	"sps" varchar,
	"cctp_disponible" boolean DEFAULT false,
	"cctp_imprime" boolean DEFAULT false,
	"etudes_thermiques_disponibles" boolean DEFAULT false,
	"etudes_acoustiques_disponibles" boolean DEFAULT false,
	"plans_disponibles" boolean DEFAULT false,
	"dpgf_client_disponible" boolean DEFAULT false,
	"dce_disponible" boolean DEFAULT false,
	"quantitatif_realise" boolean DEFAULT false,
	"portes_prevues" varchar,
	"fenetres_prevues" varchar,
	"autres_elements_prevus" varchar,
	"fournisseurs_consultes" varchar,
	"fournisseurs_retenus" jsonb,
	"tableaux_excel_generes" boolean DEFAULT false,
	"devis_detaille_etabli" boolean DEFAULT false,
	"fiches_techniques_transmises" boolean DEFAULT false,
	"dc1_complete" boolean DEFAULT false,
	"dc2_complete" boolean DEFAULT false,
	"references_travaux_fournies" boolean DEFAULT false,
	"kbis_valide" boolean DEFAULT false,
	"assurances_valides" boolean DEFAULT false,
	"quitus_legal_fourni" boolean DEFAULT false,
	"urssaf_valide" boolean DEFAULT false,
	"assurance_decennale_valide" boolean DEFAULT false,
	"rib_valide" boolean DEFAULT false,
	"qualifications_valides" boolean DEFAULT false,
	"plan_assurance_qualite_valide" boolean DEFAULT false,
	"document_passation_genere" boolean DEFAULT false,
	"page_garde_ao_generee" boolean DEFAULT false,
	"sous_dossiers_generes" boolean DEFAULT false,
	"point_offre_prevu" varchar,
	"dossier_etude_ao_cree" boolean DEFAULT false,
	"arborescence_generee" boolean DEFAULT false,
	"status" "offer_status" DEFAULT 'brouillon',
	"responsible_user_id" varchar,
	"is_priority" boolean DEFAULT false,
	"dpgf_data" jsonb,
	"batigest_ref" varchar,
	"fin_etudes_validated_at" timestamp,
	"fin_etudes_validated_by" varchar,
	"be_hours_estimated" numeric(8, 2),
	"be_hours_actual" numeric(8, 2),
	"deadline" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "offers_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "project_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'a_faire',
	"assigned_user_id" varchar,
	"start_date" timestamp,
	"end_date" timestamp,
	"estimated_hours" numeric(8, 2),
	"actual_hours" numeric(8, 2),
	"is_jalon" boolean DEFAULT false,
	"position" integer,
	"parent_task_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" varchar,
	"name" varchar NOT NULL,
	"client" varchar NOT NULL,
	"location" varchar NOT NULL,
	"status" "project_status" DEFAULT 'etude',
	"start_date" timestamp,
	"end_date" timestamp,
	"budget" numeric(12, 2),
	"responsible_user_id" varchar,
	"chef_travaux" varchar,
	"progress_percentage" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" varchar,
	"project_id" varchar,
	"supplier_name" varchar NOT NULL,
	"supplier_email" varchar,
	"supplier_phone" varchar,
	"description" text,
	"requested_items" jsonb,
	"status" varchar DEFAULT 'envoyee',
	"sent_at" timestamp DEFAULT now(),
	"response_at" timestamp,
	"quotation_amount" numeric(12, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_resources" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"user_id" varchar,
	"external_name" varchar,
	"role" varchar,
	"start_date" timestamp,
	"end_date" timestamp,
	"charge_status" charge_status DEFAULT 'disponible',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'technicien_be',
	"is_active" boolean DEFAULT true,
	"charge_status" charge_status DEFAULT 'disponible',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ao_lots" ADD CONSTRAINT "ao_lots_ao_id_aos_id_fk" FOREIGN KEY ("ao_id") REFERENCES "public"."aos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "be_workload" ADD CONSTRAINT "be_workload_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chiffrage_elements" ADD CONSTRAINT "chiffrage_elements_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dpgf_documents" ADD CONSTRAINT "dpgf_documents_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dpgf_documents" ADD CONSTRAINT "dpgf_documents_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dpgf_documents" ADD CONSTRAINT "dpgf_documents_validated_by_users_id_fk" FOREIGN KEY ("validated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_ao_id_aos_id_fk" FOREIGN KEY ("ao_id") REFERENCES "public"."aos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_responsible_user_id_users_id_fk" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_fin_etudes_validated_by_users_id_fk" FOREIGN KEY ("fin_etudes_validated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_responsible_user_id_users_id_fk" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_chef_travaux_users_id_fk" FOREIGN KEY ("chef_travaux") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_requests" ADD CONSTRAINT "supplier_requests_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_requests" ADD CONSTRAINT "supplier_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_resources" ADD CONSTRAINT "team_resources_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_resources" ADD CONSTRAINT "team_resources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ao_lots_ao_id_idx" ON "ao_lots" USING btree ("ao_id");--> statement-breakpoint
CREATE INDEX "aos_reference_idx" ON "aos" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "be_workload_user_week_idx" ON "be_workload" USING btree ("user_id","week_number","year");--> statement-breakpoint
CREATE INDEX "dpgf_offer_version_idx" ON "dpgf_documents" USING btree ("offer_id","version");--> statement-breakpoint
CREATE INDEX "offers_reference_idx" ON "offers" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "offers_status_idx" ON "offers" USING btree ("status");