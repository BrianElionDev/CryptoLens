import { createClient } from '@supabase/supabase-js';
import { WebSearchResult } from './webSearch';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Query classification types - now focused only on video-related queries
export type QueryType = 
  | 'video_summary' 
  | 'video_transcript' 
  | 'video_list' 
  | 'channel_list' 
  | 'web_search';

// Interface for RAG response
export interface RAGResponse {
  answer: string;
  references: {
    title: string;
    link: string;
    snippet?: string;
    date?: string;
  }[];
  source: 'database' | 'web' | 'hybrid';
  confidence: number;
}

// Query classification patterns - updated for video-specific queries
const queryPatterns: Record<QueryType, RegExp[]> = {
  video_summary: [
    /summarize|summary|overview of|tell me about/i,
    /what is the summary of|give me a summary of/i
  ],
  video_transcript: [
    /transcript|full text|complete text|entire content/i,
    /show me the transcript of|what does it say in/i
  ],
  video_list: [
    /list|show|find|search for videos|videos about/i,
    /what videos are there about|show me videos/i
  ],
  channel_list: [
    /channels|creators|youtubers|content creators/i,
    /who makes|who creates|who produces/i
  ],
  web_search: [] // Default fallback for non-video queries
};

// Classify query type
export function classifyQuery(query: string): QueryType {
  for (const [type, patterns] of Object.entries(queryPatterns)) {
    if (patterns.some(pattern => pattern.test(query))) {
      return type as QueryType;
    }
  }
  return 'web_search';
}

// Get embedding for query
async function getQueryEmbedding(query: string): Promise<number[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-embedding', {
      body: { inputText: query }
    });

    if (error || !data?.embedding || !Array.isArray(data.embedding)) {
      console.error('Embedding generation failed:', error);
      return null;
    }

    return data.embedding;
  } catch (error) {
    console.error('Error getting query embedding:', error);
    return null;
  }
}

// Search database using embeddings
async function searchWithEmbeddings(query: string, threshold = 0.7, count = 5): Promise<RAGResponse | null> {
  const embedding = await getQueryEmbedding(query);
  if (!embedding) return null;

  try {
    const { data, error } = await supabase.rpc('match_videos', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: count
    });

    if (error || !data || data.length === 0) {
      console.error('Embedding search failed:', error);
      return null;
    }

    const references = data.map((item: any) => ({
      title: item.video_title,
      link: item.link,
      date: new Date(item.date).toLocaleDateString(),
      snippet: item.summary?.substring(0, 150) || ''
    }));

    return {
      answer: `Based on the video content, here's what I found:\n\n${data[0].summary || data[0].transcript?.substring(0, 300) || 'No summary available.'}`,
      references,
      source: 'database',
      confidence: data[0].similarity || 0.7
    };
  } catch (error) {
    console.error('Error in embedding search:', error);
    return null;
  }
}

// Search database using keywords
async function searchWithKeywords(query: string, count = 5): Promise<RAGResponse | null> {
  try {
    const { data, error } = await supabase
      .from('knowledge')
      .select('video_title, link, "channel name", date, summary, transcript')
      .or(`video_title.ilike.%${query}%,summary.ilike.%${query}%,transcript.ilike.%${query}%`)
      .order('date', { ascending: false })
      .limit(count);

    if (error || !data || data.length === 0) {
      console.error('Keyword search failed:', error);
      return null;
    }

    const references = data.map(item => ({
      title: item.video_title,
      link: item.link,
      date: new Date(item.date).toLocaleDateString(),
      snippet: item.summary?.substring(0, 150) || ''
    }));

    return {
      answer: `Here's what I found in the video content:\n\n${data[0].summary || data[0].transcript?.substring(0, 300) || 'No summary available.'}`,
      references,
      source: 'database',
      confidence: 0.5
    };
  } catch (error) {
    console.error('Error in keyword search:', error);
    return null;
  }
}

// Get list of videos
async function getVideoList(query: string): Promise<RAGResponse | null> {
  try {
    const { data, error } = await supabase
      .from('knowledge')
      .select('video_title, link, "channel name", date')
      .or(`video_title.ilike.%${query}%,summary.ilike.%${query}%`)
      .order('date', { ascending: false })
      .limit(10);

    if (error || !data || data.length === 0) {
      console.error('Video list search failed:', error);
      return null;
    }

    const references = data.map(item => ({
      title: item.video_title,
      link: item.link,
      date: new Date(item.date).toLocaleDateString()
    }));

    const answer = `## Found Videos\n\n${data.map((item, index) => 
      `${index + 1}. **${item.video_title}**\n   Channel: ${item['channel name']}\n   Date: ${new Date(item.date).toLocaleDateString()}\n`
    ).join('\n')}`;

    return {
      answer,
      references,
      source: 'database',
      confidence: 0.8
    };
  } catch (error) {
    console.error('Error getting video list:', error);
    return null;
  }
}

// Get list of channels
async function getChannelList(): Promise<RAGResponse | null> {
  try {
    const { data, error } = await supabase
      .from('knowledge')
      .select('"channel name"')
      .order('"channel name"');

    if (error || !data || data.length === 0) {
      console.error('Channel list search failed:', error);
      return null;
    }

    const channels = Array.from(new Set(data.map(item => item['channel name'])))
      .filter((channel): channel is string => !!channel)
      .sort((a, b) => a.localeCompare(b));

    const answer = `## Available Video Channels\n\n${channels.map((channel, index) => 
      `${index + 1}. **${channel}**`
    ).join('\n')}`;

    return {
      answer,
      references: [],
      source: 'database',
      confidence: 0.9
    };
  } catch (error) {
    console.error('Error getting channel list:', error);
    return null;
  }
}

// Main RAG function
export async function processQuery(query: string): Promise<RAGResponse> {
  const queryType = classifyQuery(query);
  console.log(`Processing ${queryType} query: "${query}"`);

  // Handle video-specific queries
  switch (queryType) {
    case 'video_summary':
    case 'video_transcript':
      // Try embeddings first for summary/transcript
      const embeddingResult = await searchWithEmbeddings(query);
      if (embeddingResult && embeddingResult.confidence > 0.6) {
        return embeddingResult;
      }
      // Fall back to keyword search
      const keywordResult = await searchWithKeywords(query);
      if (keywordResult) {
        return keywordResult;
      }
      break;

    case 'video_list':
      // Get list of videos
      const videoListResult = await getVideoList(query);
      if (videoListResult) {
        return videoListResult;
      }
      break;

    case 'channel_list':
      // Get list of channels
      const channelListResult = await getChannelList();
      if (channelListResult) {
        return channelListResult;
      }
      break;
  }

  // For all other queries or if video-specific search failed
  return {
    answer: "This query should be handled by web search. Please use the web search functionality for non-video related queries.",
    references: [],
    source: 'web',
    confidence: 0
  };
} 