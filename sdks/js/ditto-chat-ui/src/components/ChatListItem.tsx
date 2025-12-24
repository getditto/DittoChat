import { AttachmentToken } from '@dittolive/ditto'
import {
  type ChatUser,
  type MessageWithUser,
  useDittoChatStore,
} from '@dittolive/ditto-chat-core'
import clsx from 'clsx'
import React, { useEffect } from 'react'

import { EMPTY_MESSAGES } from '../constants'
import { useImageAttachment } from '../hooks/useImageAttachment'
import type { Chat } from '../types'
import { formatDate } from '../utils'
import Avatar from './Avatar'

interface ChatListItemProps {
  chat: Chat
  users: ChatUser[]
  currentUserId: string
  isSelected: boolean
  onSelect: () => void
  showSeparator?: boolean
}

function ChatListItem({
  chat,
  users,
  currentUserId,
  isSelected,
  onSelect,
  showSeparator = false,
}: ChatListItemProps) {
  const lastMessage = chat.messages[chat.messages.length - 1]
  const [unreadCount, setUnreadCount] = React.useState(0)

  const fetchAttachment = useDittoChatStore((state) => state.fetchAttachment)

  let chatName = chat.name
  let otherUserIsActive = false
  let otherUserId: string | undefined

  if (chat.type === 'dm') {
    const otherUser = chat.participants.find(
      (user) => user._id !== currentUserId,
    )
    otherUserId = otherUser?._id

    chatName = otherUser?.name || 'Unknown User'
    otherUserIsActive = false
  }

  // Only lookup user and profile picture for DM chats
  const otherChatUser =
    chat.type === 'dm' && otherUserId
      ? users.find((u) => u._id === otherUserId)
      : undefined
  const profilePictureThumbnail = otherChatUser?.profilePictureThumbnail

  const { imageUrl: avatarUrl } = useImageAttachment({
    token: profilePictureThumbnail
      ? (profilePictureThumbnail as unknown as AttachmentToken)
      : null,
    fetchAttachment,
    autoFetch: true,
  })

  const lastMessageSender = users.find((u) => u._id === lastMessage?.userId)
  const senderName =
    lastMessage?.userId === currentUserId
      ? 'You'
      : lastMessageSender?.name.split(' ')[0]

  const currentUser: ChatUser | null = useDittoChatStore(
    (state) => state.currentUser,
  )
  const messages: MessageWithUser[] = useDittoChatStore(
    (state) => state.messagesByRoom[chat.id] || EMPTY_MESSAGES,
  )

  const mentionedMsgIds = useDittoChatStore<string[]>(
    (state) => state.currentUser?.mentions?.[chat.id] || [],
  )

  const subscribedAt = currentUser?.subscriptions?.[chat.id]

  useEffect(() => {
    const unreadMessages = messages.filter(
      (message) =>
        message.message.userId !== currentUserId &&
        (mentionedMsgIds.includes(message.id) ||
          new Date(message.message.createdOn).getTime() >
            new Date(subscribedAt || new Date()).getTime()),
    )

    setUnreadCount(unreadMessages.length)
  }, [subscribedAt, mentionedMsgIds, currentUserId, messages])

  return (
    <>
      <div className="relative p-1">
        <button
          onClick={onSelect}
          className={clsx(
            'w-full text-left px-4 py-3 flex items-center space-x-3 transition-colors rounded-xl outline-none focus:outline-none focus-visible:ring-(--dc-ring-color) focus-visible:ring-[3px] focus:ring-offset-1 ring-offset-(--dc-surface-color)',
            isSelected
              ? 'bg-(--dc-primary-color-light)'
              : 'hover:bg-(--dc-surface-color-light)',
          )}
        >
          <div className="relative -top-4">
            <Avatar
              isUser={chat.type === 'dm'}
              imageUrl={chat.type === 'dm' ? avatarUrl || undefined : undefined}
            />
            {otherUserIsActive && (
              <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-(--dc-active-status-bg) border-2 border-white"></span>
            )}
          </div>
          <div className="flex-1 overflow-hidden h-20">
            <div className="flex justify-between items-baseline">
              <p className="font-semibold truncate">{chatName}</p>
              <p className="text-sm text-(--dc-text-color-lightest) flex-shrink-0 ml-2">
                {lastMessage && formatDate(lastMessage.createdOn)}
              </p>
            </div>
            <div className="flex justify-between items-start mt-0.5">
              <p className="text-(--dc-text-color-lighter) font-normal line-clamp-2 pr-2">
                {senderName && (
                  <span className="font-medium">{senderName}: </span>
                )}
                {lastMessage && lastMessage?.thumbnailImageToken
                  ? 'Image'
                  : lastMessage?.text}
              </p>
              {unreadCount > 0 && !isSelected && (
                <span className="flex-shrink-0 min-w-[1.25rem] h-5 px-1.5 text-xs flex items-center justify-center rounded-full bg-(--dc-notification-badge-bg) text-white font-medium">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          </div>
        </button>
      </div>
      {showSeparator && (
        <div className="h-px bg-(--dc-border-color) mx-4 my-1" />
      )}
    </>
  )
}

export default ChatListItem
