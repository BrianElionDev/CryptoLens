"use client";

import React, { useState, useEffect, useRef } from 'react';
import ChatHistory from './ChatHistory';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { Message, Chat } from '../types/chat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '../styles/markdown.css';
import MarkdownContent from './MarkdownContent';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Dedicated component for Markdown rendering
const MarkdownContent = ({ content }: { content: string }) => {
  return (
    <div className="markdown-content prose prose-invert max-w-none break-words">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => <h1 className="text-xl font-bold my-3" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-lg font-bold my-2" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-base font-bold my-2" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-2" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-2" {...props} />,
          li: ({ node, ...props }) => <li className="my-1" {...props} />,
          p: ({ node, ...props }) => <p className="my-2" {...props} />,
          a: ({ node, href, ...props }) => 
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline" {...props} />,
          table: ({ node, ...props }) => <table className="border-collapse my-3 w-full" {...props} />,
          th: ({ node, ...props }) => <th className="border border-gray-600 px-3 py-2 bg-gray-800" {...props} />,
          td: ({ node, ...props }) => <td className="border border-gray-600 px-3 py-2" {...props} />,
          blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-500 pl-4 italic my-3" {...props} />,
          code: ({ node, ...props }: any) => 
            props.inline 
              ? <code className="bg-gray-800 rounded px-1" {...props} />
              : <code className="block bg-gray-800 p-2 rounded my-2 overflow-auto" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

const ChatWindow = ({ onClose }: { onClose: () => void }) => {
  const [input, setInput] = useState('');
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chats from Supabase with proper ordering
  useEffect(() => {
    const loadChats = async () => {
      try {
        console.log('Loading chats from Supabase...');
        const { data, error } = await supabase
          .from('chats')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error loading chats:', error);
          return;
        }

        console.log('Loaded chats:', data);
        
        if (data) {
          const formattedChats = data.map(chat => ({
            id: chat.id,
            title: chat.title || 'Untitled Chat',
            messages: chat.messages || [],
            created_at: chat.created_at
          }));
          setChats(formattedChats);
          
          // Set current chat if none selected
          if (!currentChat && formattedChats.length > 0) {
            setCurrentChat(formattedChats[0]);
          }
        }
      } catch (error) {
        console.error('Error in loadChats:', error);
      }
    };
    
    loadChats();
  }, []);

  // Generate title from first message
  const generateTitle = (message: string): string => {
    return message.length > 30 
      ? `${message.substring(0, 30)}...`
      : message;
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentChat) return;
    
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };
    
    // Generate title if this is the first message
    const isNewChat = currentChat.messages.length === 0;
    const chatTitle = isNewChat ? generateTitle(input) : currentChat.title;
    
    const updatedChat = {
      ...currentChat,
      title: chatTitle,
      messages: [...currentChat.messages, userMessage]
    };
    
    setCurrentChat(updatedChat);
    setInput('');
    setLoading(true);
    
    try {
      console.log('Saving initial message to Supabase:', updatedChat);
      // Save to Supabase immediately
      const { error: initialError } = await supabase
        .from('chats')
        .upsert({
          id: updatedChat.id,
          title: chatTitle,
          messages: updatedChat.messages,
          created_at: new Date().toISOString()
        });

      if (initialError) {
        console.error('Error saving initial message:', initialError);
        return;
      }

      // Process special queries directly or send to API
      let answer = '';
      let references = [];
      
      // Check if the query matches any special patterns
      if (/give me videos from this week/i.test(input)) {
        const result = await getRecentVideos(10);
        answer = result.answer;
        references = result.references;
      } 
      else if (/show (?:me )?(?:the )?latest (\d+)? ?videos/i.test(input)) {
        const countMatch = input.match(/show (?:me )?(?:the )?latest (\d+)? ?videos/i);
        const count = countMatch && countMatch[1] ? parseInt(countMatch[1]) : 10;
        const result = await getRecentVideos(count);
        answer = result.answer;
        references = result.references;
      }
      else if (/give me (?:videos|video titles) from (.+?)(?:$|\s*channel)/i.test(input)) {
        const channelMatch = input.match(/give me (?:videos|video titles) from (.+?)(?:$|\s*channel)/i);
        const channelName = channelMatch ? channelMatch[1].trim() : '';
        const result = await getVideosFromChannel(channelName, 10);
        answer = result.answer;
        references = result.references;
      }
      else if (/give me a summary about (.+?)(?:$|\.|\?|topic)/i.test(input)) {
        const topicMatch = input.match(/give me a summary about (.+?)(?:$|\.|\?|topic)/i);
        const topic = topicMatch ? topicMatch[1].trim() : '';
        console.log('Extracted topic for summary:', topic);
        const result = await getTopicSummary(topic);
        answer = result.answer;
        references = result.references;
      }
      else if (/find videos(?:.+?)about (.+?)(?:$|\s*topic)/i.test(input)) {
        const topicMatch = input.match(/find videos(?:.+?)about (.+)$/i);
        const topic = topicMatch ? topicMatch[1].trim() : '';
        console.log('Extracted topic for video search:', topic);
        const result = await getVideosByTopic(topic);
        answer = result.answer;
        references = result.references;
      }
      else if (/give me videos (?:from|published) (?:on|after|before) (.+?)(?:$|\s*date)/i.test(input)) {
        const dateMatch = input.match(/give me videos (?:from|published) (?:on|after|before) (.+?)(?:$|\s*date)/i);
        const dateStr = dateMatch ? dateMatch[1].trim() : '';
        const isAfter = /after/i.test(input);
        const isBefore = /before/i.test(input);
        const result = await getVideosByDate(dateStr, isAfter, isBefore);
        answer = result.answer;
        references = result.references;
      }
      else if (/give me a summary about (.+?)(?:$|\s*topic)?/i.test(input)) {
        const topicMatch = input.match(/give me a summary about (.+)$/i);
        const topic = topicMatch ? topicMatch[1].trim() : '';
        console.log('Extracted topic for summary:', topic);
        const result = await getTopicSummary(topic);
        answer = result.answer;
        references = result.references;
      }
      else if (/give me (\d+)(?:\s*videos)? from (.+?)(?:$|\s*channel)/i.test(input)) {
        const countChannelMatch = input.match(/give me (\d+)(?:\s*videos)? from (.+?)(?:$|\s*channel)/i);
        const count = countChannelMatch ? parseInt(countChannelMatch[1]) : 10;
        const channelName = countChannelMatch ? countChannelMatch[2].trim() : '';
        const result = await getVideosFromChannel(channelName, count);
        answer = result.answer;
        references = result.references;
      }
      else if (/what video channels do you have(?:\s*information about)?/i.test(input)) {
        const result = await getAvailableChannels();
        answer = result.answer;
        references = result.references;
      }
      else if (/what(?:'s| is) the latest video(?:s)? (?:from|by) (.+?)(?:$|\s*channel)/i.test(input)) {
        const channelMatch = input.match(/what(?:'s| is) the latest video(?:s)? (?:from|by) (.+?)(?:$|\s*channel)/i);
        const channelName = channelMatch ? channelMatch[1].trim() : '';
        const result = await getLatestFromChannel(channelName);
        answer = result.answer;
        references = result.references;
      }
      else {
        // Process through regular API for other queries
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            question: input,
            chatId: currentChat.id
          })
        });
        
        const data = await response.json();
        answer = data.answer;
        references = data.references || [];
      }
      
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: answer,
        timestamp: Date.now(),
        references: references
      };
      
      const finalChat = {
        ...updatedChat,
        messages: [...updatedChat.messages, assistantMessage]
      };
      
      setCurrentChat(finalChat);
      
      console.log('Saving final chat to Supabase:', finalChat);
      // Update final version in Supabase
      const { error: finalError } = await supabase
        .from('chats')
        .upsert({
          id: finalChat.id,
          title: chatTitle,
          messages: finalChat.messages,
          created_at: new Date().toISOString()
        });

      if (finalError) {
        console.error('Error saving final chat:', finalError);
        return;
      }
      
      // Update local chat list
      setChats(prevChats => {
        const chatIndex = prevChats.findIndex(c => c.id === finalChat.id);
        if (chatIndex !== -1) {
          const newChats = [...prevChats];
          newChats[chatIndex] = finalChat;
          return newChats;
        }
        return [finalChat, ...prevChats];
      });
      
    } catch (error) {
      console.error('Error in sendMessage:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to generate embedding for the user's query text
  async function getQueryEmbedding(queryText: string): Promise<number[] | null> {
     try {
       console.log(`Generating embedding for query: "${queryText}"`);
       
       // Add a timeout to the fetch request
       const controller = new AbortController();
       const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
       
       const { data, error } = await supabase.functions.invoke('generate-embedding', {
         body: { inputText: queryText },
         signal: controller.signal,
       });
       
       // Clear the timeout
       clearTimeout(timeoutId);
       
       if (error) {
         console.error('Edge function invocation error:', error);
         // Try to provide more details about the error
         if (error.message.includes('FunctionsFetchError')) {
           console.error('Function fetch error. This could indicate:');
           console.error('1. The function is not deployed correctly');
           console.error('2. There are network issues connecting to Supabase');
           console.error('3. The OPENAI_API_KEY is missing or invalid on the server');
         }
         
         // Implement a simplified fallback if needed
         console.log('Using fallback method (no semantic search) due to embedding generation failure.');
         return null;
       }
       
       if (!data?.embedding) {
         console.error('Invalid embedding data received:', data);
         return null;
       }
       
       console.log('Successfully received query embedding.');
       return data.embedding;
     } catch (error) {
       console.error('Error getting query embedding:', error);
       if (error instanceof DOMException && error.name === 'AbortError') {
         console.error('Request timed out after 10 seconds');
       }
       return null;
     }
  }

  // Helper function to get recent videos (last 7 days)
  const getRecentVideos = async (count = 10) => {
    try {
      // Calculate date for a week ago
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('knowledge')
        .select('video_title, link, "channel name", date')
        .gte('date', oneWeekAgo.toISOString())
        .order('date', { ascending: false })
        .limit(count);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return {
          answer: "I couldn't find any videos from the past week.",
          references: []
        };
      }
      
      // Format response with markdown
      let response = `## Recent Videos (Past Week)\n\n`;
      
      data.forEach((video, index) => {
        response += `${index + 1}. **${video.video_title}**\n`;
        response += `   - **Channel**: ${video['channel name']}\n`;
        response += `   - **Date**: ${new Date(video.date).toLocaleDateString()}\n\n`;
      });
      
      const references = data.map(video => ({
        title: video.video_title,
        link: video.link,
        date: new Date(video.date).toLocaleDateString()
      }));
      
      return {
        answer: response,
        references
      };
    } catch (error) {
      console.error('Error fetching recent videos:', error);
      return {
        answer: "I encountered an error while searching for recent videos. Please try again later.",
        references: []
      };
    }
  };

  // Helper function to get videos from a specific channel
  const getVideosFromChannel = async (channelName: string, count = 10) => {
    try {
      if (!channelName) {
        return {
          answer: "Please specify a channel name to get videos from.",
          references: []
        };
      }
      
      const { data, error } = await supabase
        .from('knowledge')
        .select('video_title, link, "channel name", date')
        .ilike('"channel name"', `%${channelName}%`)
        .order('date', { ascending: false })
        .limit(count);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return {
          answer: `I couldn't find any videos from channel "${channelName}". Please check the channel name and try again.`,
          references: []
        };
      }
      
      // Format response with markdown
      let response = `## Videos from ${data[0]['channel name']}\n\n`;
      
      data.forEach((video, index) => {
        response += `${index + 1}. **${video.video_title}**\n`;
        response += `   - **Date**: ${new Date(video.date).toLocaleDateString()}\n\n`;
      });
      
      const references = data.map(video => ({
        title: video.video_title,
        link: video.link,
        date: new Date(video.date).toLocaleDateString()
      }));
      
      return {
        answer: response,
        references
      };
    } catch (error) {
      console.error('Error fetching videos from channel:', error);
      return {
        answer: `I encountered an error while searching for videos from "${channelName}". Please try again later.`,
        references: []
      };
    }
  };

  // Helper function to get content of a specific video
  const getVideoContent = async (videoTitle: string) => {
    try {
      if (!videoTitle) {
        return {
          answer: "Please specify a video title to get the summary or transcript.",
          references: []
        };
      }
      
      const { data, error } = await supabase
        .from('knowledge')
        .select('video_title, link, "channel name", date, transcript, summary')
        .ilike('video_title', `%${videoTitle}%`)
        .limit(1);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return {
          answer: `I couldn't find any video with title similar to "${videoTitle}". Please check the video title and try again.`,
          references: []
        };
      }
      
      const video = data[0];
      const content = video.summary || video.transcript || "No content available for this video.";
      
      // Format response with markdown
      let response = `## ${video.video_title}\n\n`;
      response += `**Channel**: ${video['channel name']}\n`;
      response += `**Date**: ${new Date(video.date).toLocaleDateString()}\n\n`;
      response += `### ${video.summary ? 'Summary' : 'Transcript'}\n\n`;
      response += content;
      
      const references = [{
        title: video.video_title,
        link: video.link,
        date: new Date(video.date).toLocaleDateString()
      }];
      
      return {
        answer: response,
        references
      };
    } catch (error) {
      console.error('Error fetching video content:', error);
      return {
        answer: `I encountered an error while retrieving content for "${videoTitle}". Please try again later.`,
        references: []
      };
    }
  };

  // Helper function to get summary about a topic (USING EMBEDDINGS)
  const getTopicSummary = async (topic: string) => {
    try {
      if (!topic) {
        return { answer: "Please specify a topic to summarize.", references: [] };
      }

      console.log(`Summarizing topic: "${topic}" using embeddings...`);
      const queryEmbedding = await getQueryEmbedding(topic);
      
      // If we can't get embeddings, fall back to web search
      if (!queryEmbedding) {
        console.log('Embedding generation failed. Falling back to web search...');
        return await webSearchFallback(topic);
      }

      // Fetch top N relevant videos using RPC based on embedding similarity
      console.log('Finding relevant videos for summary...');
      const { data: videos, error: rpcError } = await supabase.rpc('match_videos', {
        query_embedding: queryEmbedding,
        match_threshold: 0.70, // Lower threshold to get broader context for summary
        match_count: 5      // Get top 5 videos for context
      });

      if (rpcError) {
        console.error('RPC match_videos error:', rpcError);
        // Fall back to web search if RPC fails
        console.log('RPC call failed. Falling back to web search...');
        return await webSearchFallback(topic);
      }

      if (!videos || videos.length === 0) {
        console.log('No matching videos found via embeddings. Trying web search...');
        return await webSearchFallback(topic);
      }

      console.log(`Found ${videos.length} relevant videos. Fetching details...`);
      // Now fetch the full content (summary/transcript) for these matched videos
      const videoIds = videos.map(v => v.id);
      const { data: videoDetails, error: detailError } = await supabase
        .from('knowledge')
        .select('new_id, video_title, link, "channel name", date, summary, transcript')
        .in('new_id', videoIds);

      if (detailError) {
        console.error('Error fetching video details:', detailError);
        throw detailError;
      }
      if (!videoDetails) {
        console.error('No details found for matched video IDs.');
        return { answer: "Error fetching details for summary.", references: [] };
      }

      // *** START - LLM Summarization Placeholder ***
      // In a real application, you would:
      // 1. Combine the 'summary' or 'transcript' from 'videoDetails'
      // 2. Send this combined context to an LLM (e.g., via another Edge Function/API route)
      // 3. Use the LLM's response as the 'summarizedContent'

      console.log('Preparing content for LLM summarization...');
      let combinedTextForLLM = videoDetails
        .map(v => `Video Title: ${v.video_title}\nChannel: ${v['channel name']}\nDate: ${new Date(v.date).toLocaleDateString()}\nContent: ${v.summary || v.transcript || 'No text content.'}`)
        .join('\n\n---\n\n');

      // Call our generate-summary Edge Function
      console.log('Calling generate-summary Edge Function...');
      let summarizedContent;
      try {
        const { data, error } = await supabase.functions.invoke('generate-summary', {
          body: { 
            topic: topic,
            content: combinedTextForLLM 
          },
        });
        
        if (error) {
          console.error('Error from summary function:', error);
          // Fallback if the LLM summarization fails
          summarizedContent = `Based on ${videoDetails.length} videos related to "${topic}":\n\n`;
          videoDetails.forEach((video, index) => {
            summarizedContent += `### Video ${index + 1}: ${video.video_title}\n`;
            summarizedContent += `${(video.summary || video.transcript || 'No content available.').substring(0, 150)}...\n\n`;
          });
        } else {
          // Use the LLM-generated summary
          summarizedContent = data.summary;
          console.log('Successfully received LLM-generated summary.');
        }
      } catch (error) {
        console.error('Error calling summary function:', error);
        // Fallback if the function call fails
        summarizedContent = `Based on ${videoDetails.length} videos related to "${topic}":\n\n`;
        videoDetails.forEach((video, index) => {
          summarizedContent += `### Video ${index + 1}: ${video.video_title}\n`;
          summarizedContent += `${(video.summary || video.transcript || 'No content available.').substring(0, 150)}...\n\n`;
        });
      }
      // *** END - LLM Summarization Integration ***

      // Format the final response using Markdown
      let response = `## Summary about ${topic}\n\n${summarizedContent}\n\n### Referenced Videos\n\n`;
      videoDetails.forEach((video, index) => {
        const similarityScore = videos.find(v => v.id === video.new_id)?.similarity; // Find similarity score
        response += `${index + 1}. **${video.video_title}** ${similarityScore ? `(Relevance: ${similarityScore.toFixed(2)})` : ''}\n`;
        response += `   - **Channel**: ${video['channel name']}\n`;
        response += `   - **Date**: ${new Date(video.date).toLocaleDateString()}\n\n`; // Adjusted spacing
      });

      const references = videoDetails.map(video => ({
        title: video.video_title,
        link: video.link,
        date: new Date(video.date).toLocaleDateString()
      }));

      console.log('Summary generation complete.');
      return { answer: response, references };

    } catch (error) {
      console.error('Error generating topic summary (embeddings): ', error);
      return { answer: `I encountered an error summarizing "${topic}". Please check the logs.`, references: [] };
    }
  };

  // Helper function for web search fallback (new function)
  const webSearchFallback = async (topic: string) => {
    try {
      console.log(`Trying web search for: "${topic}"`);
      
      const response = await fetch('/api/web-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: topic }),
      });
      
      if (!response.ok) {
        console.error(`Web search failed with status: ${response.status}`);
        // If web search fails, fall back to keyword search
        console.log('Web search failed. Falling back to keyword search...');
        return await getVideosByKeywords(topic);
      }
      
      const data = await response.json();
      
      // Format the response
      let answer = `## Information about ${topic}\n\n`;
      answer += data.answer;
      
      // Add a section about source if there are references
      if (data.references && data.references.length > 0) {
        answer += `\n\n## Web Sources\n\n`;
        data.references.forEach((ref: any, index: number) => {
          answer += `${index + 1}. [${ref.title}](${ref.link})\n`;
        });
      }
      
      // Add a note about the information source
      answer += `\n\n*Note: This information was retrieved from the web as of ${new Date().toLocaleDateString()} since no matching videos were found in our database.*`;
      
      return {
        answer,
        references: data.references || [],
        // Add a flag to indicate this is from web search
        isFromWeb: true
      };
    } catch (error) {
      console.error('Error in web search fallback:', error);
      // If web search fails with an exception, fall back to keyword search
      console.log('Web search threw an exception. Falling back to keyword search...');
      return await getVideosByKeywords(topic);
    }
  };

  // Helper function for keyword-based topic summary (fallback when embeddings fail)
  const getTopicSummaryByKeywords = async (topic: string) => {
    try {
      console.log(`Searching for "${topic}" using keyword search fallback...`);
      
      // Use ILIKE for simple text search (basic fallback)
      const { data, error } = await supabase
        .from('knowledge')
        .select('video_title, link, "channel name", date, summary, transcript')
        .or(`summary.ilike.%${topic}%,transcript.ilike.%${topic}%,video_title.ilike.%${topic}%`)
        .limit(5);
      
      if (error) {
        console.error('Keyword search error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        return {
          answer: `I couldn't find any videos related to "${topic}". Try using different keywords.`,
          references: []
        };
      }
      
      // Format markdown response
      let response = `## Summary about ${topic}\n\n`;
      response += `Found ${data.length} videos related to your topic through keyword search.\n\n`;
      response += `### Videos about ${topic}\n\n`;
      
      data.forEach((video, index) => {
        response += `${index + 1}. **${video.video_title}**\n`;
        response += `   - **Channel**: ${video['channel name']}\n`;
        response += `   - **Date**: ${new Date(video.date).toLocaleDateString()}\n\n`;
      });
      
      const references = data.map(video => ({
        title: video.video_title,
        link: video.link,
        date: new Date(video.date).toLocaleDateString()
      }));
      
      return { answer: response, references };
      
    } catch (error) {
      console.error('Error in keyword fallback search:', error);
      return { 
        answer: `I encountered an error while searching for information about "${topic}".`, 
        references: [] 
      };
    }
  };

  // Helper function to get videos by topic (USING EMBEDDINGS)
  const getVideosByTopic = async (topic: string, count = 10) => {
    try {
      if (!topic) {
        return { answer: "Please specify a topic to find videos about.", references: [] };
      }

      console.log(`Searching videos about "${topic}" using embeddings...`);
      const queryEmbedding = await getQueryEmbedding(topic);
      
      // If embeddings failed, fall back to keyword search
      if (!queryEmbedding) {
        console.log('Embedding generation failed. Trying web search fallback...');
        return await webSearchFallback(topic);
      }

      // Call the RPC function for similarity search
      const { data, error } = await supabase.rpc('match_videos', {
        query_embedding: queryEmbedding,
        match_threshold: 0.75, // Similarity threshold (adjust as needed)
        match_count: count
      });

      if (error) {
        console.error('RPC match_videos error:', error);
        // Fall back to web search if RPC fails
        console.log('RPC call failed. Trying web search fallback...');
        return await webSearchFallback(topic);
      }

      if (!data || data.length === 0) {
        console.log('No matching videos found via embeddings. Trying web search...');
        return await webSearchFallback(topic);
      }

      console.log(`Found ${data.length} videos via similarity search.`);
      // Format response with markdown, including similarity score
      let response = `## Videos about ${topic}\n\nBased on content similarity, here are the top results:\n\n`;
      data.forEach((video, index) => {
        response += `${index + 1}. **${video.video_title}** (Relevance: ${video.similarity.toFixed(2)})\n`;
        response += `   - **Channel**: ${video.channel_name}\n`;
        response += `   - **Date**: ${new Date(video.date).toLocaleDateString()}\n\n`; // Removed extra newline
      });

      const references = data.map(video => ({
        title: video.video_title,
        link: video.link,
        date: new Date(video.date).toLocaleDateString()
      }));

      return { answer: response, references };

    } catch (error) {
      console.error('Error fetching videos by topic (embeddings):', error);
      return { 
        answer: `I encountered an error searching for videos about "${topic}". Please check the logs.`, 
        references: [] 
      };
    }
  };

  // Helper function for keyword-based search (fallback when embeddings fail)
  const getVideosByKeywords = async (topic: string, count = 10) => {
    try {
      console.log(`Searching for "${topic}" using keyword search fallback...`);
      
      // Use ILIKE for simple text search
      const { data, error } = await supabase
        .from('knowledge')
        .select('video_title, link, "channel name", date')
        .or(`summary.ilike.%${topic}%,transcript.ilike.%${topic}%,video_title.ilike.%${topic}%`)
        .limit(count);
      
      if (error) {
        console.error('Keyword search error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        return {
          answer: `I couldn't find any videos related to "${topic}". Try using different keywords.`,
          references: []
        };
      }
      
      // Format markdown response
      let response = `## Videos about ${topic} (Keyword Search)\n\n`;
      
      data.forEach((video, index) => {
        response += `${index + 1}. **${video.video_title}**\n`;
        response += `   - **Channel**: ${video['channel name']}\n`;
        response += `   - **Date**: ${new Date(video.date).toLocaleDateString()}\n\n`;
      });
      
      const references = data.map(video => ({
        title: video.video_title,
        link: video.link,
        date: new Date(video.date).toLocaleDateString()
      }));
      
      return { answer: response, references };
      
    } catch (error) {
      console.error('Error in keyword search:', error);
      return { 
        answer: `I encountered an error while searching for videos about "${topic}".`, 
        references: [] 
      };
    }
  };

  // Helper function to get videos by date
  const getVideosByDate = async (dateStr: string, isAfter = false, isBefore = false) => {
    try {
      if (!dateStr) {
        return {
          answer: "Please specify a date to find videos.",
          references: []
        };
      }
      
      // Try to parse the date
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) {
        return {
          answer: `I couldn't understand the date "${dateStr}". Please use a standard date format like "2023-01-01" or "January 1, 2023".`,
          references: []
        };
      }
      
      let query = supabase
        .from('knowledge')
        .select('video_title, link, "channel name", date')
        .order('date', { ascending: false });
      
      // Apply date filters
      if (isAfter) {
        query = query.gte('date', parsedDate.toISOString());
      } else if (isBefore) {
        query = query.lte('date', parsedDate.toISOString());
      } else {
        // On the specific date (within 24 hours)
        const nextDay = new Date(parsedDate);
        nextDay.setDate(nextDay.getDate() + 1);
        query = query
          .gte('date', parsedDate.toISOString())
          .lt('date', nextDay.toISOString());
      }
      
      const { data, error } = await query.limit(10);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        const timeDescription = isAfter ? "after" : isBefore ? "before" : "on";
        return {
          answer: `I couldn't find any videos ${timeDescription} ${parsedDate.toLocaleDateString()}.`,
          references: []
        };
      }
      
      // Format response with markdown
      const timeDescription = isAfter ? "after" : isBefore ? "before" : "on";
      let response = `## Videos ${timeDescription} ${parsedDate.toLocaleDateString()}\n\n`;
      
      data.forEach((video, index) => {
        response += `${index + 1}. **${video.video_title}**\n`;
        response += `   - **Channel**: ${video['channel name']}\n`;
        response += `   - **Date**: ${new Date(video.date).toLocaleDateString()}\n\n`;
      });
      
      const references = data.map(video => ({
        title: video.video_title,
        link: video.link,
        date: new Date(video.date).toLocaleDateString()
      }));
      
      return {
        answer: response,
        references
      };
    } catch (error) {
      console.error('Error fetching videos by date:', error);
      return {
        answer: `I encountered an error while searching for videos by date. Please try again later.`,
        references: []
      };
    }
  };

  // Helper function to get available channels
  const getAvailableChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge')
        .select('"channel name"');
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return {
          answer: "I couldn't find any channels in the database.",
          references: []
        };
      }
      
      // Get unique channel names
      const channels = Array.from(new Set(data.map(item => item['channel name'])))
        .filter(Boolean)
        .sort();
      
      // Format response with markdown
      let response = `## Available Video Channels\n\n`;
      
      channels.forEach((channel, index) => {
        response += `${index + 1}. **${channel}**\n`;
      });
      
      return {
        answer: response,
        references: []
      };
    } catch (error) {
      console.error('Error fetching available channels:', error);
      return {
        answer: "I encountered an error while retrieving the list of available channels. Please try again later.",
        references: []
      };
    }
  };

  // Helper function to get the latest video from a specific channel
  const getLatestFromChannel = async (channelName: string) => {
    try {
      if (!channelName) {
        return {
          answer: "Please specify a channel name to get the latest video.",
          references: []
        };
      }
      
      const { data, error } = await supabase
        .from('knowledge')
        .select('video_title, link, "channel name", date')
        .ilike('"channel name"', `%${channelName}%`)
        .order('date', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return {
          answer: `I couldn't find any videos from channel "${channelName}". Please check the channel name and try again.`,
          references: []
        };
      }
      
      const video = data[0];
      
      // Format response with markdown
      let response = `## Latest Video from ${video['channel name']}\n\n`;
      response += `**${video.video_title}**\n\n`;
      response += `**Published on**: ${new Date(video.date).toLocaleDateString()}\n\n`;
      response += `You can watch this video [here](${video.link}).`;
      
      const references = [{
        title: video.video_title,
        link: video.link,
        date: new Date(video.date).toLocaleDateString()
      }];
      
      return {
        answer: response,
        references
      };
    } catch (error) {
      console.error('Error fetching latest video from channel:', error);
      return {
        answer: `I encountered an error while retrieving the latest video from "${channelName}". Please try again later.`,
        references: []
      };
    }
  };

  const startNewChat = () => {
    const newChat = {
      id: uuidv4(),
      title: 'New Chat',
      messages: [],
      created_at: new Date().toISOString()
    };
    setCurrentChat(newChat);
    setChats([newChat, ...chats]);
  };

  const selectChat = (chatId: string) => {
    const selected = chats.find(chat => chat.id === chatId);
    if (selected) {
      setCurrentChat(selected);
      setShowHistory(false);
    }
  };

  // Add handler to hide history when input is focused
  const handleInputFocus = () => {
    if (showHistory) {
      setShowHistory(false);
    }
  };

  const saveChat = async (messages: Message[]) => {
    try {
      console.log('Attempting to save chat:', messages);
      const { data, error } = await supabase
        .from('chats')
        .upsert({
          messages: messages,
          title: generateTitle(messages[0]?.content || 'New Chat'),
          created_at: new Date().toISOString(),
        });
      
      console.log('Supabase response:', { data, error });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving chat:', error);
      throw error;
    }
  }

  return (
    <div className="fixed inset-0 bg-[#1A1B1E] bg-opacity-95 flex items-center justify-center z-50">
      <div className="bg-[#2A2B2E] w-[80%] rounded-lg shadow-2xl h-[85vh] flex flex-col relative text-gray-100">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="text-gray-400 hover:bg-gray-700 p-2 rounded-full transition-colors flex items-center gap-2"
              aria-label="Toggle chat history"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="text-sm">History</span>
            </button>
          </div>
          <h3 className="font-medium text-lg">Video Knowledge Assistant</h3>
          <button 
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:bg-gray-700 p-2 rounded-full transition-colors"
            aria-label="Close chat"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        {/* Chat History Drawer */}
        {showHistory && (
          <ChatHistory 
            chats={chats} 
            onSelectChat={selectChat} 
            onNewChat={startNewChat}
            activeChat={currentChat?.id}
          />
        )}
        
        {/* Messages Container */}
        <div className="flex-1 overflow-auto p-4 space-y-6">
          {currentChat?.messages.map(message => (
            <div 
              key={message.id} 
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} flex-col gap-2`}
            >
              <div 
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                {message.role === 'user' ? (
                  message.content
                ) : (
                  <MarkdownContent content={message.content} />
                )}
              </div>
              {message.references && message.references.length > 0 && (
                <div className="text-sm text-gray-400 pl-3">
                  Sources:
                  {message.references.map((ref, index) => (
                    <a 
                      key={index}
                      href={ref.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block hover:text-blue-400 transition-colors"
                    >
                      {ref.title} {ref.date && `(${ref.date})`}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="inline-block p-3 bg-gray-700 text-gray-100 rounded-lg">
                Searching videos...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area */}
        <div className="border-t border-gray-700 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              onFocus={handleInputFocus}
              placeholder="Ask about video content or search for recent videos"
              className="flex-1 bg-gray-700 text-gray-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              disabled={loading}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400 transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow; 