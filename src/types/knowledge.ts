export interface KnowledgeItem {
  id: string;
  date: string;
  transcript?: string;
  video_title: string;
  "channel name": string;
  link: string;
  summary?: string;
  llm_answer: LLMAnswer;
  video_type: "video" | "short";
}

export interface LLMAnswer {
  projects: Project[];
  total_count: number;
  total_rpoints: number;
}

export interface Project {
  coin_or_project: string;
  marketcap: string;
  rpoints: number;
  total_count: number;
  category: string[];
  coingecko_matched?: boolean;
  coingecko_data?: {
    id: string;
    symbol: string;
    name: string;
  };
  cmc_matched?: boolean;
  cmc_data?: {
    id: string;
    name: string;
    symbol: string;
    price: number;
    market_cap: number;
    volume_24h: number;
    percent_change_24h: number;
    percent_change_7d: number;
    percent_change_1h: number;
    cmc_id: number;
    rank: number;
    circulating_supply: number;
    total_supply: number;
    max_supply: number;
    market_cap_dominance: number;
    fully_diluted_market_cap: number;
    image: string;
  };
}
