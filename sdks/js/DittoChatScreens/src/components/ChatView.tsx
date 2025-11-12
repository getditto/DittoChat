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
  const saveEditedTextMessage = useDittoChatStore((state) => state.saveEditedTextMessage);
  const saveDeletedImageMessage = useDittoChatStore((state) => state.saveDeletedImageMessage);
  const createFileMessage = useDittoChatStore((state) => state.createFileMessage);
  // const subscribeToRoom = useDittoChatStore((state: any) => state.subscribeToRoom as ((roomId: string) => Promise<void>) | undefined);
  // const markRoomAsRead = useDittoChatStore((state: any) => state.markRoomAsRead as ((roomId: string) => Promise<void>) | undefined);
  const chatUser = useDittoChatStore((state: any) => state.chatUser as any);

  const rooms = useDittoChatStore((state) => state.rooms) as Room[];
  const room = (rooms || []).find((room) => room._id === chat.id);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat.messages]);

  // TODO: When the user opens/views the room, mark it as read (update subscription timestamp)
  // useEffect(() => {
  //   if (room && markRoomAsRead && chatUser?.subscriptions && room._id in chatUser.subscriptions) {
  //     markRoomAsRead(room._id).catch(console.error);
  //   }
  // }, [room, markRoomAsRead, chatUser]);

  const handleStartEdit = (message: Message) => {
    setEditingMessage(message);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
  };

  const handleSaveEdit = async (messageId: string, newContent: string) => {
    if (!room || !editingMessage) return;
    const updatedMessage = { ...editingMessage, text: newContent };
    await saveEditedTextMessage(updatedMessage, room);
    setEditingMessage(null);
  };

  const handleDeleteMessage = async (messageId: string | number) => {
    if (!room) return;
    const msgObj = messages.find((m) => m.id === String(messageId));
    if (!msgObj) return;
    const msg = msgObj.message;
    // If message has file token, treat as file delete
    console.log("Delete message:", msg);
    if (msg.fileAttachmentToken) {
      await saveDeletedImageMessage(msg, room, "file");
    } else {
      // If message has image tokens, treat as image delete
      const isImage = !!msg.thumbnailImageToken || !!msg.largeImageToken;
      await saveDeletedImageMessage(msg, room, isImage ? "image" : "text");
    }
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

          {/* TODO: Subscribe button */}
          {/* {room && chatUser && (
            <button
              onClick={() => {
                if (subscribeToRoom) subscribeToRoom(room._id).catch(console.error);
              }}
              className="ml-3 text-sm px-2 py-1 border rounded text-(--text-color-light)">
              {chatUser?.subscriptions && room._id in chatUser.subscriptions ? "Subscribed" : "Subscribe"}
            </button>
          )} */}

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
              onDeleteMessage={handleDeleteMessage}
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
        onSendFile={(file, caption) => {
          createFileMessage(room, file, caption).catch(console.error);
        }}
        editingMessage={editingMessage}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
      />
    </div>
  );
};

export default ChatView;
