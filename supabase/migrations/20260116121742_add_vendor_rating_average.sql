/*
  # Add vendor rating average column

  1. Changes
    - Add `vendor_rating_average` column to `vendors` table to store the calculated average of price, quality, and lead time ratings
  
  2. Details
    - Column type: numeric
    - Nullable: yes
    - Default value: 0
    - Constraint: value must be between 0 and 5
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'vendor_rating_average'
  ) THEN
    ALTER TABLE vendors ADD COLUMN vendor_rating_average numeric DEFAULT 0 CHECK (vendor_rating_average >= 0 AND vendor_rating_average <= 5);
  END IF;
END $$;