/*
  # Update Help Content with Current Workflows

  1. Overview
    - Replace existing client portal help content with comprehensive ERP help
    - Cover all current modules and workflows
    - Include detailed step-by-step guides
    - Add FAQ and troubleshooting content

  2. New Categories
    - Getting Started
    - Inventory Management
    - Purchase Management
    - Purchase Orders
    - Manufacturing & Assembly
    - Sales & Deliveries
    - CRM (Leads & Customers)
    - Vendor Management
    - Support & Ticketing
    - User Management
    - System Administration

  3. Content Types
    - knowledgebase: Conceptual information and overviews
    - howto: Step-by-step tutorials
    - faq: Common questions and answers
*/

-- Clear existing help content
DELETE FROM help_articles;
DELETE FROM help_categories;

-- Insert comprehensive categories
INSERT INTO help_categories (name, icon, "order") VALUES
  ('Getting Started', 'Zap', 1),
  ('Inventory Management', 'Package', 2),
  ('Purchase Management', 'ShoppingCart', 3),
  ('Purchase Orders', 'FileText', 4),
  ('Manufacturing & Assembly', 'Settings', 5),
  ('Sales & Deliveries', 'DollarSign', 6),
  ('CRM (Leads & Customers)', 'Users', 7),
  ('Vendor Management', 'Briefcase', 8),
  ('Support & Ticketing', 'LifeBuoy', 9),
  ('User Management', 'UserCog', 10),
  ('System Administration', 'Shield', 11);

-- Get category IDs for reference
DO $$
DECLARE
  cat_getting_started uuid;
  cat_inventory uuid;
  cat_purchase uuid;
  cat_purchase_orders uuid;
  cat_manufacturing uuid;
  cat_sales uuid;
  cat_crm uuid;
  cat_vendor uuid;
  cat_support uuid;
  cat_user uuid;
  cat_admin uuid;
