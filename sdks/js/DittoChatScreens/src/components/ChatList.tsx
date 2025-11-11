import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  List,
  AutoSizer,
  CellMeasurerCache,
  CellMeasurer,
} from "react-virtualized";
import type { Chat } from "../types";
import ChatListItem from "./ChatListItem";
import { Icons } from "./Icons";
import { useDittoChatStore } from "dittochatcore";
import { GridCoreProps } from "react-virtualized/dist/es/Grid";
import { MeasuredCellParent } from "react-virtualized/dist/es/CellMeasurer";

interface ChatListProps {
  chats: Chat[];
  onSelectChat: (chat: Chat) => void;
  onNewMessage: () => void;
  selectedChatId: number | string | null;
}

const ChatList: React.FC<ChatListProps> = ({
  chats,
  onSelectChat,
  onNewMessage,
  selectedChatId,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<List | null>(null);
  const users = useDittoChatStore((state) => state.allUsers);
  const currentUserId = useDittoChatStore((state) => state.chatUser?._id);

  // search state moved outside for brevity - keep your useState if needed
  const [searchTerm, setSearchTerm] = React.useState("");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNewRoom = () => {
    console.log("New Room feature is not yet implemented.", "info");
    setIsDropdownOpen(false);
  };

  const filteredChats = useMemo(
    () =>
      chats.filter((chat) =>
        (chat.name || "DM").toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [chats, searchTerm],
  );

  const selectedIndex = useMemo(() => {
    return filteredChats.findIndex((c) => c.id === selectedChatId);
  }, [filteredChats, selectedChatId]);

  const rowRenderer = ({
    index,
    key,
    parent,
    style,
  }: {
    index: number;
    key: string;
    parent: React.Component<GridCoreProps> & MeasuredCellParent;
    style: React.CSSProperties;
  }) => {
    const chat = filteredChats[index];
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
          />
        </div>
      </CellMeasurer>
    );
  };

  const cache = new CellMeasurerCache({
    defaultHeight: 60,
    minHeight: 40,
  });

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="pl-4 pr-4 border-b min-h-12 flex items-center border-(--border-color)">
        <h1 className="text-xl font-semibold">Chats</h1>
      </header>
      <div className="p-4 space-y-4">
        <div className="relative w-full" ref={dropdownRef}>
          <div className="flex w-full rounded-lg shadow-sm">
            <button
              onClick={onNewMessage}
              className="w-full bg-(--primary-color) text-(--text-on-primary) font-semibold py-3 rounded-l-xl hover:bg-(--primary-color-hover) transition-colors"
            >
              New Message
            </button>
            <button
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={isDropdownOpen}
              className="relative inline-flex items-center px-3 py-3 bg-(--primary-color) rounded-r-xl text-(--text-on-primary) hover:bg-(--primary-color-hover) focus:z-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-(--primary-color-focus) border-l border-white/20 transition-colors"
            >
              <span className="sr-only">Open options</span>
              <Icons.chevronDown className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {isDropdownOpen && (
            <div className="origin-top absolute mt-2 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
              <div
                className="py-1"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="options-menu"
              >
                <button
                  onClick={handleNewRoom}
                  className="block w-full text-left px-4 py-2 text-sm text-[rgb(var(--text-color-medium))] hover:bg-[rgb(var(--secondary-bg))]"
                  role="menuitem"
                >
                  New Room
                </button>
              </div>
            </div>
          )}
        </div>

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
      </div>

      <div className="flex-1 min-h-0 mb-4">
        <AutoSizer>
          {({ height, width }) => {
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
              />
            );
          }}
        </AutoSizer>
      </div>
    </div>
  );
};

export default ChatList;
