/*
  # Fix Purchase Orders RLS Policies

  ## Changes
  Updates RLS policies for purchase_orders and purchase_order_items tables to use 
  correct role values that exist in the users table.

  ## Security
  - Allows admin, manager, and user roles to create/update purchase orders
  - Allows admin and manager roles to delete purchase orders
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Users can update purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Users can delete purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Users can create PO items" ON purchase_order_items;
DROP POLICY IF EXISTS "Users can update PO items" ON purchase_order_items;
DROP POLICY IF EXISTS "Users can delete PO items" ON purchase_order_items;

-- Recreate policies with correct role checks
CREATE POLICY "Users can create purchase orders"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'manager', 'user')
    )
  );

CREATE POLICY "Users can update purchase orders"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'manager', 'user')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'manager', 'user')
    )
  );

CREATE POLICY "Users can delete purchase orders"
  ON purchase_orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- Recreate policies for purchase_order_items
CREATE POLICY "Users can create PO items"
  ON purchase_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'manager', 'user')
    )
  );

CREATE POLICY "Users can update PO items"
  ON purchase_order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'manager', 'user')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'manager', 'user')
    )
  );

CREATE POLICY "Users can delete PO items"
  ON purchase_order_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );
