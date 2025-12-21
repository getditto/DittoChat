import { useDittoChatStore } from '@dittolive/ditto-chat-core'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
  List,
} from 'react-virtualized'
import { MeasuredCellParent } from 'react-virtualized/dist/es/CellMeasurer'
import { GridCoreProps } from 'react-virtualized/dist/es/Grid'

import type { Chat } from '../types'
import { usePermissions } from '../utils/usePermissions'
import ChatListItem from './ChatListItem'
import { Icons } from './Icons'

interface ChatListProps {
  chats: Chat[]
  onSelectChat: (chat: Chat) => void
  onNewMessage: (messageType: 'newMessage' | 'newRoom') => void
  selectedChatId: number | string | null
}

function ChatList({
  chats,
  onSelectChat,
  onNewMessage,
  selectedChatId,
}: ChatListProps) {
  const listRef = useRef<List | null>(null)
  const users = useDittoChatStore((state) => state.allUsers)
  const currentUserId = useDittoChatStore<string>(
    (state) => state.currentUser?._id || '',
  )
  const { canCreateRoom } = usePermissions()

  // search state moved outside for brevity - keep your useState if needed
  const [searchTerm, setSearchTerm] = React.useState('')

  const filteredChats = useMemo(
    () =>
      chats.filter((chat) =>
        (chat.name || 'DM').toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [chats, searchTerm],
  )

  const selectedIndex = useMemo(() => {
    return filteredChats.findIndex((c) => c.id === selectedChatId)
  }, [filteredChats, selectedChatId])

  const rowRenderer = ({
    index,
    key,
    parent,
    style,
  }: {
    index: number
    key: string
    parent: React.Component<GridCoreProps> & MeasuredCellParent
    style: React.CSSProperties
  }) => {
    const chat = filteredChats[index]
    return (
      <CellMeasurer
        key={key}
        cache={cache}
        parent={parent}
        columnIndex={0}
        rowIndex={index}
      >
        <div key={key} style={style}>
          <ChatListItem
            chat={chat}
            currentUserId={currentUserId}
            users={users}
            isSelected={chat.id === selectedChatId}
            onSelect={() => onSelectChat(chat)}
            showSeparator={index < filteredChats.length - 1}
          />
        </div>
      </CellMeasurer>
    )
  }

  const cache = new CellMeasurerCache({
    fixedWidth: true,
    defaultHeight: 60,
    minHeight: 40,
  })

  return (
    <div className="flex flex-col h-full bg-(--dc-surface-color)">
      <header className="pl-4 pr-4 border-b min-h-12 flex items-center border-(--dc-border-color)">
        <h1 className="text-xl font-semibold">Chats</h1>
      </header>
      <div className="p-4 space-y-4">
        <div className="relative w-full">
          <div className="flex w-full">
            <button
              onClick={() => onNewMessage('newMessage')}
              className={`w-full bg-(--dc-primary-color) text-(--dc-text-on-primary) font-semibold py-3 ${canCreateRoom ? 'rounded-l-xl' : 'rounded-xl'} hover:bg-(--dc-primary-color-hover) outline-none focus:outline-none focus-visible:ring-(--dc-ring-color) focus-visible:ring-[3px] focus:ring-offset-1 ring-offset-(--dc-surface-color) transition-colors`}
            >
              New Message
            </button>
            {canCreateRoom && (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    className="relative inline-flex items-center px-3 py-3 bg-(--dc-primary-color) rounded-r-xl text-(--dc-text-on-primary) hover:bg-(--dc-primary-color-hover) focus:z-10 outline-none focus:outline-none focus-visible:ring-(--dc-ring-color) focus-visible:ring-[3px] focus:ring-offset-1 ring-offset-(--dc-surface-color) border-l border-white/20 transition-colors"
                    aria-label="Open options"
                  >
                    <Icons.chevronDown className="h-5 w-5" aria-hidden="true" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="min-w-[200px] bg-(--dc-surface-color) rounded-md shadow-lg border border-(--dc-border-color) p-1 z-50"
                    sideOffset={8}
                    align="end"
                  >
                    <DropdownMenu.Item
                      className="px-4 py-2 text-sm text-[rgb(var(--dc-text-color-medium))] hover:bg-[rgb(var(--dc-secondary-bg))] rounded outline-none focus:outline-none focus-visible:ring-(--dc-ring-color) focus-visible:ring-[3px] focus:ring-offset-1 ring-offset-(--dc-surface-color) cursor-pointer"
                      onSelect={() => onNewMessage('newRoom')}
                    >
                      New Room
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            )}
          </div>
        </div>

        <div className="relative">
          <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--dc-text-color-faint)" />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-(--dc-secondary-bg) border border-(--dc-border-color) rounded-3xl pl-10 pr-4 py-2 outline-none focus:outline-none focus-visible:ring-(--dc-ring-color) focus-visible:ring-[3px] focus:ring-offset-1 ring-offset-(--dc-surface-color)"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 mb-4 px-4">
        <AutoSizer>
          {({ height, width }: { height: number; width: number }) => {
            return (
              <List
                ref={listRef}
                width={width}
                height={height}
                rowCount={filteredChats.length}
                rowHeight={cache.rowHeight}
                rowRenderer={rowRenderer}
                overscanRowCount={10}
                scrollToIndex={selectedIndex >= 0 ? selectedIndex : undefined}
                scrollToAlignment="auto"
                className="outline-none focus:outline-none"
              />
            )
          }}
        </AutoSizer>
      </div>
    </div>
  )
}

export default ChatList
