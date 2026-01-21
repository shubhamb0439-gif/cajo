import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ReverseAssemblyRequest {
  assemblyId: string;
  userId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { assemblyId, userId }: ReverseAssemblyRequest = await req.json();

    if (!assemblyId || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get assembly details
    const { data: assembly, error: assemblyError } = await supabase
      .from("assemblies")
      .select("*, boms(bom_name, bom_item_id)")
      .eq("id", assemblyId)
      .maybeSingle();

    if (assemblyError || !assembly) {
      return new Response(
        JSON.stringify({ error: "Assembly not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get assembly units
    const { data: units, error: unitsError } = await supabase
      .from("assembly_units")
      .select("id, assembly_unit_number")
      .eq("assembly_id", assemblyId);

    if (unitsError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch assembly units" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get BOM items to restore component stock
    const { data: bomItems, error: bomItemsError } = await supabase
      .from("bom_items")
      .select("bom_component_item_id, bom_component_quantity")
      .eq("bom_id", assembly.bom_id);

    if (bomItemsError || !bomItems) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch BOM items" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate total quantities to restore
    const quantityToRestore = assembly.assembly_quantity;

    // Restore component inventory and purchase_items FIFO tracking
    for (const bomItem of bomItems) {
      const restoreQty = bomItem.bom_component_quantity * quantityToRestore;

      // Restore inventory stock level
      const { data: currentItem } = await supabase
        .from("inventory_items")
        .select("item_stock_current")
        .eq("id", bomItem.bom_component_item_id)
        .maybeSingle();

      if (currentItem) {
        await supabase
          .from("inventory_items")
          .update({
            item_stock_current: currentItem.item_stock_current + restoreQty,
          })
          .eq("id", bomItem.bom_component_item_id);
      }

      // Restore purchase_items remaining_quantity using FIFO (oldest first)
      let remainingToRestore = restoreQty;

      const { data: purchaseItems } = await supabase
        .from("purchase_items")
        .select("id, remaining_quantity, quantity, purchase_id, purchases(purchase_date)")
        .eq("item_id", bomItem.bom_component_item_id)
        .eq("received", true)
        .order("purchases(purchase_date)", { ascending: true });

      if (purchaseItems && purchaseItems.length > 0) {
        for (const pi of purchaseItems) {
          if (remainingToRestore <= 0) break;

          // Calculate how much we can restore to this purchase_item
          const maxRestorableToThisBatch = pi.quantity - pi.remaining_quantity;
          const restoreToThisBatch = Math.min(remainingToRestore, maxRestorableToThisBatch);

          if (restoreToThisBatch > 0) {
            await supabase
              .from("purchase_items")
              .update({
                remaining_quantity: pi.remaining_quantity + restoreToThisBatch,
              })
              .eq("id", pi.id);

            remainingToRestore -= restoreToThisBatch;
          }
        }
      }
    }

    // Reduce finished goods inventory
    const { data: finishedGood } = await supabase
      .from("inventory_items")
      .select("item_stock_current")
      .eq("id", assembly.boms.bom_item_id)
      .maybeSingle();

    if (finishedGood) {
      await supabase
        .from("inventory_items")
        .update({
          item_stock_current: finishedGood.item_stock_current - quantityToRestore,
        })
        .eq("id", assembly.boms.bom_item_id);
    }

    // Delete assembly items (serial number tracking)
    if (units && units.length > 0) {
      const unitIds = units.map(u => u.id);
      await supabase
        .from("assembly_items")
        .delete()
        .in("assembly_unit_id", unitIds);
    }

    // Delete assembly units
    await supabase
      .from("assembly_units")
      .delete()
      .eq("assembly_id", assemblyId);

    // Delete the assembly
    const { error: deleteError } = await supabase
      .from("assemblies")
      .delete()
      .eq("id", assemblyId);

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: "Failed to delete assembly", details: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: userId,
      action: "DELETE_ASSEMBLY",
      details: {
        assemblyId,
        assemblyName: assembly.assembly_name,
        quantity: assembly.assembly_quantity,
        bomName: assembly.boms?.bom_name,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully deleted assembly: ${assembly.assembly_name}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
