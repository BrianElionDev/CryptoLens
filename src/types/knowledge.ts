export interface KnowledgeItem {
  id: string;
  title: string;
  channel: string;
  publish_date: string;
  sorted?: string;
}

export interface Project {
  Coin: string;
  Marketcap: string;
  Rpoints: number;
  "Total count": number;
}
