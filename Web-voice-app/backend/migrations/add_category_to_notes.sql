-- Add category_id to notes table
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS category_id INT NULL,
ADD FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- Create index for category_id
CREATE INDEX IF NOT EXISTS idx_category_id ON notes(category_id);

