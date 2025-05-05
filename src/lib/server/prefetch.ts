import { createClient } from "@supabase/supabase-js";
import type { KnowledgeItem } from "@/types/knowledge";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function prefetchKnowledgeData() {
  try {
    // Fetch all data without date restrictions
    const { data: knowledgeData, error } = await supabase
      .from("knowledge")
      .select("*")
      .order("date", { ascending: false });
    // No limit to ensure we get all data

    if (error) {
      console.error("Knowledge fetch error:", error);
      return [];
    }

    if (!knowledgeData || knowledgeData.length === 0) {
      return [];
    }

    console.log(`Server prefetched ${knowledgeData.length} knowledge items`);

    // Count unique channels in prefetched data
    const channels = new Set();
    knowledgeData.forEach((item) => {
      if (item["channel name"]) {
        channels.add(item["channel name"]);
      }
    });
    console.log(
      `Server found ${channels.size} unique channels in prefetched data`
    );

    const transformedData: KnowledgeItem[] = knowledgeData.map((item) => ({
      id: item.id,
      date: item.date,
      transcript: item.transcript,
      video_title: item.video_title,
      "channel name": item["channel name"],
      link: item.link || "",
      answer: item.answer || "",
      summary: item.summary || "",
      llm_answer: item.llm_answer || { projects: [] }, // Ensure projects array exists
      video_type: item.video_type || "video", // Default to "video" if not specified
      usage: item.usage || 0, // Add usage field with default value of 0
    }));

    return transformedData;
  } catch (error) {
    console.error("Prefetch Error:", error);
    return []; // Return empty array instead of undefined
  }
}
