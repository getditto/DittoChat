import React from "react";
import type { Chat } from "../types";
import type ChatUser from "dittochatcore/dist/types/ChatUser";
import { formatDate } from "../utils";
import clsx from "clsx";
import Avatar from "./Avatar";

interface ChatListItemProps {
  chat: Chat;
  users: ChatUser[];
  currentUserId: string;
  isSelected: boolean;
  onSelect: () => void;
}

const ChatListItem: React.FC<ChatListItemProps> = ({
  chat,
  users,
  currentUserId,
  isSelected,
  onSelect,
}) => {
  const lastMessage = chat.messages[chat.messages.length - 1];

  let chatName = chat.name;
  let otherUserIsActive = false;

  if (chat.type === "dm") {
    // TODO: implement DM user avathar
    const otherUser = chat.participants.find(
      (user) => user._id !== currentUserId,
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

  return (
    <button
      onClick={onSelect}
      className={clsx(
        "w-full text-left px-3 py-3 flex items-center space-x-3 transition-colors border-b",
        isSelected
          ? "bg-(--primary-color-light) rounded-xl border-b-(--surface-color)"
          : "hover:bg-(--surface-color-light) border-b-(--border-color)",
      )}
    >
      <div className="relative -top-4">
        <Avatar isUser={chat.type === "dm"} />
        {chat.unread && (
          <span className="absolute -top-0.5 -right-0.5 block h-3 w-3 rounded-full bg-(--notification-badge-bg) border-2 border-white"></span>
        )}
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
        <p className="text-(--text-color-lighter) font-normal line-clamp-2">
          {senderName && <span className="font-medium">{senderName}: </span>}
          {lastMessage && lastMessage?.thumbnailImageToken
            ? "Image"
            : lastMessage?.text}
        </p>
      </div>
    </button>
  );
};

export default ChatListItem;
