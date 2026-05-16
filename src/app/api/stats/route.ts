import { getServerClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getServerClient();

    const { data: collections, error } = await supabase
      .from("collections")
      .select("*")
      .order("id");

    if (error) throw error;

    // Get file type breakdown per collection
    const { data: fileTypes } = await supabase
      .from("documents")
      .select("collection_id, file_type");

    const fileTypeMap: Record<string, Record<string, number>> = {};
    for (const row of fileTypes ?? []) {
      if (!fileTypeMap[row.collection_id]) {
        fileTypeMap[row.collection_id] = {};
      }
      fileTypeMap[row.collection_id][row.file_type] =
        (fileTypeMap[row.collection_id][row.file_type] || 0) + 1;
    }

    // Get year ranges per collection
    const { data: yearRanges } = await supabase.rpc("get_year_ranges");

    const yearMap: Record<string, { min: number; max: number }> = {};
    for (const row of yearRanges ?? []) {
      yearMap[row.collection_id] = {
        min: row.min_year,
        max: row.max_year,
      };
    }

    const stats = (collections ?? []).map((col) => ({
      ...col,
      file_types: fileTypeMap[col.id] || {},
      year_range: yearMap[col.id] || null,
    }));

    return Response.json(stats, {
      headers: { "Cache-Control": "s-maxage=3600" },
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return Response.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
