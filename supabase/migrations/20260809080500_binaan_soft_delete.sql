-- Add deleted_at column and index to binaan table for soft delete support
ALTER TABLE public.binaan ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_binaan_status ON public.binaan(status);
CREATE INDEX IF NOT EXISTS idx_binaan_deleted_at ON public.binaan(deleted_at);
