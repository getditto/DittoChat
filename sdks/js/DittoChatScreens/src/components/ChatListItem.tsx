import React from 'react';
import type { Chat } from '../types';
import { USERS, CURRENT_USER_ID } from '../constants';
import { Icons } from './Icons';

interface ChatListItemProps {
  chat: Chat;
  isSelected: boolean;
  onSelect: () => void;
}

const ChatListItem: React.FC<ChatListItemProps> = ({ chat, isSelected, onSelect }) => {
  const lastMessage = chat.messages[chat.messages.length - 1];
  
  let chatName = chat.name;
  let avatar: React.ReactNode;
  let otherUserIsActive = false;

  if (chat.type === 'dm') {
    const otherUserId = chat.participants.find(id => id !== CURRENT_USER_ID);
    const otherUser = USERS.find(user => user.id === otherUserId);
    chatName = otherUser?.name || 'Unknown User';
    otherUserIsActive = !!otherUser?.isActive;
    avatar = <img src={otherUser?.avatarUrl} alt={chatName} className="w-10 h-10 rounded-full" />;
  } else {
    avatar = (
      <div className="w-10 h-10 rounded-full bg-[rgb(var(--secondary-bg-hover))] flex items-center justify-center">
        <Icons.hashtag className="w-6 h-6 text-[rgb(var(--text-color-lightest))]" />
      </div>
    );
  }
  
  const lastMessageSender = USERS.find(u => u.id === lastMessage?.senderId);
  const senderName = lastMessage?.senderId === CURRENT_USER_ID ? 'You' : lastMessageSender?.name.split(' ')[0];

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 flex items-center space-x-4 transition-colors ${isSelected ? 'bg-[rgb(var(--primary-color-light))]' : 'hover:bg-[rgb(var(--surface-color-light))]'}`}
    >
      <div className="relative">
        {avatar}
        {chat.unread && <span className="absolute -top-0.5 -right-0.5 block h-3 w-3 rounded-full bg-[rgb(var(--notification-badge-bg))] border-2 border-white"></span>}
        {otherUserIsActive && <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-[rgb(var(--active-status-bg))] border-2 border-white"></span>}
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex justify-between items-baseline">
          <p className="font-semibold truncate">{chatName}</p>
          <p className="text-xs text-[rgb(var(--text-color-lightest))] flex-shrink-0 ml-2">{lastMessage?.timestamp}</p>
        </div>
        <p className="text-sm text-[rgb(var(--text-color-lighter))] truncate">
          {senderName && <span className="font-medium">{senderName}: </span>}
          {lastMessage?.content}
        </p>
      </div>
    </button>
  );
};

export default ChatListItem;