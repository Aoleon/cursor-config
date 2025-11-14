-- Migration SQL manuelle pour créer la table cursor_conversations
-- À exécuter si drizzle-kit push ne fonctionne pas

CREATE TABLE IF NOT EXISTS cursor_conversations (
  id VARCHAR(255) PRIMARY KEY,
  cursor_conversation_id VARCHAR(255) NOT NULL UNIQUE,
  title TEXT,
  project_path TEXT,
  messages JSONB NOT NULL,
  metadata JSONB,
  workspace_folder TEXT,
  context_files TEXT[],
  context_rules TEXT[],
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP,
  archived_at TIMESTAMP,
  stored_at TIMESTAMP DEFAULT NOW() NOT NULL,
  message_count INTEGER NOT NULL,
  has_code_changes BOOLEAN DEFAULT FALSE,
  has_errors BOOLEAN DEFAULT FALSE,
  has_solutions BOOLEAN DEFAULT FALSE,
  topics TEXT[],
  search_text TEXT
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS cursor_conversations_created_at_idx ON cursor_conversations(created_at);
CREATE INDEX IF NOT EXISTS cursor_conversations_project_path_idx ON cursor_conversations(project_path);
CREATE INDEX IF NOT EXISTS cursor_conversations_stored_at_idx ON cursor_conversations(stored_at);

-- Index pour recherche full-text (optionnel, nécessite extension pg_trgm)
-- CREATE INDEX IF NOT EXISTS cursor_conversations_search_text_idx ON cursor_conversations USING gin(search_text gin_trgm_ops);

