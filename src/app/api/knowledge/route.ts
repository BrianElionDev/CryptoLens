import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { KnowledgeItem } from "@/types/knowledge";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Add interface for raw data
interface RawDataItem {
  id?: string;
  date: string;
  transcript: string;
  video_title: string;
  channel_name: string;
  link?: string;
  llm_answer: {
    projects: Array<{
      coin_or_project: string;
      Marketcap?: string;
      marketcap?: string;
      Rpoints?: number;
      rpoints?: number;
      "Total count"?: number;
      total_count?: number;
      category?: string[];
    }>;
    total_count?: number;
    total_Rpoints?: number;
    total_rpoints?: number;
  }[];
}

// Add interface for project structure
interface RawProject {
  coin_or_project: string;
  Marketcap?: string;
  marketcap?: string;
  Rpoints?: number;
  rpoints?: number;
  "Total count"?: number;
  total_count?: number;
  category?: string[];
}

export async function GET() {
  try {
    const { data: knowledgeData, error } = await supabase
      .from("knowledge")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      throw error;
    }

    if (!knowledgeData || knowledgeData.length === 0) {
      return NextResponse.json({ knowledge: [] });
    }

    const transformedData: KnowledgeItem[] = knowledgeData.map((item) => ({
      id: item.id,
      date: item.date,
      transcript: item.transcript,
      video_title: item.video_title,
      "channel name": item["channel name"],
      link: item.link || "",
      llm_answer: item.llm_answer,
    }));

    return NextResponse.json({ knowledge: transformedData });
  } catch (error: unknown) {
    console.error("GET Error:", error);
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

    if (!data || typeof data !== "object") {
      throw new Error("Invalid data format: expected an object");
    }

    // Update the data transformation
    const dataArray = Array.isArray(data)
      ? data
      : Object.entries(data).map(([id, item]) => ({
          ...(item as RawDataItem),
          id,
        }));

    const transformedData = dataArray.map((item, index) => {
      if (!item || typeof item !== "object") {
        throw new Error(`Item ${index} is not an object`);
      }

      // Check for required fields
      const missingFields = [];
      if (!item.transcript) missingFields.push("transcript");
      if (!item.video_title) missingFields.push("video_title");
      if (!item.channel_name) missingFields.push("channel_name");
      if (!item.llm_answer) missingFields.push("llm_answer");

      if (missingFields.length > 0) {
        throw new Error(
          `Missing required fields in item ${index}: ${missingFields.join(
            ", "
          )}`
        );
      }

      // Parse llm_answer if it's an array
      const llm_answer = Array.isArray(item.llm_answer)
        ? item.llm_answer[0]
        : item.llm_answer;

      // Update project transformation
      const transformedProjects = llm_answer.projects.map(
        (project: RawProject) => ({
          coin_or_project: project.coin_or_project,
          marketcap: (
            project.Marketcap ||
            project.marketcap ||
            ""
          ).toLowerCase(),
          rpoints: project.Rpoints || project.rpoints || 0,
          total_count: project["Total count"] || project.total_count || 0,
          category: project.category || [],
        })
      );

      // Update the return object
      return {
        date: item.date || new Date().toISOString(),
        transcript: item.transcript,
        video_title: item.video_title,
        "channel name": item.channel_name,
        link: item.link || "",
        llm_answer: {
          projects: transformedProjects,
          total_count: llm_answer.total_count || 0,
          total_rpoints:
            llm_answer.total_Rpoints || llm_answer.total_rpoints || 0,
        },
        created_at: new Date().toISOString(),
      };
    });

    // Delete all existing data
    const { error: deleteError } = await supabase
      .from("knowledge")
      .delete()
      .not("id", "is", null);

    if (deleteError) {
      console.error("Delete Error:", deleteError);
      throw new Error(`Failed to delete existing data: ${deleteError.message}`);
    }

    // Before the insert, transform the data to match the table structure
    const dbData = transformedData.map((item) => ({
      date: item.date,
      transcript: item.transcript,
      video_title: item.video_title,
      "channel name": item["channel name"],
      link: item.link,
      llm_answer: item.llm_answer,
      created_at: item.created_at,
    }));

    // Insert new data
    const { error: insertError } = await supabase
      .from("knowledge")
      .insert(dbData);

    if (insertError) {
      console.error("Insert Error:", insertError);
      throw new Error(`Failed to insert new data: ${insertError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: "Data updated successfully",
      dataSize: transformedData.length,
    });
  } catch (error: unknown) {
    console.error("POST Error:", error);
    return NextResponse.json(
      {
        error: "Failed to process knowledge data",
        details: error instanceof Error ? error.message : JSON.stringify(error),
      },
      { status: 500 }
    );
  }
}
