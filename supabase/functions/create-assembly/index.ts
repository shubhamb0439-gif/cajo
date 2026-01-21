import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AssemblyRequest {
  bomId: string;
  assemblyName: string;
  quantity: number;
  userId: string;
  componentSources?: { componentId: string; vendorId: string }[];
  serialNumbers?: { unitNumber: number; serialNumber?: string; components: { itemId: string; serialNumber?: string }[] }[];
  poNumber?: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { bomId, assemblyName, quantity, userId, componentSources, serialNumbers, poNumber }: AssemblyRequest = await req.json();

    // Validate input
    if (!bomId || !assemblyName || !quantity || quantity <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid input parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get BOM details
    const { data: bom, error: bomError } = await supabase
      .from("boms")
      .select("id, bom_item_id, bom_name")
      .eq("id", bomId)
      .maybeSingle();

    if (bomError || !bom) {
      return new Response(
        JSON.stringify({ error: "BOM not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get BOM components
    const { data: bomItems, error: bomItemsError } = await supabase
      .from("bom_items")
      .select("id, bom_component_item_id, bom_component_quantity")
      .eq("bom_id", bomId);

    if (bomItemsError || !bomItems || bomItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "BOM has no components" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get component details
    const componentIds = bomItems.map(item => item.bom_component_item_id);
    const { data: components, error: componentsError } = await supabase
      .from("inventory_items")
      .select("id, item_id, item_name, item_stock_current")
      .in("id", componentIds);

    if (componentsError || !components) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch component details" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check stock availability
    const stockCheck: { itemId: string; itemName: string; required: number; available: number }[] = [];
    for (const bomItem of bomItems) {
      const component = components.find(c => c.id === bomItem.bom_component_item_id);
      if (!component) continue;

      const requiredQty = bomItem.bom_component_quantity * quantity;
      stockCheck.push({
        itemId: component.item_id,
        itemName: component.item_name,
        required: requiredQty,
        available: component.item_stock_current,
      });

      if (component.item_stock_current < requiredQty) {
        return new Response(
          JSON.stringify({
            error: "Insufficient stock",
            details: stockCheck.filter(s => s.available < s.required),
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Execute transaction using PostgreSQL function
    const { data: result, error: txError } = await supabase.rpc("execute_assembly_transaction", {
      p_bom_id: bomId,
      p_assembly_name: assemblyName,
      p_quantity: quantity,
      p_user_id: userId,
      p_bom_item_id: bom.bom_item_id,
      p_po_number: poNumber,
    });

    if (txError) {
      console.error("Transaction error:", txError);
      return new Response(
        JSON.stringify({ error: "Failed to execute assembly transaction", details: txError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const assemblyId = result;

    // If serial numbers provided, update assembly units
    if (serialNumbers && serialNumbers.length > 0) {
      for (const sn of serialNumbers) {
        // Update assembly unit serial number
        if (sn.serialNumber) {
          await supabase
            .from("assembly_units")
            .update({ assembly_serial_number: sn.serialNumber })
            .eq("assembly_id", assemblyId)
            .eq("assembly_unit_number", sn.unitNumber);
        }

        // Insert assembly items with serial numbers
        if (sn.components && sn.components.length > 0) {
          const { data: units } = await supabase
            .from("assembly_units")
            .select("id")
            .eq("assembly_id", assemblyId)
            .eq("assembly_unit_number", sn.unitNumber)
            .maybeSingle();

          if (units) {
            for (const comp of sn.components) {
              const { data: item } = await supabase
                .from("inventory_items")
                .select("id")
                .eq("item_id", comp.itemId)
                .maybeSingle();

              if (item && comp.serialNumber) {
                await supabase.from("assembly_items").insert({
                  assembly_id: assemblyId,
                  assembly_unit_id: units.id,
                  assembly_component_item_id: item.id,
                  assembly_item_serial_number: comp.serialNumber,
                  created_by: userId,
                });
              }
            }
          }
        }
      }
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: userId,
      action: "CREATE_ASSEMBLY",
      details: {
        bomId,
        assemblyName,
        quantity,
        bomName: bom.bom_name,
        components: stockCheck,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        assemblyId: result,
        message: `Successfully created assembly: ${assemblyName}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
