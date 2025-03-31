"use client";

import { useState, useEffect, useRef } from 'react';
import ChatHistory from './ChatHistory';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { Message, Chat } from '../types/chat';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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

      // Process response and update chat
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: input,
          chatId: currentChat.id
        })
      });
      
      const data = await response.json();
      
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: data.answer,
        timestamp: Date.now(),
        references: data.references
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
                {message.content}
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