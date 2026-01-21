/*
  # Seed Sample Devices for Testing

  1. Sample Data
    - Create sample devices for the first customer in the database
    - Various statuses: ordered, delivered, installed, online, offline
    - Sample locations using three-word format
    - Device history entries

  2. Important Notes
    - This is test/demo data
    - Only inserts if customer exists
    - Uses realistic dates and device serial numbers
*/

-- Insert sample devices only if we have customers
DO $$
DECLARE
  v_customer_id uuid;
BEGIN
  -- Get the first customer
  SELECT id INTO v_customer_id FROM customers LIMIT 1;
  
  IF v_customer_id IS NOT NULL THEN
    -- Insert sample devices
    INSERT INTO devices (customer_id, device_serial_number, qr_code, status, ordered_date, delivered_date, installed_date, last_online_at, location)
    VALUES
      (v_customer_id, 'LSR-2024-001', 'QR-LSR-2024-001', 'online', NOW() - INTERVAL '60 days', NOW() - INTERVAL '45 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '2 hours', 'apple.banana.cherry'),
      (v_customer_id, 'LSR-2024-002', 'QR-LSR-2024-002', 'online', NOW() - INTERVAL '55 days', NOW() - INTERVAL '40 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '1 hour', 'delta.echo.foxtrot'),
      (v_customer_id, 'LSR-2024-003', 'QR-LSR-2024-003', 'offline', NOW() - INTERVAL '50 days', NOW() - INTERVAL '35 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '3 days', 'golf.hotel.india'),
      (v_customer_id, 'LSR-2024-004', 'QR-LSR-2024-004', 'installed', NOW() - INTERVAL '30 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '5 days', NULL, 'juliet.kilo.lima'),
      (v_customer_id, 'LSR-2024-005', 'QR-LSR-2024-005', 'delivered', NOW() - INTERVAL '20 days', NOW() - INTERVAL '10 days', NULL, NULL, 'mike.november.oscar'),
      (v_customer_id, 'LSR-2024-006', 'QR-LSR-2024-006', 'ordered', NOW() - INTERVAL '5 days', NULL, NULL, NULL, NULL),
      (v_customer_id, 'LSR-2024-007', 'QR-LSR-2024-007', 'online', NOW() - INTERVAL '90 days', NOW() - INTERVAL '75 days', NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 minutes', 'papa.quebec.romeo'),
      (v_customer_id, 'LSR-2024-008', 'QR-LSR-2024-008', 'offline', NOW() - INTERVAL '70 days', NOW() - INTERVAL '55 days', NOW() - INTERVAL '40 days', NOW() - INTERVAL '5 days', 'sierra.tango.uniform')
    ON CONFLICT (device_serial_number) DO NOTHING;
  END IF;
END $$;
