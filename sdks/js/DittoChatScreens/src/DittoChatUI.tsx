import React, { useState, useEffect } from "react";

import { USERS, CURRENT_USER_ID } from "./constants";
import ChatList from "./components/ChatList";
import ChatView from "./components/ChatView";
import NewMessageModal from "./components/NewMessageModal";
import { Icons } from "./components/Icons";
// import { useToast } from "./components/ToastProvider";
import { useDittoChat, type DittoConfParams } from "dittochatcore";
import type { Chat } from "./types";

export default function DittoChatUI({
  ditto,
  userCollectionKey,
  userId,
}: DittoConfParams) {
  useDittoChat({
    ditto,
    userCollectionKey,
    userId,
  });

  const [activeScreen, setActiveScreen] = useState<
    "list" | "chat" | "newMessage"
  >("list");

  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  // const { addToast } = useToast();

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    setActiveScreen("chat");
  };

  const handleNewMessage = () => {
    setSelectedChat(null);
    setActiveScreen("newMessage");
  };

  const handleBack = () => {
    setSelectedChat(null);
    setActiveScreen("list");
  };

  // const handleAddReaction = (
  //   chatId: number | string,
  //   messageId: number | string,
  //   emoji: string,
  // ) => {
  //   setChats((prevChats) =>
  //     prevChats.map((chat) => {
  //       if (chat.id === chatId) {
  //         const updatedMessages = chat.messages.map((msg) => {
  //           if (msg.id === messageId) {
  //             const newReactions = [...msg.reactions];
  //             const existingReactionIndex = newReactions.findIndex(
  //               (r) => r.emoji === emoji,
  //             );

  //             if (existingReactionIndex > -1) {
  //               const reaction = newReactions[existingReactionIndex];
  //               const userReactedIndex =
  //                 reaction.userIds.indexOf(CURRENT_USER_ID);

  //               if (userReactedIndex > -1) {
  //                 // User removing their reaction
  //                 reaction.userIds.splice(userReactedIndex, 1);
  //                 reaction.count--;
  //                 if (reaction.count === 0) {
  //                   newReactions.splice(existingReactionIndex, 1);
  //                 }
  //               } else {
  //                 // User adding reaction to existing emoji
  //                 reaction.userIds.push(CURRENT_USER_ID);
  //                 reaction.count++;
  //               }
  //             } else {
  //               // New emoji reaction
  //               newReactions.push({
  //                 emoji,
  //                 userIds: [CURRENT_USER_ID],
  //                 count: 1,
  //               });
  //             }
  //             return { ...msg, reactions: newReactions };
  //           }
  //           return msg;
  //         });
  //         return { ...chat, messages: updatedMessages };
  //       }
  //       return chat;
  //     }),
  //   );
  // };

  // On desktop, default to selecting the first chat
  useEffect(() => {
    if (window.innerWidth >= 768 && !selectedChat) {
      // setSelectedChatId(chats[0].id);
      setActiveScreen("chat");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen bg-white font-sans text-[rgb(var(--text-color))] overflow-hidden">
      {/* Chat List */}
      <aside
        className={`w-full md:w-[350px] md:flex-shrink-0 border-r border-[rgb(var(--border-color))] flex flex-col ${activeScreen !== "list" && "hidden"} md:flex`}
      >
        <ChatList
          onSelectChat={handleSelectChat}
          onNewMessage={handleNewMessage}
          selectedChatId={selectedChat?.id || ""}
        />
      </aside>

      {/* Main Content Area */}
      <main
        className={`w-full flex-1 flex-col ${activeScreen === "list" && "hidden"} md:flex`}
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
            users={USERS.filter((u) => u.id !== 0)}
          />
        )}
        {activeScreen === "list" && !selectedChat && (
          <div className="hidden md:flex flex-col items-center justify-center h-full bg-[rgb(var(--surface-color-light))] text-[rgb(var(--text-color-lightest))]">
            <Icons.messageCircle className="w-24 h-24 text-[rgb(var(--text-color-disabled))] mb-4" />
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm">or start a new message</p>
          </div>
        )}
      </main>
    </div>
  );
}
