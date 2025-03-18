-- Migration: Add openrouter_key_hash column to users table
-- Date: Created on demand to fix missing column error

-- Add the openrouter_key_hash column if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS openrouter_key_hash TEXT;

-- Comment on the column to document its purpose
COMMENT ON COLUMN public.users.openrouter_key_hash IS 'Hash reference to the user''s OpenRouter API key';

-- Update any existing rows that might need a default value
-- This is a placeholder and can be modified based on your needs
-- UPDATE public.users SET openrouter_key_hash = NULL WHERE openrouter_key_hash IS NULL;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users' 
AND column_name = 'openrouter_key_hash'; 