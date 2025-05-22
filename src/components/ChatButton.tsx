"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import N8nChatWindow from "./N8nChatWindow";

const ChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const buttonClicked = useRef(false);
  const chatMountedRef = useRef(false);

  // Pages where the chat button should appear
  const allowedPages = [
    "/knowledge",
    "/channels",
    "/analytics",
    "/", // Crypto Lens home page
    "/autofetch",
    "/categories",
  ];

  // Check if current page should show the chat button
  const shouldShow = allowedPages.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );

  // Check if current page is categories
  const isCategoriesPage =
    pathname === "/categories" || pathname.startsWith("/categories/");

  // Handle opening the chat - must be wrapped in useCallback to prevent recreations
  const handleOpenChat = useCallback(() => {
    console.log("Opening chat...");
    buttonClicked.current = true;

    // Only add the class if we're not on the categories page
    if (!isCategoriesPage) {
      document.body.classList.add("chat-overlay-active");
    }

    setIsOpen(true);
  }, [isCategoriesPage]);

  // Handle closing the chat
  const handleCloseChat = useCallback(() => {
    console.log("Closing chat...");
    setIsOpen(false);

    // Only remove the class if we're not on the categories page
    if (!isCategoriesPage) {
      document.body.classList.remove("chat-overlay-active");
    }

    // Reset flags
    buttonClicked.current = false;
    chatMountedRef.current = false;
  }, [isCategoriesPage]);

  // When the chat component is mounted, set a flag
  useEffect(() => {
    if (isOpen) {
      chatMountedRef.current = true;
    }
  }, [isOpen]);

  // Add cleanup effect when path changes
  useEffect(() => {
    return () => {
      // When unmounting or path changes, clean up
      document.body.classList.remove("chat-overlay-active");
      buttonClicked.current = false;
      chatMountedRef.current = false;
    };
  }, [pathname]);

  if (!shouldShow) return null;

  return (
    <>
      {isOpen && <N8nChatWindow onClose={handleCloseChat} />}

      <button
        type="button"
        onClick={handleOpenChat}
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
