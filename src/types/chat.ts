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
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
} 