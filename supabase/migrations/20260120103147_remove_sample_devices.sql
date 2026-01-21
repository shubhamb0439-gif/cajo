/*
  # Remove Sample Devices

  1. Changes
    - Remove all sample devices that were created for testing purposes
    - Cleans up devices with serial numbers LSR-2024-001 through LSR-2024-008

  2. Security
    - Only removes devices with specific test serial numbers
    - Does not affect any real customer devices
*/

-- Delete sample devices by their known serial numbers
DELETE FROM devices 
WHERE device_serial_number IN (
  'LSR-2024-001',
  'LSR-2024-002',
  'LSR-2024-003',
  'LSR-2024-004',
  'LSR-2024-005',
  'LSR-2024-006',
  'LSR-2024-007',
  'LSR-2024-008'
);
