import { useEffect } from "react";
import { useDittoChatStore, toast } from "@dittolive/ditto-chat-core";
import { useBrowserNotifications } from "../hooks/useBrowserNotifications";

interface ChatNotificationObserverProps {
  activeRoomId?: string | number | null;
}

function ChatNotificationObserver({ activeRoomId }: ChatNotificationObserverProps) {
  const registerNotificationHandler = useDittoChatStore(
    (state) => state.registerNotificationHandler,
  );
  const users = useDittoChatStore((state) => state.allUsers);
  const {
    permission,
    isSupported,
    requestPermission,
    showNotification,
  } = useBrowserNotifications();

  useEffect(() => {
    registerNotificationHandler((messageWithUser, room) => {
      // Don't show notification if user is currently viewing this room
      if (activeRoomId === room._id) {
        return;
      }
      const user = users.find((u) => u._id === messageWithUser.message?.userId);
      if (!user) { return; }
      const senderName = user?.name || "Unknown User";
      const roomName = room.name;
      const isDM = room.collectionId === "dm_rooms";

      const title = isDM
        ? `New message from ${senderName}`
        : `#${roomName}: ${senderName}`;

      const preview = messageWithUser.message.text
        ? messageWithUser.message.text.substring(0, 30) +
        (messageWithUser.message.text.length > 30 ? "..." : "")
        : "Sent an attachment";

      // Try browser notifications
      if (isSupported) {
        if (permission === "default") {
          requestPermission().then((newPermission) => {
            if (newPermission === "granted") {
              showNotification({
                title,
                body: preview,
                tag: room._id,
                data: { roomId: room._id },
              });
            } else {
              // Permission denied, show toast as fallback
              console.log('[ChatNotificationObserver] Triggering toast (permission denied):', { title, preview });
              toast({
                title,
                description: preview,
              });
            }
          });
        } else if (permission === "granted") {
          showNotification({
            title,
            body: preview,
            tag: room._id,
            data: { roomId: room._id },
          });
        } else {
          // Permission denied, show toast as fallback
          console.log('[ChatNotificationObserver] Triggering toast (permission denied):', { title, preview });
          toast({
            title,
            description: preview,
          });
        }
      } else {
        // Browser notifications not supported, show toast as fallback
        console.log('[ChatNotificationObserver] Triggering toast (not supported):', { title, preview });
        toast({
          title,
          description: preview,
        });
      }
    });
  }, [
    registerNotificationHandler,
    activeRoomId,
    users,
    permission,
    isSupported,
    requestPermission,
    showNotification,
  ]);

  return null;
};

export default ChatNotificationObserver;