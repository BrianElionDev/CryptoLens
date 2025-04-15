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
  }, [currentChat?.messages]);

  // Function to start a new chat
  const startNewChat = useCallback(() => {
    console.log("Starting new chat...");
    const newChatInstance: Chat = {
      id: uuidv4(),
      title: 'New Chat',
      messages: [],
      created_at: new Date().toISOString()
    };
    setChats(prevChats => [newChatInstance, ...prevChats].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setCurrentChat(newChatInstance);
    setShowHistory(false);
  }, []);

  // Load chats from Supabase
  useEffect(() => {
    const loadChats = async () => {
      setLoading(true);
      try {
        console.log('Loading chats from Supabase...');
        const { data, error } = await supabase
          .from('chats')
          .select('*')
          .order('created_at', { ascending: false }); // Fetch newest first

        if (error) throw error;

        console.log('Loaded chats:', data?.length);

        if (data && data.length > 0) {
          const formattedChats = data.map((chat): Chat => ({
            id: chat.id,
            title: chat.title || 'Untitled Chat',
            messages: Array.isArray(chat.messages) ? chat.messages : [],
            created_at: chat.created_at,
          })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // Ensure sorted

          setChats(formattedChats);
          // Set the most recent chat as current if none is selected, or current one isn't in the loaded list
          if (!currentChat || !formattedChats.some(c => c.id === currentChat.id)) {
            setCurrentChat(formattedChats[0]);
          }
        } else {
          startNewChat(); // Start a new one if DB is empty
        }
      } catch (error) {
        console.error('Error loading chats:', error);
        startNewChat(); // Start new chat on error
      } finally {
        setLoading(false);
      }
    };
    loadChats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startNewChat]); // Depend on startNewChat

  // Generate title
  const generateTitle = (messageContent: string): string => {
    const title = messageContent.split('\n')[0];
    return title.length > 50 ? `${title.substring(0, 50)}...` : title || 'New Chat';
  };

  // Send message handler
  const sendMessage = async () => {
    if (!input.trim()) return;

    const chatToUpdate = currentChat;
    if (!chatToUpdate) {
      console.error("Critical Error: No current chat to send message to.");
      // Potentially start a new chat here if desired, but current logic depends on it being set
       startNewChat(); // Attempt recovery by starting a new chat
       // Need to potentially wait for state update or handle async nature
       // For now, just return to avoid errors, user might need to resend
       setLoading(false); // Ensure loading is reset
      return;
    }

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    const isNewChat = chatToUpdate.messages.length === 0;
    const chatTitle = isNewChat ? generateTitle(input) : chatToUpdate.title;

    // Optimistically update UI with user message
    const updatedChatWithUserMsg: Chat = {
      ...chatToUpdate,
      title: chatTitle,
      messages: [...chatToUpdate.messages, userMessage],
      // updated_at will be set by the backend on save
    };
    setCurrentChat(updatedChatWithUserMsg);
    setInput('');
    setLoading(true);

    // Update chats list state
    setChats(prevChats => {
      const updatedChats = prevChats.map(c => c.id === updatedChatWithUserMsg.id ? updatedChatWithUserMsg : c);
      if (!updatedChats.some(c => c.id === updatedChatWithUserMsg.id)) {
        updatedChats.push(updatedChatWithUserMsg); // Add if it's a new chat created mid-function
      }
      return updatedChats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });

     // No need to save user message separately here, API route handles saving the whole interaction
     // try { ... supabase upsert user message ... } block removed

    // Process query via API
    let assistantMessage: Message | null = null;
    try {
      console.log(`Processing query via /api/chat for chatId: ${chatToUpdate.id}`);
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          question: userMessage.content, // Use content from userMessage object
          chatId: chatToUpdate.id,
          title: chatTitle // Pass the generated title to the backend
          })
        });

       const data = await response.json(); // Expects UnifiedResponse structure

        if (!response.ok) {
         console.error('API Error from /api/chat:', response.status, data);
         assistantMessage = {
             id: uuidv4(),
             role: 'assistant',
             content: data.answer || `Sorry, an error occurred (Status: ${response.status}).`,
             timestamp: Date.now(),
             source: data.source || 'error',
             confidence: data.confidence || 0,
             references: data.references || []
        };
        } else {
         console.log("Received response from /api/chat:", data);
         assistantMessage = {
             id: uuidv4(),
             role: 'assistant',
             content: data.answer || "Sorry, I received an empty response.",
             timestamp: Date.now(),
          references: data.references || [],
             source: data.source || 'none', // Use source from API response
             confidence: data.confidence !== undefined ? data.confidence : 0 // Use confidence from API
          };
      }
    } catch (processingError) {
      console.error("Error fetching from /api/chat:", processingError);
      assistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: "Sorry, an internal error occurred while trying to reach the server.",
        timestamp: Date.now(),
        source: 'error',
        confidence: 0
      };
    }

     // Ensure assistantMessage is not null (it should always be assigned in try/catch)
     if (!assistantMessage) {
        console.error("Critical Error: Assistant message was unexpectedly null.");
        assistantMessage = {
             id: uuidv4(), role: 'assistant', content: "An unexpected client-side error occurred.", timestamp: Date.now(), source: 'error', confidence: 0
        };
     }

    // Update chat state with assistant message
    const finalChat: Chat = {
      ...updatedChatWithUserMsg, // Start from chat with user message
      messages: [...updatedChatWithUserMsg.messages, assistantMessage] // Add assistant message
      // updated_at will be set by the backend
    };

    // Update UI
    setCurrentChat(finalChat);
     setChats(prevChats => {
        const updatedChats = prevChats.map(c => c.id === finalChat.id ? finalChat : c);
        // Ensure the chat exists in the list
        if (!updatedChats.some(c => c.id === finalChat.id)) {
            updatedChats.push(finalChat);
        }
        return updatedChats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });

    // Backend API route now handles saving the interaction including the assistant message
    // try { ... supabase upsert final chat ... } block removed

    setLoading(false);
  };


  // Helper function to display source nicely
  const getSourceDisplayName = (source?: string): string | null => {
    if (!source) return null;
    switch (source) {
      case 'database': return 'Video DB';
      case 'tavily': return 'Tavily Search';
      case 'perplexity': return 'Perplexity Search';
      case 'openai': return 'OpenAI';
      case 'rag_fallback': return 'Video Content (Fallback)';
      case 'none': return 'Unavailable';
      case 'error': return 'Error';
      default: return source; // Show the raw source if unknown
    }
  };


  // Select chat handler
  const selectChat = (chatId: string) => {
    const selected = chats.find(chat => chat.id === chatId);
    if (selected) {
      setCurrentChat(selected);
      setShowHistory(false); // Hide history panel on selection
    }
  };

  // Hide history on input focus
  const handleInputFocus = () => {
    if (showHistory) {
      setShowHistory(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-60 backdrop-blur-sm sm:items-center">
      {/* Outer container for potential click-outside-to-close */}
      <div className="relative flex flex-col w-full max-w-4xl h-[85vh] max-h-[700px] bg-gray-800 text-gray-100 rounded-lg shadow-xl overflow-hidden mx-4 mb-4 sm:mb-0">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
           <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-700 transition-colors" aria-label="Toggle chat history">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            <span className="text-sm hidden sm:inline">History</span>
          </button>
          <h2 className="text-lg font-semibold truncate px-2 text-center flex-1">{currentChat?.title || 'Chat'}</h2>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-700 transition-colors" aria-label="Close chat">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
           </button>
        </div>

        {/* Chat History Sidebar - Absolutely positioned */}
         {showHistory && <ChatHistory chats={chats} activeChat={currentChat?.id || ''} onSelectChat={selectChat} onNewChat={startNewChat} />}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {!currentChat || currentChat.messages.length === 0 ? (
             <div className="text-center text-gray-400 mt-10">Start a conversation...</div>
           ) : (
             currentChat.messages.map(message => (
               <div key={message.id} className={`flex flex-col gap-1.5 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                {/* Message Bubble */}
                 <div className={`max-w-[85%] p-3 rounded-lg shadow-md ${message.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-100 rounded-bl-none'}`}>
                   {message.role === 'user' ? (
                     message.content // Render user content directly
                   ) : (
                     <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                        {message.content}
                     </ReactMarkdown>
                   )}
                 </div>
                 {/* Metadata for Assistant Messages */}
                 {message.role === 'assistant' && (message.source || message.confidence !== undefined) && (
                   <div className="text-xs text-gray-400 mt-1 w-full max-w-[85%] pl-1 flex gap-3">
                     {/* Display Source */}
                     {message.source && getSourceDisplayName(message.source) && (
                       <span>
                         Source: {getSourceDisplayName(message.source)}
                       </span>
                     )}
                     {/* Display Confidence */}
                     {message.confidence !== undefined && message.source !== 'error' && message.source !== 'none' && (
                       <span>
                         Confidence: {Math.round(message.confidence * 100)}%
                       </span>
                     )}
                   </div>
                 )}
                {/* Render references if they exist */}
                {message.role === 'assistant' && message.references && message.references.length > 0 && (
                    <div className="text-xs text-gray-400 mt-2 w-full max-w-[85%] pl-1 border-t border-gray-600 pt-2">
                        <strong className="text-gray-300">References:</strong>
                        <ul className="list-none pl-0 mt-1 space-y-1">
                         {message.references.map((ref, index) => (
                                <li key={index}>
                                    <a href={ref.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-words">
                                        {index + 1}. {ref.title}
                                    </a>
                                    {/* Optionally display snippet if useful */}
                                    {/* {ref.snippet && <p className="text-gray-500 italic text-xs pl-3">{ref.snippet}</p>} */}
                                </li>
                            ))}
                        </ul>
                   </div>
                 )}
               </div>
             ))
           )}
          {/* Anchor for scrolling */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-700 p-4 bg-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              onFocus={handleInputFocus} // Hide history on focus
              placeholder="Ask anything..." // Updated placeholder
              className="flex-1 bg-gray-700 text-gray-100 rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700"
              rows={1}
              style={{ maxHeight: '100px', overflowY: 'auto' }} // Prevent excessive growth
              disabled={loading}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 flex items-center gap-2"
              aria-label="Send message"
            >
             {loading ? (
                 <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
             ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
             )}
              <span className="hidden sm:inline">{loading ? 'Sending...' : 'Send'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow; 