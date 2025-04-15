export interface MessageReference {
  title: string;
  link: string;
  snippet?: string;
  date?: string;
  [key: string]: string | undefined;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  references?: MessageReference[];
  source?: 'database' | 'tavily' | 'perplexity' | 'openai' | 'rag_fallback' | 'none' | 'error';
  confidence?: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
}