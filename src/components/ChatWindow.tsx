"use client";

import { useState, useEffect, useRef } from 'react';
import ChatHistory from './ChatHistory';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

const ChatWindow = ({ onClose }: { onClose: () => void }) => {
  const [input, setInput] = useState('');
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chats from Supabase
  useEffect(() => {
    const loadChats = async () => {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data && !error) {
        setChats(data.map(chat => ({
          id: chat.id,
          title: chat.title,
          messages: chat.messages,
          createdAt: new Date(chat.created_at).getTime()
        })));
      }
    };
    
    loadChats();
  }, []);

  // Create a new chat if none exists
  useEffect(() => {
    if (!currentChat && chats.length === 0) {
      const newChat = {
        id: uuidv4(),
        title: 'New Chat',
        messages: [],
        createdAt: Date.now()
      };
      setCurrentChat(newChat);
      setChats([newChat]);
    } else if (!currentChat && chats.length > 0) {
      setCurrentChat(chats[0]);
    }
  }, [currentChat, chats]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages]);

  const sendMessage = async () => {
    if (!input.trim() || !currentChat) return;
    
    // Create user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };
    
    // Update chat with user message
    const updatedChat = {
      ...currentChat,
      messages: [...currentChat.messages, userMessage],
      title: currentChat.messages.length === 0 ? input.slice(0, 30) : currentChat.title
    };
    
    setCurrentChat(updatedChat);
    setInput('');
    setLoading(true);
    
    try {
      // Send message to API
      const response = await fetch('/api/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input })
      });
      
      const data = await response.json();
      
      // Create assistant message
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: data.answer || 'Sorry, I could not find an answer.',
        timestamp: Date.now()
      };
      
      // Update chat with assistant message
      const finalChat = {
        ...updatedChat,
        messages: [...updatedChat.messages, assistantMessage]
      };
      
      setCurrentChat(finalChat);
      
      // Update in Supabase
      await supabase
        .from('chats')
        .upsert({
          id: finalChat.id,
          title: finalChat.title,
          messages: finalChat.messages,
          created_at: new Date(finalChat.createdAt).toISOString()
        });
      
      // Update chats list
      setChats(prevChats => {
        const index = prevChats.findIndex(chat => chat.id === finalChat.id);
        if (index !== -1) {
          const newChats = [...prevChats];
          newChats[index] = finalChat;
          return newChats;
        }
        return [finalChat, ...prevChats];
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    const newChat = {
      id: uuidv4(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now()
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

  return (
    <div className="fixed inset-0 bg-[#1A1B1E] bg-opacity-95 flex items-center justify-center z-50">
      <div className="bg-[#2A2B2E] w-[80%] rounded-lg shadow-2xl h-[85vh] flex flex-col relative text-gray-100">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <button 
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="text-gray-400 hover:bg-gray-700 p-2 rounded-full transition-colors"
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
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <h3 className="font-medium text-lg">Chat Assistant</h3>
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
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="inline-block p-3 bg-gray-700 text-gray-100 rounded-lg">
                Thinking...
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
              placeholder="Ask anything"
              className="flex-1 bg-gray-700 text-gray-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              disabled={loading}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400 transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow; 