import React, { useRef, useEffect, useState } from "react";
import type { Chat } from "../types";
import { EMPTY_MESSAGES, EMPTY_ROOMS } from "../constants";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { Icons } from "./Icons";
import { useDittoChatStore } from "@dittolive/ditto-chat-core";
import type MessageWithUser from "@dittolive/ditto-chat-core/dist/types/MessageWithUser";
import type Message from "@dittolive/ditto-chat-core/dist/types/Message";
import type ChatUser from "@dittolive/ditto-chat-core/dist/types/ChatUser";
import Avatar from "./Avatar";
import { EmojiClickData } from "emoji-picker-react";
import {
  Reaction,
  Mention,
} from "@dittolive/ditto-chat-core/dist/types/Message";
import { useImageAttachment } from "../hooks/useImageAttachment";
import { AttachmentToken } from "@dittolive/ditto";
import { usePermissions } from "../utils/usePermissions";

interface ChatViewProps {
  chat: Chat;
  onBack: () => void;
}

function ChatView({ chat, onBack }: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const { canSubscribeToRoom } = usePermissions();

  const messages: MessageWithUser[] = useDittoChatStore(
    (state) => state.messagesByRoom[chat.id] || EMPTY_MESSAGES,
  );
  const currentUser: ChatUser | null = useDittoChatStore(
    (state) => state.currentUser,
  );
  const allUsers: ChatUser[] = useDittoChatStore((state) => state.allUsers);
  const createMessage = useDittoChatStore((state) => state.createMessage);
  const createImageMessage = useDittoChatStore(
    (state) => state.createImageMessage,
  );
  const fetchAttachment = useDittoChatStore((state) => state.fetchAttachment);
  const addReactionToMessage = useDittoChatStore(
    (state) => state.addReactionToMessage,
  );
  const removeReactionFromMessage = useDittoChatStore(
    (state) => state.removeReactionFromMessage,
  );
  const saveEditedTextMessage = useDittoChatStore(
    (state) => state.saveEditedTextMessage,
  );
  const saveDeletedMessage = useDittoChatStore(
    (state) => state.saveDeletedMessage,
  );
  const createFileMessage = useDittoChatStore(
    (state) => state.createFileMessage,
  );
  const toggleRoomSubscription = useDittoChatStore(
    (state) =>
      state.toggleRoomSubscription as ((roomId: string) => Promise<void>) | undefined,
  );
  const markRoomAsRead = useDittoChatStore((state) => state.markRoomAsRead);

  const rooms = useDittoChatStore((state) => state.rooms || EMPTY_ROOMS);
  const room = rooms.find((room) => room._id === chat.id);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  // TODO: When the user opens/views the room, mark it as read (update subscription timestamp)
  useEffect(() => {
    if (!room?._id) return;
    markRoomAsRead(room._id).catch(console.error);
  }, [messages.length, room?._id, markRoomAsRead]);

  const handleStartEdit = (message: Message) => {
    setEditingMessage(message);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
  };

  const handleSaveEdit = async (
    newContent: string,
    mentions: Mention[] = [],
  ) => {
    if (!room || !editingMessage) return;
    const updatedMessage = { ...editingMessage, text: newContent, mentions };
    await saveEditedTextMessage(updatedMessage, room);
    setEditingMessage(null);
  };

  const handleDeleteMessage = async (messageId: string | number) => {
    if (!room) return;
    const msgObj = messages.find((m) => m.id === String(messageId));
    if (!msgObj) return;
    const msg = msgObj.message;
    // If message has file token, treat as file delete
    if (msg.fileAttachmentToken) {
      await saveDeletedMessage(msg, room, "file");
    } else {
      // If message has image tokens, treat as image delete
      const isImage = !!msg.thumbnailImageToken || !!msg.largeImageToken;
      await saveDeletedMessage(msg, room, isImage ? "image" : "text");
    }
  };

  const handleAddReaction = async (message: Message, emoji: EmojiClickData) => {
    if (!room) return;
    const reaction: Reaction = {
      emoji: emoji.emoji,
      userId: currentUser?._id || "",
      unified: emoji.unified,
      unifiedWithoutSkinTone: emoji.unifiedWithoutSkinTone,
    };
    await addReactionToMessage(message, room, reaction);
  };

  const handleRemoveReaction = async (
    message: Message,
    userId: string,
    emoji: string,
  ) => {
    if (!room) return;
    const reaction = (message.reactions || []).find(
      (r) => r.userId === userId && r.emoji === emoji,
    );
    if (!reaction) return;
    await removeReactionFromMessage(message, room, reaction);
  };

  let chatName = chat.name;
  let otherUserIsActive = false;
  let otherUserId: string | undefined;

  if (chat.type === "dm") {
    const otherUser = chat.participants.find(
      (user) => user._id !== currentUser?._id,
    );
    otherUserId = otherUser?._id;
    chatName = otherUser?.name || "Unknown User";
    // TODO: Implement user status
    otherUserIsActive = false;
  }

  const otherChatUser = allUsers.find((u) => u._id === otherUserId);
  const profilePictureThumbnail = otherChatUser?.profilePictureThumbnail;

  const { imageUrl: avatarUrl } = useImageAttachment({
    token: profilePictureThumbnail
      ? (profilePictureThumbnail as unknown as AttachmentToken)
      : null,
    fetchAttachment,
    autoFetch: true,
  });

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
            <Avatar isUser={chat.type === "dm"} imageUrl={avatarUrl || undefined} />
            {otherUserIsActive && (
              <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-(--active-status-bg) border-2 border-white"></span>
            )}
          </div>
          <h2 className="text-xl font-semibold">{chatName}</h2>
        </div>

        {room && currentUser && chat.type === "group" && canSubscribeToRoom && (
          <button
            onClick={() => {
              if (toggleRoomSubscription) {
                toggleRoomSubscription(room._id).catch(console.error);
              }
            }}
            className="ml-auto flex items-center space-x-2 px-3 py-1.5 rounded-full bg-(--secondary-bg) hover:bg-(--secondary-bg-hover) text-(--text-color-lighter) font-medium"
          >
            {(() => {
              const hasKey = currentUser?.subscriptions && room._id in currentUser.subscriptions;
              const subValue = currentUser?.subscriptions?.[room._id];
              const isSubscribed = hasKey && subValue !== null;

              return isSubscribed ? (
                <>
                  <Icons.x className="w-5 h-5" />
                  <span>Unsubscribe</span>
                </>
              ) : (
                <>
                  <Icons.plus className="w-5 h-5" />
                  <span>Subscribe</span>
                </>
              );
            })()}
          </button>
        )}
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const sender = allUsers.find(
            (user) => user._id === message.message.userId,
          );
          const isOwnMessage = message.message.userId === currentUser?._id;

          return (
            <MessageBubble
              key={message.id}
              message={message.message}
              currentUserId={currentUser?._id || ""}
              sender={sender}
              isOwnMessage={isOwnMessage}
              isGroupChat={chat.type === "group"}
              showSenderInfo={true}
              fetchAttachment={fetchAttachment}
              onStartEdit={handleStartEdit}
              onDeleteMessage={handleDeleteMessage}
              onAddReaction={handleAddReaction}
              onRemoveReaction={handleRemoveReaction}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput
        onSendMessage={(content: string, mentions: Mention[] = []) => {
          //TODO: Refactor room null check
          if (room) createMessage(room, content, mentions).catch(console.error);
        }}
        onSendImage={(file, caption) => {
          if (room)
            createImageMessage(room, file, caption).catch(console.error);
        }}
        onSendFile={(file, caption) => {
          if (room) createFileMessage(room, file, caption).catch(console.error);
        }}
        editingMessage={editingMessage}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
      />
    </div>
  );
}

export default ChatView;