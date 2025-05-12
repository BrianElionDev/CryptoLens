"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { Chat } from '../types/chat';
import ChatHistory from './ChatHistory';
import '@n8n/chat/style.css';
import { createChat } from '@n8n/chat';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// N8n webhook URL
const N8N_WEBHOOK_URL = 'https://brianeliondev.app.n8n.cloud/webhook/089e38ab-4eee-4c34-aa5d-54cf4a8f53b7/chat';

// Custom styling for n8n chat to match our application theme
const injectCustomStyles = () => {
  const style = document.createElement('style');
  style.innerHTML = `
    :root {
      --chat--color-primary: #3b82f6; /* Blue-600 */
      --chat--color-primary-shade-50: #2563eb; /* Blue-700 */
      --chat--color-primary-shade-100: #1d4ed8; /* Blue-800 */
      --chat--color-secondary: #3b82f6; /* Blue-600 */
      --chat--color-secondary-shade-50: #2563eb; /* Blue-700 */
      --chat--color-white: #ffffff;
      --chat--color-light: #f8fafc; /* Gray-50 */
      --chat--color-light-shade-50: #f1f5f9; /* Gray-100 */
      --chat--color-light-shade-100: #e2e8f0; /* Gray-200 */
      --chat--color-medium: #94a3b8; /* Gray-400 */
      --chat--color-dark: #1e293b; /* Gray-800 */
      --chat--color-disabled: #64748b; /* Gray-500 */
      --chat--color-typing: #334155; /* Gray-700 */

      --chat--header--background: #1f2937; /* Gray-800 */
      --chat--header--color: #f9fafb; /* Gray-50 */
      
      --chat--message--bot--background: #1f2937; /* Gray-800 */
      --chat--message--bot--color: #f9fafb; /* Gray-50 */
      --chat--message--user--background: #3b82f6; /* Blue-600 */
      --chat--message--user--color: #ffffff;
      
      /* Container sized to match our custom UI */
      --chat--window--width: 100%;
      --chat--window--height: 100%;
    }
    
    /* Ensure the n8n chat container takes up the full space */
    #n8n-chat-container {
      height: 100%;
      width: 100%;
      position: relative;
      z-index: 1;
    }
    
    /* Show our custom header instead of n8n's */
    .chat-header {
      display: none !important;
    }
    
    /* Style messages area - enable scrolling */
    .chat-messages {
      background-color: #111827; /* Gray-900 */
      height: calc(100% - 60px); /* Adjust for the input box height */
      overflow-y: auto !important;
      padding: 1rem;
    }
    
    /* Style input area */
    .chat-input {
      background-color: #1f2937; /* Gray-800 */
      border-top: 1px solid #374151; /* Gray-700 */
      position: relative;
      z-index: 2;
    }

    /* Ensure the close button works */
    .fixed.inset-0 {
      z-index: 9999;
    }

    /* Make sure buttons are clickable */
    .fixed button {
      position: relative;
      z-index: 9999;
    }

    /* Fix for scrolling in message container */
    .chat-window {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    /* Ensure welcome messages are visible */
    .chat-welcome-screen {
      padding: 1rem;
      color: #f9fafb;
    }
  `;
  document.head.appendChild(style);
};

