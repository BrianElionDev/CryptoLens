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

// Type for the result of helper functions
interface QueryResult {
  answer: string;
  references: WebSearchResultReference[];
  isFromWeb?: boolean; // Optional flag for web results
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
    if (!input.trim()) return; // Don't send empty messages

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

    // Generate title if this is the first message in the chat
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

    // Update the list of chats locally as well
    setChats(prevChats => {
      const chatIndex = prevChats.findIndex(c => c.id === updatedChat.id);
      let newChats;
      if (chatIndex !== -1) {
        newChats = [...prevChats];
        newChats[chatIndex] = updatedChat;
      } else {
        // Add the new chat if it wasn't in the list (should be rare)
        newChats = [updatedChat, ...prevChats];
      }
      // Ensure the list remains sorted by creation date
      return newChats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });


    // Save user message to Supabase immediately (before processing response)
    try {
      console.log('Saving user message to Supabase:', { id: updatedChat.id, title: chatTitle });
      const { error: upsertError } = await supabase
        .from('chats')
        .upsert({
          id: updatedChat.id,
          title: chatTitle,
          messages: updatedChat.messages, // Save messages up to user's input
          created_at: updatedChat.created_at || new Date().toISOString()
        });

      if (upsertError) {
        console.error('Error saving user message:', upsertError);
        // Optionally revert UI or show error, but continue processing for assistant response
      }
    } catch (saveError) {
       console.error('Exception saving user message:', saveError);
    }

