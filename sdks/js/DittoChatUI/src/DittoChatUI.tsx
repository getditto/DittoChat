import "./index.css";
import { useState, useEffect } from "react";
import ChatList from "./components/ChatList";
import ChatView from "./components/ChatView";
import NewMessageModal from "./components/NewMessageModal";
import { Icons } from "./components/Icons";
// import { useToast } from "./components/ToastProvider";
import {
  useDittoChat,
  useDittoChatStore,
  type DittoConfParams,
} from "@dittolive/ditto-chat-core";
import type { Chat } from "./types";

import { ToastProvider } from "./components/ToastProvider";
import ChatUser from "@dittolive/ditto-chat-core/dist/types/ChatUser";
import Room from "@dittolive/ditto-chat-core/dist/types/Room";
import Message from "@dittolive/ditto-chat-core/dist/types/Message";
import NewRoomModal from "./components/NewRoomModal";
import { ChatNotificationObserver } from "./components/ChatNotificationObserver";
import ChatListSkeleton from "./components/ChatListSkeleton";

export default function DittoChatUI({
  ditto,
  userCollectionKey,
  userId,
  theme = "light",
}: DittoConfParams & { theme: "light" | "dark" }) {
  useDittoChat({
    ditto,
    userCollectionKey,
    userId,
  });

  const [chats, setChats] = useState<Chat[]>([]);
  const createDMRoom = useDittoChatStore((state) => state.createDMRoom);
  const createRoom = useDittoChatStore((state) => state.createRoom);
  const rooms: Room[] = useDittoChatStore((state) => state.rooms);
  const users: ChatUser[] = useDittoChatStore((state) => state.allUsers);
  const currentUser: ChatUser | null = useDittoChatStore(
    (state) => state.currentUser,
  );

  const loading = useDittoChatStore(
    (state) =>
      state.roomsLoading || state.usersLoading || state.messagesLoading,
  );

  const [activeScreen, setActiveScreen] = useState<
    "list" | "chat" | "newMessage" | "newRoom"
  >("list");

  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [newlyCreatedRoom, setNewlyCreatedRoom] = useState<string | undefined>(
    undefined,
  );

  const latestMessages = useDittoChatStore((state) => {
    const roomKeys = Object.keys(state.messagesByRoom);
    const latestMessages: Message[] = roomKeys
      .map((key) => {
        const messages = state.messagesByRoom[key];
        if (!messages || messages.length === 0) return null;
        return messages[messages.length - 1].message;
      })
      .filter((msg): msg is Message => msg !== null);
    const sortedMessages = latestMessages.sort(
      (a, b) =>
        new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime(),
    );
    return sortedMessages;
  });

  const isDM = (room: Room) => {
    return room.participants?.length === 2;
  };

  useEffect(() => {
    if (!rooms.length || !users.length) return;
    const userMap = new Map(users.map((u) => [u._id, u]));
    const messageMap = new Map<string, Message>();
    for (const msg of latestMessages) {
      messageMap.set(msg.roomId, msg);
    }
    const messageRoomIds: string[] = [];
    // Rooms that have latest messages (keep order of latestMessages)
    const chatsWithMessages: Chat[] = latestMessages
      .map((message: Message) => {
        const room = rooms.find((r) => r._id === message.roomId);
        if (!room) return null;
        messageRoomIds.push(message.roomId);

        const participants: ChatUser[] = (room.participants || [])
          .map((userId) => userMap.get(userId))
          .filter(Boolean) as ChatUser[];

        return {
          id: room._id,
          type: isDM(room) ? "dm" : "group",
          name: room.name,
          participants,
          messages: [message],
        };
      })
      .filter(Boolean) as Chat[];

    // Remaining rooms (no messages)
    const emptyRooms = rooms.filter((r) => !messageRoomIds.includes(r._id));

    const chatsWithoutMessages: Chat[] = emptyRooms.map((room) => {
      const participants: ChatUser[] = (room.participants || [])
        .map((userId) => userMap.get(userId))
        .filter(Boolean) as ChatUser[];

      return {
        id: room._id,
        type: isDM(room) ? "dm" : "group",
        name: room.name,
        participants,
        messages: [],
      };
    });

    // Combine (latest first)
    setChats([...chatsWithMessages, ...chatsWithoutMessages]);
  }, [rooms, latestMessages, users]);

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    setActiveScreen("chat");
  };

  const handleNewMessage = (messageType: "newMessage" | "newRoom") => {
    setSelectedChat(null);
    setActiveScreen(messageType);
  };

  const handleBack = () => {
    setSelectedChat(null);
    setActiveScreen("list");
  };

  const handleNewDMCreate = async (user: ChatUser) => {
    const isExists = chats.find((chat) => {
      if (chat.participants.length !== 2) return false;
      const ids = chat.participants.map((p) => p._id);
      return ids.includes(user._id) && ids.includes(currentUser?._id);
    });

    if (isExists) {
      handleSelectChat(isExists);
      return;
    }

    const createdRoom = await createDMRoom(user);
    setNewlyCreatedRoom(createdRoom?._id);
  };

  const handleNewRoomCreate = async (roomName: string) => {
    const createdRoom = await createRoom(roomName);
    setNewlyCreatedRoom(createdRoom?._id);
  };

  useEffect(() => {
    if (!newlyCreatedRoom) return;
    const chat = chats.find((chat) => chat.id === newlyCreatedRoom);
    if (chat) {
      handleSelectChat(chat);
      setNewlyCreatedRoom(undefined);
    }
  }, [chats, newlyCreatedRoom]);

  // On desktop, default to selecting the first chat
  useEffect(() => {
    if (window.innerWidth >= 768 && !selectedChat) {
      setActiveScreen("chat");
    }
  }, []);

  return (
    <div className="web-chat-root">
      <div className={theme}>
        <ToastProvider>
          <ChatNotificationObserver activeRoomId={selectedChat?.id} />
          <div className="flex h-screen bg-(--surface-color) font-sans text-(--text-color) overflow-hidden">
            {/* Chat List */}
            <aside
              className={`w-full md:w-[420px] md:flex-shrink-0 border-r border-(--border-color) flex flex-col ${
                activeScreen !== "list" && "hidden"
              } md:flex`}
            >
              {loading ? (
                <ChatListSkeleton />
              ) : (
                <ChatList
                  chats={chats}
                  onSelectChat={handleSelectChat}
                  onNewMessage={handleNewMessage}
                  selectedChatId={selectedChat?.id || ""}
                />
              )}
            </aside>

            {/* Main Content Area */}
            <main
              className={`w-full flex-1 flex-col ${
                activeScreen === "list" && "hidden"
              } md:flex`}
            >
              {activeScreen === "chat" && selectedChat && (
                <ChatView
                  key={selectedChat.id}
                  chat={selectedChat}
                  onBack={handleBack}
                />
              )}
              {activeScreen === "newMessage" && (
                <NewMessageModal
                  onClose={handleBack}
                  onNewDMCreate={handleNewDMCreate}
                />
              )}
              {activeScreen === "newRoom" && (
                <NewRoomModal
                  onClose={handleBack}
                  onCreateRoom={handleNewRoomCreate}
                />
              )}
              {activeScreen === "list" && !selectedChat && (
                <div className="hidden md:flex flex-col items-center justify-center h-full bg-(--surface-color-light) text-(--text-color-lightest)">
                  <Icons.messageCircle className="w-24 h-24 text-(--text-color-disabled) mb-4" />
                  <p className="text-lg font-medium">Select a conversation</p>
                  <p className="text-sm">or start a new message</p>
                </div>
              )}
            </main>
          </div>
        </ToastProvider>
      </div>
    </div>
  );
}
