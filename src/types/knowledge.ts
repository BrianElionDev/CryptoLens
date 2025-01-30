export interface KnowledgeItem {
  id: string;
  date: string;
  transcript: string;
  video_title: string;
  "channel name": string;
  link: string;
  llm_answer: LLMAnswer;
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
}
