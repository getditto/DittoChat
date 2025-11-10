import React, { useRef, useEffect, useState } from "react";
import type { Chat } from "../types";
import { EMPTY_MESSAGES } from "../constants";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { Icons } from "./Icons";
import { useDittoChatStore } from "dittochatcore";
import type MessageWithUser from "dittochatcore/dist/types/MessageWithUser";
import type Message from "dittochatcore/dist/types/Message";
import type ChatUser from "dittochatcore/dist/types/ChatUser";
import Avatar from "./Avatar";
import type Room from "dittochatcore/dist/types/Room";

interface ChatViewProps {
  chat: Chat;
  onBack: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ chat, onBack }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const messages: MessageWithUser[] = useDittoChatStore(
    (state) => state.messagesByRoom[chat.id] || EMPTY_MESSAGES,
  );
  const currentUser: ChatUser = useDittoChatStore((state) => state.chatUser);
  const allUsers: ChatUser[] = useDittoChatStore((state) => state.allUsers);
  const createMessage = useDittoChatStore((state) => state.createMessage);
  const createImageMessage = useDittoChatStore(
    (state) => state.createImageMessage,
  );
  const fetchAttachment = useDittoChatStore((state) => state.fetchAttachment);

  const rooms = useDittoChatStore((state) => state.rooms) as Room[];
  const room = (rooms || []).find((room) => room._id === chat.id);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat.messages]);

  const handleStartEdit = (message: Message) => {
    setEditingMessage(message);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
  };

  const handleSaveEdit = (messageId: string, newContent: string) => {
    // onUpdateMessage(chat.id, messageId, newContent);
    console.log("Save", messageId, newContent);
    setEditingMessage(null);
  };

  let chatName = chat.name;
  let otherUserIsActive = false;

  if (chat.type === "dm") {
    const otherUser = chat.participants.find(
      (user) => user._id !== currentUser._id,
    );
    chatName = otherUser?.name || "Unknown User";
    // TODO: Implement user status
    otherUserIsActive = false;
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center px-4 min-h-12 border-b border-(--border-color) flex-shrink-0">
        <button
          onClick={onBack}
          className="md:hidden mr-4 text-(--text-color-lighter)"
        >
          <Icons.arrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar isUser={chat.type === "dm"} />
            {otherUserIsActive && (
              <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-(--active-status-bg) border-2 border-white"></span>
            )}
          </div>
          <h2 className="text-xl font-semibold">{chatName}</h2>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const sender = allUsers.find(
            (user) => user._id === message.message.userId,
          );
          const isOwnMessage = message.message.userId === currentUser._id;

          return (
            <MessageBubble
              key={message.id}
              message={message.message}
              sender={sender}
              isOwnMessage={isOwnMessage}
              isGroupChat={chat.type === "group"}
              showSenderInfo={true}
              fetchAttachment={fetchAttachment}
              onStartEdit={handleStartEdit}
              onDeleteMessage={(messageId) => {
                // onDeleteMessage(chat.id, messageId)
                console.log("Delete", messageId);
              }}
              onAddReaction={(messageId, emoji) => {
                // onAddReaction(chat.id, messageId, emoji)
                console.log("Delete", messageId, emoji);
              }}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput
        onSendMessage={(content) => {
          createMessage(room, content).catch(console.error);
        }}
        onSendImage={(file, caption) => {
          createImageMessage(room, file, caption).catch(console.error);
        }}
        editingMessage={editingMessage}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
      />
    </div>
  );
};

export default ChatView;
