export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  references?: {
    title: string;
    link: string;
    date?: string;
  }[];
  source?: 'database' | 'web' | 'hybrid' | 'none';
  confidence?: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
} 