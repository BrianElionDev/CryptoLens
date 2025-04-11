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