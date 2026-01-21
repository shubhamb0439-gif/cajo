/*
  # Add Late Purchase Order Status Automation

  1. Changes
    - Create a function to automatically update PO status to 'late' when delivery_date has passed
    - Create a trigger that runs on INSERT and UPDATE of purchase_orders
    - This ensures POs are marked late automatically when their delivery date passes

  2. Logic
    - If status is 'open' and delivery_date is in the past, change status to 'late'
    - Only affects open POs with a delivery_date set
    - Completed, cancelled, and in_progress POs are not affected

  3. Security
    - Function runs with security definer privileges
    - No RLS policy changes needed
*/

-- Create function to automatically mark late POs
CREATE OR REPLACE FUNCTION mark_late_purchase_orders()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is 'open' and delivery_date is in the past, mark as 'late'
  IF NEW.status = 'open' AND NEW.delivery_date IS NOT NULL AND NEW.delivery_date < CURRENT_DATE THEN
    NEW.status = 'late';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on purchase_orders
DROP TRIGGER IF EXISTS trigger_mark_late_purchase_orders ON purchase_orders;
CREATE TRIGGER trigger_mark_late_purchase_orders
  BEFORE INSERT OR UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION mark_late_purchase_orders();

-- Update existing open POs that are already late
UPDATE purchase_orders
SET status = 'late'
WHERE status = 'open'
  AND delivery_date IS NOT NULL
  AND delivery_date < CURRENT_DATE;
