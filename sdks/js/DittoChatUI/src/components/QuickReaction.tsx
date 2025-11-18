import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { useEffect, useRef, useState } from "react";
import { Icons } from "./Icons";

interface QuickReactionProps {
  onSelect: (reaction: EmojiClickData) => void;
  disabled?: boolean;
  isOwnMessage: boolean;
}

function EmojiPickerComponent({
  isOwnMessage,
  onSelect,
  closePicker,
  triggerRef,
}: {
  isOwnMessage: boolean;
  onSelect: (emoji: EmojiClickData) => void;
  closePicker: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [positionY, setPositionY] = useState<"top" | "bottom">("top");

  const [isVisible, setIsVisible] = useState(false);

  // Animate on mount
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // Close with animation
  const closeWithAnimation = () => {
    setIsVisible(false);
    setTimeout(closePicker, 150);
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      ) {
        closeWithAnimation();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Smart positioning: top/bottom + left/right/center
  useEffect(() => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const pickerHeight = 459;
    const vh = window.innerHeight;

    // Vertical
    const spaceBelow = vh - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    setPositionY(
      spaceBelow < pickerHeight && spaceAbove > pickerHeight ? "top" : "bottom",
    );
  }, []);

  // Tailwind positioning classes
  const yClass = positionY === "top" ? "bottom-full mb-2" : "top-full mt-2";
  const xClass = isOwnMessage ? "right-0" : "left-0";

  // 1. State to store the value of the CSS variable
  const [themeName, setThemeName] = useState("");

  // 3. The effect that reads the CSS variable
  useEffect(() => {
    // Ensure the ref is connected to a DOM element
    if (pickerRef.current) {
      // getComputedStyle gives us the final, browser-computed CSS properties
      const computedStyle = getComputedStyle(pickerRef.current);

      // getPropertyValue gets the value of a specific CSS property
      // .trim() is important because the value might have leading/trailing whitespace
      const colorValue = computedStyle.getPropertyValue("--theme-name").trim();

      // Update our state with the value we read
      setThemeName(colorValue);
    }
    // 4. This effect should re-run whenever the `theme` changes,
    // because a theme change will cause the CSS variable to have a new value.
  }, [pickerRef]);

  return (
    <div
      ref={pickerRef}
      className={`
        absolute z-50
        ${yClass}
        ${xClass}
        transition-all duration-150 ease-out transform
        origin-top
        ${
          isVisible
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 " +
              (positionY === "top" ? "translate-y-2" : "-translate-y-2")
        }
        p-1
      `}
    >
      <EmojiPicker
        onEmojiClick={(emoji) => {
          setIsVisible(false);
          setTimeout(() => onSelect(emoji), 120);
        }}
        theme={themeName === "dark" ? Theme.DARK : Theme.LIGHT}
        skinTonesDisabled={false}
        reactionsDefaultOpen={true}
      />
    </div>
  );
}

export default function QuickReaction({
  onSelect,
  disabled,
  isOwnMessage,
}: QuickReactionProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const handleAddReactionClick = (emoji: EmojiClickData) => {
    console.log({ emoji });
    onSelect(emoji);
    setIsEmojiPickerOpen(false);
  };

  return (
    <div className="relative">
      {isEmojiPickerOpen && (
        <EmojiPickerComponent
          isOwnMessage={isOwnMessage}
          triggerRef={triggerRef}
          onSelect={handleAddReactionClick}
          closePicker={() => setIsEmojiPickerOpen(false)}
        />
      )}
      <button
        ref={triggerRef}
        onClick={() => setIsEmojiPickerOpen((p) => !p)}
        disabled={disabled}
        className="p-1 rounded-full hover:bg-(--secondary-bg-hover) text-(--text-color-lightest) disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Add reaction"
      >
        <Icons.smile className="w-5 h-5" />
      </button>
    </div>
  );
}
