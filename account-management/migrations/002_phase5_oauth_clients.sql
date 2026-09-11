ALTER TABLE application_oauth_clients ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;
ALTER TABLE application_oauth_clients ADD COLUMN IF NOT EXISTS redirect_uris jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE application_oauth_clients ADD COLUMN IF NOT EXISTS web_origins jsonb NOT NULL DEFAULT '[]'::jsonb;
