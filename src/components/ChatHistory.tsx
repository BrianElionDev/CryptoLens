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
    <div className="absolute top-16 left-0 w-64 bg-gray-50 h-[calc(100%-64px)] border-r z-10 overflow-auto">
      <div className="p-3">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 mb-4"
        >
          New Chat
        </button>
        
        <h4 className="text-xs uppercase text-gray-500 font-semibold mb-2">Chat History</h4>
        
        <div className="space-y-1">
          {chats.map(chat => (
            <button
              type="button"
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`w-full text-left p-2 rounded-lg text-sm truncate ${
                activeChat === chat.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-200'
              }`}
            >
              {chat.title || 'New Chat'}
              <div className="text-xs text-gray-500">
                {new Date(chat.createdAt).toLocaleDateString()}
              </div>
            </button>
          ))}
          
          {chats.length === 0 && (
            <p className="text-sm text-gray-500 p-2">No chat history</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHistory; 