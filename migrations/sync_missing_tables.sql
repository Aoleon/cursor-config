-- ========================================
-- SCRIPT DE SYNCHRONISATION COMPLÈTE DB
-- Tables manquantes pour tests E2E Monday
-- ========================================

-- Table de liaison AO-Contacts
-- Nécessaire pour MondayDataSplitter.linkAoContact()
CREATE TABLE IF NOT EXISTS ao_contacts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  ao_id VARCHAR NOT NULL REFERENCES aos(id) ON DELETE CASCADE,
  contact_id VARCHAR NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  link_type contact_link_type NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes pour ao_contacts
CREATE UNIQUE INDEX IF NOT EXISTS unique_ao_contact ON ao_contacts(ao_id, contact_id, link_type);
CREATE INDEX IF NOT EXISTS ao_contacts_ao_id_idx ON ao_contacts(ao_id);
CREATE INDEX IF NOT EXISTS ao_contacts_contact_id_idx ON ao_contacts(contact_id);
CREATE INDEX IF NOT EXISTS ao_contacts_link_type_idx ON ao_contacts(link_type);

-- Table de liaison Project-Contacts
CREATE TABLE IF NOT EXISTS project_contacts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contact_id VARCHAR NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  link_type contact_link_type NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes pour project_contacts
CREATE UNIQUE INDEX IF NOT EXISTS unique_project_contact ON project_contacts(project_id, contact_id, link_type);
CREATE INDEX IF NOT EXISTS project_contacts_project_id_idx ON project_contacts(project_id);
CREATE INDEX IF NOT EXISTS project_contacts_contact_id_idx ON project_contacts(contact_id);
CREATE INDEX IF NOT EXISTS project_contacts_link_type_idx ON project_contacts(link_type);

-- Table project_timelines pour système de dates intelligentes
CREATE TABLE IF NOT EXISTS project_timelines (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR REFERENCES projects(id) ON DELETE CASCADE,
  phase project_status NOT NULL,
  
  -- Dates planifiées vs réelles
  planned_start_date TIMESTAMP,
  planned_end_date TIMESTAMP,
  actual_start_date TIMESTAMP,
  actual_end_date TIMESTAMP,
  
  -- Métadonnées calculs intelligents
  duration_estimate INTEGER DEFAULT 0,
  confidence DECIMAL(3, 2) DEFAULT 0.80,
  calculation_method calculation_method DEFAULT 'automatic',
  
  -- Dépendances et contraintes
  depends_on TEXT[] DEFAULT '{}',
  risk_level priority_level DEFAULT 'normale',
  buffer_days INTEGER DEFAULT 0,
  
  -- Métadonnées système
  auto_calculated BOOLEAN DEFAULT true,
  last_calculated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR REFERENCES users(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes pour project_timelines
CREATE INDEX IF NOT EXISTS idx_project_timelines_project_id ON project_timelines(project_id);
CREATE INDEX IF NOT EXISTS idx_project_timelines_phase ON project_timelines(phase);

-- Vérification finale
SELECT 
  'ao_contacts' AS table_name, 
  COUNT(*) AS row_count,
  'CRÉÉE' AS status
FROM ao_contacts
UNION ALL
SELECT 
  'project_contacts', 
  COUNT(*),
  'CRÉÉE'
FROM project_contacts
UNION ALL
SELECT 
  'project_timelines', 
  COUNT(*),
  'CRÉÉE'
FROM project_timelines;
