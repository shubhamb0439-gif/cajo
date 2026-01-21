/*
  # Remove Old Stock by Vendor Function

  ## Problem
  There are two versions of the `get_item_stock_by_vendor` function:
  - Old version: accepts TEXT parameter (outdated schema)
  - New version: accepts UUID parameter (current schema)
  
  This causes a PostgreSQL function overloading conflict where the database
  cannot determine which function to call.

  ## Solution
  Drop the old TEXT-based version to resolve the conflict.
*/

DROP FUNCTION IF EXISTS get_item_stock_by_vendor(text);
