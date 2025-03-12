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
    // Only fetch last 30 days of data initially
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const isoDate = thirtyDaysAgo.toISOString();

    const { data: knowledgeData, error } = await supabase
      .from("knowledge")
      .select("*")
      .gte("date", isoDate)
      .order("date", { ascending: false })
      .limit(100); // Limit initial load

    if (error) {
      console.error("Knowledge fetch error:", error);
      return [];
    }

    if (!knowledgeData || knowledgeData.length === 0) {
      return [];
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
      llm_answer: item.llm_answer || { projects: [] }, // Ensure projects array exists
    }));

    return transformedData;
  } catch (error) {
    console.error("Prefetch Error:", error);
    return []; // Return empty array instead of undefined
  }
}
