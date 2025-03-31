"use client";

import { useState, useEffect, useRef } from 'react';
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
      else if (/give me (?:the )?(?:summary|transcript) of (.+?)(?:$|\s*video)/i.test(input)) {
        const titleMatch = input.match(/give me (?:the )?(?:summary|transcript) of (.+?)(?:$|\s*video)/i);
        const videoTitle = titleMatch ? titleMatch[1].trim() : '';
        const result = await getVideoContent(videoTitle);
        answer = result.answer;
        references = result.references;
      }
      else if (/find videos(?:.+?)about (.+?)(?:$|\s*topic)/i.test(input)) {
        const topicMatch = input.match(/find videos(?:.+?)about (.+?)(?:$|\s*topic)/i);
        const topic = topicMatch ? topicMatch[1].trim() : '';
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
        const topicMatch = input.match(/give me a summary about (.+?)(?:$|\s*topic)?/i);
        const topic = topicMatch ? topicMatch[1].trim() : '';
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

  // Helper function to get summary about a topic
  const getTopicSummary = async (topic: string) => {
    try {
      if (!topic) {
        return {
          answer: "Please specify a topic to summarize.",
          references: []
        };
      }
      
      // Get videos containing the topic in transcript or summary
      const { data, error } = await supabase
        .from('knowledge')
        .select('video_title, link, "channel name", date, transcript, summary')
        .or(`transcript.ilike.%${topic}%,summary.ilike.%${topic}%`)
        .order('date', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return {
          answer: `I couldn't find any information about "${topic}" in the recent videos. Please try a different topic.`,
          references: []
        };
      }
      
      // Collect all relevant information
      let allContent = data.map(video => video.summary || video.transcript || "").join(" ");
      
      // Simple summary extraction - in a real application, this would use LLM for synthesis
      let summarizedContent = `Based on ${data.length} recent videos, here's what I found about ${topic}:\n\n`;
      summarizedContent += `The topic "${topic}" appears in videos from channels like ${Array.from(new Set(data.map(v => v['channel name']))).join(", ")}. `;
      summarizedContent += `Most recent coverage was on ${new Date(data[0].date).toLocaleDateString()}.`;
      
      // Format response with markdown
      let response = `## Summary about ${topic}\n\n`;
      response += summarizedContent + "\n\n";
      response += "### Referenced Videos\n\n";
      
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
      console.error('Error generating topic summary:', error);
      return {
        answer: `I encountered an error while summarizing information about "${topic}". Please try again later.`,
        references: []
      };
    }
  };

  // Helper function to get videos by topic
  const getVideosByTopic = async (topic: string, count = 10) => {
    try {
      if (!topic) {
        return {
          answer: "Please specify a topic to find videos about.",
          references: []
        };
      }
      
      const { data, error } = await supabase
        .from('knowledge')
        .select('video_title, link, "channel name", date')
        .or(`transcript.ilike.%${topic}%,summary.ilike.%${topic}%,video_title.ilike.%${topic}%`)
        .order('date', { ascending: false })
        .limit(count);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return {
          answer: `I couldn't find any videos about "${topic}". Please try a different topic.`,
          references: []
        };
      }
      
      // Format response with markdown
      let response = `## Videos about ${topic}\n\n`;
      
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
      console.error('Error fetching videos by topic:', error);
      return {
        answer: `I encountered an error while searching for videos about "${topic}". Please try again later.`,
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