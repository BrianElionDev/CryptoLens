import { createClient } from "@supabase/supabase-js";
import type { KnowledgeItem } from "@/types/knowledge";
import type { CoinData } from "@/hooks/useCoinData";
import axios from "axios";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function prefetchKnowledgeData() {
  try {
    const { data: knowledgeData, error } = await supabase
      .from("knowledge")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      throw error;
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
      llm_answer: item.llm_answer,
    }));

    return transformedData;
  } catch (error) {
    console.error("Prefetch Error:", error);
    return [];
  }
}

export async function prefetchCoinData(symbols: string[]) {
  try {
    if (!symbols.length) return [];
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/coingecko`,
      { symbols },
      {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      }
    );
    return Object.values(response.data.data) as CoinData[];
  } catch (error) {
    console.error("Coin Prefetch Error:", error);
    return [];
  }
}