const N8nChatWindow = ({ onClose }: { onClose: () => void }) => {
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatInitializedRef = useRef(false);

  // Generate title from first message
  const generateTitle = useCallback((messageContent: string): string => {
    const title = messageContent.split('\n')[0];
    return title.length > 50 ? `${title.substring(0, 50)}...` : title || 'New Chat';
  }, []);

  // Handle chat messages from n8n
  const handleChatMessage = useCallback(async (event: MessageEvent) => {
    // Only process messages from n8n chat
    if (event.data && event.data.source === 'n8n-chat' && event.data.type === 'user-message') {
      const message = event.data.message;
      const chatId = currentChat?.id;
      
      if (!chatId) return;
      
      // For the first message, update the chat title
      if (currentChat?.messages.length === 0) {
        const title = generateTitle(message);
        
        // Update chat title in state
        const updatedChat = { ...currentChat, title };
        setCurrentChat(updatedChat);
        
        // Update chats list
        setChats(prevChats => {
          const updatedChats = prevChats.map(c => c.id === chatId ? { ...c, title } : c);
          return updatedChats;
        });
        
        // Save to database
        try {
          await supabase
            .from('chats')
            .upsert([{ id: chatId, title, messages: [] }]);
        } catch (error) {
          console.error('Error saving chat title:', error);
        }
      }
    }
    
    // Process bot responses to save in our database
    if (event.data && event.data.source === 'n8n-chat' && event.data.type === 'bot-message') {
      const userMessage = event.data.userMessage;
      const botMessage = event.data.message;
      const chatId = currentChat?.id;
      
      if (!chatId || !userMessage || !botMessage) return;
      
      try {
        // Fetch current messages
        const { data: chatData } = await supabase
          .from('chats')
          .select('messages')
          .eq('id', chatId)
          .single();
        
        const existingMessages = (chatData?.messages && Array.isArray(chatData.messages)) 
          ? chatData.messages 
          : [];
        
        // Add new messages
        const newMessages = [
          ...existingMessages,
          { 
            role: 'user', 
            content: userMessage, 
            timestamp: Date.now(), 
            id: uuidv4() 
          },
          {
            role: 'assistant',
            content: botMessage,
            timestamp: Date.now(),
            id: uuidv4()
          }
        ];
        
        // Update database
        await supabase
          .from('chats')
          .upsert([{ 
            id: chatId, 
            messages: newMessages 
          }]);
        
        // Update state
        if (currentChat) {
          const updatedChat = { ...currentChat, messages: newMessages };
          setCurrentChat(updatedChat);
        }
      } catch (error) {
        console.error('Error saving chat messages:', error);
      }
    }
  }, [currentChat, generateTitle]);

  // Initialize n8n chat with custom metadata
  const initializeN8nChat = useCallback((chatId: string) => {
    if (!chatContainerRef.current) return;
    
    // Clear previous chat instance
    chatContainerRef.current.innerHTML = '';
    
    // Make sure our custom styles are injected
    injectCustomStyles();
    
    // Create new n8n chat instance
    createChat({
      webhookUrl: N8N_WEBHOOK_URL,
      target: '#n8n-chat-container',
      mode: 'fullscreen', // Use fullscreen mode to integrate with our container
      chatInputKey: 'chatInput',
      chatSessionKey: 'sessionId',
      metadata: {
        chatId: chatId,
      },
      showWelcomeScreen: false, // Don't use n8n's welcome screen
      initialMessages: [
        'Hi there! 👋',
        'My name is Crypto, how can I help with your cryptocurrency information?'
      ],
      i18n: {
        en: {
          title: 'CryptoLens Assistant',
          subtitle: "How can I help you with cryptocurrency information?",
          inputPlaceholder: "Type your question...",
          getStarted: "New Conversation",
          footer: "", // Add missing required property
          closeButtonTooltip: "Close" // Add missing required property
        },
      },
    });

    // Add event listener for messages
    window.addEventListener('message', handleChatMessage);
  }, [handleChatMessage]);

  // Function to start a new chat
  const startNewChat = useCallback(() => {
    console.log("Starting new chat...");
    const newChatInstance: Chat = {
      id: uuidv4(),
      title: 'New Chat',
      messages: [],
      created_at: new Date().toISOString()
    };
    setChats(prevChats => [newChatInstance, ...prevChats].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setCurrentChat(newChatInstance);
    setShowHistory(false);

    // Reset n8n chat
    if (chatContainerRef.current) {
      // Remove previous chat instance
      chatContainerRef.current.innerHTML = '';
      
      // Initialize new chat instance
      initializeN8nChat(newChatInstance.id);
    }
  }, [initializeN8nChat]);

  // Load chats from Supabase
  useEffect(() => {
    const loadChats = async () => {
      setLoading(true);
      try {
        console.log('Loading chats from Supabase...');
        const { data, error } = await supabase
          .from('chats')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        console.log('Loaded chats:', data?.length);

        if (data && data.length > 0) {
          const formattedChats = data.map((chat): Chat => ({
            id: chat.id,
            title: chat.title || 'Untitled Chat',
            messages: Array.isArray(chat.messages) ? chat.messages : [],
            created_at: chat.created_at,
          })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          setChats(formattedChats);
          // Set the most recent chat as current if none is selected
          if (!currentChat) {
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
  }, [startNewChat]); // Now this dependency is properly memoized

  // Initialize n8n chat after component mounts
  useEffect(() => {
    if (currentChat && chatContainerRef.current && !chatInitializedRef.current) {
      initializeN8nChat(currentChat.id);
      chatInitializedRef.current = true;
    }
    
    return () => {
      // Cleanup event listener
      window.removeEventListener('message', handleChatMessage);
    };
  }, [currentChat, initializeN8nChat, handleChatMessage]);

  // Select chat handler
  const selectChat = useCallback((chatId: string) => {
    const selectedChat = chats.find(c => c.id === chatId);
    if (selectedChat) {
      setCurrentChat(selectedChat);
      setShowHistory(false);
      
      // Reinitialize n8n chat with the selected chat
      chatInitializedRef.current = false;
      if (chatContainerRef.current) {
        initializeN8nChat(selectedChat.id);
      }
    }
  }, [chats, initializeN8nChat]);

  // Add this useEffect to add and remove a body class when the chat window is active
  useEffect(() => {
    // Add class to body when component mounts
    document.body.classList.add('chat-overlay-active');
    
    // Cleanup function to remove class when component unmounts
    return () => {
      document.body.classList.remove('chat-overlay-active');
      
      // Extra cleanup for any persistent overlays
      const persistentOverlays = document.querySelectorAll('.persist-overlay');
      persistentOverlays.forEach(overlay => {
        (overlay as HTMLElement).style.display = 'none';
      });
    };
  }, []);

  // Modify the onClose handler to ensure cleanup
  const handleClose = useCallback(() => {
    // Remove the class before calling the onClose function
    document.body.classList.remove('chat-overlay-active');
    onClose();
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 w-full max-w-[900px] h-[80vh] rounded-lg shadow-2xl flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 flex justify-between items-center border-b border-gray-700 z-50">
          <div className="flex items-center space-x-4">
            <h3 className="text-xl font-semibold text-white">CryptoLens Assistant</h3>
          </div>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 rounded-full hover:bg-gray-700 text-gray-300 z-50"
              aria-label="Toggle chat history"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
            <button
              type="button"
              onClick={startNewChat}
              className="p-2 rounded-full hover:bg-gray-700 text-gray-300 z-50"
              aria-label="New chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-gray-700 text-gray-300 z-50"
              aria-label="Close chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* Chat history sidebar */}
        {showHistory && (
          <ChatHistory 
            chats={chats} 
            activeChat={currentChat?.id || ''} 
            onSelectChat={selectChat} 
            onNewChat={startNewChat} 
          />
        )}

        {/* Chat window */}
        <div className="flex-grow relative" style={{ overflow: "hidden" }}>
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div id="n8n-chat-container" ref={chatContainerRef} className="h-full w-full"></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default N8nChatWindow; 