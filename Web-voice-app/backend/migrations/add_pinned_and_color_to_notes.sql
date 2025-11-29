-- Add pinned and color fields to notes table
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#ffffff';

-- Create index for pinned notes
CREATE INDEX IF NOT EXISTS idx_pinned ON notes(pinned);

