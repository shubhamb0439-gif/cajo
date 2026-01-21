/*
  # Add DELETE policy for activity_logs

  ## Changes
  - Adds DELETE policy to activity_logs table allowing authenticated users to delete activity logs
  - Required for system reset functionality to clear activity logs

  ## Security
  - Only authenticated users can delete activity logs
  - This is necessary for the "Reset System & Delete All Data" feature
*/

CREATE POLICY "Authenticated users can delete activity logs"
  ON activity_logs FOR DELETE
  TO authenticated
  USING (true);
