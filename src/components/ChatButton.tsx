"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import N8nChatWindow from './N8nChatWindow';

const ChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Pages where the chat button should appear
  const allowedPages = [
    '/knowledge',
    '/channels',
    '/analytics',
    '/', // Crypto Lens home page
    '/autofetch',
    '/categories'
  ];

  // Check if current page should show the chat button
  const shouldShow = allowedPages.some(page => 
    pathname === page || pathname.startsWith(`${page}/`));
  
  // Add cleanup effect when path changes
  useEffect(() => {
    // If navigating away, close the chat to prevent overlay issues
    setIsOpen(false);
    
    // Additional cleanup for any persistent overlay elements
    if (document.body.classList.contains('chat-overlay-active')) {
      document.body.classList.remove('chat-overlay-active');
    }
    
    // Force cleanup of any lingering overlay elements
    setTimeout(() => {
      const overlays = document.querySelectorAll('.fixed.inset-0.bg-black.bg-opacity-50');
      overlays.forEach(overlay => {
        if (overlay instanceof HTMLElement) {
          overlay.style.display = 'none';
        }
      });
    }, 100);
  }, [pathname]);
  
  if (!shouldShow) return null;

  return (
    <>
      {isOpen && <N8nChatWindow onClose={() => setIsOpen(false)} />}
      
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full bg-blue-600 text-white p-4 shadow-lg hover:bg-blue-700 transition-all z-40"
        aria-label="Open chat"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
    </>
  );
};

export default ChatButton; 