    // --- Process the query and get assistant response ---
    let queryResult: QueryResult | null = null;
    try {
      // Check if the query matches any special patterns
      if (/give me videos from this week/i.test(input)) {
        queryResult = await getRecentVideos(10);
      }
      else if (/show (?:me )?(?:the )?latest (\d+)? ?videos/i.test(input)) {
        const countMatch = input.match(/show (?:me )?(?:the )?latest (\d+)? ?videos/i);
        const count = countMatch && countMatch[1] ? parseInt(countMatch[1]) : 10;
        queryResult = await getRecentVideos(count);
      }
      else if (/give me (?:videos|video titles) from (.+?)(?:$|\s*channel)/i.test(input)) {
        const channelMatch = input.match(/give me (?:videos|video titles) from (.+?)(?:$|\s*channel)/i);
        const channelName = channelMatch ? channelMatch[1].trim() : '';
        queryResult = await getVideosFromChannel(channelName, 10);
      }
      else if (/give me a summary about (.+)$/i.test(input)) {
        const topicMatch = input.match(/give me a summary about (.+)$/i);
        const topic = topicMatch ? topicMatch[1].trim() : '';
        if (topic) {
          console.log('Extracted topic for summary:', topic);
          queryResult = await getTopicSummary(topic);
        } else {
          queryResult = { answer: "Please specify a topic after 'give me a summary about'.", references: [] };
        }
      }
      else if (/find videos(?:.+?)about (.+)$/i.test(input)) {
        const topicMatch = input.match(/find videos(?:.+?)about (.+)$/i);
        const topic = topicMatch ? topicMatch[1].trim() : '';
         if (topic) {
           console.log('Extracted topic for video search:', topic);
           queryResult = await getVideosByTopic(topic);
         } else {
           queryResult = { answer: "Please specify a topic after 'find videos about'.", references: [] };
         }
      }
      else if (/give me videos (?:from|published) (?:on|after|before) (.+?)(?:$|\s*date)/i.test(input)) {
        const dateMatch = input.match(/give me videos (?:from|published) (?:on|after|before) (.+?)(?:$|\s*date)/i);
        const dateStr = dateMatch ? dateMatch[1].trim() : '';
        const isAfter = /after/i.test(input);
        const isBefore = /before/i.test(input);
        queryResult = await getVideosByDate(dateStr, isAfter, isBefore);
      }
      else if (/give me (\d+)(?:\s*videos)? from (.+?)(?:$|\s*channel)/i.test(input)) {
        const countChannelMatch = input.match(/give me (\d+)(?:\s*videos)? from (.+?)(?:$|\s*channel)/i);
        const count = countChannelMatch ? parseInt(countChannelMatch[1]) : 10;
        const channelName = countChannelMatch ? countChannelMatch[2].trim() : '';
        queryResult = await getVideosFromChannel(channelName, count);
      }
      else if (/what video channels do you have(?:\s*information about)?/i.test(input)) {
        queryResult = await getAvailableChannels();
      }
      else if (/what(?:\'s| is) the latest video(?:s)? (?:from|by) (.+?)(?:$|\s*channel)/i.test(input)) {
        const channelMatch = input.match(/what(?:\'s| is) the latest video(?:s)? (?:from|by) (.+?)(?:$|\s*channel)/i);
        const channelName = channelMatch ? channelMatch[1].trim() : '';
        queryResult = await getLatestFromChannel(channelName);
      }
      else {
        // Default: Process through regular API route for generic chat/search
        console.log("Processing generic query via /api/chat");
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: input,
            chatId: chatToUpdate.id // Pass current chat ID
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})); // Try parsing error
          console.error('API Error from /api/chat:', response.status, errorData);
          queryResult = { answer: errorData.error || "Sorry, I couldn't process that request.", references: [] };
        } else {
          const data = await response.json();
          queryResult = {
              answer: data.answer || "Sorry, I received an empty response.",
              references: data.references || []
          };
        }
      }
    } catch (processingError) {
       console.error("Error processing user query:", processingError);
       queryResult = { answer: "Sorry, an internal error occurred while processing your request.", references: [] };
    }

    // Ensure there's always a valid queryResult
    if (!queryResult) {
        console.error("Critical Error: queryResult was null after processing.");
        queryResult = { answer: "An unexpected error occurred.", references: [] };
    }

    // --- Update state and save final chat with assistant response ---
    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: queryResult.answer,
      timestamp: Date.now(),
      references: queryResult.references,
      // isFromWeb: queryResult.isFromWeb // Optionally include source flag if needed
    };

    // Create the final chat state including the assistant's response
    const finalChat: Chat = {
      ...updatedChat, // Use the state that includes the user message
      messages: [...updatedChat.messages, assistantMessage]
    };

    // Update the UI optimistically with the final chat state
    setCurrentChat(finalChat);

    // Update the list of chats again with the final state
     setChats(prevChats => {
      const chatIndex = prevChats.findIndex(c => c.id === finalChat.id);
      let newChats;
      if (chatIndex !== -1) {
        newChats = [...prevChats];
        newChats[chatIndex] = finalChat;
      } else {
        // Should not happen if initial update worked
        console.warn("Chat was not found in list during final update, adding it.");
        newChats = [finalChat, ...prevChats];
      }
      return newChats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });

    // Save final chat state (with assistant message) to Supabase
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
        // Maybe notify user?
      }
    } catch(finalSaveError) {
        console.error('Exception saving final chat state:', finalSaveError);
    }

    // Processing complete
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
        return { answer: "I couldn't find any videos from the past week.", references: [] };
      }

      let response = `## Recent Videos (Past Week)\n\n`;
      data.forEach((video, index) => {
        response += `${index + 1}. **${video.video_title}**\n`;
        response += `   - **Channel**: ${video['channel name']}\n`;
        response += `   - **Date**: ${new Date(video.date).toLocaleDateString()}\n\n`;
      });
      const references: WebSearchResultReference[] = data.map(video => ({ title: video.video_title, link: video.link, date: new Date(video.date).toLocaleDateString() }));
      return { answer: response, references };
    } catch (error) {
      console.error('Error fetching recent videos:', error);
      return { answer: "I encountered an error while searching for recent videos.", references: [] };
    }
  };

  // Helper function to get videos from a specific channel
  const getVideosFromChannel = async (channelName: string, count = 10): Promise<QueryResult> => {
    try {
      if (!channelName) return { answer: "Please specify a channel name.", references: [] };
      const { data, error } = await supabase
        .from('knowledge')
        .select('video_title, link, "channel name", date')
        .ilike('"channel name"', `%${channelName}%`)
        .order('date', { ascending: false })
        .limit(count);

      if (error) throw error;
      if (!data || data.length === 0) {
        return { answer: `I couldn't find any videos from channel "${channelName}".`, references: [] };
      }

      let response = `## Videos from ${data[0]['channel name']}\n\n`;
      data.forEach((video, index) => {
        response += `${index + 1}. **${video.video_title}**\n`;
        response += `   - **Date**: ${new Date(video.date).toLocaleDateString()}\n\n`;
      });
      const references: WebSearchResultReference[] = data.map(video => ({ title: video.video_title, link: video.link, date: new Date(video.date).toLocaleDateString() }));
      return { answer: response, references };
    } catch (error) {
      console.error('Error fetching videos from channel:', error);
      return { answer: `I encountered an error searching videos from "${channelName}".`, references: [] };
    }
  };

  // Helper function to get summary about a topic (Embeddings -> Web -> Keywords)
  const getTopicSummary = async (topic: string): Promise<QueryResult> => {
    try {
      if (!topic) return { answer: "Please specify a topic to summarize.", references: [] };
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
            return { answer: response, references, isFromWeb: false };
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
      if (!webResult.isFromWeb) { // Check flag instead of answer text
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
        return { answer: `Web search failed for "${topic}".`, references: [], isFromWeb: false }; // Indicate failure
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
      return { answer, references: data.references || [], isFromWeb: true };
    } catch (error) {
      console.error('Error in web search fallback:', error);
      return { answer: `Error during web search for "${topic}".`, references: [], isFromWeb: false }; // Indicate failure
    }
  };

  // Helper function to get videos by topic (Embeddings -> Web -> Keywords)
  const getVideosByTopic = async (topic: string, count = 10): Promise<QueryResult> => {
    try {
      if (!topic) return { answer: "Please specify a topic.", references: [] };
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
           return { answer: response, references, isFromWeb: false };
        } else if (error) {
            console.error('RPC match_videos error for topic search:', error);
        }
      }

      // Fallback to Web Search
      console.log('Embeddings failed or no DB results. Falling back to web search for topic...');
      const webResult = await webSearchFallback(topic);
      // If web search fails, use keyword search as final resort
      if (!webResult.isFromWeb) { // Check flag
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
         return { answer: `Error during keyword search for "${topic}".`, references: [], isFromWeb: false };
      }
      if (!data || data.length === 0) {
        return { answer: `No videos found mentioning "${topic}" via keywords.`, references: [], isFromWeb: false };
      }

      let response = `## Videos about ${topic} (Keyword Search)\n\nFound ${data.length} videos mentioning "${topic}":\n\n`;
      data.forEach((video, index) => {
        response += `${index + 1}. **${video.video_title}**\n`;
        response += `   - Channel: ${video['channel name']}\n`;
        response += `   - Date: ${new Date(video.date).toLocaleDateString()}\n\n`;
      });
      const references: WebSearchResultReference[] = data.map(video => ({ title: video.video_title, link: video.link, date: new Date(video.date).toLocaleDateString() }));
      return { answer: response, references, isFromWeb: false };

    } catch (error) {
      console.error('Unexpected error in keyword search fallback:', error);
      return { answer: `Unexpected error during keyword search for "${topic}".`, references: [], isFromWeb: false };
    }
  };

  // Helper function to get videos by date
  const getVideosByDate = async (dateStr: string, isAfter = false, isBefore = false): Promise<QueryResult> => {
    try {
      if (!dateStr) return { answer: "Please specify a date.", references: [] };
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) {
        return { answer: `Invalid date format: "${dateStr}".`, references: [] };
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
        return { answer: `No videos found ${timeDescription} ${parsedDate.toLocaleDateString()}.`, references: [] };
      }

      let response = `## Videos ${timeDescription} ${parsedDate.toLocaleDateString()}\n\n`;
      data.forEach((video, index) => {
        response += `${index + 1}. **${video.video_title}**\n...`; // Abbreviated for brevity
      });
      const references: WebSearchResultReference[] = data.map(video => ({ title: video.video_title, link: video.link, date: new Date(video.date).toLocaleDateString() }));
      return { answer: response, references };
    } catch (error) {
      console.error('Error fetching videos by date:', error);
      return { answer: `Error searching videos by date.`, references: [] };
    }
  };

  // Helper function to get available channels
  const getAvailableChannels = async (): Promise<QueryResult> => {
    try {
      const { data, error } = await supabase.from('knowledge').select('"channel name"');
      if (error) throw error;
      if (!data || data.length === 0) return { answer: "No channels found.", references: [] };

      const channels = Array.from(new Set(data.map(item => item['channel name'])))
        .filter((channel): channel is string => !!channel)
        .sort((a, b) => a.localeCompare(b));
      if (channels.length === 0) return { answer: "No valid channel names found.", references: [] };

      let response = `## Available Video Channels\n\nI have info from:\n\n`;
      channels.forEach((channel, index) => { response += `${index + 1}. **${channel}**\n`; });
      return { answer: response, references: [] };
    } catch (error) {
      console.error('Error fetching available channels:', error);
      return { answer: "Error retrieving channel list.", references: [] };
    }
  };

  // Helper function to get the latest video from a specific channel
  const getLatestFromChannel = async (channelName: string): Promise<QueryResult> => {
    try {
      if (!channelName) return { answer: "Please specify a channel name.", references: [] };
      const { data, error } = await supabase
        .from('knowledge')
        .select('video_title, link, "channel name", date')
        .ilike('"channel name"', `%${channelName}%`)
        .order('date', { ascending: false }).limit(1);

      if (error) throw error;
      if (!data || data.length === 0) {
        return { answer: `No videos found for channel "${channelName}".`, references: [] };
      }
      const video = data[0];
      const response = `## Latest Video from ${video['channel name']}\n\n**${video.video_title}**\n...`; // Abbreviated
      const references: WebSearchResultReference[] = [{ title: video.video_title, link: video.link, date: new Date(video.date).toLocaleDateString() }];
      return { answer: response, references };
    } catch (error) {
      console.error('Error fetching latest video:', error);
      return { answer: `Error getting latest video from "${channelName}".`, references: [] };
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
      <div className="relative flex flex-col w-full max-w-2xl h-[85vh] max-h-[700px] bg-gray-800 text-gray-100 rounded-lg shadow-xl overflow-hidden mx-4 mb-4 sm:mb-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
           <button onClick={() => setShowHistory(!showHistory)} className="p-2 rounded-md hover:bg-gray-700" aria-label="Toggle chat history">...</button>
          <h2 className="text-lg font-semibold truncate px-2">{currentChat?.title || 'Chat'}</h2>
           <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-700" aria-label="Close chat">...</button>
        </div>
        {/* Chat History Sidebar */}
         {showHistory && <ChatHistory chats={chats} activeChat={currentChat?.id || ''} onSelectChat={selectChat} onNewChat={startNewChat} onClose={() => setShowHistory(false)} />}
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
                 {message.references && message.references.length > 0 && (
                   <div className="text-xs text-gray-400 mt-1 w-full max-w-[85%] pl-1 ${message.role === 'user' ? 'text-right' : 'text-left'}">
                      Sources:
                      <div className="flex flex-wrap gap-x-2 gap-y-1">
                         {message.references.map((ref, index) => (
                           <a key={index} href={ref.link} target="_blank" rel="noopener noreferrer" className="block text-blue-400 hover:underline truncate" title={ref.link}>
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
            <button type="button" onClick={sendMessage} disabled={loading || !input.trim()} className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0" aria-label="Send message">...</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow; 