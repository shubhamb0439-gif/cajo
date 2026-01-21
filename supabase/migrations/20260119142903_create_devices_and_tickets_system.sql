/*
  # Create Devices and Tickets System

  1. New Tables
    - devices: Stores all devices (lasers) associated with customers
    - device_history: Tracks all status changes and events for devices
    - tickets: Support tickets for device issues

  2. Security
    - Enable RLS on all tables
    - Clients can only access their own customer devices and tickets
    - Managers can access their customer devices and tickets
    - Admin users can access all devices and tickets

  3. Important Notes
    - Device status flow: ordered, delivered, installed, online, offline
    - All status changes are logged in device_history
    - Tickets are auto-numbered with prefix TKT
    - QR codes must be unique across all devices
*/

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  device_serial_number text UNIQUE NOT NULL,
  qr_code text UNIQUE,
  status text NOT NULL DEFAULT 'ordered',
  ordered_date timestamptz,
  delivered_date timestamptz,
  installed_date timestamptz,
  last_online_at timestamptz,
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create device_history table
CREATE TABLE IF NOT EXISTS device_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  status text NOT NULL,
  changed_at timestamptz DEFAULT now(),
  changed_by uuid REFERENCES users(id),
  notes text,
  location text
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  ticket_number text UNIQUE NOT NULL,
  ticket_type text NOT NULL DEFAULT 'support',
  status text NOT NULL DEFAULT 'open',
  priority text DEFAULT 'medium',
  description text,
  raised_by uuid REFERENCES users(id),
  raised_at timestamptz DEFAULT now(),
  closed_by uuid REFERENCES users(id),
  closed_at timestamptz,
  resolution_notes text
);

-- Create sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1000;

-- Create function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS text AS $$
BEGIN
  RETURN 'TKT-' || LPAD(nextval('ticket_number_seq')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_ticket_number ON tickets;
CREATE TRIGGER trigger_set_ticket_number
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- Create trigger to log device status changes to history
CREATE OR REPLACE FUNCTION log_device_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO device_history (device_id, status, changed_at, notes, location)
    VALUES (NEW.id, NEW.status, now(), 
      CASE 
        WHEN TG_OP = 'INSERT' THEN 'Device created'
        ELSE 'Status changed from ' || OLD.status || ' to ' || NEW.status
      END,
      NEW.location
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_device_status ON devices;
CREATE TRIGGER trigger_log_device_status
  AFTER INSERT OR UPDATE ON devices
  FOR EACH ROW
  EXECUTE FUNCTION log_device_status_change();

-- Enable RLS
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Devices policies
CREATE POLICY "Admin can view all devices"
  ON devices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Client and manager can view their customer devices"
  ON devices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND customer_id = devices.customer_id
      AND role IN ('client', 'manager')
    )
  );

CREATE POLICY "Admin can insert devices"
  ON devices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin can update devices"
  ON devices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin can delete devices"
  ON devices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Device history policies
CREATE POLICY "Admin can view all device history"
  ON device_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Client and manager can view their device history"
  ON device_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN devices d ON d.customer_id = u.customer_id
      WHERE u.auth_user_id = auth.uid() 
      AND d.id = device_history.device_id
      AND u.role IN ('client', 'manager')
    )
  );

CREATE POLICY "System can insert device history"
  ON device_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Tickets policies
CREATE POLICY "Admin can view all tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Client and manager can view their customer tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND customer_id = tickets.customer_id
      AND role IN ('client', 'manager')
    )
  );

CREATE POLICY "Client and manager can insert tickets for their devices"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN devices d ON d.customer_id = u.customer_id
      WHERE u.auth_user_id = auth.uid() 
      AND d.id = tickets.device_id
      AND u.role IN ('client', 'manager')
    )
  );

CREATE POLICY "Admin can insert tickets"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin can update tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Manager can update their customer tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND customer_id = tickets.customer_id
      AND role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND customer_id = tickets.customer_id
      AND role = 'manager'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_devices_customer_id ON devices(customer_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_qr_code ON devices(qr_code);
CREATE INDEX IF NOT EXISTS idx_device_history_device_id ON device_history(device_id);
CREATE INDEX IF NOT EXISTS idx_device_history_changed_at ON device_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_device_id ON tickets(device_id);
CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_raised_at ON tickets(raised_at DESC);

-- Enable realtime for devices and tickets
ALTER PUBLICATION supabase_realtime ADD TABLE devices;
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
