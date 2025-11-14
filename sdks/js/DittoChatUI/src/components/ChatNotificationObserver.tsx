import React, { useEffect } from "react";
import { useDittoChatStore } from "@dittolive/ditto-chat-core";
import { useToast } from "./ToastProvider";

interface ChatNotificationObserverProps {
  activeRoomId?: string | number | null;
}

export const ChatNotificationObserver: React.FC<ChatNotificationObserverProps> = ({ 
  activeRoomId 
}) => {
  const registerNotificationHandler = useDittoChatStore(
    (state) => state.registerNotificationHandler
  );
  const { addToast } = useToast();

  useEffect(() => {
    registerNotificationHandler((messageWithUser, room) => {
      // Don't show notification if user is currently viewing this room
      if (activeRoomId === room._id) {
        return;
      }

      const senderName = messageWithUser.user?.name || "Unknown User";
      const roomName = room.name;
      const isDM = room.collectionId === "dm_rooms";
      
      const title = isDM 
        ? `New message from ${senderName}`
        : `#${roomName}: ${senderName}`;
      
      const preview = messageWithUser.message.text 
        ? messageWithUser.message.text.substring(0, 30) + 
          (messageWithUser.message.text.length > 30 ? "..." : "")
        : "Sent an attachment";
      
      addToast(`${title}: ${preview}`, "info");
    });
  }, [registerNotificationHandler, addToast, activeRoomId]);

  return null;
};