/*
  # Seed Help Content

  1. Categories
    - Inventory Management
    - Purchase Management
    - Manufacturing
    - Vendor Management
    - User Management
    - System Administration

  2. Articles
    - Knowledge base articles
    - FAQ articles
    - How-to guides
*/

-- Insert categories
INSERT INTO help_categories (name, icon, "order") VALUES
  ('Inventory Management', 'Package', 1),
  ('Purchase Management', 'ShoppingCart', 2),
  ('Manufacturing', 'Settings', 3),
  ('Vendor Management', 'Users', 4),
  ('User Management', 'UserCog', 5),
  ('System Administration', 'Shield', 6)
ON CONFLICT DO NOTHING;

-- Get category IDs for reference
DO $$
DECLARE
  cat_inventory uuid;
  cat_purchase uuid;
  cat_manufacturing uuid;
  cat_vendor uuid;
  cat_user uuid;
  cat_admin uuid;
BEGIN
  SELECT id INTO cat_inventory FROM help_categories WHERE name = 'Inventory Management';
  SELECT id INTO cat_purchase FROM help_categories WHERE name = 'Purchase Management';
  SELECT id INTO cat_manufacturing FROM help_categories WHERE name = 'Manufacturing';
  SELECT id INTO cat_vendor FROM help_categories WHERE name = 'Vendor Management';
  SELECT id INTO cat_user FROM help_categories WHERE name = 'User Management';
  SELECT id INTO cat_admin FROM help_categories WHERE name = 'System Administration';

  -- Inventory Management Articles
  INSERT INTO help_articles (category_id, title, content, type, tags, "order") VALUES
    (cat_inventory, 'Getting Started with Inventory', 
    E'The Inventory Management module allows you to track and manage all your inventory items.\n\nKey Features:\n• Add, edit, and delete inventory items\n• Track stock levels (current, minimum, maximum)\n• View purchase history for each item\n• Monitor assembly usage\n• Set up serial number tracking\n• Organize items by groups\n\nTo add a new item:\n1. Navigate to the Inventory page\n2. Click the "Add Item" button\n3. Fill in the item details (ID, name, description)\n4. Set stock levels (current, min, max)\n5. Choose if serial tracking is required\n6. Select the item group\n7. Click "Create Item"',
    'knowledgebase', ARRAY['inventory', 'getting started', 'basics'], 1),

    (cat_inventory, 'How to Add a New Inventory Item', 
    E'Step-by-step guide to adding inventory items:\n\n1. Navigate to the Inventory page from the sidebar\n2. Click the blue "Add Item" button in the top right\n3. Enter a unique Item ID (e.g., PART001)\n4. Enter the Item Name\n5. Add a description (optional)\n6. Set Current Stock quantity\n7. Set Minimum Stock level for alerts\n8. Set Maximum Stock level\n9. Check "Serial Number Tracked" if needed\n10. Select an Item Group from the dropdown\n11. Click "Create Item" to save\n\nThe item will immediately appear in your inventory list.',
    'howto', ARRAY['inventory', 'add item', 'tutorial'], 2),

    (cat_inventory, 'Understanding Stock Alerts', 
    E'Stock alerts help you maintain optimal inventory levels.\n\nHow it works:\n• When an item''s current stock falls below its minimum level, an alert is triggered\n• Alerts appear on the Dashboard\n• The Inventory page shows items with low stock in red\n\nBest Practices:\n• Set minimum levels based on lead times\n• Review alerts regularly\n• Place orders before stock runs out\n• Adjust min/max levels based on usage patterns',
    'knowledgebase', ARRAY['inventory', 'alerts', 'stock'], 3),

    (cat_inventory, 'What is Serial Number Tracking?', 
    E'Q: What is serial number tracking?\nA: Serial number tracking allows you to track individual units of an item by their unique serial numbers. This is useful for high-value items, warranty tracking, or quality control.\n\nQ: When should I enable it?\nA: Enable serial tracking for items that need individual identification, such as electronics, equipment, or products with warranties.\n\nQ: How does it affect manufacturing?\nA: When assembling items with serial tracking enabled, you''ll need to provide unique serial numbers for each unit produced.',
    'faq', ARRAY['inventory', 'serial numbers', 'tracking'], 4);

  -- Purchase Management Articles
  INSERT INTO help_articles (category_id, title, content, type, tags, "order") VALUES
    (cat_purchase, 'Managing Purchases', 
    E'The Purchase Management module tracks all inventory purchases from vendors.\n\nKey Features:\n• Record purchases with quantities and costs\n• Link purchases to vendors\n• Track purchase dates and PO numbers\n• View vendor item codes and lead times\n• Filter purchases by item or vendor\n• Export purchase history\n\nPurchases automatically update inventory stock levels using FIFO (First In, First Out) method.',
    'knowledgebase', ARRAY['purchases', 'getting started'], 1),

    (cat_purchase, 'How to Record a Purchase', 
    E'Step-by-step guide to recording a purchase:\n\n1. Go to the Purchases page\n2. Click "Add Purchase"\n3. Select the item being purchased\n4. Select the vendor (optional)\n5. Enter the purchase date (defaults to today)\n6. Enter quantity received\n7. Enter unit cost\n8. Add PO number if applicable\n9. Enter vendor''s item code (optional)\n10. Enter lead time in days\n11. Click "Create Purchase"\n\nThe system will automatically update the inventory stock.',
    'howto', ARRAY['purchases', 'add purchase', 'tutorial'], 2),

    (cat_purchase, 'How do purchase costs affect assemblies?', 
    E'Q: How are purchase costs tracked?\nA: Each purchase records the unit cost at time of purchase. The system uses FIFO to track which specific purchase batches are used in assemblies.\n\nQ: Can I see which purchases were used in an assembly?\nA: Yes! Go to Manufacturing > Traceability to see exactly which purchase batches were consumed for each assembly, including their costs.\n\nQ: What is FIFO?\nA: First In, First Out - the oldest inventory is used first when creating assemblies.',
    'faq', ARRAY['purchases', 'cost', 'fifo'], 3);

  -- Manufacturing Articles
  INSERT INTO help_articles (category_id, title, content, type, tags, "order") VALUES
    (cat_manufacturing, 'Bill of Materials (BOM)', 
    E'A Bill of Materials defines what components are needed to assemble a product.\n\nCreating a BOM:\n1. Go to Manufacturing > BOM Builder\n2. Click "Create BOM"\n3. Enter BOM name\n4. Select the finished item this BOM produces\n5. Add components:\n   - Select component item\n   - Enter quantity needed per unit\n6. Click "Create BOM"\n\nBOMs can be edited or deleted as needed.',
    'knowledgebase', ARRAY['manufacturing', 'bom', 'assembly'], 1),

    (cat_manufacturing, 'How to Create an Assembly', 
    E'Step-by-step guide to creating assemblies:\n\n1. Navigate to Manufacturing > Assembly\n2. Click "Create Assembly"\n3. Select a BOM from the dropdown\n4. Enter the quantity to assemble\n5. The system shows:\n   - Components needed\n   - Available stock\n   - Any shortages\n6. If serial tracking is enabled, enter serial numbers\n7. Click "Create Assembly"\n\nThe system will:\n• Deduct components from inventory (FIFO)\n• Add finished goods to inventory\n• Record the assembly transaction\n• Create traceability records',
    'howto', ARRAY['manufacturing', 'assembly', 'tutorial'], 2),

    (cat_manufacturing, 'Understanding Traceability', 
    E'Traceability tracks which specific purchase batches went into each assembled product.\n\nKey Features:\n• See complete assembly history\n• View component sources for each assembly\n• Track purchase costs through assemblies\n• Identify which vendor supplied components\n• Support quality control and recalls\n\nTo view traceability:\n1. Go to Manufacturing > Traceability\n2. Select an assembly\n3. View all components used with their purchase details',
    'knowledgebase', ARRAY['manufacturing', 'traceability', 'quality'], 3),

    (cat_manufacturing, 'What happens if I don''t have enough stock?', 
    E'Q: Can I create an assembly without enough components?\nA: No, the system will prevent assembly creation if there is insufficient stock. You''ll see which components are short.\n\nQ: How do I know what to order?\nA: The assembly form shows available stock vs required. Order the shortfall before assembling.\n\nQ: Can I partially assemble?\nA: No, assemblies must be complete. Reduce the assembly quantity if needed.',
    'faq', ARRAY['manufacturing', 'stock', 'shortage'], 4);

  -- Vendor Management Articles
  INSERT INTO help_articles (category_id, title, content, type, tags, "order") VALUES
    (cat_vendor, 'Managing Vendors', 
    E'The Vendor Management module tracks your suppliers and their performance.\n\nKey Features:\n• Store vendor contact information\n• Track vendor ratings and notes\n• View purchase history by vendor\n• Calculate average ratings automatically\n• Export vendor data\n\nVendors are linked to purchases for better tracking.',
    'knowledgebase', ARRAY['vendors', 'suppliers', 'getting started'], 1),

    (cat_vendor, 'How to Add a Vendor', 
    E'Step-by-step guide to adding vendors:\n\n1. Navigate to Vendors page\n2. Click "Add Vendor"\n3. Enter vendor name\n4. Add contact name\n5. Enter email address\n6. Enter phone number\n7. Add physical address\n8. Set initial rating (1-5 stars)\n9. Add notes about the vendor\n10. Click "Create Vendor"\n\nYou can now link this vendor to purchases.',
    'howto', ARRAY['vendors', 'add vendor', 'tutorial'], 2),

    (cat_vendor, 'How do vendor ratings work?', 
    E'Q: How is the average rating calculated?\nA: The system automatically calculates the average of all individual purchase ratings for each vendor.\n\nQ: Can I rate individual purchases?\nA: Not directly, but you can update the vendor''s overall rating based on performance.\n\nQ: Should I use the notes field?\nA: Yes! Use notes to track delivery issues, quality concerns, or positive experiences.',
    'faq', ARRAY['vendors', 'ratings', 'performance'], 3);

  -- User Management Articles
  INSERT INTO help_articles (category_id, title, content, type, tags, "order") VALUES
    (cat_user, 'User Roles and Permissions', 
    E'CAJO ERP has different user roles with specific permissions:\n\nAdmin:\n• Full system access\n• User management\n• System settings\n• All data operations\n\nManager:\n• View and edit most data\n• Cannot manage users\n• Cannot access danger zone\n\nUser:\n• View and edit assigned areas\n• Limited access\n\nClient:\n• View-only access\n• Dashboard only\n• Restricted features',
    'knowledgebase', ARRAY['users', 'roles', 'permissions'], 1),

    (cat_user, 'How to Change Your Password', 
    E'Step-by-step guide to changing your password:\n\n1. Click your profile picture in top right\n2. Select "Settings"\n3. Click "Change Password" tab\n4. Enter current password\n5. Enter new password\n6. Confirm new password\n7. Click "Update Password"\n\nPassword requirements:\n• Minimum 6 characters\n• Keep it secure and unique',
    'howto', ARRAY['users', 'password', 'security'], 2),

    (cat_user, 'How to Update Your Profile', 
    E'Step-by-step guide to updating your profile:\n\n1. Click your profile picture in top right\n2. Select "Settings"\n3. Click "Edit Profile" tab\n4. Update your name\n5. Update your email (if needed)\n6. Click "Choose File" to change profile picture\n7. Click "Update Profile"\n\nYour changes are saved immediately.',
    'howto', ARRAY['users', 'profile', 'settings'], 3);

  -- System Administration Articles
  INSERT INTO help_articles (category_id, title, content, type, tags, "order") VALUES
    (cat_admin, 'Bulk Upload and Export', 
    E'The Bulk Upload feature allows admins to import and export data in CSV format.\n\nSupported Operations:\n• Export items, vendors, purchases, BOMs, assemblies\n• Import data via CSV upload\n• Create full system backups\n• Restore from backups\n\nBest Practices:\n• Always export before bulk operations\n• Verify CSV format matches template\n• Test with small datasets first\n• Keep backups of important data',
    'knowledgebase', ARRAY['admin', 'bulk', 'import', 'export'], 1),

    (cat_admin, 'Activity Logs', 
    E'Activity logs track all system actions for audit purposes.\n\nWhat is logged:\n• User logins\n• Data creation, updates, deletions\n• System configuration changes\n• Failed login attempts\n\nTo view activity logs:\n1. Navigate to Activity Log page\n2. Use search to filter actions\n3. Filter by action type\n4. View user, action, and details\n\nOnly admins can delete activity logs.',
    'knowledgebase', ARRAY['admin', 'logs', 'audit'], 2),

    (cat_admin, 'Managing Users (Admin)', 
    E'Step-by-step guide for user management:\n\n1. Go to Settings > User Management\n2. View all users and their roles\n3. To add a user:\n   - They must sign up first\n   - Then you can assign their role\n4. To edit a user:\n   - Click edit icon\n   - Change role, rights, or enable/disable\n   - Click Update\n5. To remove a user:\n   - Click delete icon\n   - Confirm deletion\n\nUser rights include access to specific modules.',
    'howto', ARRAY['admin', 'users', 'management'], 3),

    (cat_admin, 'Can I recover deleted data?', 
    E'Q: Can I recover deleted items?\nA: No, deletions are permanent. Always export data before major changes.\n\nQ: Are there any safeguards?\nA: Yes, the Danger Zone requires confirmation for destructive actions.\n\nQ: Should I use backups?\nA: Absolutely! Regular backups are essential. Use the Full Backup feature in Settings.',
    'faq', ARRAY['admin', 'backup', 'recovery'], 4);

END $$;
