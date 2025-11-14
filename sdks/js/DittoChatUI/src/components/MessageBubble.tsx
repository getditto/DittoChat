import React, { useEffect, useState } from "react";
import { Icons } from "./Icons";
import type Message from "@dittolive/ditto-chat-core/dist/types/Message";
import type ChatUser from "@dittolive/ditto-chat-core/dist/types/ChatUser";
import { formatDate } from "../utils";
import { useImageAttachment } from "../utils/useImageAttachment";
import { AttachmentToken } from "@dittolive/ditto";
import { EmojiClickData } from "emoji-picker-react";
import QuickReaction from "./QuickReaction";

type MessageReaction = {
  id: number;
  emoji: string;
  userIds: string[];
};

interface MessageBubbleProps {
  message: Message;
  sender?: ChatUser;
  currentUserId: string;
  isOwnMessage: boolean;
  isGroupChat: boolean;
  showSenderInfo: boolean;
  onStartEdit: (message: Message) => void;
  onDeleteMessage: (messageId: number | string) => void;
  onAddReaction: (message: Message, reaction: EmojiClickData) => Promise<void>;
  onRemoveReaction: (
    message: Message,
    userId: string,
    emoji: string,
  ) => Promise<void>;
  fetchAttachment?: (
    token: AttachmentToken,
    onProgress: (progress: number) => void,
    onComplete: (result: {
      success: boolean;
      data?: Uint8Array;
      metadata?: Record<string, string>;
      error?: Error;
    }) => void,
  ) => void;
}

function FormattedMessage({
  content,
  isOwn,
}: {
  content: string;
  isOwn: boolean;
}) {
  const parts = content.split(/(@[A-Za-z\s\d]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span
            key={i}
            className={`font-semibold ${isOwn ? "text-(--mention-text-on-primary)" : "text-(--mention-text)"}`}
          >
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>
            <span className="whitespace-pre-line">{part}</span>
          </React.Fragment>
        ),
      )}
    </>
  );
}

