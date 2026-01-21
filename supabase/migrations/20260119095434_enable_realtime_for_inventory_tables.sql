/*
  # Enable Realtime for Inventory-Related Tables

  ## Overview
  This migration enables realtime replication for all tables that need to trigger
  real-time UI updates when inventory, deliveries, and stock movements change.

  ## Tables Enabled for Realtime
  1. `inventory_items` - For stock level updates
  2. `stock_movements` - For tracking inventory changes
  3. `deliveries` - For delivery status updates
  4. `sale_items` - For tracking sold item status
  5. `assemblies` - For assembly changes
  6. `assembly_units` - For unit-level updates
  7. `assembly_items` - For component tracking

  ## Important Notes
  - Realtime must be enabled for frontend subscriptions to work
  - These tables are updated by various operations (purchases, assemblies, deliveries)
  - UI components listen to these changes for automatic updates
*/

-- Enable realtime replication on inventory and delivery-related tables
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE sale_items;
ALTER PUBLICATION supabase_realtime ADD TABLE assemblies;
ALTER PUBLICATION supabase_realtime ADD TABLE assembly_units;
ALTER PUBLICATION supabase_realtime ADD TABLE assembly_items;
