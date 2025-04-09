"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatHistory from './ChatHistory';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { Message, Chat } from '../types/chat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '../styles/markdown.css';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Define interface for web search results used in the fallback
interface WebSearchResultReference {
  title: string;
  link: string;
  snippet?: string; // Snippet might be optional
  date?: string; // Add date from other reference types
}

// Update the QueryResult interface to match RAGResponse
interface QueryResult {
  answer: string;
  references: WebSearchResultReference[];
  source: 'database' | 'web' | 'hybrid';
  confidence: number;
}

// Custom Markdown components for styling
const MarkdownComponents = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h1 className="text-xl font-bold my-3" {...props} />,
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h2 className="text-lg font-bold my-2" {...props} />,
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h3 className="text-base font-bold my-2" {...props} />,
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => <ul className="list-disc pl-5 my-2" {...props} />,
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => <ol className="list-decimal pl-5 my-2" {...props} />,
  li: (props: React.HTMLAttributes<HTMLLIElement>) => <li className="my-1" {...props} />,
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => <p className="my-2" {...props} />,
  a: ({ href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline" {...props} />,
  table: (props: React.HTMLAttributes<HTMLTableElement>) => <table className="border-collapse my-3 w-full" {...props} />,
  th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => <th className="border border-gray-600 px-3 py-2 bg-gray-800" {...props} />,
  td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => <td className="border border-gray-600 px-3 py-2" {...props} />,
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => <blockquote className="border-l-4 border-gray-500 pl-4 italic my-3" {...props} />,
  code: ({ inline, className, children, ...props }: React.HTMLAttributes<HTMLElement> & { inline?: boolean; className?: string }) => {
    const match = /language-(\w+)/.exec(className || '');
    return !inline ? (
      // Basic code block styling for now, can add syntax highlighting later
      <pre className="block bg-gray-900 p-3 rounded my-2 overflow-auto text-sm scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-900">
        <code className={match ? `language-${match[1]}` : ''} {...props}>
          {String(children).replace(/\n$/, '')}
        </code>
      </pre>
    ) : (
      <code className="bg-gray-700 rounded px-1.5 py-0.5 text-sm mx-0.5" {...props}>
        {children}
      </code>
    );
  }
};

const ChatWindow = ({ onClose }: { onClose: () => void }) => {
  const [input, setInput] = useState('');
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChat?.messages]); // Trigger only when messages change

  // Function to start a new chat (memoized)
  const startNewChat = useCallback(() => {
    console.log("Starting new chat...");
    const newChatInstance: Chat = {
      id: uuidv4(),
      title: 'New Chat',
      messages: [],
      created_at: new Date().toISOString()
    };
    // Add to the beginning of the list and set as current
    setChats(prevChats => [newChatInstance, ...prevChats]);
    setCurrentChat(newChatInstance);
    setShowHistory(false); // Close history when starting new chat
  }, []); // No dependencies needed if it only uses setters and uuid

  // Load chats from Supabase on initial mount and handle empty state
  useEffect(() => {
    const loadChats = async () => {
      setLoading(true);
      try {
        console.log('Loading chats from Supabase...');
        const { data, error } = await supabase
          .from('chats')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading chats:', error);
          startNewChat(); // Start new chat if loading fails
          return;
        }

        console.log('Loaded chats:', data?.length);

        if (data && data.length > 0) {
          // Ensure messages is always an array
          const formattedChats = data.map((chat): Chat => ({
            id: chat.id,
            title: chat.title || 'Untitled Chat',
            messages: Array.isArray(chat.messages) ? chat.messages : [],
            created_at: chat.created_at
          }));
          setChats(formattedChats);

          // Set current chat if none selected or current is invalid
          if (!currentChat || !formattedChats.some(c => c.id === currentChat.id)) {
            setCurrentChat(formattedChats[0]);
          }
        } else {
          // No chats found in DB, start a new one
          startNewChat();
        }
      } catch (error) {
        console.error('Error in loadChats:', error);
        startNewChat(); // Start new chat on any exception
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  // Add currentChat and startNewChat to dependency array as per ESLint warning
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startNewChat]); // Reloading based on currentChat change caused issues, load only once

  // Generate title from first message
  const generateTitle = (messageContent: string): string => {
    // Keep it concise for display
    const title = messageContent.split('\n')[0]; // Use first line
    return title.length > 50
      ? `${title.substring(0, 50)}...`
      : title || 'New Chat'; // Ensure there's always a fallback title
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Ensure currentChat is initialized
    let chatToUpdate = currentChat;
    // If no current chat, create one (should be handled by load effect, but belts and suspenders)
    if (!chatToUpdate) {
      const newChatInstance: Chat = {
        id: uuidv4(),
        title: 'New Chat',
        messages: [],
        created_at: new Date().toISOString()
      };
      setChats(prev => [newChatInstance, ...prev]);
      setCurrentChat(newChatInstance);
      chatToUpdate = newChatInstance;
      console.log("Initialized new chat within sendMessage");
    }

    // Double check - should not happen if above logic is sound
    if (!chatToUpdate) {
      console.error("Critical Error: Failed to initialize chat before sending message.");
      setLoading(false);
      // Display an error message to the user?
      return;
    }

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    // Generate title if this is the first message
    const isNewChat = chatToUpdate.messages.length === 0;
    const chatTitle = isNewChat ? generateTitle(input) : chatToUpdate.title;

    // Optimistically update UI
    const updatedChat: Chat = {
      ...chatToUpdate,
      title: chatTitle,
      messages: [...chatToUpdate.messages, userMessage]
    };
    setCurrentChat(updatedChat);
    setInput('');
    setLoading(true);

    // Update chats list
    setChats(prevChats => {
      const chatIndex = prevChats.findIndex(c => c.id === updatedChat.id);
      let newChats;
      if (chatIndex !== -1) {
        newChats = [...prevChats];
        newChats[chatIndex] = updatedChat;
      } else {
        newChats = [updatedChat, ...prevChats];
      }
      return newChats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });

    // Save user message to Supabase
    try {
      console.log('Saving user message to Supabase:', { id: updatedChat.id, title: chatTitle });
      const { error: upsertError } = await supabase
        .from('chats')
        .upsert({
          id: updatedChat.id,
          title: chatTitle,
          messages: updatedChat.messages,
          created_at: updatedChat.created_at || new Date().toISOString()
        });

      if (upsertError) {
        console.error('Error saving user message:', upsertError);
      }
    } catch (saveError) {
       console.error('Exception saving user message:', saveError);
    }

    // Process the query and get assistant response
    let queryResult: QueryResult | null = null;
    try {
      // Process through the chat API
      console.log("Processing query via /api/chat");
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: input,
          chatId: chatToUpdate.id
          })
        });

        if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
          console.error('API Error from /api/chat:', response.status, errorData);
        queryResult = {
          answer: errorData.error || "Sorry, I couldn't process that request.",
          references: [],
          source: 'hybrid',
          confidence: 0
        };
        } else {
          const data = await response.json();
          queryResult = {
              answer: data.answer || "Sorry, I received an empty response.",
          references: data.references || [],
          source: data.source || 'hybrid',
          confidence: data.confidence || 0
          };
      }
    } catch (processingError) {
       console.error("Error processing user query:", processingError);
      queryResult = {
        answer: "Sorry, an internal error occurred while processing your request.",
        references: [],
        source: 'hybrid',
        confidence: 0
      };
    }

    // Ensure there's always a valid queryResult
    if (!queryResult) {
        console.error("Critical Error: queryResult was null after processing.");
      queryResult = {
        answer: "An unexpected error occurred.",
        references: [],
        source: 'hybrid',
        confidence: 0
      };
    }

    // Create assistant message with source indicator
    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: queryResult.answer,
      timestamp: Date.now(),
      references: queryResult.references,
      source: queryResult.source,
      confidence: queryResult.confidence
    };

    // Create final chat state
    const finalChat: Chat = {
      ...updatedChat,
      messages: [...updatedChat.messages, assistantMessage]
    };

    // Update UI
    setCurrentChat(finalChat);
     setChats(prevChats => {
      const chatIndex = prevChats.findIndex(c => c.id === finalChat.id);
      let newChats;
      if (chatIndex !== -1) {
        newChats = [...prevChats];
        newChats[chatIndex] = finalChat;
      } else {
        newChats = [finalChat, ...prevChats];
      }
      return newChats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });

    // Save final chat state
    try {
      console.log('Saving final chat to Supabase:', { id: finalChat.id, title: finalChat.title });
      const { error: finalError } = await supabase
        .from('chats')
        .upsert({
          id: finalChat.id,
          title: finalChat.title,
          messages: finalChat.messages,
          created_at: finalChat.created_at || new Date().toISOString()
        });

      if (finalError) {
        console.error('Error saving final chat state:', finalError);
      }
    } catch(finalSaveError) {
        console.error('Exception saving final chat state:', finalSaveError);
    }

    setLoading(false);
  };

  // Function to generate embedding for the user's query text
  async function getQueryEmbedding(queryText: string): Promise<number[] | null> {
     try {
       console.log(`Generating embedding for query: "${queryText}"`);
       // Removed AbortController logic as it's not directly compatible with invoke
       // const controller = new AbortController();
       // const timeoutId = setTimeout(() => controller.abort(), 10000);

       const { data, error } = await supabase.functions.invoke('generate-embedding', {
         body: { inputText: queryText },
         // signal: controller.signal, // Removed incompatible signal property
       });

       // clearTimeout(timeoutId); // Removed timeout clearing

       if (error) {
         console.error('Edge function invocation error:', error);
         // Keep detailed error logging
         if (error.message.includes('FunctionsFetchError')) {
            console.error('Function fetch error details...');
         } /* // Removed AbortError check as controller is removed
         else if (error.name === 'AbortError') {
            console.error('Edge function request timed out.');
         } */
         return null;
       }
       if (!data?.embedding || !Array.isArray(data.embedding)) {
         console.error('Invalid embedding data received:', data);
         return null;
       }
       console.log('Successfully received query embedding.');
       return data.embedding;
     } catch (error: unknown) {
       console.error('Error getting query embedding:', error);
       // Removed AbortError check
       // if (error instanceof Error && error.name === 'AbortError') { ... }
       return null;
     }
  }

  // Helper function to get recent videos (last 7 days)
  const getRecentVideos = async (count = 10): Promise<QueryResult> => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const { data, error } = await supabase
        .from('knowledge')
        .select('video_title, link, "channel name", date')
        .gte('date', oneWeekAgo.toISOString().split('T')[0]) // Use YYYY-MM-DD
        .order('date', { ascending: false })
        .limit(count);

      if (error) throw error;
      if (!data || data.length === 0) {
        return { answer: "I couldn't find any videos from the past week.", references: [], source: 'hybrid', confidence: 0 };
      }

      let response = `## Recent Videos (Past Week)\n\n`;
      data.forEach((video, index) => {
        response += `${index + 1}. **${video.video_title}**\n`;
        response += `   - **Channel**: ${video['channel name']}\n`;
        response += `   - **Date**: ${new Date(video.date).toLocaleDateString()}\n\n`;
      });
      const references: WebSearchResultReference[] = data.map(video => ({ title: video.video_title, link: video.link, date: new Date(video.date).toLocaleDateString() }));
      return { answer: response, references, source: 'hybrid', confidence: 0 };
    } catch (error) {
      console.error('Error fetching recent videos:', error);
      return { answer: "I encountered an error while searching for recent videos.", references: [], source: 'hybrid', confidence: 0 };
    }
  };

  // Helper function to get videos from a specific channel
  const getVideosFromChannel = async (channelName: string, count = 10): Promise<QueryResult> => {
    try {
      if (!channelName) return { answer: "Please specify a channel name.", references: [], source: 'hybrid', confidence: 0 };
      const { data, error } = await supabase
        .from('knowledge')
        .select('video_title, link, "channel name", date')
        .ilike('"channel name"', `%${channelName}%`)
        .order('date', { ascending: false })
        .limit(count);

      if (error) throw error;
      if (!data || data.length === 0) {
        return { answer: `I couldn't find any videos from channel "${channelName}".`, references: [], source: 'hybrid', confidence: 0 };
      }

      let response = `## Videos from ${data[0]['channel name']}\n\n`;
      data.forEach((video, index) => {
        response += `${index + 1}. **${video.video_title}**\n`;
        response += `   - **Date**: ${new Date(video.date).toLocaleDateString()}\n\n`;
      });
      const references: WebSearchResultReference[] = data.map(video => ({ title: video.video_title, link: video.link, date: new Date(video.date).toLocaleDateString() }));
      return { answer: response, references, source: 'hybrid', confidence: 0 };
    } catch (error) {
      console.error('Error fetching videos from channel:', error);
      return { answer: `I encountered an error searching videos from "${channelName}".`, references: [], source: 'hybrid', confidence: 0 };
    }
  };

  // Helper function to get summary about a topic (Embeddings -> Web -> Keywords)
  const getTopicSummary = async (topic: string): Promise<QueryResult> => {
    try {
      if (!topic) return { answer: "Please specify a topic to summarize.", references: [], source: 'hybrid', confidence: 0 };
      console.log(`Summarizing topic: "${topic}" using embeddings...`);
      const queryEmbedding = await getQueryEmbedding(topic);

      if (queryEmbedding) {
        console.log('Finding relevant videos for summary via embeddings...');
        const { data: videos, error: rpcError } = await supabase.rpc('match_videos', {
          query_embedding: queryEmbedding, match_threshold: 0.70, match_count: 5
        });

        if (!rpcError && videos && videos.length > 0) {
          console.log(`Found ${videos.length} relevant videos via embeddings. Fetching details...`);
          const videoIds = videos.map((v: { id: string }) => v.id);
          const { data: videoDetails, error: detailError } = await supabase
            .from('knowledge')
            .select('new_id, video_title, link, "channel name", date, summary, transcript')
            .in('new_id', videoIds);

          if (!detailError && videoDetails && videoDetails.length > 0) {
            console.log('Preparing content for LLM summarization...');
            const combinedTextForLLM = videoDetails
              .map(v => `Video Title: ${v.video_title}\n...[content]...`)
              .join('\n---\n');

            console.log('Calling generate-summary Edge Function...');
            let summarizedContent = '';
            try {
              const { data: summaryData, error: summaryError } = await supabase.functions.invoke('generate-summary', {
                body: { topic: topic, content: combinedTextForLLM }
              });
              if (summaryError) {
                 console.error('Error from summary function:', summaryError);
                 summarizedContent = `Could not generate LLM summary for "${topic}".`; // Simple fallback
              } else {
                 summarizedContent = summaryData?.summary || `No summary returned for "${topic}".`;
                 console.log('Successfully received LLM-generated summary.');
              }
            } catch (functionError) {
              console.error('Error calling summary function:', functionError);
              summarizedContent = `Error calling summary function for "${topic}".`;
            }

            let response = `## Summary about ${topic}\n\n${summarizedContent}\n\n### Referenced Videos (from Database)\n\n`;
            videoDetails.forEach((video, index) => {
              // const similarityScore = videos.find((v: { id: string }) => v.id === video.new_id)?.similarity; // Removed as unused
              response += `${index + 1}. **${video.video_title}** ...\n`; // Simplified output
            });
            const references: WebSearchResultReference[] = videoDetails.map(video => ({ title: video.video_title, link: video.link, date: new Date(video.date).toLocaleDateString() }));
            console.log('Summary generation from database complete.');
            return { answer: response, references, source: 'database', confidence: 1 };
          } else if (detailError) {
              console.error('Error fetching video details for summary:', detailError);
          }
        } else if (rpcError) {
            console.error('RPC match_videos error for summary:', rpcError);
        }
      }

      // Fallback to Web Search
      console.log('Embeddings failed or no DB results. Falling back to web search for summary...');
      const webResult = await webSearchFallback(topic);
      // If web search fails, use keyword search as the *final* resort for summary
      if (!webResult.source.includes('hybrid')) { // Check flag instead of answer text
         console.log("Web search failed for summary. Falling back to keyword search...");
         return await getVideosByKeywords(topic, 5); // Limit results for summary context
      }
      return webResult;

    } catch (error) {
      console.error('Error generating topic summary: ', error);
      console.log("Unexpected error during summary. Final fallback to keyword search...");
      return await getVideosByKeywords(topic, 5);
    }
  };

  // Helper function for web search fallback
  const webSearchFallback = async (topic: string): Promise<QueryResult> => {
    try {
      console.log(`Trying web search for: "${topic}"`);
      const response = await fetch('/api/web-search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: topic }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Web search failed with status: ${response.status}`, errorData);
        return { answer: `Web search failed for "${topic}".`, references: [], source: 'web', confidence: 0 }; // Indicate failure
      }
      const data = await response.json();
      let answer = `## Information about ${topic}\n\n${data.answer || `No details found for "${topic}".`}`;
      if (data.references && data.references.length > 0) {
        answer += `\n\n## Web Sources (${data.source || 'Web'})\n\n`;
        data.references.forEach((ref: WebSearchResultReference, index: number) => {
          answer += `${index + 1}. [${ref.title || 'Source'}](${ref.link})${ref.snippet ? ` - *${ref.snippet}*` : ''}\n`;
        });
      }
      answer += `\n\n*Note: Info from ${data.source === 'openai' ? 'knowledge base' : 'web'}.*`;
      return { answer, references: data.references || [], source: data.source || 'web', confidence: 1 };
    } catch (error) {
      console.error('Error in web search fallback:', error);
      return { answer: `Error during web search for "${topic}".`, references: [], source: 'web', confidence: 0 }; // Indicate failure
    }
  };

  // Helper function to get videos by topic (Embeddings -> Web -> Keywords)
  const getVideosByTopic = async (topic: string, count = 10): Promise<QueryResult> => {
    try {
      if (!topic) return { answer: "Please specify a topic.", references: [], source: 'hybrid', confidence: 0 };
      console.log(`Searching videos about "${topic}" using embeddings...`);
      const queryEmbedding = await getQueryEmbedding(topic);

      if (queryEmbedding) {
        console.log('Finding relevant videos via embeddings...');
        const { data, error } = await supabase.rpc('match_videos', {
          query_embedding: queryEmbedding, match_threshold: 0.75, match_count: count
        });

        if (!error && data && data.length > 0) {
           console.log(`Found ${data.length} videos via similarity search.`);
           let response = `## Videos about ${topic} (from Database)\n\nBased on content similarity:\n\n`;
           // Define type for video object from RPC result
           type MatchedVideo = { id: string; video_title: string; similarity: number; channel_name: string; date: string; link: string };
           data.forEach((video: MatchedVideo, index: number) => {
             response += `${index + 1}. **${video.video_title}** (Relevance: ${video.similarity.toFixed(2)})\n`;
             response += `   - Channel: ${video.channel_name}\n`;
             response += `   - Date: ${new Date(video.date).toLocaleDateString()}\n\n`;
           });
           const references: WebSearchResultReference[] = data.map((video: MatchedVideo) => ({ title: video.video_title, link: video.link, date: new Date(video.date).toLocaleDateString() }));
           return { answer: response, references, source: 'database', confidence: 1 };
        } else if (error) {
            console.error('RPC match_videos error for topic search:', error);
        }
      }

      // Fallback to Web Search
      console.log('Embeddings failed or no DB results. Falling back to web search for topic...');
      const webResult = await webSearchFallback(topic);
      // If web search fails, use keyword search as final resort
      if (!webResult.source.includes('hybrid')) { // Check flag
         console.log("Web search failed for topic. Falling back to keyword search...");
         return await getVideosByKeywords(topic, count);
      }
      return webResult;

    } catch (error) {
      console.error('Error fetching videos by topic: ', error);
      console.log("Unexpected error during topic search. Final fallback to keyword search...");
      return await getVideosByKeywords(topic, count);
    }
  };

  // Helper function for keyword-based search (FINAL fallback)
  const getVideosByKeywords = async (topic: string, count = 10): Promise<QueryResult> => {
    try {
      console.log(`Searching for "${topic}" using keyword search fallback...`);
      const { data, error } = await supabase
        .from('knowledge')
        .select('video_title, link, "channel name", date')
        .or(`video_title.ilike.%${topic}%,summary.ilike.%${topic}%,transcript.ilike.%${topic}%`)
        .order('date', { ascending: false })
        .limit(count);

      if (error) {
        console.error('Keyword search error:', error);
         return { answer: `Error during keyword search for "${topic}".`, references: [], source: 'hybrid', confidence: 0 };
      }
      if (!data || data.length === 0) {
        return { answer: `No videos found mentioning "${topic}" via keywords.`, references: [], source: 'hybrid', confidence: 0 };
      }

      let response = `## Videos about ${topic} (Keyword Search)\n\nFound ${data.length} videos mentioning "${topic}":\n\n`;
      data.forEach((video, index) => {
        response += `${index + 1}. **${video.video_title}**\n`;
        response += `   - Channel: ${video['channel name']}\n`;
        response += `   - Date: ${new Date(video.date).toLocaleDateString()}\n\n`;
      });
      const references: WebSearchResultReference[] = data.map(video => ({ title: video.video_title, link: video.link, date: new Date(video.date).toLocaleDateString() }));
      return { answer: response, references, source: 'hybrid', confidence: 1 };

    } catch (error) {
      console.error('Unexpected error in keyword search fallback:', error);
      return { answer: `Unexpected error during keyword search for "${topic}".`, references: [], source: 'hybrid', confidence: 0 };
    }
  };

  // Helper function to get videos by date
  const getVideosByDate = async (dateStr: string, isAfter = false, isBefore = false): Promise<QueryResult> => {
    try {
      if (!dateStr) return { answer: "Please specify a date.", references: [], source: 'hybrid', confidence: 0 };
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) {
        return { answer: `Invalid date format: "${dateStr}".`, references: [], source: 'hybrid', confidence: 0 };
      }

      let query = supabase.from('knowledge').select('video_title, link, "channel name", date').order('date', { ascending: false });
      const isoDate = parsedDate.toISOString().split('T')[0];
      const nextDayDate = new Date(parsedDate);
      nextDayDate.setDate(nextDayDate.getDate() + 1);
      const nextDayIso = nextDayDate.toISOString().split('T')[0];

      if (isAfter) query = query.gte('date', nextDayIso);
      else if (isBefore) query = query.lt('date', isoDate);
      else query = query.gte('date', isoDate).lt('date', nextDayIso);

      const { data, error } = await query.limit(10);

      if (error) throw error;
      const timeDescription = isAfter ? "after" : isBefore ? "before" : "on";
      if (!data || data.length === 0) {
        return { answer: `No videos found ${timeDescription} ${parsedDate.toLocaleDateString()}.`, references: [], source: 'hybrid', confidence: 0 };
      }

      let response = `## Videos ${timeDescription} ${parsedDate.toLocaleDateString()}\n\n`;
      data.forEach((video, index) => {
        response += `${index + 1}. **${video.video_title}**\n...`; // Abbreviated for brevity
      });
      const references: WebSearchResultReference[] = data.map(video => ({ title: video.video_title, link: video.link, date: new Date(video.date).toLocaleDateString() }));
      return { answer: response, references, source: 'hybrid', confidence: 1 };
    } catch (error) {
      console.error('Error fetching videos by date:', error);
      return { answer: `Error searching videos by date.`, references: [], source: 'hybrid', confidence: 0 };
    }
  };

  // Helper function to get available channels
  const getAvailableChannels = async (): Promise<QueryResult> => {
    try {
      const { data, error } = await supabase.from('knowledge').select('"channel name"');
      if (error) throw error;
      if (!data || data.length === 0) return { answer: "No channels found.", references: [], source: 'hybrid', confidence: 0 };

      const channels = Array.from(new Set(data.map(item => item['channel name'])))
        .filter((channel): channel is string => !!channel)
        .sort((a, b) => a.localeCompare(b));
      if (channels.length === 0) return { answer: "No valid channel names found.", references: [], source: 'hybrid', confidence: 0 };

      let response = `## Available Video Channels\n\nI have info from:\n\n`;
      channels.forEach((channel, index) => { response += `${index + 1}. **${channel}**\n`; });
      return { answer: response, references: [], source: 'hybrid', confidence: 1 };
    } catch (error) {
      console.error('Error fetching available channels:', error);
      return { answer: "Error retrieving channel list.", references: [], source: 'hybrid', confidence: 0 };
    }
  };

  // Helper function to get the latest video from a specific channel
  const getLatestFromChannel = async (channelName: string): Promise<QueryResult> => {
    try {
      if (!channelName) return { answer: "Please specify a channel name.", references: [], source: 'hybrid', confidence: 0 };
      const { data, error } = await supabase
        .from('knowledge')
        .select('video_title, link, "channel name", date')
        .ilike('"channel name"', `%${channelName}%`)
        .order('date', { ascending: false }).limit(1);

      if (error) throw error;
      if (!data || data.length === 0) {
        return { answer: `No videos found for channel "${channelName}".`, references: [], source: 'hybrid', confidence: 0 };
      }
      const video = data[0];
      const response = `## Latest Video from ${video['channel name']}\n\n**${video.video_title}**\n...`; // Abbreviated
      const references: WebSearchResultReference[] = [{ title: video.video_title, link: video.link, date: new Date(video.date).toLocaleDateString() }];
      return { answer: response, references, source: 'hybrid', confidence: 1 };
    } catch (error) {
      console.error('Error fetching latest video:', error);
      return { answer: `Error getting latest video from "${channelName}".`, references: [], source: 'hybrid', confidence: 0 };
    }
  };

  // Select an existing chat
  const selectChat = (chatId: string) => {
    const selected = chats.find(chat => chat.id === chatId);
    if (selected) {
      setCurrentChat(selected);
      setShowHistory(false);
    }
  };

  // Hide history when input is focused
  const handleInputFocus = () => {
    if (showHistory) {
      setShowHistory(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-60 backdrop-blur-sm sm:items-center">
      <div className="relative flex flex-col w-full max-w-4xl h-[85vh] max-h-[700px] bg-gray-800 text-gray-100 rounded-lg shadow-xl overflow-hidden mx-4 mb-4 sm:mb-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
           <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-700 transition-colors" aria-label="Toggle chat history">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
             <span className="text-sm">History</span>
           </button>
          <h2 className="text-lg font-semibold truncate px-2">{currentChat?.title || 'Chat'}</h2>
           <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-700" aria-label="Close chat">...</button>
        </div>
        {/* Chat History Sidebar */}
         {showHistory && <ChatHistory chats={chats} activeChat={currentChat?.id || ''} onSelectChat={selectChat} onNewChat={startNewChat} />}
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {!currentChat || currentChat.messages.length === 0 ? (
             <div className="text-center text-gray-400 mt-10">Start a conversation...</div>
           ) : (
             currentChat.messages.map(message => (
               <div key={message.id} className={`flex flex-col gap-1.5 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                 <div className={`max-w-[85%] p-3 rounded-lg shadow-md ${message.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-100 rounded-bl-none'}`}>
                   {message.role === 'user' ? (
                     message.content
                   ) : (
                     <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                        {message.content}
                     </ReactMarkdown>
                   )}
                 </div>
                 {message.role === 'assistant' && (
                   <div className="text-xs text-gray-400 mt-1 w-full max-w-[85%] pl-1">
                     {message.source && (
                       <span className="mr-2">
                         Source: {message.source === 'database' ? 'Video Content' : message.source === 'web' ? 'Web Search' : 'Hybrid'}
                       </span>
                     )}
                     {message.confidence !== undefined && (
                       <span>
                         Confidence: {Math.round(message.confidence * 100)}%
                       </span>
                     )}
                   </div>
                 )}
                 {message.references && message.references.length > 0 && (
                   <div className="text-xs text-gray-400 mt-1 w-full max-w-[85%] pl-1">
                      Sources:
                      <div className="flex flex-wrap gap-x-2 gap-y-1">
                         {message.references.map((ref, index) => (
                           <a
                             key={index}
                             href={ref.link}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="block text-blue-400 hover:underline truncate"
                             title={ref.link}
                           >
                             [{index + 1}] {ref.title || 'Source'} {ref.date && `(${ref.date})`}
                           </a>
                         ))}
                      </div>
                   </div>
                 )}
               </div>
             ))
           )}
          {loading && (
            <div className="flex items-center justify-start gap-2 p-3">
               <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-100"></div>
               <span className="text-sm text-gray-400">Searching...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {/* Input Area */}
        <div className="border-t border-gray-700 p-4 bg-gray-800">
          <div className="flex items-center gap-3">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} onFocus={handleInputFocus} placeholder="Ask about video content..." className="flex-1 bg-gray-700 text-gray-100 rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700" rows={1} style={{ maxHeight: '100px', overflowY: 'auto' }} disabled={loading} />
            <button type="button" onClick={sendMessage} disabled={loading || !input.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 flex items-center gap-2" aria-label="Send message">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow; 