function MessageBubble({
  message,
  sender,
  isOwnMessage,
  currentUserId,
  isGroupChat,
  showSenderInfo,
  fetchAttachment,
  onStartEdit,
  onDeleteMessage,
  onAddReaction,
  onRemoveReaction,
}: MessageBubbleProps) {
  const {
    imageUrl: thumbnailUrl,
    progress: thumbnailProgress,
    isLoading: isLoadingThumbnail,
    error: thumbnailError,
  } = useImageAttachment({
    token: message.thumbnailImageToken,
    fetchAttachment,
    autoFetch: true,
  });

  const {
    imageUrl: largeImageUrl,
    progress: largeImageProgress,
    isLoading: isLoadingLargeImage,
    error: largeImageError,
    fetchImage: fetchLargeImage,
  } = useImageAttachment({
    token: message.largeImageToken,
    fetchAttachment,
    autoFetch: false,
  });

  const [showLargeImage, setShowLargeImage] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isActionsVisible, setIsActionsVisible] = useState(false);
  const [reactions, setReactions] = useState<MessageReaction[]>([]);

  const hasImage = message.thumbnailImageToken || message.largeImageToken;
  const hasFile = !!message.fileAttachmentToken;
  const hasText =
    !!message.text &&
    message.text.trim().length > 0 &&
    (!hasFile || message.isDeleted);

  const imageError = thumbnailError || largeImageError;

  useEffect(() => {
    const r = (message.reactions || []).reduce((acc, reaction) => {
      const existingReaction = acc.find((r) => r.emoji === reaction.emoji);
      if (existingReaction) {
        existingReaction.userIds.push(reaction.userId);
      } else {
        acc.push({
          id: acc.length + 1,
          emoji: reaction.emoji,
          userIds: [reaction.userId],
        });
      }
      return acc;
    }, [] as MessageReaction[]);
    setReactions(r);
  }, [message]);

  const handleThumbnailClick = () => {
    if (largeImageUrl) {
      setShowLargeImage(true);
      return;
    }

    const token = message.largeImageToken;

    if (!token) {
      console.warn("No largeImageToken found, using thumbnail in fullscreen");
      if (thumbnailUrl) {
        setShowLargeImage(true);
      }
      return;
    }

    fetchLargeImage();
    setShowLargeImage(true);
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      onDeleteMessage(message._id);
    }
  };

  const handleAddReactionClick = (emoji: EmojiClickData) => {
    const existingReactionIndex = reactions.findIndex(
      (reaction) =>
        reaction.emoji === emoji.emoji &&
        reaction.userIds.includes(currentUserId),
    );
    if (existingReactionIndex !== -1) return;
    onAddReaction(message, emoji);
  };

  const senderName = isOwnMessage ? "You" : sender?.name || "Unknown User";
  const bubbleClasses = isOwnMessage
    ? "bg-(--primary-color) text-(--text-on-primary) rounded-tr-none"
    : "bg-(--secondary-bg) text-(--text-color-medium) rounded-tl-none";

  const alignmentClass = isOwnMessage ? "items-end" : "items-start";

  return (
    <div
      className={`flex flex-col ${alignmentClass}`}
      onMouseEnter={() => {
        if (isOwnMessage) setIsActionsVisible(true);
      }}
      onMouseLeave={() => {
        if (isOwnMessage) {
          setIsActionsVisible(false);
          setIsMenuOpen(false);
        }
      }}
    >
      {showSenderInfo && (
        <div
          className={`flex items-baseline text-xs text-(--text-color-lightest) mb-1 ${isOwnMessage ? "justify-end" : ""}`}
        >
          {(isGroupChat || !isOwnMessage) && (
            <span className="mr-1">{senderName}</span>
          )}
          <span className="mr-1 text-sm">&#183;</span>
          <span>{formatDate(message.createdOn)}</span>
          {message.isEdited && !message.isDeleted && (
            <span className="text-(--text-color-faint) text-xs ml-1">
              (edited)
            </span>
          )}
        </div>
      )}

      <div
        className={`flex items-center gap-2 ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}
      >
        <div
          className={`flex flex-col max-w-xs md:max-w-md lg:max-w-lg ${isOwnMessage ? "items-end" : "items-start"}`}
        >
          {hasImage && !message.isDeleted && (
            <div className={`relative ${hasText ? "mb-1" : ""}`}>
              {message.isDeleted ? (
                <div className="flex items-center justify-center w-48 h-48 rounded-xl bg-[rgb(var(--secondary-bg-hover))]">
                  <span className="italic text-(--text-color-faint)">
                    [deleted image]
                  </span>
                </div>
              ) : imageError ? (
                <div className="flex items-center justify-center w-48 h-48 rounded-xl bg-[rgb(var(--secondary-bg-hover))] text-[rgb(var(--text-color-light))]">
                  <span>{imageError}</span>
                </div>
              ) : thumbnailUrl ? (
                <div className="relative">
                  <img
                    src={thumbnailUrl}
                    alt="Message attachment"
                    className="rounded-xl cursor-pointer max-w-full h-auto block"
                    onClick={handleThumbnailClick}
                    style={{ maxHeight: "282px" }}
                  />
                  {isLoadingLargeImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                      <div className="text-white text-center">
                        <div className="text-sm">Loading…</div>
                        <div className="text-xs">
                          {Math.round(largeImageProgress * 100)}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-48 h-48 rounded-xl bg-[rgb(var(--secondary-bg-hover))]">
                  <div className="text-[rgb(var(--text-color-light))] text-sm">
                    {isLoadingThumbnail ? "Loading…" : "Preparing image…"}
                  </div>
                  {thumbnailProgress > 0 && (
                    <div className="text-[rgb(var(--text-color-light))] text-xs mt-1">
                      {Math.round(thumbnailProgress * 100)}%
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {hasFile &&
            (message.isDeleted ? (
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl ${bubbleClasses} max-w-xs`}
              >
                <span className="italic text-(--text-color-faint)">
                  [deleted file]
                </span>
              </div>
            ) : (
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl ${bubbleClasses} max-w-xs`}
              >
                <div className="flex-shrink-0 p-2 bg-(--secondary-bg-hover) rounded-lg">
                  <Icons.fileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">
                    {message.text || "File attachment"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (fetchAttachment && message.fileAttachmentToken) {
                      fetchAttachment(
                        message.fileAttachmentToken as unknown as AttachmentToken,
                        () => {},
                        (result) => {
                          if (result.success && result.data) {
                            const blob = new Blob(
                              [new Uint8Array(result.data)],
                              { type: "application/octet-stream" },
                            );
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = message.text || "download";
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }
                        },
                      );
                    }
                  }}
                  className="p-1.5 hover:bg-(--secondary-bg-hover) rounded-md transition-colors flex-shrink-0"
                  aria-label="Download file"
                >
                  <Icons.arrowDown className="w-4 h-4" />
                </button>
              </div>
            ))}

          {hasText && (
            <div className={`px-4 py-2 rounded-xl ${bubbleClasses}`}>
              <p className="break-words">
                {message.isDeleted ? (
                  <span className="italic text-(--text-color-faint)">
                    [deleted message]
                  </span>
                ) : (
                  <FormattedMessage
                    content={message.text!}
                    isOwn={isOwnMessage}
                  />
                )}
              </p>
            </div>
          )}
        </div>

        {isOwnMessage && (
          <div
            className={`relative flex items-center transition-opacity duration-200 ${
              isActionsVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <button
              onClick={() => {
                onStartEdit(message);
                setIsActionsVisible(false);
              }}
              disabled={message.isDeleted}
              className="p-1 rounded-full hover:bg-(--secondary-bg-hover) text-(--text-color-lightest) disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Edit message"
            >
              <Icons.edit3 className="w-5 h-5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen((p) => !p)}
                className="p-1 rounded-full hover:bg-[rgb(var(--secondary-bg-hover))] text-[rgb(var(--text-color-lightest))]"
                aria-label="More options"
              >
                <Icons.moreHorizontal className="w-5 h-5" />
              </button>
              {isMenuOpen && (
                <div className="absolute top-full mt-2 right-0 bg-(--surface-color) rounded-lg shadow-lg border border-(--border-color) w-40 z-10 py-1">
                  {!message.isDeleted && (
                    <button
                      onClick={() => {
                        onStartEdit(message);
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-(--secondary-bg)"
                    >
                      Edit message
                    </button>
                  )}
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-4 py-2 text-sm text-(--danger-text) hover:bg-(--secondary-bg)"
                  >
                    Delete message
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div
        className={`flex items-center space-x-1 mt-1 ${isOwnMessage ? "justify-end" : ""}`}
      >
        {reactions.map((reaction) => {
          const userHasReacted = reaction.userIds.includes(currentUserId);
          return (
            <button
              onClick={() =>
                onRemoveReaction(message, currentUserId, reaction.emoji)
              }
              className={`text-xs px-2 py-0.5 rounded-full flex items-center space-x-1 cursor-pointer transition-colors ${
                userHasReacted
                  ? "bg-(--primary-color-lighter) border border-(--primary-color-light-border)"
                  : "bg-(--secondary-bg-hover) hover:bg-(--disabled-bg)"
              }`}
            >
              <span>{reaction.emoji}</span>
              <span
                className={`font-medium ${userHasReacted ? "text-(--primary-color-dark-text)" : "text-(--text-color-light)"}`}
              >
                {reaction.userIds.length}
              </span>
            </button>
          );
        })}
        <QuickReaction
          onSelect={handleAddReactionClick}
          disabled={message.isDeleted}
          isOwnMessage={isOwnMessage}
        />
      </div>

      {showLargeImage && (largeImageUrl || thumbnailUrl) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
          onClick={() => setShowLargeImage(false)}
        >
          <div className="relative max-w-4xl max-h-screen p-4">
            <button
              className="absolute top-2 right-2 text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70"
              onClick={(e) => {
                e.stopPropagation();
                setShowLargeImage(false);
              }}
            >
              ✕
            </button>
            <img
              src={largeImageUrl || thumbnailUrl!}
              alt="Large view"
              className="max-w-full max-h-screen rounded"
              onClick={(e) => e.stopPropagation()}
            />
            {isLoadingLargeImage && !largeImageUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                <div className="text-white text-center">
                  <div className="text-sm">Loading full image…</div>
                  <div className="text-xs">
                    {Math.round(largeImageProgress * 100)}%
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MessageBubble;
