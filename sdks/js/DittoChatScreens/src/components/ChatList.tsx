import React, { useEffect, useState } from "react";
import type { Chat } from "../types";
import ChatListItem from "./ChatListItem";
import { Icons } from "./Icons";
import { useDittoChatStore } from "dittochatcore";
import type Room from "dittochatcore/dist/types/Room";
import { CHATS } from "../constants";

interface ChatListProps {
  onSelectChat: (chat: Chat) => void;
  onNewMessage: () => void;
  selectedChatId: number | string | null;
}

const ChatList: React.FC<ChatListProps> = ({
  onSelectChat,
  onNewMessage,
  selectedChatId,
}) => {
  const [chats, setChats] = useState<Chat[]>(CHATS);
  const rooms = useDittoChatStore((state) => state.rooms);
  useEffect(() => {
    rooms.map((room: Room) => {
      const existingRoom = chats.find((chat) => chat.id === room._id);
      if (!existingRoom) {
        setChats((prevChats) => [
          ...prevChats,
          {
            id: room._id,
            type: "group",
            name: room.name,
            participants: [],
            messages: [],
          },
        ]);
      }
    });
  }, [rooms]);
  const [searchTerm, setSearchTerm] = useState("");

  // A real app would have more sophisticated search logic
  const filteredChats = chats.filter((chat) =>
    (chat.name || "DM").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="p-4 border-b border-[rgb(var(--border-color))]">
        <h1 className="text-2xl font-bold">Chats</h1>
      </header>
      <div className="p-4 space-y-4">
        <button
          onClick={onNewMessage}
          className="w-full bg-[rgb(var(--primary-color))] text-[rgb(var(--text-on-primary))] font-semibold py-3 rounded-lg hover:bg-[rgb(var(--primary-color-hover))] transition-colors"
        >
          New Message
        </button>
        <div className="relative">
          <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgb(var(--text-color-faint))]" />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[rgb(var(--secondary-bg))] border border-[rgb(var(--border-color))] rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary-color-focus))]"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ul>
          {filteredChats.map((chat) => (
            <li key={chat.id}>
              <ChatListItem
                chat={chat}
                isSelected={chat.id === selectedChatId}
                onSelect={() => onSelectChat(chat)}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ChatList;
