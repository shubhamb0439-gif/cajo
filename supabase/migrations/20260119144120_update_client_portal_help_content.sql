/*
  # Update Help Content for Client Portal

  1. Changes
    - Remove all existing ERP-related help content
    - Add new categories specific to Client Portal
    - Add knowledgebase articles for portal features
    - Add FAQ articles for common client questions
    - Add how-to guides for portal operations

  2. New Categories
    - Getting Started
    - Device Management
    - Status Monitoring
    - Reporting Issues
    - Account Settings
*/

-- Clear existing help content
DELETE FROM help_articles;
DELETE FROM help_categories;

-- Insert new Client Portal categories
INSERT INTO help_categories (name, icon, "order") VALUES
  ('Getting Started', 'Zap', 1),
  ('Device Management', 'Cpu', 2),
  ('Status Monitoring', 'Activity', 3),
  ('Reporting Issues', 'AlertCircle', 4),
  ('Account Settings', 'Settings', 5);

-- Get category IDs for reference
DO $$
DECLARE
  cat_getting_started uuid;
  cat_device_mgmt uuid;
  cat_status_monitor uuid;
  cat_reporting uuid;
  cat_settings uuid;
BEGIN
  SELECT id INTO cat_getting_started FROM help_categories WHERE name = 'Getting Started';
  SELECT id INTO cat_device_mgmt FROM help_categories WHERE name = 'Device Management';
  SELECT id INTO cat_status_monitor FROM help_categories WHERE name = 'Status Monitoring';
  SELECT id INTO cat_reporting FROM help_categories WHERE name = 'Reporting Issues';
  SELECT id INTO cat_settings FROM help_categories WHERE name = 'Account Settings';

  -- Getting Started Articles
  INSERT INTO help_articles (category_id, title, content, type, tags, "order") VALUES
    (cat_getting_started, 'Welcome to Your Client Portal',
    E'Welcome to your laser device management portal! This portal allows you to monitor and manage all your laser devices in one place.\n\nKey Features:\n• Real-time device status monitoring\n• Track devices from order to installation\n• Report device issues instantly\n• View complete device history\n• Search and filter your devices\n• Access from any device with internet\n\nYour dashboard shows:\n• Total lasers ordered\n• Lasers delivered\n• Lasers installed and operational\n• Any devices currently offline\n\nUse the navigation menu to explore all features. If you need help, click the help icon at any time.',
    'knowledgebase', ARRAY['portal', 'getting started', 'overview'], 1),

    (cat_getting_started, 'Understanding Device Status',
    E'Your devices can have different status levels:\n\nOrdered:\n• Device has been ordered from the manufacturer\n• Not yet shipped or delivered\n• Visible in your portal for tracking\n\nDelivered:\n• Device has arrived at your location\n• Ready for installation\n• Awaiting setup and configuration\n\nInstalled:\n• Device has been professionally installed\n• Configured and ready for use\n• May be online or offline\n\nOnline:\n• Device is operational and connected\n• Actively communicating with our systems\n• Functioning normally\n\nOffline:\n• Device has lost connection\n• May need attention or troubleshooting\n• Report issues using the portal buttons',
    'knowledgebase', ARRAY['status', 'devices', 'overview'], 2),

    (cat_getting_started, 'What information can I see about my devices?',
    E'Q: What details are shown for each device?\nA: For each device, you can see:\n• Serial number\n• Current status (ordered, delivered, installed, online, offline)\n• Order date\n• Delivery date\n• Installation date\n• Installation location\n• Last online timestamp\n• Complete status change history\n\nQ: How do I find a specific device?\nA: Use the search bar to find devices by serial number or location. You can also filter by status.\n\nQ: Can I export device information?\nA: Contact your account manager for custom reports and data exports.\n\nQ: How often is the information updated?\nA: Device status updates in real-time. You''ll see changes immediately as they occur.',
    'faq', ARRAY['devices', 'information', 'details'], 3);

  -- Device Management Articles
  INSERT INTO help_articles (category_id, title, content, type, tags, "order") VALUES
    (cat_device_mgmt, 'Viewing Your Devices',
    E'The main dashboard displays all your devices with their current status.\n\nDevice List Features:\n• Each device shows its serial number and status badge\n• Color-coded status for quick identification\n• Important dates (ordered, delivered, installed)\n• Device location information\n• Last online timestamp for offline devices\n\nInteractive Features:\n• Click "View History" to see complete status changes\n• Search by serial number or location\n• Filter devices by status type\n• Expand devices to see detailed history\n\nThe list updates automatically as device statuses change, so you always have the latest information.',
    'knowledgebase', ARRAY['devices', 'viewing', 'list'], 1),

    (cat_device_mgmt, 'How to Search and Filter Devices',
    E'Step-by-step guide to finding devices:\n\n1. Use the Search Bar:\n   - Located at the top of the device list\n   - Type a serial number to find specific devices\n   - Type a location to find all devices there\n   - Search works in real-time as you type\n\n2. Use Status Filters:\n   - Click the status dropdown menu\n   - Select a specific status (Ordered, Delivered, etc.)\n   - Select "All Status" to clear the filter\n\n3. Combine Search and Filters:\n   - Use both together for precise results\n   - Example: Filter by "Installed" and search "Building A"\n   - This shows only installed devices in Building A\n\n4. Clear Your Search:\n   - Delete text from the search bar\n   - Reset filter to "All Status"\n   - View all devices again',
    'howto', ARRAY['devices', 'search', 'filter', 'tutorial'], 2),

    (cat_device_mgmt, 'Understanding Device History',
    E'Every device maintains a complete history of status changes.\n\nWhat''s Tracked:\n• Every status change with timestamp\n• Who made the change (our team or you)\n• Notes about each change\n• Complete audit trail from order to installation\n\nTo View History:\n1. Find the device in your list\n2. Click "View History" button\n3. History appears below device details\n4. Most recent changes shown first\n\nHistory includes:\n• Exact date and time of change\n• Status transition (e.g., delivered → installed)\n• Any notes or comments about the change\n• Complete chronological record\n\nClick "Hide History" to collapse the view.',
    'knowledgebase', ARRAY['devices', 'history', 'tracking'], 3),

    (cat_device_mgmt, 'Can I add or remove devices?',
    E'Q: Can I add new devices to the portal?\nA: New devices are automatically added when you place an order with us. They''ll appear in your portal immediately.\n\nQ: Who updates device information?\nA: Our team updates device status as they move through order, delivery, and installation. You can report status changes (online/offline) using the portal buttons.\n\nQ: Can I edit device details?\nA: Device details are managed by our team to ensure accuracy. Contact your account manager for any corrections.\n\nQ: What if I don''t see a device I ordered?\nA: Contact support immediately. All orders should appear in your portal within 24 hours.',
    'faq', ARRAY['devices', 'add', 'remove', 'edit'], 4);

  -- Status Monitoring Articles
  INSERT INTO help_articles (category_id, title, content, type, tags, "order") VALUES
    (cat_status_monitor, 'Dashboard Metrics Overview',
    E'Your dashboard provides at-a-glance metrics for all your devices.\n\nLasers Ordered:\n• Total devices currently on order\n• Includes devices not yet delivered\n• Updated when new orders are placed\n\nLasers Delivered:\n• Devices that have arrived\n• Awaiting installation\n• Located at your facility\n\nLasers Installed:\n• Professionally installed devices\n• Configured and ready for use\n• May be online or offline\n\nLasers Offline:\n• Devices that have lost connection\n• May need immediate attention\n• Click the red number to see which devices\n\nThese metrics update in real-time as device statuses change.',
    'knowledgebase', ARRAY['dashboard', 'metrics', 'overview'], 1),

    (cat_status_monitor, 'What does "Last Online" mean?',
    E'Q: What does the "Last Online" timestamp tell me?\nA: It shows the exact date and time when the device last successfully connected to our monitoring system.\n\nQ: How often do devices check in?\nA: Devices typically check in every few minutes when operating normally.\n\nQ: If "Last Online" was yesterday, is there a problem?\nA: Yes, this indicates the device has been offline for over 24 hours. Please report this issue.\n\nQ: Can I see a history of online/offline periods?\nA: Yes! Click "View History" on any device to see all status changes including online/offline transitions.\n\nQ: What causes devices to go offline?\nA: Common causes include power issues, network connectivity problems, or device malfunctions. Our team can diagnose the specific issue.',
    'faq', ARRAY['status', 'online', 'monitoring'], 2),

    (cat_status_monitor, 'Real-Time Updates',
    E'The Client Portal updates device information automatically in real-time.\n\nAutomatic Updates:\n• No need to refresh your browser\n• Changes appear instantly\n• Status badges update immediately\n• Metrics recalculate automatically\n• New devices appear when added\n\nWhat This Means:\n• You always see current information\n• No stale or outdated data\n• Instant visibility into device issues\n• Immediate confirmation of status changes\n\nBest Practice:\n• Keep the portal open for continuous monitoring\n• Check regularly for offline alerts\n• Respond quickly to status changes\n• Contact support if updates seem delayed',
    'knowledgebase', ARRAY['status', 'updates', 'realtime'], 3);

  -- Reporting Issues Articles
  INSERT INTO help_articles (category_id, title, content, type, tags, "order") VALUES
    (cat_reporting, 'How to Report a Device Offline',
    E'Step-by-step guide to reporting offline devices:\n\n1. Click the red "Report Device Offline" button\n   - Located on the main dashboard\n   - Opens the QR code scanner\n\n2. Scan the Device QR Code:\n   - Point your camera at the QR code on the device\n   - The code is usually on the device label\n   - Alternatively, manually enter the serial number\n\n3. Confirm Device Details:\n   - Verify you have the correct device\n   - Check the serial number matches\n\n4. Submit the Report:\n   - System creates a support ticket\n   - Our team is notified immediately\n   - Device status updates to "offline"\n\n5. Track the Resolution:\n   - View the device history for updates\n   - Support team will contact you\n   - Status updates as issue is resolved',
    'howto', ARRAY['reporting', 'offline', 'issues', 'tutorial'], 1),

    (cat_reporting, 'How to Confirm a Device is Online',
    E'Step-by-step guide to confirming device status:\n\n1. Click the green "Confirm Device Online" button\n   - Located on the main dashboard\n   - Opens the QR code scanner\n\n2. Scan the Device QR Code:\n   - Point your camera at the device QR code\n   - Or manually enter the serial number\n\n3. Verify Device Information:\n   - Confirm the device details\n   - Check it was previously offline\n\n4. Submit Confirmation:\n   - System updates device status to "online"\n   - Creates a history entry\n   - Closes any related support tickets\n\n5. Verification:\n   - Device appears in "online" status\n   - Removed from offline metrics\n   - Last online timestamp updates\n\nUse this feature after resolving connectivity issues.',
    'howto', ARRAY['reporting', 'online', 'confirm', 'tutorial'], 2),

    (cat_reporting, 'Using the QR Code Scanner',
    E'The QR code scanner allows quick device identification.\n\nHow to Use:\n1. Click either reporting button (offline/online)\n2. Allow camera access when prompted\n3. Point camera at device QR code\n4. Scanner automatically detects and reads code\n5. Device information appears instantly\n\nTroubleshooting:\n• Ensure good lighting on QR code\n• Hold camera steady\n• Keep QR code in frame\n• Try different angles if not scanning\n• Use manual serial number entry if needed\n\nManual Entry:\n• Click "Enter Manually" option\n• Type the device serial number\n• Found on device label\n• Submit to continue\n\nThe scanner works on phones, tablets, and computers with cameras.',
    'knowledgebase', ARRAY['qr', 'scanner', 'reporting'], 3),

    (cat_reporting, 'What happens after I report an issue?',
    E'Q: What happens after I report a device offline?\nA: Our support team receives an immediate notification and creates a support ticket. They''ll diagnose the issue and contact you with a resolution plan.\n\nQ: How long until someone responds?\nA: We aim to respond within 2 hours during business hours. Critical issues receive immediate attention.\n\nQ: Can I see the status of my report?\nA: Yes, check the device history to see updates. Support tickets and resolution steps appear there.\n\nQ: What if the device is actually online?\nA: If you reported offline by mistake, use the "Confirm Device Online" button to correct it. The system will update immediately.\n\nQ: Will I be notified when the issue is resolved?\nA: Yes, our team will contact you when the device is back online and functioning normally.',
    'faq', ARRAY['reporting', 'support', 'tickets'], 4);

  -- Account Settings Articles
  INSERT INTO help_articles (category_id, title, content, type, tags, "order") VALUES
    (cat_settings, 'Managing Your Profile',
    E'Your profile contains your personal information and preferences.\n\nProfile Information:\n• Your full name\n• Email address\n• Profile picture\n• Company affiliation\n• Role (Client or Manager)\n\nWhat You Can Change:\n• Your name\n• Email address (with verification)\n• Profile picture\n• Password\n\nWhat You Cannot Change:\n• Your company assignment\n• Your role (contact admin)\n• Device access permissions\n• Portal features available\n\nTo access settings, click your profile picture in the top right corner and select "Settings".',
    'knowledgebase', ARRAY['settings', 'profile', 'account'], 1),

    (cat_settings, 'How to Update Your Profile Information',
    E'Step-by-step guide to updating your profile:\n\n1. Click your profile picture (top right)\n2. Select "Settings" from the menu\n3. Click the "Edit Profile" tab\n\n4. Update Your Name:\n   - Click in the name field\n   - Type your new name\n   - Changes save automatically\n\n5. Change Your Email:\n   - Enter new email address\n   - Verify the email when prompted\n   - Must be unique and valid\n\n6. Update Profile Picture:\n   - Click "Choose File" button\n   - Select an image from your device\n   - Image uploads and displays immediately\n   - Appears in top right corner\n\n7. Click "Update Profile" to save all changes\n\nChanges take effect immediately throughout the portal.',
    'howto', ARRAY['settings', 'profile', 'update', 'tutorial'], 2),

    (cat_settings, 'How to Change Your Password',
    E'Step-by-step guide to changing your password:\n\n1. Click your profile picture (top right)\n2. Select "Settings" from the menu\n3. Click the "Change Password" tab\n\n4. Enter Current Password:\n   - Type your existing password\n   - Required for security verification\n\n5. Enter New Password:\n   - Type your new password\n   - Must be at least 6 characters\n   - Use a strong, unique password\n\n6. Confirm New Password:\n   - Type the new password again\n   - Must match exactly\n\n7. Click "Update Password"\n\n8. You''ll receive confirmation\n   - Password changes immediately\n   - Use new password for next login\n\nSecurity Tips:\n• Use a unique password for this portal\n• Include numbers and special characters\n• Don''t share your password\n• Change periodically for security',
    'howto', ARRAY['settings', 'password', 'security', 'tutorial'], 3),

    (cat_settings, 'What is the difference between Client and Manager roles?',
    E'Q: What can Client users do?\nA: Clients can view all devices for their company, report issues using QR scanner, view device history, and manage their own profile settings.\n\nQ: What additional access do Managers have?\nA: Managers have all Client permissions plus they can manage team members, view company-wide reports, and access advanced features.\n\nQ: How do I become a Manager?\nA: Contact your account administrator or our support team to request Manager access. Role changes require approval.\n\nQ: Can I see devices from other companies?\nA: No, you can only see devices assigned to your company. This ensures data security and privacy.\n\nQ: Can I change my own role?\nA: No, only system administrators can change user roles. Contact support if you need a role change.',
    'faq', ARRAY['settings', 'roles', 'permissions'], 4),

    (cat_settings, 'Getting Additional Help',
    E'Need more assistance? We''re here to help!\n\nIn-Portal Help:\n• Click the help icon (?) anytime\n• Browse knowledgebase articles\n• Read FAQ for quick answers\n• Follow step-by-step guides\n\nContact Support:\n• Email: support@company.com\n• Phone: Available in your welcome email\n• Live chat: Click chat icon (if available)\n• Support tickets: Created automatically when reporting issues\n\nYour Account Manager:\n• Direct contact for account questions\n• Custom reports and data requests\n• Feature requests and feedback\n• Contract and billing questions\n\nEmergency Support:\n• For critical device failures, call support directly\n• 24/7 emergency line for urgent issues\n• Provide device serial number and description\n\nWe typically respond within 2 hours during business hours.',
    'knowledgebase', ARRAY['help', 'support', 'contact'], 5);

END $$;
