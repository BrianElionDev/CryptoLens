import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface KnowledgeData {
  Title: string;
  Channel: string;
  Publish: string;
  Sorted: string;
  Summary: {
    answer: string;
  };
}

export async function GET() {
  try {
    const { data: knowledgeData, error } = await supabase
      .from("knowledge")
      .select("id, title, category, publish_date, sorted")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    if (!knowledgeData || knowledgeData.length === 0) {
      return NextResponse.json({ knowledge: [] });
    }

    const transformedData = knowledgeData.map((item) => ({
      id: item.id,
      title: item.title,
      channel: item.category,
      publish_date: item.publish_date,
      sorted: item.sorted,
    }));

    return NextResponse.json({ knowledge: transformedData });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Failed to fetch knowledge data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const transformedData = Object.entries(
      data as Record<string, KnowledgeData>
    ).map(([id, item]) => ({
      external_id: id,
      title: item.Title,
      content: item.Summary.answer,
      category: item.Channel,
      publish_date: item.Publish,
      sorted: JSON.stringify(item.Sorted),
      created_at: new Date().toISOString(),
    }));

    // Delete all existing data without conditions
    const { error: deleteError } = await supabase
      .from("knowledge")
      .delete()
      .not("id", "is", null); // This will match all rows

    if (deleteError) {
      throw deleteError;
    }

    // Then, insert the new data
    const { error: insertError } = await supabase
      .from("knowledge")
      .insert(transformedData);

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      message: "Data updated successfully",
      dataSize: transformedData.length,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Failed to process knowledge data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
