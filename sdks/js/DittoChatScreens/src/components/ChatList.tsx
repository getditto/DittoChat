import React, { useEffect, useState } from "react";
import type { Chat } from "../types";
import ChatListItem from "./ChatListItem";
import { Icons } from "./Icons";
import { useDittoChatStore } from "dittochatcore";
import type Room from "dittochatcore/dist/types/Room";
import type Message from "dittochatcore/dist/types/Message";

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
  const [chats, setChats] = useState<Chat[]>([]);
  const rooms = useDittoChatStore((state) => state.rooms);
  const users = useDittoChatStore((state) => state.allUsers);
  const currentUserId = useDittoChatStore((state) => state.chatUser?._id);
  const latestMessages = useDittoChatStore((state) => {
    const roomKeys = Object.keys(state.messagesByRoom);
    const latestMessages: Message[] = roomKeys.map((key) => {
      const messages = state.messagesByRoom[key];
      return messages[messages.length - 1].message;
    });
    const sortedMessages = latestMessages.sort(
      (a, b) =>
        new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime(),
    );
    return sortedMessages;
  });
  useEffect(() => {
    const chats: Chat[] = [];
    latestMessages.map((message: Message) => {
      const room = rooms.find((room: Room) => room._id === message.roomId);
      // const existingRoom = chats.find((chat) => chat.id === room._id);
      chats.push({
        id: room._id,
        type: "group",
        name: room.name,
        participants: [],
        messages: [message],
      });

      setChats(chats);
    });
  }, [rooms, latestMessages]);
  const [searchTerm, setSearchTerm] = useState("");

  // A real app would have more sophisticated search logic
  const filteredChats = chats.filter((chat) =>
    (chat.name || "DM").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="pl-4 pr-4 border-b min-h-12 flex items-center border-(--border-color)">
        <h1 className="text-xl font-semibold">Chats</h1>
      </header>
      <div className="p-4 space-y-4">
        <button
          onClick={onNewMessage}
          className="w-full bg-(--primary-color) text-(--text-on-primary) font-semibold py-3 rounded-xl hover:bg-(--primary-color-hover) transition-colors"
        >
          New Message
        </button>
        <div className="relative">
          <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--text-color-faint)" />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-(--secondary-bg) border border-(--border-color) rounded-3xl pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-(--primary-color-focus)"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <ul>
            {filteredChats.map((chat) => (
              <li key={chat.id}>
                <ChatListItem
                  chat={chat}
                  currentUserId={currentUserId}
                  users={users}
                  isSelected={chat.id === selectedChatId}
                  onSelect={() => onSelectChat(chat)}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ChatList;
