-- Add sample universities to the universities table
-- Run this in your Supabase SQL Editor

INSERT INTO universities (name, locations, logo_url, logo_scale)
VALUES 
  ('Ebonyi State University (EBSU)', '["Presco", "Palmsite", "Town", "CAS", "Ishieke", "Front Gate"]', NULL, 1.1),
  ('University of Lagos (UNILAG)', '["Akoka", "Yaba", "Bariga", "Onike"]', NULL, 1.1),
  ('Ahmadu Bello University (ABU)', '["Samaru", "Kongo", "Shika", "Aviation"]', NULL, 1.1)
ON CONFLICT (name) DO NOTHING;

-- Verify the insert
SELECT id, name, locations, logo_url, logo_scale FROM universities;