BEGIN
  SELECT id INTO cat_getting_started FROM help_categories WHERE name = 'Getting Started';
  SELECT id INTO cat_inventory FROM help_categories WHERE name = 'Inventory Management';
  SELECT id INTO cat_purchase FROM help_categories WHERE name = 'Purchase Management';
  SELECT id INTO cat_purchase_orders FROM help_categories WHERE name = 'Purchase Orders';
  SELECT id INTO cat_manufacturing FROM help_categories WHERE name = 'Manufacturing & Assembly';
  SELECT id INTO cat_sales FROM help_categories WHERE name = 'Sales & Deliveries';
  SELECT id INTO cat_crm FROM help_categories WHERE name = 'CRM (Leads & Customers)';
  SELECT id INTO cat_vendor FROM help_categories WHERE name = 'Vendor Management';
  SELECT id INTO cat_support FROM help_categories WHERE name = 'Support & Ticketing';
  SELECT id INTO cat_user FROM help_categories WHERE name = 'User Management';
  SELECT id INTO cat_admin FROM help_categories WHERE name = 'System Administration';

  -- Getting Started Articles
  INSERT INTO help_articles (category_id, title, content, type, tags, "order") VALUES
    (cat_getting_started, 'Welcome to CAJO ERP',
    E'Welcome to CAJO ERP - your comprehensive enterprise resource planning system!\n\nKey Features:\n• Inventory Management: Track stock levels, set alerts, manage items\n• Purchase Management: Record purchases, track costs, FIFO tracking\n• Purchase Orders: Create and manage customer purchase orders\n• Manufacturing: Create BOMs, assemble products, full traceability\n• Sales & Deliveries: Process sales, track deliveries, manage fulfillment\n• CRM: Manage leads, prospects, and customers\n• Vendor Management: Track suppliers, ratings, and performance\n• Support System: Manage devices, tickets, and customer issues\n• User Management: Control access, roles, and permissions\n• Dashboard: Real-time metrics and recent activity\n\nThis system integrates all aspects of your business operations into one platform.',
    'knowledgebase', ARRAY['getting started', 'overview', 'erp'], 1),

    (cat_getting_started, 'Understanding the Dashboard',
    E'The Dashboard provides a comprehensive overview of your business operations:\n\nTop Metrics:\n• Total Users: Number of system users\n• Total Vendors: Supplier count\n• Total Items: Inventory item count\n• Stock Alerts: Items below minimum or reorder levels (red alert)\n\nPurchase Order Metrics:\n• Total Purchase Orders: All customer POs\n• Total Sales: All sales orders\n• Pending Purchase Orders: Open POs awaiting fulfillment\n• Late Purchase Orders: Overdue POs (red alert)\n\nRecent Activity:\n• Recent Purchases: Last 3 vendor purchases\n• Recent Assemblies: Last 3 manufacturing assemblies\n• Recent Purchase Orders: Last 3 customer POs\n• Recent Sales: Last 3 sales orders\n• Recent Deliveries: Last 3 delivery records\n• Recent Installations: Last 3 device installations\n\nAll sections are clickable and navigate to detailed views.',
    'knowledgebase', ARRAY['dashboard', 'overview', 'metrics'], 2),

    (cat_getting_started, 'What are user roles?',
    E'Q: What user roles exist in the system?\nA: Admin (full access), User (standard operations), Manager (customer portal admin), and Client (customer portal view-only).\n\nQ: What can Admin users do?\nA: Admins have complete system access including user management, settings, data setup, and danger zone operations.\n\nQ: What are User rights?\nA: Users have either read-only or read-write access. Admins control this in Settings > User Management.\n\nQ: How do I change my password?\nA: Click your profile picture (top right) > Settings > Change Password tab.',
    'faq', ARRAY['users', 'roles', 'permissions'], 3);

  -- Inventory Management Articles
  INSERT INTO help_articles (category_id, title, content, type, tags, "order") VALUES
    (cat_inventory, 'Inventory Management Overview',
    E'The Inventory module manages all your items and stock levels.\n\nKey Features:\n• Item master data with unique IDs and names\n• Stock tracking (current, minimum, maximum, reorder levels)\n• Cost tracking (average, min, max, automatically calculated)\n• Group and class organization\n• Serial number tracking capability\n• Sales history tracking\n• Lead time tracking\n• Multi-unit support (pcs, kg, meters, etc.)\n\nStock Levels:\n• Current: Actual stock on hand\n• Minimum: Triggers alert when stock falls below\n• Maximum: Upper limit for stock\n• Reorder: Alternative alert level\n• Sales Sold: Total units sold (tracked automatically)\n\nStock is automatically updated by purchases, assemblies, and sales.',
    'knowledgebase', ARRAY['inventory', 'stock', 'overview'], 1),

    (cat_inventory, 'How to Add an Inventory Item',
    E'Step-by-step guide to creating inventory items:\n\n1. Navigate to Inventory page\n2. Click "Add Item" button\n3. Enter unique Item ID (e.g., RAW001, FIN001)\n4. Enter Item Name (required)\n5. Add Display Name (optional, for reports)\n6. Select Unit (pcs, kg, meters, etc.)\n7. Choose Item Group from dropdown (or add new)\n8. Choose Item Class from dropdown (or add new)\n9. Set Stock Levels:\n   - Current Stock: Starting quantity\n   - Minimum: Alert threshold\n   - Maximum: Upper limit\n   - Reorder: Alternative alert level\n10. Check "Serial Number Tracked" if needed\n11. Click "Create Item"\n\nThe item appears immediately in the inventory list and can be used in purchases and assemblies.',
    'howto', ARRAY['inventory', 'add', 'create', 'tutorial'], 2),

    (cat_inventory, 'Understanding Stock Alerts',
    E'Stock alerts help prevent stockouts and maintain optimal inventory.\n\nHow Alerts Work:\n• Red alert when current stock < minimum level\n• Orange alert when current stock <= reorder level\n• Alerts shown on Dashboard with item details\n• Click alerts to go directly to Inventory page\n\nSetting Effective Alerts:\n• Set minimum based on average usage + lead time\n• Set reorder point for ordering new stock\n• Consider vendor lead times\n• Review and adjust based on actual usage\n\nAlert Indicators:\n• Dashboard shows total stock alerts count (red)\n• Inventory page highlights low-stock items\n• Click alert items to view details\n\nBest Practice: Review alerts daily and place orders proactively.',
    'knowledgebase', ARRAY['inventory', 'alerts', 'stock'], 3),

    (cat_inventory, 'What is Serial Number Tracking?',
    E'Q: What is serial number tracking?\nA: When enabled, each unit of an item requires a unique serial number. Used for assemblies and high-value items.\n\nQ: When should I use it?\nA: For finished products, assemblies, equipment, or items requiring individual identification and traceability.\n\nQ: How does it affect assemblies?\nA: When assembling serial-tracked items, you must assign unique serial numbers to each unit produced.\n\nQ: Can I change this setting later?\nA: Yes, but it only affects future transactions. Existing stock is not retroactively tracked.\n\nQ: Where are serial numbers used?\nA: In assemblies, sales, and device tracking for complete traceability.',
    'faq', ARRAY['inventory', 'serial', 'tracking'], 4);

  -- Purchase Management Articles
  INSERT INTO help_articles (category_id, title, content, type, tags, "order") VALUES
    (cat_purchase, 'Purchase Management Overview',
    E'The Purchase Management module tracks inventory purchases from vendors.\n\nKey Capabilities:\n• Multi-item purchases per PO\n• Link to vendors for tracking\n• Record PO numbers and dates\n• Track vendor item codes\n• Monitor lead times\n• Cost tracking with FIFO\n• Automatic stock updates\n• Purchase history by item\n• Vendor performance analysis\n\nPurchase Structure:\n• Each purchase can contain multiple items\n• Items link to inventory items\n• Quantities and unit costs tracked per item\n• Remaining quantity tracked for assembly usage\n• Received status per item\n\nFIFO (First In, First Out):\n• System uses oldest purchases first in assemblies\n• Ensures accurate cost tracking\n• Complete traceability to source purchases',
    'knowledgebase', ARRAY['purchases', 'overview', 'fifo'], 1),

    (cat_purchase, 'How to Record a Multi-Item Purchase',
    E'Step-by-step guide to recording purchases:\n\n1. Navigate to Purchases page\n2. Click "Add Purchase" button\n3. Select Vendor (optional but recommended)\n4. Enter PO Number (for reference)\n5. Select Purchase Date (defaults to today)\n\n6. Add Items (repeat for each item):\n   a. Click "Add Item" button\n   b. Select Item from dropdown\n   c. Enter Vendor Item Code (optional)\n   d. Enter Quantity received\n   e. Enter Unit Cost\n   f. Enter Lead Time in days\n   g. Check "Received" if items are in stock\n\n7. Review all items and details\n8. Click "Create Purchase"\n\nResults:\n• Purchase is recorded with all items\n• Inventory stock levels updated automatically\n• Costs calculated and stored\n• Purchase available for assembly FIFO tracking',
    'howto', ARRAY['purchases', 'add', 'create', 'tutorial'], 2),

    (cat_purchase, 'Understanding Purchase Costs and FIFO',
    E'Purchase cost tracking ensures accurate product costing.\n\nCost Recording:\n• Unit cost captured for each item in each purchase\n• Costs stored with FIFO order\n• Used to calculate assembly costs\n• Average costs auto-calculated in inventory\n\nFIFO Usage:\n• Oldest purchases consumed first in assemblies\n• System automatically selects correct purchase batches\n• Remaining quantity tracked per purchase item\n• Complete cost traceability\n\nViewing Costs:\n• Manufacturing > Traceability shows component sources\n• See which purchases used in each assembly\n• Track costs through production\n• Vendor cost comparison\n\nBest Practice: Record actual purchase costs for accurate product costing.',
    'knowledgebase', ARRAY['purchases', 'costs', 'fifo'], 3),

    (cat_purchase, 'Can I edit or delete purchases?',
    E'Q: Can I edit a purchase after creating it?\nA: You can mark items as received/not received, but quantities and costs cannot be changed once recorded to maintain data integrity.\n\nQ: Can I delete a purchase?\nA: Only if it has not been used in any assemblies. Used purchases are locked to maintain traceability.\n\nQ: What if I entered wrong information?\nA: Contact your administrator. They can make corrections in the database if needed.\n\nQ: Can I see purchase history for an item?\nA: Yes! Go to Inventory, find the item, and view its purchase history showing all purchases and costs.',
    'faq', ARRAY['purchases', 'edit', 'delete'], 4);

  -- Purchase Orders Articles
  INSERT INTO help_articles (category_id, title, content, type, tags, "order") VALUES
    (cat_purchase_orders, 'Purchase Orders Overview',
    E'Purchase Orders (POs) are customer orders for your products.\n\nKey Features:\n• Create POs from customers\n• Link to customer records\n• Multi-item POs with BOMs\n• Delivery date tracking\n• Payment terms and notes\n• Status tracking (open/completed)\n• Late PO alerts on dashboard\n\nPO Structure:\n• Each PO has unique number\n• Links to customer\n• Contains one or more items (BOMs)\n• Each item has quantity needed\n• Tracks delivery date\n• Records payment terms\n\nWorkflow:\n1. Customer places order\n2. Create PO in system\n3. Add items (BOMs) and quantities\n4. Set delivery date\n5. Assemble products\n6. Create sale and delivery\n7. Mark PO as completed',
    'knowledgebase', ARRAY['purchase orders', 'orders', 'overview'], 1),

    (cat_purchase_orders, 'How to Create a Purchase Order',
    E'Step-by-step guide to creating customer purchase orders:\n\n1. Navigate to Orders page\n2. Click "Create Purchase Order" button\n3. Enter PO Number (e.g., PO-2024-001)\n4. Select Customer from dropdown\n5. Set Delivery Date (target completion)\n6. Enter Payment Terms (optional)\n7. Add Notes (optional)\n\n8. Add Items:\n   a. Click "Add Item" button\n   b. Select BOM (finished product)\n   c. Enter Quantity needed\n   d. Item appears in list\n\n9. Review all details\n10. Click "Create Purchase Order"\n\nResults:\n• PO created with open status\n• Appears on Dashboard in metrics\n• Visible in Orders list\n• Can be referenced in assemblies\n• Tracked until completed',
    'howto', ARRAY['purchase orders', 'create', 'tutorial'], 2),

    (cat_purchase_orders, 'Managing Purchase Order Status',
    E'PO status tracking helps manage fulfillment and delivery.\n\nStatus Types:\n• Open: PO active and awaiting fulfillment\n• Completed: All items delivered, PO closed\n\nDashboard Tracking:\n• Total Purchase Orders: All POs count\n• Pending Purchase Orders: Open POs count\n• Late Purchase Orders: Open POs past delivery date (red alert)\n\nChanging Status:\n• Manually update status in Orders page\n• Change from open to completed when fulfilled\n• Status affects dashboard metrics\n\nLate PO Alerts:\n• Automatically calculated based on delivery date\n• Red alert on dashboard like stock alerts\n• Click to view which POs are late\n• Take action to fulfill or update dates\n\nBest Practice: Keep PO status current and address late POs promptly.',
    'knowledgebase', ARRAY['purchase orders', 'status', 'tracking'], 3),

    (cat_purchase_orders, 'How do POs relate to Sales?',
    E'Q: What is the difference between Purchase Orders and Sales?\nA: Purchase Orders are customer orders (what they want). Sales are actual transactions when you sell and deliver products.\n\nQ: Do I need a PO to create a Sale?\nA: No, but POs help track customer orders. You can create sales without POs.\n\nQ: Can I reference a PO in assemblies?\nA: Yes! When creating assemblies, you can add a PO number for reference and tracking.\n\nQ: Should I create a PO for every customer order?\nA: Yes, if you want to track order fulfillment, delivery dates, and late orders. POs provide better order management.',
    'faq', ARRAY['purchase orders', 'sales', 'workflow'], 4);

  -- Manufacturing & Assembly Articles  
  INSERT INTO help_articles (category_id, title, content, type, tags, "order") VALUES
    (cat_manufacturing, 'Manufacturing & Assembly Overview',
    E'The Manufacturing module handles product assembly and production.\n\nKey Features:\n• Bill of Materials (BOM) creation\n• Assembly transactions\n• FIFO component tracking\n• Serial number assignment\n• Complete traceability\n• Cost tracking through production\n• PO number reference\n• Stock level auto-updates\n\nBOM (Bill of Materials):\n• Defines what components make a finished product\n• Links finished item to component items\n• Specifies quantity of each component needed\n• Used as template for assemblies\n\nAssembly Process:\n• Select BOM and quantity to assemble\n• System checks component availability\n• Uses FIFO to consume oldest components\n• Creates finished goods units\n• Assigns serial numbers if required\n• Records complete traceability',
    'knowledgebase', ARRAY['manufacturing', 'assembly', 'bom', 'overview'], 1),

    (cat_manufacturing, 'How to Create a Bill of Materials',
    E'Step-by-step guide to creating BOMs:\n\n1. Navigate to Manufacturing page\n2. Click "BOM Builder" tab\n3. Click "Create BOM" button\n4. Enter BOM Name (e.g., "Widget Assembly")\n5. Select Finished Item this BOM produces\n\n6. Add Components (repeat for each):\n   a. Click "Add Component" button\n   b. Select Component Item from dropdown\n   c. Enter Quantity needed per unit\n   d. Component appears in list\n\n7. Review all components and quantities\n8. Click "Create BOM"\n\nResults:\n• BOM saved and available for assemblies\n• Can be edited or deleted if not used\n• Appears in BOM list\n• Ready for production\n\nExample:\nBOM: "Complete Device"\nFinished Item: Device-FIN-001\nComponents:\n- Circuit Board: 1 unit\n- Enclosure: 1 unit\n- Power Supply: 1 unit\n- Cable: 2 units',
    'howto', ARRAY['manufacturing', 'bom', 'create', 'tutorial'], 2),

    (cat_manufacturing, 'How to Create an Assembly',
    E'Step-by-step guide to assembling products:\n\n1. Navigate to Manufacturing page\n2. Click "Assembly" tab\n3. Click "Create Assembly" button\n4. Enter Assembly Name (e.g., "Batch 2024-001")\n5. Select BOM from dropdown\n6. Enter Quantity to assemble\n7. Enter PO Number for reference (optional)\n\n8. Review Component Requirements:\n   - System shows components needed\n   - Displays available stock\n   - Highlights any shortages (red)\n\n9. If sufficient stock:\n   a. For serial-tracked items, enter serial numbers\n   b. Click "Create Assembly"\n\n10. If insufficient stock:\n   - Note which components are short\n   - Purchase needed components first\n   - Return to complete assembly\n\nResults:\n• Components deducted from stock (FIFO)\n• Finished goods added to stock\n• Assembly recorded with traceability\n• Serial numbers assigned\n• Stock levels updated automatically',
    'howto', ARRAY['manufacturing', 'assembly', 'create', 'tutorial'], 3),

    (cat_manufacturing, 'Understanding Traceability',
    E'Traceability tracks component sources through production.\n\nWhat is Tracked:\n• Which purchase batches used in each assembly\n• Vendor source for each component\n• Unit costs from purchases\n• Serial numbers through production\n• Complete component genealogy\n\nWhy Traceability Matters:\n• Quality control and recalls\n• Cost analysis\n• Vendor performance tracking\n• Compliance requirements\n• Problem investigation\n\nViewing Traceability:\n1. Go to Manufacturing > Traceability tab\n2. View list of all assemblies\n3. Click to expand assembly details\n4. See all components with:\n   - Source purchase date and PO\n   - Vendor name\n   - Unit cost\n   - Quantity used\n   - Serial numbers\n\nFIFO Guarantee: System always uses oldest purchases first, ensuring accurate traceability.',
    'knowledgebase', ARRAY['manufacturing', 'traceability', 'quality'], 4),

    (cat_manufacturing, 'What if I don''t have enough components?',
    E'Q: Can I create an assembly without enough stock?\nA: No, the system prevents partial assemblies. All components must be available.\n\nQ: How do I know what to purchase?\nA: The assembly form shows required vs available for each component. Purchase the shortage.\n\nQ: Can I reserve components for an assembly?\nA: Not directly, but you can note requirements and purchase accordingly.\n\nQ: What happens if stock runs out during assembly?\nA: This cannot happen - stock is checked before assembly and deducted atomically.\n\nQ: Can I partially complete an assembly?\nA: No, reduce the quantity instead. Assembly is all-or-nothing.',
    'faq', ARRAY['manufacturing', 'stock', 'shortage'], 5);

  -- Sales & Deliveries Articles
  INSERT INTO help_articles (category_id, title, content, type, tags, "order") VALUES
    (cat_sales, 'Sales & Deliveries Overview',
    E'The Sales module manages customer sales and deliveries.\n\nKey Features:\n• Create sales orders with serial numbers\n• Link to customers\n• Track PO numbers from customers\n• Multi-unit sales\n• Assembly unit tracking\n• Delivery scheduling\n• Partial delivery support\n• Fulfillment tracking\n• Stock deduction on delivery\n\nSales Structure:\n• Each sale has unique number\n• Links to customer\n• Contains one or more items (assembly units)\n• Each item has serial number\n• Sale date recorded\n• Optional PO number\n\nDelivery Process:\n• Delivery created for each sale\n• Schedule delivery date\n• Add address and location\n• Select items to deliver (partial allowed)\n• Fulfill delivery (deducts stock)\n• Track delivery status',
    'knowledgebase', ARRAY['sales', 'deliveries', 'overview'], 1),

    (cat_sales, 'How to Create a Sale',
    E'Step-by-step guide to creating sales:\n\n1. Navigate to Sales page\n2. Click "Create Sale" button\n3. Enter Sale Number (auto-generated or manual)\n4. Select Customer from dropdown\n5. Enter Customer PO Number (optional)\n6. Select Sale Date (defaults to today)\n7. Add Notes (optional)\n\n8. Add Items:\n   a. Click "Add Item" button\n   b. Enter Serial Number of assembled unit\n   c. System validates serial number exists\n   d. Item appears in list\n   e. Repeat for multiple units\n\n9. Review all items\n10. Click "Create Sale"\n\nResults:\n• Sale recorded with all items\n• Appears in Sales list\n• Delivery automatically created\n• Items marked for delivery\n• Tracked in Dashboard metrics\n\nNote: Items are not removed from stock until delivery is fulfilled.',
    'howto', ARRAY['sales', 'create', 'tutorial'], 2),

    (cat_sales, 'Managing Deliveries',
    E'Deliveries track shipment and fulfillment of sales.\n\nDelivery Features:\n• Automatic creation with each sale\n• Delivery address and location\n• Scheduled delivery date\n• Item selection (partial deliveries)\n• Fulfillment action\n• Stock deduction\n• History tracking\n\nDelivery Workflow:\n1. Delivery auto-created with sale\n2. Edit delivery to add address/location\n3. Set delivery date\n4. View items included\n5. When ready to ship:\n   a. Select items to deliver\n   b. Click "Fulfill Delivery"\n   c. System deducts components from stock\n   d. Updates delivery status\n\nPartial Deliveries:\n• Select some items to deliver now\n• Leave others for later\n• Multiple fulfillments possible\n• Track what has been delivered\n\nStock Impact:\n• Fulfillment deducts BOM components\n• Uses FIFO for component tracking\n• Updates inventory in real-time\n• Tracks sales sold count',
    'knowledgebase', ARRAY['deliveries', 'fulfillment', 'stock'], 3),

    (cat_sales, 'Understanding Fulfillment',
    E'Fulfillment is the critical step that completes the sale.\n\nWhat Happens During Fulfillment:\n1. System looks up BOM for each item\n2. Deducts components from inventory (FIFO)\n3. Updates stock levels\n4. Records sale in inventory history\n5. Marks items as delivered\n6. Updates delivery status\n7. Increments sales sold count\n\nFulfillment Requirements:\n• Sufficient component stock\n• Valid serial numbers\n• Delivery not already fulfilled\n\nFulfillment vs. Sale:\n• Sale: Records the transaction\n• Fulfillment: Actually ships and deducts stock\n• Stock stays until fulfillment\n• Allows time between sale and shipment\n\nViewing History:\n• Each inventory item shows sales history\n• Track which sales consumed stock\n• View fulfillment dates\n• Complete audit trail',
    'knowledgebase', ARRAY['deliveries', 'fulfillment', 'process'], 4),

    (cat_sales, 'Can I unfulfill or cancel a delivery?',
    E'Q: Can I undo a fulfillment?\nA: No, once fulfilled, stock is deducted. Contact admin if you need to reverse.\n\nQ: Can I delete a sale?\nA: Only if delivery has not been fulfilled. Fulfilled sales are locked.\n\nQ: What if I fulfilled with wrong items?\nA: Contact admin immediately. Manual correction may be needed.\n\nQ: Can I change delivery address after fulfillment?\nA: Yes, address is for reference only and can be updated anytime.\n\nQ: How do I handle returns?\nA: Contact admin for guidance. Returns may require manual adjustments.',
    'faq', ARRAY['sales', 'deliveries', 'cancel'], 5);

  -- CRM Articles
  INSERT INTO help_articles (category_id, title, content, type, tags, "order") VALUES
    (cat_crm, 'CRM Overview: Leads, Prospects, Customers',
    E'The CRM module manages your sales pipeline and customer relationships.\n\nThree Stages:\n\n1. Leads:\n   • Initial contacts and inquiries\n   • Status: new, contacted, qualified, proposal, negotiation, won, lost\n   • Convert to Prospects when qualified\n\n2. Prospects:\n   • Qualified leads ready for deeper engagement\n   • Status: qualified, evaluating, quote sent\n   • Convert to Customers when they buy\n\n3. Customers:\n   • Active clients who have purchased\n   • Status: active, inactive\n   • Used in Purchase Orders, Sales, Devices\n\nEach stage tracks:\n• Contact information\n• Company details\n• Value/revenue\n• Source\n• Assigned user\n• Notes\n• Status history',
    'knowledgebase', ARRAY['crm', 'leads', 'prospects', 'customers', 'overview'], 1),

    (cat_crm, 'How to Manage Leads',
    E'Step-by-step guide to working with leads:\n\n1. Navigate to Leads page\n2. Click "Add Lead" button\n3. Enter lead information:\n   - Name (required)\n   - Email\n   - Phone\n   - Company\n   - Position\n   - Source (how you found them)\n   - Estimated value\n   - Notes\n4. Assign to user\n5. Set initial status (defaults to "new")\n6. Click "Create Lead"\n\nUpdating Status:\n1. Find lead in list\n2. Click edit icon\n3. Change status as you progress\n4. Add notes\n5. Update value if needed\n6. Click "Update Lead"\n\nConverting to Prospect:\n1. Edit lead\n2. Change status to "qualified"\n3. Click "Convert to Prospect"\n4. Lead moved to Prospects with history\n\nLead workflow: new → contacted → qualified → convert',
    'howto', ARRAY['crm', 'leads', 'manage', 'tutorial'], 2),

    (cat_crm, 'How to Manage Prospects and Customers',
    E'Working with Prospects:\n\n1. Navigate to Prospects page\n2. View converted leads\n3. Edit to update status and info\n4. Add detailed notes\n5. When ready to purchase:\n   a. Click "Convert to Customer"\n   b. Prospect becomes customer\n   c. History preserved\n\nManaging Customers:\n\n1. Navigate to Customers page\n2. View all active customers\n3. Create new customers directly if needed\n4. Edit customer information:\n   - Contact details\n   - Company info\n   - Status (active/inactive)\n   - Notes\n5. Assign to account manager\n\nCustomer Usage:\n• Link to Purchase Orders\n• Link to Sales\n• Link to Devices\n• Link to Support Tickets\n• Customer portal access\n\nCustomer workflow: prospect → qualified → evaluating → customer',
    'howto', ARRAY['crm', 'prospects', 'customers', 'tutorial'], 3),

    (cat_crm, 'Understanding CRM Status Workflow',
    E'Lead Status Flow:\n• New: Initial inquiry\n• Contacted: First outreach made\n• Qualified: Meets criteria\n• Proposal: Quote or proposal sent\n• Negotiation: Discussing terms\n• Won: Convert to Prospect\n• Lost: Not interested\n\nProspect Status Flow:\n• Qualified: Converted from lead\n• Evaluating: Reviewing solution\n• Quote Sent: Formal quote provided\n→ Convert to Customer when they purchase\n\nCustomer Status:\n• Active: Current customer\n• Inactive: No longer active\n\nBest Practices:\n• Update status regularly\n• Add notes at each stage\n• Assign leads promptly\n• Track estimated value\n• Note the source\n• Follow up consistently',
    'knowledgebase', ARRAY['crm', 'status', 'workflow'], 4),

    (cat_crm, 'Can I undo a conversion?',
    E'Q: Can I convert a Prospect back to a Lead?\nA: No, conversions are one-way to maintain data integrity. The history is preserved.\n\nQ: Can I convert a Customer back to Prospect?\nA: No, customers remain customers. You can mark them inactive.\n\nQ: What if I converted too early?\nA: Continue working with them in the new stage. The workflow is flexible.\n\nQ: Can I delete leads/prospects/customers?\nA: Yes, if they have no associated records (POs, sales, devices). Otherwise they are protected.\n\nQ: Is there a way to see conversion history?\nA: Yes, each record tracks the original lead/prospect ID it was converted from.',
    'faq', ARRAY['crm', 'conversion', 'history'], 5);

  -- Vendor Management Articles
  INSERT INTO help_articles (category_id, title, content, type, tags, "order") VALUES
    (cat_vendor, 'Vendor Management Overview',
    E'The Vendor module tracks your suppliers and their performance.\n\nKey Features:\n• Vendor master data\n• Contact information\n• Performance ratings (price, quality, lead time)\n• Average rating calculation\n• Purchase history\n• Stock by vendor reporting\n• Currency tracking\n• Group organization\n\nVendor Information:\n• Vendor ID and name\n• Legal name\n• Contact name\n• Email and phone\n• Address\n• Currency\n• Group classification\n\nRating System:\n• Price Rating (1-5 stars)\n• Quality Rating (1-5 stars)\n• Lead Time Rating (1-5 stars)\n• Average automatically calculated\n• Used for vendor comparison\n\nPurchase Linking:\n• Link purchases to vendors\n• Track what you buy from each vendor\n• View purchase history\n• Analyze costs and performance',
    'knowledgebase', ARRAY['vendors', 'suppliers', 'overview'], 1),

    (cat_vendor, 'How to Add and Manage Vendors',
    E'Step-by-step guide to vendor management:\n\nAdding a Vendor:\n1. Navigate to Vendors page\n2. Click "Add Vendor" button\n3. Enter Vendor ID (unique)\n4. Enter Vendor Name (required)\n5. Enter Legal Name (for contracts)\n6. Add Contact Name\n7. Enter Email\n8. Enter Phone\n9. Add Address\n10. Select Currency (defaults to USD)\n11. Choose Vendor Group\n12. Set initial ratings (1-5):\n    - Price Rating\n    - Quality Rating\n    - Lead Time Rating\n13. Average calculated automatically\n14. Click "Create Vendor"\n\nEditing Vendors:\n1. Find vendor in list\n2. Click edit icon\n3. Update information\n4. Adjust ratings based on experience\n5. Click "Update Vendor"\n\nDeleting Vendors:\n• Only if no purchases linked\n• Protected vendors show warning',
    'howto', ARRAY['vendors', 'add', 'manage', 'tutorial'], 2),

    (cat_vendor, 'Vendor Ratings and Performance',
    E'Vendor ratings help you choose the best suppliers.\n\nRating Categories:\n\n1. Price Rating (1-5 stars):\n   • 5: Best pricing in market\n   • 4: Competitive pricing\n   • 3: Average pricing\n   • 2: Above market pricing\n   • 1: Expensive\n\n2. Quality Rating (1-5 stars):\n   • 5: Excellent quality, no issues\n   • 4: Good quality, minor issues\n   • 3: Acceptable quality\n   • 2: Quality concerns\n   • 1: Poor quality\n\n3. Lead Time Rating (1-5 stars):\n   • 5: Always on time or early\n   • 4: Usually on time\n   • 3: Sometimes late\n   • 2: Often late\n   • 1: Consistently late\n\nAverage Rating:\n• Automatically calculated\n• (Price + Quality + Lead Time) / 3\n• Used for vendor comparison\n• Displayed in vendor list\n\nBest Practice: Update ratings regularly based on actual performance.',
    'knowledgebase', ARRAY['vendors', 'ratings', 'performance'], 3),

    (cat_vendor, 'Viewing Stock by Vendor',
    E'Track which vendor supplied your current inventory.\n\nStock by Vendor Report:\n• Shows current stock for each item\n• Groups by vendor\n• Based on FIFO remaining quantities\n• Helps with reordering\n\nHow to View:\n1. Navigate to Inventory page\n2. Select an item\n3. View purchase history\n4. See vendor for each purchase\n5. Check remaining quantity\n\nUse Cases:\n• Identify primary suppliers\n• Diversify vendor base\n• Reorder from same vendor\n• Analyze vendor costs\n• Track vendor performance\n\nNote: Stock by vendor is calculated from purchase items with remaining quantity > 0.',
    'knowledgebase', ARRAY['vendors', 'stock', 'reporting'], 4);

  -- Support & Ticketing Articles
  INSERT INTO help_articles (category_id, title, content, type, tags, "order") VALUES
    (cat_support, 'Support & Ticketing Overview',
    E'The Support module manages customer devices and support tickets.\n\nKey Features:\n• Device tracking from order to installation\n• QR code generation and scanning\n• Status management (ordered, delivered, installed, online, offline)\n• Support ticket creation\n• Issue tracking and resolution\n• Device history logging\n• Customer portal integration\n\nDevice Lifecycle:\n1. Ordered: Customer places order\n2. Delivered: Device arrives at customer\n3. Installed: Device set up and configured\n4. Online: Device operational\n5. Offline: Device needs attention\n\nTicket System:\n• Create tickets for device issues\n• Link to devices and customers\n• Track priority and status\n• Resolution notes\n• Assignment to support staff',
    'knowledgebase', ARRAY['support', 'tickets', 'devices', 'overview'], 1),

    (cat_support, 'How to Manage Devices',
    E'Step-by-step guide to device management:\n\nAdding a Device:\n1. Navigate to Support page\n2. Click "Add Device" button\n3. Select Customer\n4. Enter Serial Number (unique)\n5. Set initial status (ordered)\n6. Enter Ordered Date\n7. Add Location (optional)\n8. Click "Create Device"\n9. System generates QR code automatically\n\nUpdating Device Status:\n1. Find device in list\n2. Click edit icon\n3. Change status:\n   - ordered → delivered (add delivery date)\n   - delivered → installed (add install date)\n   - installed → online/offline\n4. Add location if installing\n5. Click "Update Device"\n6. History entry created automatically\n\nSending QR Codes:\n1. View device details\n2. Click "Send QR Code" button\n3. System emails QR code to customer\n4. Customer uses for reporting issues\n\nDevice history tracks all status changes with timestamps.',
    'howto', ARRAY['support', 'devices', 'manage', 'tutorial'], 2),

    (cat_support, 'Managing Support Tickets',
    E'Support tickets track and resolve customer issues.\n\nCreating Tickets:\n\nManual Creation:\n1. Navigate to Support page\n2. Click "Create Ticket" button\n3. Select Device\n4. Customer auto-filled from device\n5. Choose Ticket Type (support, maintenance, etc.)\n6. Set Priority (low, medium, high)\n7. Enter Description\n8. Click "Create Ticket"\n\nAutomatic Creation:\n• Customer reports device offline via portal\n• System creates ticket automatically\n• Linked to device and customer\n• You receive notification\n\nWorking Tickets:\n1. View ticket list\n2. See status (open, in progress, closed)\n3. Click to view details\n4. Update status as you work\n5. Add resolution notes\n6. Close when resolved\n\nTicket Information:\n• Unique ticket number\n• Device and customer links\n• Type and priority\n• Raised by and date\n• Status\n• Resolution notes\n• Closed by and date',
    'howto', ARRAY['support', 'tickets', 'manage', 'tutorial'], 3),

    (cat_support, 'Customer Portal for Support',
    E'Customers can report issues through their portal.\n\nPortal Features:\n• View all their devices\n• See device status\n• Report devices offline\n• Confirm devices online\n• QR code scanner\n• View device history\n\nCustomer Workflow:\n1. Customer notices device offline\n2. Opens portal\n3. Clicks "Report Device Offline"\n4. Scans device QR code\n5. Submits report\n6. Ticket created automatically\n7. Your team receives notification\n8. Customer sees ticket in history\n\nYour Response:\n1. Receive ticket notification\n2. Investigate issue\n3. Update ticket status\n4. Contact customer\n5. Resolve issue\n6. Update device status to online\n7. Close ticket\n8. Customer sees resolution\n\nBenefits:\n• Fast issue reporting\n• Reduced phone calls\n• Automatic ticket creation\n• Complete history\n• Customer self-service',
    'knowledgebase', ARRAY['support', 'portal', 'customer'], 4),

    (cat_support, 'What is the QR code used for?',
    E'Q: Why does each device have a QR code?\nA: QR codes allow customers to quickly identify devices when reporting issues via mobile phone.\n\nQ: How do customers get the QR code?\nA: Click "Send QR Code" button to email it to the customer, or they can view it in their portal.\n\nQ: Can QR codes be scanned from the portal?\nA: Yes, customers can scan QR codes using their phone camera when reporting issues.\n\nQ: What if the QR code is damaged?\nA: The portal also allows manual serial number entry as a backup.\n\nQ: Can I regenerate a QR code?\nA: QR codes are based on serial numbers and generated automatically. They don''t need regeneration.',
    'faq', ARRAY['support', 'qr', 'codes'], 5);

  -- User Management Articles
  INSERT INTO help_articles (category_id, title, content, type, tags, "order") VALUES
    (cat_user, 'User Management Overview',
    E'User management controls access and permissions.\n\nUser Roles:\n• Admin: Full system access\n• User: Standard operations access\n• Manager: Customer portal admin\n• Client: Customer portal read-only\n\nUser Rights:\n• Read-Write: Can create and edit data\n• Read-Only: Can view but not modify\n\nUser Status:\n• Enabled: Can log in\n• Disabled: Cannot log in (admin blocks)\n\nManagement Features:\n• Create user accounts\n• Assign roles\n• Set rights level\n• Enable/disable accounts\n• Link to customers (for portal users)\n• View activity logs\n• Password management',
    'knowledgebase', ARRAY['users', 'management', 'overview'], 1),

    (cat_user, 'How to Manage Users (Admin)',
    E'Step-by-step guide for user management:\n\nUser Signup Process:\n1. New user goes to signup page\n2. Enters email and password\n3. Creates account\n4. Account disabled by default\n5. Admin enables and assigns role\n\nEnabling New Users:\n1. Navigate to Settings page\n2. Click "User Management" tab\n3. Find new user in list\n4. Click edit icon\n5. Check "Enabled" box\n6. Select Role (admin/user/manager/client)\n7. Set User Rights (read-write/read-only)\n8. For Manager/Client: Select Customer\n9. Click "Update User"\n\nUpdating Users:\n1. Find user in list\n2. Click edit icon\n3. Change role, rights, or enabled status\n4. Click "Update User"\n\nDeleting Users:\n1. Click delete icon\n2. Confirm deletion\n3. User and activity preserved\n\nProfile Pictures:\n• Users set their own via Settings\n• Stored in avatars storage bucket',
    'howto', ARRAY['users', 'management', 'admin', 'tutorial'], 2),

    (cat_user, 'User Profile and Settings',
    E'Users can manage their own profile and settings.\n\nAccessing Settings:\n1. Click profile picture (top right)\n2. Select "Settings" from menu\n\nEdit Profile Tab:\n1. Update your name\n2. Change email (requires verification)\n3. Upload profile picture\n4. Click "Update Profile"\n\nChange Password Tab:\n1. Enter current password\n2. Enter new password (min 6 characters)\n3. Confirm new password\n4. Click "Update Password"\n\nProfile Picture:\n• Click "Choose File"\n• Select image\n• Uploads automatically\n• Appears immediately in header\n• Stored securely\n\nEmail Changes:\n• Must be unique\n• Verification required\n• Updates auth system\n\nSecurity Tips:\n• Use strong passwords\n• Don''t share credentials\n• Change password regularly\n• Log out on shared computers',
    'howto', ARRAY['users', 'profile', 'settings', 'tutorial'], 3),

    (cat_user, 'What can each role do?',
    E'Q: What can Admin users do?\nA: Everything - full system access including user management, settings, danger zone, all modules.\n\nQ: What can User role do?\nA: Access all operational modules based on rights (read-write or read-only): inventory, purchases, manufacturing, sales, etc. Cannot manage users or access danger zone.\n\nQ: What can Manager role do?\nA: Customer portal admin - view their company''s devices, create tickets, manage customer portal team members.\n\nQ: What can Client role do?\nA: Customer portal read-only - view their company''s devices, report issues, view history. Cannot manage others.\n\nQ: What are User Rights?\nA: Read-Write allows creating/editing data. Read-Only allows viewing only. Admins control this per user.',
    'faq', ARRAY['users', 'roles', 'permissions'], 4);

  -- System Administration Articles
  INSERT INTO help_articles (category_id, title, content, type, tags, "order") VALUES
    (cat_admin, 'System Administration Overview',
    E'System administration controls data, settings, and system configuration.\n\nAdmin Features:\n• User management\n• Data setup (groups, classes, dropdowns)\n• Bulk upload/export\n• Activity log viewing\n• Messaging system\n• Help content management\n• Danger zone operations\n\nData Setup:\n• Item groups and classes\n• Vendor groups and currencies\n• Lead sources and statuses\n• Customer statuses\n• Dropdown value management\n\nBulk Operations:\n• Export data to CSV\n• Import data from CSV\n• Full system backup\n• Data validation\n\nActivity Logs:\n• All user actions logged\n• Searchable and filterable\n• Audit trail\n• Cannot be modified\n\nMessaging:\n• Internal messaging system\n• Real-time updates\n• Attachments support\n• Read receipts',
    'knowledgebase', ARRAY['admin', 'system', 'overview'], 1),

    (cat_admin, 'Managing Data Setup',
    E'Data setup configures dropdown options and classifications.\n\nManaging Dropdown Values:\n\n1. Navigate to Settings page\n2. Click "Data Setup" tab\n3. Select dropdown type:\n   - Item Groups\n   - Item Classes\n   - Vendor Groups\n   - Vendor Currencies\n   - Lead Sources\n   - Lead Statuses\n   - Customer Statuses\n\n4. View current values\n5. Click "Add Value" button\n6. Enter value name\n7. Click "Create"\n\nDeleting Values:\n• Click delete icon\n• Only if not in use\n• Protected values show warning\n\nBest Practices:\n• Set up values before creating records\n• Use consistent naming\n• Don''t delete in-use values\n• Add new values as needed\n• Keep lists concise\n\nExample Item Groups:\n• Raw Materials\n• Components\n• Finished Goods\n• Packaging\n• Tools',
    'howto', ARRAY['admin', 'data', 'setup', 'tutorial'], 2),

    (cat_admin, 'Using Bulk Upload and Export',
    E'Bulk operations handle large data imports and exports.\n\nExporting Data:\n\n1. Navigate to Settings page\n2. Click "Bulk Upload" tab\n3. Select data type to export\n4. Click "Export" button\n5. CSV file downloads\n6. Open in spreadsheet software\n\nImporting Data:\n\n1. Prepare CSV file with correct format\n2. First row must be headers\n3. Match existing field names\n4. Validate data before import\n\n5. In Bulk Upload tab:\n   a. Select data type\n   b. Click "Choose File"\n   c. Select your CSV\n   d. Click "Import"\n   e. System validates and imports\n   f. View results\n\nSupported Imports:\n• Inventory items\n• Vendors\n• Customers\n• Users (bulk invite)\n\nBest Practices:\n• Export first to see format\n• Test with small batches\n• Backup before bulk import\n• Validate data thoroughly\n• Check results after import',
    'howto', ARRAY['admin', 'bulk', 'import', 'export', 'tutorial'], 3),

    (cat_admin, 'Activity Logs and Auditing',
    E'Activity logs provide complete audit trail.\n\nWhat is Logged:\n• User login/logout\n• Data creation\n• Data updates\n• Data deletion\n• System configuration changes\n• Failed operations\n• Timestamps\n• User who performed action\n\nViewing Activity Logs:\n\n1. Navigate to Activity Log page\n2. View chronological list\n3. Use search to filter\n4. Filter by action type\n5. See details for each action\n\nLog Information:\n• Action type (created, updated, deleted)\n• User who performed action\n• Timestamp\n• Entity affected\n• Details (JSON format)\n\nSearch and Filter:\n• Search by user name\n• Search by action type\n• Search by entity\n• Date range filtering\n\nRetention:\n• Logs kept indefinitely\n• Cannot be modified\n• Only admins can delete (use carefully)\n\nCompliance:\n• Full audit trail\n• Who did what when\n• Data change history\n• Security monitoring',
    'knowledgebase', ARRAY['admin', 'logs', 'audit'], 4),

    (cat_admin, 'Danger Zone Operations',
    E'Danger zone contains destructive operations.\n\nAvailable Operations:\n• Delete all test data\n• Reset system to defaults\n• Bulk delete records\n• Clear activity logs (use carefully)\n\nAccess:\n1. Navigate to Settings page\n2. Scroll to Danger Zone section\n3. Operations shown in red\n4. Require confirmation\n\nSafety Measures:\n• Admin-only access\n• Confirmation required\n• Cannot be undone\n• Backups recommended\n\nBefore Using:\n1. Export all data\n2. Backup database\n3. Notify users\n4. Confirm necessity\n5. Double-check operation\n\nWhen to Use:\n• Removing test data\n• System reset for new start\n• Development/staging cleanup\n• Never use in production casually\n\nRecovery:\n• No built-in recovery\n• Restore from backup only\n• Plan before executing',
    'knowledgebase', ARRAY['admin', 'danger', 'delete'], 5),

    (cat_admin, 'Can I recover deleted data?',
    E'Q: Can I recover deleted records?\nA: No automatic recovery. Always export before major deletions. Contact admin for database-level recovery.\n\nQ: Are there any safeguards?\nA: Yes, Danger Zone requires confirmation. Records with dependencies cannot be deleted.\n\nQ: Should I backup regularly?\nA: Absolutely! Use bulk export regularly. Database backups are essential.\n\nQ: What if I accidentally delete something important?\nA: Contact system administrator immediately. May be recoverable from database backups.\n\nQ: Can I undo a bulk import?\nA: Not automatically. Export before importing to allow manual reversal.\n\nQ: How long are activity logs kept?\nA: Indefinitely, providing permanent audit trail. Only delete logs in Danger Zone if absolutely necessary.',
    'faq', ARRAY['admin', 'recovery', 'backup'], 6);

END $$;
