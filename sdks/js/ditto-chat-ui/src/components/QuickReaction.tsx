import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react'
import { useEffect, useRef, useState } from 'react'

import { Icons } from './Icons'
import * as Popover from './ui/Popover'

interface QuickReactionProps {
  onSelect: (reaction: EmojiClickData) => void
  disabled?: boolean
  isOwnMessage: boolean
}

function useSmartPositioning(
  triggerRef: React.RefObject<HTMLButtonElement | null>,
  open: boolean,
) {
  const [positionY, setPositionY] = useState<'top' | 'bottom'>('top')

  // Smart positioning: top/bottom based on available space
  useEffect(() => {
    if (!triggerRef.current || !open) {
      return
    }

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const pickerHeight = 459
    const vh = window.innerHeight

    // Vertical
    const spaceBelow = vh - triggerRect.bottom
    const spaceAbove = triggerRect.top

    setPositionY(
      spaceBelow < pickerHeight && spaceAbove > pickerHeight ? 'top' : 'bottom',
    )
  }, [triggerRef, open])

  return positionY
}

export default function QuickReaction({
  onSelect,
  disabled,
  isOwnMessage,
}: QuickReactionProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const positionY = useSmartPositioning(triggerRef, isEmojiPickerOpen)

  const handleAddReactionClick = (emoji: EmojiClickData) => {
    onSelect(emoji)
    setIsEmojiPickerOpen(false)
  }

  const [themeName] = useState(localStorage.getItem('ditto-web-chat-theme'))

  return (
    <div className="relative">
      <Popover.Root open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
        <Popover.Trigger asChild>
          <button
            ref={triggerRef}
            disabled={disabled}
            className="p-1 rounded-full hover:bg-(--dc-secondary-bg-hover) text-(--dc-text-color-lightest) disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:outline-none focus-visible:ring-(--dc-ring-color) focus-visible:ring-[3px] focus:ring-offset-1 ring-offset-(--dc-surface-color)"
            aria-label="Add reaction"
          >
            <Icons.smile className="w-5 h-5" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="z-50 p-1 outline-none"
            side={positionY}
            sideOffset={8}
            align={isOwnMessage ? 'end' : 'start'}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <EmojiPicker
              onEmojiClick={handleAddReactionClick}
              theme={themeName === 'dark' ? Theme.DARK : Theme.LIGHT}
              skinTonesDisabled={false}
              reactionsDefaultOpen={true}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}
