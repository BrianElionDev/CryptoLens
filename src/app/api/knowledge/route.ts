import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { KnowledgeItem } from "@/types/knowledge";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Handle both array and object formats
    const dataArray = Array.isArray(data) ? data : Object.values(data);

    const transformedData = dataArray.map((item, index) => {
      if (!item || typeof item !== "object") {
        throw new Error(`Item ${index} is not an object`);
      }

      // Check for fields and log their presence
      const missingFields = [];
      if (!item.transcript) missingFields.push("transcript");
      if (!item["video title"]) missingFields.push("video title");
      if (!item["channel name"]) missingFields.push("channel name");
      if (!item.llm_answer) missingFields.push("llm_answer");

      if (missingFields.length > 0) {
        throw new Error(
          `Missing required fields in item ${index}: ${missingFields.join(
            ", "
          )}`
        );
      }

      // Parse llm_answer if it's a string
      let llm_answer;
      try {
        llm_answer =
          typeof item.llm_answer === "string"
            ? JSON.parse(item.llm_answer.replace(/([{,]\s*)(\w+):/g, '$1"$2":'))
            : item.llm_answer;
      } catch (parseError: unknown) {
        console.error(`JSON Parse Error for item ${index}:`, parseError);
        throw new Error(
          `Failed to parse llm_answer JSON in item ${index}: ${
            parseError instanceof Error
              ? parseError.message
              : String(parseError)
          }`
        );
      }

      if (!llm_answer.projects || !Array.isArray(llm_answer.projects)) {
        throw new Error(
          `Invalid llm_answer.projects in item ${index}: expected an array`
        );
      }

      interface RawProject {
        "coin or project"?: string;
        coin_or_project?: string;
        marketcap?: string;
        Marketcap?: string;
        rpoints?: number;
        Rpoints?: number;
        "Total count"?: number;
      }

      // Validate and fix project structure
      llm_answer.projects = llm_answer.projects.map((project: RawProject) => {
        // Fix any malformed keys
        const fixedProject: RawProject = {};
        Object.entries(project).forEach(([key, value]) => {
          // Remove any stray colons and normalize quotes
          const fixedKey = key.replace(/[:"']/g, "");
          fixedProject[fixedKey as keyof RawProject] = value;
        });
        return fixedProject;
      });

      const transformedProjects = llm_answer.projects.map(
        (project: RawProject, projectIndex: number) => {
          const coin_or_project =
            project["coin or project"] || project.coin_or_project;
          if (!coin_or_project) {
            throw new Error(
              `Missing coin_or_project in project ${projectIndex} of item ${index}`
            );
          }
          const marketcap = project.marketcap || project.Marketcap;
          if (!marketcap) {
            throw new Error(
              `Missing marketcap in project ${projectIndex} of item ${index}`
            );
          }
          const rpoints = project.rpoints || project.Rpoints;
          if (typeof rpoints !== "number") {
            throw new Error(
              `Invalid rpoints in project ${projectIndex} of item ${index}: expected a number`
            );
          }

          return {
            coin_or_project,
            marketcap: marketcap.toLowerCase(),
            rpoints,
          };
        }
      );

      // Handle case-insensitive field names and spaces
      let total_count =
        llm_answer.total_count ||
        llm_answer.Total_count ||
        llm_answer["total count"] ||
        llm_answer["Total Count"];

      let total_rpoints =
        llm_answer.total_rpoints ||
        llm_answer.Total_rpoints ||
        llm_answer["total rpoints"] ||
        llm_answer["Total rpoints"];

      // If totals are not provided, calculate them from projects
      if (typeof total_count !== "number") {
        total_count = llm_answer.projects.reduce(
          (sum: number, p: { "Total count"?: number }) =>
            sum + (p["Total count"] || 1),
          0
        );
      }

      if (typeof total_rpoints !== "number") {
        total_rpoints = llm_answer.projects.reduce(
          (sum: number, p: { Rpoints?: number; rpoints?: number }) =>
            sum + (p.Rpoints || p.rpoints || 0),
          0
        );
      }

      return {
        date: item.date || new Date().toISOString(),
        transcript: item.transcript,
        video_title: item["video title"],
        "channel name": item["channel name"],
        llm_answer: {
          projects: transformedProjects,
          total_count,
          total_rpoints,
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

    // Insert new data
    const { error: insertError } = await supabase
      .from("knowledge")
      .insert(transformedData);

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
