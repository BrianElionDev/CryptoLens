import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { KnowledgeItem } from "@/types/knowledge";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RawDataItem {
  id?: string;
  date: string;
  transcript: string;
  video_title: string;
  channel_name: string;
  link?: string;
  answer?: string;
  llm_answer: Array<{
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
  }>;
}

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
      answer: item.answer || "",
      summary: item.summary || "",
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
      if (!item.video_title) missingFields.push("video_title");
      if (!item.channel_name) missingFields.push("channel_name");
      if (!item.llm_answer) missingFields.push("llm_answer");
      if (!item.transcript) missingFields.push("transcript");

      if (missingFields.length > 0) {
        throw new Error(
          `Missing required fields in item ${index}: ${missingFields.join(
            ", "
          )}`
        );
      }

      // Transform llm_answer to match database structure
      const llm_answer = {
        projects:
          Array.isArray(item.llm_answer) && item.llm_answer[0]?.projects
            ? item.llm_answer[0].projects.map((project: RawProject) => ({
                coin_or_project: project.coin_or_project,
                marketcap: (
                  project.Marketcap ||
                  project.marketcap ||
                  ""
                ).toLowerCase(),
                rpoints: Number(project.Rpoints || project.rpoints || 0),
                total_count: Number(
                  project["Total count"] || project.total_count || 0
                ),
                category: Array.isArray(project.category)
                  ? project.category
                  : [],
              }))
            : [],
        total_count: Number(item.llm_answer?.[0]?.total_count || 0),
        total_rpoints: Number(
          item.llm_answer?.[0]?.total_Rpoints ||
            item.llm_answer?.[0]?.total_rpoints ||
            0
        ),
      };

      // Clean the data structure
      const cleanedData = {
        date: item.date || new Date().toISOString(),
        transcript: item.transcript,
        video_title: item.video_title,
        "channel name": item.channel_name,
        link: item.link || "",
        summary: item.answer || "",
        llm_answer: JSON.parse(JSON.stringify(llm_answer)), // Ensure clean JSON
        created_at: new Date().toISOString(),
      };

      return cleanedData;
    });

    // Instead of deleting all data, let's check what's new
    const { data: existingData, error: fetchError } = await supabase
      .from("knowledge")
      .select("link")
      .order("date", { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch existing data: ${fetchError.message}`);
    }

    // Create a unique key for comparison using YouTube links
    const existingLinks = new Set(existingData.map((item) => item.link));

    // Filter out only new items
    const newData = transformedData.filter(
      (item) => !existingLinks.has(item.link)
    );

    if (newData.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No new data to update",
        dataSize: 0,
      });
    }

    // Transform only the new data
    const dbData = newData.map((item) => ({
      date: item.date,
      transcript: item.transcript,
      video_title: item.video_title,
      "channel name": item["channel name"],
      link: item.link,
      summary: item.summary,
      llm_answer: item.llm_answer,
      created_at: item.created_at,
    }));

    // Insert only new data
    const { error: insertError } = await supabase
      .from("knowledge")
      .insert(dbData);

    if (insertError) {
      console.error("Insert Error:", insertError);
      throw new Error(`Failed to insert new data: ${insertError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: "New data added successfully",
      dataSize: newData.length,
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
