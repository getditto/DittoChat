import React, { useState, useRef, useEffect } from "react";
import { Icons } from "./Icons";
import type Message from "dittochatcore/dist/types/Message";
import type ChatUser from "dittochatcore/dist/types/ChatUser";
import { useImageAttachment } from "../utils/useImageAttachment";

interface MessageBubbleProps {
  message: Message;
  sender?: ChatUser;
  isOwnMessage: boolean;
  isGroupChat: boolean;
  showSenderInfo: boolean;
  onStartEdit: (message: Message) => void;
  onDeleteMessage: (messageId: number | string) => void;
  onAddReaction: (messageId: number | string, emoji: string) => void;
  fetchAttachment?: (
    token: any,
    onProgress: (progress: number) => void,
    onComplete: (result: {
      success: boolean;
      data?: Uint8Array;
      metadata?: Record<string, string>;
      error?: Error;
    }) => void
  ) => void;
}

const FormattedMessage: React.FC<{ content: string; isOwn: boolean }> = ({
  content,
  isOwn,
}) => {
  const parts = content.split(/(@[A-Za-z\s\d]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span
            key={i}
            className={`font-semibold ${isOwn
              ? "text-[rgb(var(--mention-text-on-primary))]"
              : "text-[rgb(var(--mention-text))]"
              }`}
          >
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
};

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const EmojiPicker: React.FC<{
  onSelect: (emoji: string) => void;
  closePicker: () => void;
}> = ({ onSelect, closePicker }) => {
  const pickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        closePicker();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closePicker]);

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full mb-2 bg-white rounded-lg shadow-lg border border-[rgb(var(--border-color))] p-1 flex gap-1 z-10"
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="text-2xl p-1 rounded-md hover:bg-[rgb(var(--secondary-bg-hover))] transition-colors"
          aria-label={`react with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  sender,
  isOwnMessage,
  isGroupChat,
  showSenderInfo,
  fetchAttachment,
  onStartEdit,
  onDeleteMessage,
  onAddReaction,
}) => {
  // Use the image attachment hook for thumbnail (auto-fetch)
  const {
    imageUrl: thumbnailUrl,
    progress: thumbnailProgress,
    isLoading: isLoadingThumbnail,
    error: thumbnailError,
  } = useImageAttachment({
    token: (message as any).thumbnailImageToken,
    fetchAttachment,
    autoFetch: true,
  });

  // Use the image attachment hook for large image (manual fetch)
  const {
    imageUrl: largeImageUrl,
    progress: largeImageProgress,
    isLoading: isLoadingLargeImage,
    error: largeImageError,
    fetchImage: fetchLargeImage,
  } = useImageAttachment({
    token: (message as any).largeImageToken,
    fetchAttachment,
    autoFetch: false,
  });

  const [showLargeImage, setShowLargeImage] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isActionsVisible, setIsActionsVisible] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const hasImage =
    (message as any).thumbnailImageToken || (message as any).largeImageToken;
  const hasText = !!message.text && message.text.trim().length > 0;

  const imageError = thumbnailError || largeImageError;

  const handleThumbnailClick = () => {
    // If large image is already loaded, just show it
    if (largeImageUrl) {
      setShowLargeImage(true);
      return;
    }

    const token = (message as any).largeImageToken;

    // If no large image token, show thumbnail in fullscreen as fallback
    if (!token) {
      console.warn("No largeImageToken found, using thumbnail in fullscreen");
      if (thumbnailUrl) {
        // Just show the thumbnail in fullscreen
        setShowLargeImage(true);
      }
      return;
    }

    // Fetch and show large image
    fetchLargeImage();
    setShowLargeImage(true);
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      onDeleteMessage(message._id);
    }
  };

  const handleAddReactionClick = (emoji: string) => {
    onAddReaction(message._id, emoji);
    setIsEmojiPickerOpen(false);
  };

  const senderName = isOwnMessage ? "You" : sender?.name || "Unknown User";
  const bubbleClasses = isOwnMessage
    ? "bg-[rgb(var(--primary-color))] text-[rgb(var(--text-on-primary))] rounded-tr-none"
    : "bg-[rgb(var(--secondary-bg))] text-[rgb(var(--text-color-medium))] rounded-tl-none";

  const alignmentClass = isOwnMessage ? "items-end" : "items-start";

  return (
    <>
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
            className={`flex items-baseline text-sm mb-1 ${isOwnMessage ? "justify-end" : ""
              }`}
          >
            {(isGroupChat || !isOwnMessage) && (
              <span className="font-semibold mr-2">{senderName}</span>
            )}
            <span className="text-[rgb(var(--text-color-lightest))] text-xs">
              {typeof message.createdOn === "string"
                ? message.createdOn
                : message.createdOn instanceof Date
                  ? message.createdOn.toISOString()
                  : new Date(message.createdOn as any).toISOString()}
            </span>
          </div>
        )}

        <div
          className={`flex items-center gap-2 ${isOwnMessage ? "flex-row-reverse" : "flex-row"
            }`}
        >
          <div
            className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-xl ${bubbleClasses}`}
          >
            {/* Image block */}
            {hasImage && (
              <div className={`${hasText ? "mb-2" : ""}`}>
                {imageError ? (
                  <div className="flex items-center justify-center w-48 h-48 rounded bg-[rgb(var(--secondary-bg-hover))] text-[rgb(var(--text-color-light))]">
                    <span>{imageError}</span>
                  </div>
                ) : thumbnailUrl ? (
                  <div className="relative">
                    <img
                      src={thumbnailUrl}
                      alt="Message attachment"
                      className="rounded cursor-pointer max-w-full h-auto"
                      onClick={handleThumbnailClick}
                      style={{ maxHeight: "282px" }}
                    />
                    {isLoadingLargeImage && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
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
                  <div className="flex flex-col items-center justify-center w-48 h-48 rounded bg-[rgb(var(--secondary-bg-hover))]">
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

            {/* Text block */}
            {hasText && (
              <p className="break-words">
                <FormattedMessage
                  content={message.text!}
                  isOwn={isOwnMessage}
                />
              </p>
            )}
          </div>

          {isOwnMessage && (
            <div
              className={`relative flex items-center transition-opacity duration-200 ${isActionsVisible ? "opacity-100" : "opacity-0"
                }`}
            >
              <div className="relative">
                {isEmojiPickerOpen && (
                  <EmojiPicker
                    onSelect={handleAddReactionClick}
                    closePicker={() => setIsEmojiPickerOpen(false)}
                  />
                )}
                <button
                  onClick={() => setIsEmojiPickerOpen((p) => !p)}
                  className="p-1 rounded-full hover:bg-[rgb(var(--secondary-bg-hover))] text-[rgb(var(--text-color-lightest))]"
                  aria-label="Add reaction"
                >
                  <Icons.smile className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={() => {
                  onStartEdit(message);
                  setIsActionsVisible(false);
                }}
                className="p-1 rounded-full hover:bg-[rgb(var(--secondary-bg-hover))] text-[rgb(var(--text-color-lightest))]"
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
                  <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border border-[rgb(var(--border-color))] w-40 z-10 py-1">
                    <button
                      onClick={() => {
                        onStartEdit(message);
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-[rgb(var(--secondary-bg))]"
                    >
                      Edit message
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full text-left px-4 py-2 text-sm text-[rgb(var(--danger-text))] hover:bg-[rgb(var(--secondary-bg))]"
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
          className={`flex items-center space-x-1 mt-1 ${isOwnMessage ? "justify-end" : ""
            }`}
        >
          {/* TODO: Implement reactions */}
          {/*{message.reactions.map((reaction) => {
          const userHasReacted = reaction.userIds.includes(CURRENT_USER_ID);
          return (
            <button
              key={reaction.emoji}
              onClick={() => handleAddReactionClick(reaction.emoji)}
              className={`text-xs px-2 py-0.5 rounded-full flex items-center space-x-1 cursor-pointer transition-colors ${
                userHasReacted
                  ? "bg-[rgb(var(--primary-color-lighter))] border border-[rgb(var(--primary-color-light-border))]"
                  : "bg-[rgb(var(--secondary-bg-hover))] hover:bg-[rgb(var(--disabled-bg))]"
              }`}
            >
              <span>{reaction.emoji}</span>
              <span
                className={`font-medium ${userHasReacted ? "text-[rgb(var(--primary-color-dark-text))]" : "text-[rgb(var(--text-color-light))]"}`}
              >
                {reaction.count}
              </span>
            </button>
          );
        })}*/}
          {!isOwnMessage && (
            <div className="relative">
              <button
                onClick={() => setIsEmojiPickerOpen((p) => !p)}
                className="p-1 rounded-full hover:bg-[rgb(var(--secondary-bg-hover))] text-[rgb(var(--text-color-lightest))]"
                aria-label="Add reaction"
              >
                <Icons.smile className="w-5 h-5" />
              </button>
              {isEmojiPickerOpen && (
                <EmojiPicker
                  onSelect={handleAddReactionClick}
                  closePicker={() => setIsEmojiPickerOpen(false)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen image viewer */}
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
    </>
  );
};

export default MessageBubble;