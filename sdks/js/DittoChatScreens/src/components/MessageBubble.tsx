import React, { useState, useRef, useEffect } from "react";
import { Icons } from "./Icons";
import type Message from "dittochatcore/dist/types/Message";
import type ChatUser from "dittochatcore/dist/types/ChatUser";

interface MessageBubbleProps {
  message: Message;
  sender?: ChatUser;
  isOwnMessage: boolean;
  isGroupChat: boolean;
  showSenderInfo: boolean;
  onStartEdit: (message: Message) => void;
  onDeleteMessage: (messageId: number | string) => void;
  onAddReaction: (messageId: number | string, emoji: string) => void;
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
            className={`font-semibold ${isOwn ? "text-[rgb(var(--mention-text-on-primary))]" : "text-[rgb(var(--mention-text))]"}`}
          >
            {part}
          </span>
        ) : (
          part
        ),
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
  onStartEdit,
  onDeleteMessage,
  onAddReaction,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isActionsVisible, setIsActionsVisible] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
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
          className={`flex items-baseline text-sm mb-1 ${isOwnMessage ? "justify-end" : ""}`}
        >
          {(isGroupChat || !isOwnMessage) && (
            <span className="font-semibold mr-2">{senderName}</span>
          )}
          <span className="text-[rgb(var(--text-color-lightest))] text-xs">
            {typeof message.createdOn === "string"
              ? message.createdOn
              : message.createdOn.toISOString()}
          </span>
          {/*// TODO: Implement message editing functionality*/}
          {/*{message.edited && (
            <span className="text-[rgb(var(--text-color-faint))] text-xs ml-1">
              (edited)
            </span>
          )}*/}
        </div>
      )}

      <div
        className={`flex items-center gap-2 ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}
      >
        <div
          className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-xl ${bubbleClasses}`}
        >
          <p className="break-words">
            {message.text ? (
              <FormattedMessage content={message.text} isOwn={isOwnMessage} />
            ) : (
              "I"
            )}
          </p>
        </div>

        {isOwnMessage && (
          <div
            className={`relative flex items-center transition-opacity duration-200 ${isActionsVisible ? "opacity-100" : "opacity-0"}`}
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
        className={`flex items-center space-x-1 mt-1 ${isOwnMessage ? "justify-end" : ""}`}
      >
        {/*// TODO: Implement reactions*/}
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
  );
};

export default MessageBubble;
