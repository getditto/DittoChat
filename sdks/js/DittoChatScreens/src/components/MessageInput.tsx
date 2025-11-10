import React, { useState, useRef, useEffect } from "react";
import { Icons } from "./Icons";
import type Message from "dittochatcore/dist/types/Message";
import { useDittoChatStore } from "dittochatcore";
import ChatUser from "dittochatcore/dist/types/ChatUser";

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onSendImage?: (file: File, caption?: string) => void;
  editingMessage: Message | null;
  onCancelEdit: () => void;
  onSaveEdit: (messageId: string, newContent: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendImage,
  editingMessage,
  onCancelEdit,
  onSaveEdit,
}) => {
  const users: ChatUser[] = useDittoChatStore((state) => state.allUsers);
  const [text, setText] = useState("");
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);

  // Mention states
  const [isMentioning, setIsMentioning] = useState(false);
  const [filteredMentionUsers, setFilteredMentionUsers] = useState<ChatUser[]>(
    [],
  );

  const attachMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text);
      textareaRef.current?.focus();
    } else {
      setText(""); // Clear text when not editing
    }
  }, [editingMessage]);

  const handleAction = () => {
    if (text.trim()) {
      if (editingMessage) {
        onSaveEdit(editingMessage._id, text.trim());
      } else {
        onSendMessage(text.trim());
        setText("");
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAction();
    }
    if (e.key === "Escape" && editingMessage) {
      onCancelEdit();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newText.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      setIsMentioning(true);
      setFilteredMentionUsers(
        users.filter((user) =>
          user.name.toLowerCase().includes(query.toLowerCase()),
        ),
      );
    } else {
      setIsMentioning(false);
    }
  };

  const handleMentionSelect = (userName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const currentText = textarea.value;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = currentText.substring(0, cursorPos);
    const textAfterCursor = currentText.substring(cursorPos);

    const mentionStartIndex = textBeforeCursor.lastIndexOf("@");
    if (mentionStartIndex === -1) {
      setIsMentioning(false);
      return;
    }

    const newTextBefore = textBeforeCursor.substring(0, mentionStartIndex);
    const newText = `${newTextBefore}@${userName} ${textAfterCursor}`;
    setText(newText);
    setIsMentioning(false);

    const newCursorPos = mentionStartIndex + 1 + userName.length + 1;

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  const renderHighlightedText = () => {
    const parts = text.split(/(@[A-Za-z\s\d]+)/g);
    return (
      <>
        {parts.map((part, i) =>
          part.startsWith("@") ? (
            <span key={i} className="text-(--mention-text)">
              {part}
            </span>
          ) : (
            part
          ),
        )}
        {text.endsWith("\n") ? "\u200B" : ""}
      </>
    );
  };

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(event.target as Node)
      ) {
        setIsAttachMenuOpen(false);
      }
      if (
        !event
          .composedPath()
          .some((el) => (el as HTMLElement).id === "mention-popover")
      ) {
        setIsMentioning(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="p-4 bg-white border-t border-(--border-color) mt-auto flex-shrink-0">
      <div className="relative">
        {editingMessage && (
          <div className="bg-[rgba(var(--edit-bg),0.5)] rounded-lg p-3 mb-2 flex justify-between items-start">
            <div>
              <p className="font-semibold text-(--edit-text) text-sm">
                Edit Message
              </p>
              <p className="text-sm text-(--text-color-lighter) line-clamp-1">
                {editingMessage.text}
              </p>
            </div>
            <button
              onClick={onCancelEdit}
              className="text-(--text-color-lightest) hover:text-(--text-color-medium) flex-shrink-0 ml-2"
            >
              <Icons.x className="w-5 h-5" />
            </button>
          </div>
        )}

        {isMentioning && filteredMentionUsers.length > 0 && (
          <div
            id="mention-popover"
            className="absolute bottom-full mb-2 bg-white rounded-lg shadow-lg border border-(--border-color) w-64 z-20 overflow-hidden"
          >
            <ul className="max-h-60 overflow-y-auto">
              {filteredMentionUsers.map((user) => (
                <li key={user._id}>
                  <button
                    onClick={() => handleMentionSelect(user.name)}
                    className="w-full text-left px-3 py-2 flex items-center space-x-3 hover:bg-(--secondary-bg)"
                  >
                    {/*<img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                    />*/}
                    <span className="font-semibold">{user.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isAttachMenuOpen && (
          <div
            ref={attachMenuRef}
            className="absolute bottom-full mb-2 bg-white rounded-lg shadow-lg border border-(--border-color) w-48 z-10 py-1"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onSendImage) {
                  onSendImage(file, text.trim() || undefined);
                  setText("");
                  setIsAttachMenuOpen(false);
                }
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-left px-4 py-2 text-sm hover:bg-[rgb(var(--secondary-bg))] flex items-center space-x-3"
            >
              <Icons.image className="w-5 h-5 text-[rgb(var(--text-color-lightest))]" />
              <span>Photo</span>
            </button>
            <button className="w-full text-left px-4 py-2 text-sm hover:bg-(--secondary-bg) flex items-center space-x-3">
              <Icons.fileText className="w-5 h-5 text-(--text-color-lightest)" />
              <span>File</span>
            </button>
          </div>
        )}

        <div className="flex items-start space-x-3">
          <div className="relative" ref={attachMenuRef}>
            <button
              onClick={() => setIsAttachMenuOpen((p) => !p)}
              className="flex-shrink-0 flex items-center space-x-2 px-3 py-2 rounded-full bg-(--secondary-bg) hover:bg-(--secondary-bg-hover) text-(--text-color-lighter) font-medium"
            >
              <Icons.paperclip className="w-5 h-5" />
              <span>Attach</span>
            </button>
          </div>

          <div className="flex-1 flex items-start bg-(--secondary-bg) rounded-lg">
            <div className="relative flex-1 min-h-12 max-h-20 p-2 overflow-y-auto">
              <div
                aria-hidden="true"
                className="text-base whitespace-pre-wrap break-words invisible"
              >
                {renderHighlightedText()}
              </div>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder={editingMessage ? "Edit message..." : "Message..."}
                className="absolute inset-0 w-full h-full bg-transparent text-(--text-color) text-base resize-none outline-none px-2 py-2"
              />
            </div>
            <button
              onClick={handleAction}
              disabled={!text.trim()}
              className="w-8 h-8 m-1 flex items-center justify-center rounded-full bg-(--primary-color) text-(--text-on-primary) disabled:bg-(--disabled-bg) transition-colors flex-shrink-0"
            >
              {editingMessage ? (
                <Icons.check className="w-5 h-5" />
              ) : (
                <Icons.arrowUp className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageInput;
