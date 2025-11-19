import React, { useEffect } from "react";
import type { Chat } from "../types";
import type ChatUser from "@dittolive/ditto-chat-core/dist/types/ChatUser";
import { formatDate } from "../utils";
import clsx from "clsx";
import Avatar from "./Avatar";
import { useDittoChatStore } from "@dittolive/ditto-chat-core";
import type MessageWithUser from "@dittolive/ditto-chat-core/dist/types/MessageWithUser";
import { EMPTY_MESSAGES } from "../constants";

interface ChatListItemProps {
  chat: Chat;
  users: ChatUser[];
  currentUserId: string;
  isSelected: boolean;
  onSelect: () => void;
}

function ChatListItem({
  chat,
  users,
  currentUserId,
  isSelected,
  onSelect,
}: ChatListItemProps) {
  const lastMessage = chat.messages[chat.messages.length - 1];
  const [unreadCount, setUnreadCount] = React.useState(0);

  let chatName = chat.name;
  let otherUserIsActive = false;

  if (chat.type === "dm") {
    // TODO: implement DM user avathar
    const otherUser = chat.participants.find(
      (user) => user._id !== currentUserId
    );

    chatName = otherUser?.name || "Unknown User";
    //TODO: Implement user status
    otherUserIsActive = false;
  }

  const lastMessageSender = users.find((u) => u._id === lastMessage?.userId);
  const senderName =
    lastMessage?.userId === currentUserId
      ? "You"
      : lastMessageSender?.name.split(" ")[0];

  const currentUser: ChatUser | null = useDittoChatStore(
    (state) => state.currentUser
  );
  const messages: MessageWithUser[] = useDittoChatStore(
    (state) => state.messagesByRoom[chat.id] || EMPTY_MESSAGES
  );

  const mentionedMsgIds = useDittoChatStore<string[]>(
    (state) => state.currentUser?.mentions?.[chat.id] || []
  );

  const subscribedAt = currentUser?.subscriptions?.[chat.id];

  useEffect(() => {
    const unreadMessages = messages.filter(
      (message) =>
        message.message.userId !== currentUserId &&
        (mentionedMsgIds.includes(message.id) ||
          new Date(message.message.createdOn).getTime() >
            new Date(subscribedAt || new Date()).getTime())
    );

    setUnreadCount(unreadMessages.length);
  }, [subscribedAt, mentionedMsgIds, currentUserId, messages]);

  return (
    <button
      onClick={onSelect}
      className={clsx(
        "w-full text-left px-3 py-3 flex items-center space-x-3 transition-colors border-b",
        isSelected
          ? "bg-(--primary-color-light) rounded-xl border-b-(--surface-color)"
          : "hover:bg-(--surface-color-light) border-b-(--border-color)"
      )}
    >
      <div className="relative -top-4">
        <Avatar isUser={chat.type === "dm"} />
        {otherUserIsActive && (
          <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-(--active-status-bg) border-2 border-white"></span>
        )}
      </div>
      <div className="flex-1 overflow-hidden h-20">
        <div className="flex justify-between items-baseline">
          <p className="font-semibold truncate">{chatName}</p>
          <p className="text-sm text-(--text-color-lightest) flex-shrink-0 ml-2">
            {lastMessage && formatDate(lastMessage.createdOn)}
          </p>
        </div>
        <div className="flex justify-between items-start mt-0.5">
          <p className="text-(--text-color-lighter) font-normal line-clamp-2 pr-2">
            {senderName && <span className="font-medium">{senderName}: </span>}
            {lastMessage && lastMessage?.thumbnailImageToken
              ? "Image"
              : lastMessage?.text}
          </p>
            {unreadCount > 0 && !isSelected && (
            <span className="flex-shrink-0 min-w-[1.25rem] h-5 px-1.5 text-xs flex items-center justify-center rounded-full bg-(--notification-badge-bg) text-white font-medium">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default ChatListItem;