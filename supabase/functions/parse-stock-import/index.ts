import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ParsedStockItem {
  item_name: string;
  item_code?: string;
  category?: string;
  unit_of_measure?: string;
  unit_cost?: number;
  reorder_threshold?: number;
  reorder_quantity?: number;
  initial_quantity?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    const content = typeof body?.content === "string" ? body.content : null;
    const fileType = typeof body?.fileType === "string" ? body.fileType : "txt";

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No content provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (content.length > 500_000) {
      return new Response(
        JSON.stringify({ error: "content exceeds maximum size" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a hospital inventory data extraction specialist. Your task is to parse stock/inventory item data from various formats (spreadsheet data, CSV, scanned PDF text, supplier price lists) and extract structured stock item records.

Extract the following fields where available:
- item_name (REQUIRED - the product/item description, e.g. "Surgical Gauze 10x10cm", "Paracetamol 500mg")
- item_code (SKU, product code, catalogue number, barcode)
- category (classify into one of: "medication", "consumable", "equipment", "ppe" — infer from the item name/context if not explicitly stated)
- unit_of_measure (e.g. "box", "vial", "unit", "pack", "carton" — default to "unit" if unclear)
- unit_cost (price per unit as a plain number, no currency symbols)
- reorder_threshold (minimum stock level before reordering — if a "min stock"/"reorder level" column exists, use it; otherwise omit)
- reorder_quantity (how many to order when restocking — if a "reorder qty"/"order quantity" column exists, use it; otherwise omit)
- initial_quantity (current stock on hand, if a "quantity"/"qty on hand"/"stock count" column exists)

Rules:
1. Each item must have at least an item_name
2. Be flexible with column names — "SKU"/"Code"/"Product Code" all mean item_code; "Cost"/"Price"/"Unit Price" all mean unit_cost; "UOM"/"Unit"/"Pack Size" all mean unit_of_measure
3. Strip currency symbols and thousand separators from cost/quantity fields, return plain numbers
4. If multiple items are in the data, return all of them
5. Skip empty or clearly invalid rows (e.g. header repeats, subtotal rows)
6. If category cannot be determined, infer the most sensible one from the item name rather than leaving it blank

Return ONLY a valid JSON array of stock item objects. No explanations, no markdown, just the JSON array.`;

    const userPrompt = `Parse the following ${fileType === "txt" || fileType === "pdf" ? "text" : "data"} content and extract stock item records:

${content}

Return a JSON array of stock item objects with the fields described. Each item MUST have an "item_name" field.`;

    console.log("Calling Lovable AI to parse stock import data...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error("No response from AI");
    }

    console.log("AI response:", aiContent);

    let items: ParsedStockItem[] = [];
    try {
      let jsonStr = aiContent.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();

      const parsed = JSON.parse(jsonStr);

      if (Array.isArray(parsed)) {
        items = parsed.filter((p: any) => p && typeof p.item_name === "string" && p.item_name.trim());
      } else if (parsed && typeof parsed.item_name === "string") {
        items = [parsed];
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      throw new Error("Could not parse AI response as JSON");
    }

    console.log(`Successfully parsed ${items.length} stock items`);

    return new Response(
      JSON.stringify({ items }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in parse-stock-import:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
