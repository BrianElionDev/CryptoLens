"use client";

interface ChatHistoryProps {
  chats: Array<{
    id: string;
    title: string;
    createdAt: number;
  }>;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  activeChat: string | undefined;
}

const ChatHistory = ({ chats, onSelectChat, onNewChat, activeChat }: ChatHistoryProps) => {
  return (
    <div className="absolute top-16 left-0 w-72 bg-[#1E1F23] h-[calc(100%-64px)] border-r border-gray-700 z-10 overflow-auto">
      <div className="p-4">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors mb-6"
        >
          New Chat
        </button>
        
        <h4 className="text-xs uppercase text-gray-400 font-medium mb-3 px-2">Chat History</h4>
        
        <div className="space-y-1">
          {chats.map(chat => (
            <button
              key={chat.id}
              type="button"
              onClick={() => onSelectChat(chat.id)}
              className={`w-full text-left p-3 rounded-lg text-sm ${
                activeChat === chat.id
                  ? 'bg-gray-700 text-gray-100'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              {chat.title || 'New Chat'}
              <div className="text-xs text-gray-500 mt-1">
                {new Date(chat.createdAt).toLocaleDateString()}
              </div>
            </button>
          ))}
          
          {chats.length === 0 && (
            <p className="text-sm text-gray-400 p-2">No chat history</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHistory; 