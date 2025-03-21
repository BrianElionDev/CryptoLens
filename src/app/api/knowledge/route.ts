import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { KnowledgeItem } from "@/types/knowledge";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      console.error("Knowledge fetch error:", error);
      throw error;
    }

    if (!knowledgeData || knowledgeData.length === 0) {
      console.log("No knowledge data found");
      return NextResponse.json({ knowledge: [] });
    }

    console.log(`Found ${knowledgeData.length} knowledge entries`);

    const transformedData: KnowledgeItem[] = knowledgeData.map((item) => ({
      id: item.id,
      date: item.date,
      transcript: item.transcript,
      video_title: item.video_title,
      "channel name": item["channel name"],
      link: item.link || "",
      answer: item.answer || "",
      summary: item.summary || "",
      llm_answer: item.llm_answer || { projects: [] },
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
    console.log(
      "Raw received data type:",
      Array.isArray(data) ? "Array" : typeof data
    );
    console.log("Raw data keys:", Object.keys(data));

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        {
          error: "Invalid data format",
          details: "Expected an object or array",
          received: typeof data,
        },
        { status: 400 }
      );
    }

    // Normalize data to array format
    const dataArray = Array.isArray(data)
      ? data
      : Object.keys(data).some((key) => !isNaN(Number(key)))
      ? Object.values(data)
      : [data];

    if (dataArray.length === 0) {
      return NextResponse.json(
        {
          error: "Empty data",
          details: "No items to process",
        },
        { status: 400 }
      );
    }

    console.log(`Processing ${dataArray.length} items`);

    // Validate all items before processing
    const validationErrors: string[] = [];
    dataArray.forEach((item, index) => {
      if (!item || typeof item !== "object") {
        validationErrors.push(`Item ${index}: Invalid item format`);
        return;
      }

      const missingFields = [];
      if (!item.video_title) missingFields.push("video_title");
      if (!item.channel_name && !item["channel name"])
        missingFields.push("channel_name");
      if (!item.transcript) missingFields.push("transcript");

      // Detailed llm_answer validation
      if (!item.llm_answer) {
        missingFields.push("llm_answer");
      } else if (!Array.isArray(item.llm_answer)) {
        validationErrors.push(`Item ${index}: llm_answer must be an array`);
      } else if (item.llm_answer.length === 0) {
        validationErrors.push(`Item ${index}: llm_answer array is empty`);
      } else if (!item.llm_answer[0]?.projects) {
        validationErrors.push(
          `Item ${index}: llm_answer[0].projects is required`
        );
      }

      if (missingFields.length > 0) {
        validationErrors.push(
          `Item ${index}: Missing required fields: ${missingFields.join(", ")}`
        );
      }
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationErrors,
        },
        { status: 400 }
      );
    }

    const transformedData = dataArray.map((item, index) => {
      try {
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

        return {
          date: item.date || new Date().toISOString(),
          transcript: item.transcript,
          video_title: item.video_title,
          "channel name": item.channel_name || item["channel name"],
          link: item.link || "",
          summary: item.answer || "",
          llm_answer,
          created_at: new Date().toISOString(),
        };
      } catch (error) {
        console.error(`Error transforming item ${index}:`, error);
        throw new Error(
          `Failed to transform item ${index}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    });

    // Check for existing entries
    const { data: existingData, error: fetchError } = await supabase
      .from("knowledge")
      .select("link")
      .order("date", { ascending: false });

    if (fetchError) {
      console.error("Database fetch error:", fetchError);
      return NextResponse.json(
        {
          error: "Database error",
          details: "Failed to check for existing entries",
        },
        { status: 500 }
      );
    }

    const existingLinks = new Set(existingData.map((item) => item.link));
    const newData = transformedData.filter(
      (item) => !existingLinks.has(item.link)
    );

    if (newData.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No new data to update",
        skipped: transformedData.length,
        dataSize: 0,
      });
    }

    // Insert new data
    const { error: insertError } = await supabase
      .from("knowledge")
      .insert(newData);

    if (insertError) {
      console.error("Database insert error:", insertError);
      return NextResponse.json(
        {
          error: "Database error",
          details: "Failed to insert new data",
          dbError: insertError.message,
        },
        { status: 500 }
      );
    }

    // Optional revalidation
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (appUrl) {
        const revalidateUrl = new URL("/api/revalidate", appUrl);
        revalidateUrl.searchParams.set("path", "/knowledge");
        await fetch(revalidateUrl.toString(), { method: "POST" });
      }
    } catch (error) {
      console.warn("Revalidation failed:", error);
      // Non-critical error, continue
    }

    return NextResponse.json({
      success: true,
      message: "Data processed successfully",
      total: transformedData.length,
      added: newData.length,
      skipped: transformedData.length - newData.length,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
