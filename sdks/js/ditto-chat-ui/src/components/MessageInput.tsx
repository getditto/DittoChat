import { AttachmentToken } from '@dittolive/ditto'
import {
  type ChatUser,
  type Mention,
  type Message,
  useDittoChatStore,
} from '@dittolive/ditto-chat-core'
import { clsx } from 'clsx'
import React, { useEffect, useRef, useState } from 'react'

import { useImageAttachment } from '../hooks/useImageAttachment'
import { usePermissions } from '../utils/usePermissions'
import Avatar from './Avatar'
import { Icons } from './Icons'
import * as Popover from './ui/Popover'

interface UserMentionItemProps {
  user: ChatUser
  isHighlighted: boolean
  onSelect: () => void
  fetchAttachment?: (
    token: AttachmentToken,
    onProgress: (progress: number) => void,
    onComplete: (result: {
      success: boolean
      data?: Uint8Array
      metadata?: Record<string, string>
      error?: Error
    }) => void,
  ) => void
}

function UserMentionItem({
  user,
  isHighlighted,
  onSelect,
  fetchAttachment,
}: UserMentionItemProps) {
  const profilePictureThumbnail = user.profilePictureThumbnail

  const { imageUrl: avatarUrl } = useImageAttachment({
    token: profilePictureThumbnail
      ? (profilePictureThumbnail as unknown as AttachmentToken)
      : null,
    fetchAttachment,
    autoFetch: true,
  })

  return (
    <button
      onClick={onSelect}
      className={clsx(
        'w-full text-left px-3 py-2 flex items-center space-x-3 hover:bg-(--dc-secondary-bg) outline-none focus:outline-none focus-visible:ring-(--dc-ring-color) focus-visible:ring-[3px] focus:ring-offset-1 ring-offset-(--dc-surface-color)',
        isHighlighted ? 'bg-(--dc-secondary-bg)' : '',
      )}
    >
      <Avatar isUser={true} imageUrl={avatarUrl || undefined} />
      <span className="font-semibold">{user.name}</span>
    </button>
  )
}

export interface MessageInputProps {
  onSendMessage: (content: string, mentions: Mention[]) => void
  onSendImage?: (file: File, caption?: string) => void
  onSendFile?: (file: File, caption?: string) => void
  editingMessage: Message | null
  onCancelEdit: () => void
  onSaveEdit: (newContent: string, mentions: Mention[]) => void
}

function MessageInput({
  onSendMessage,
  onSendImage,
  onSendFile,
  editingMessage,
  onCancelEdit,
  onSaveEdit,
}: MessageInputProps) {
  const users: ChatUser[] = useDittoChatStore((state) => state.allUsers)
  const fetchAttachment = useDittoChatStore((state) => state.fetchAttachment)
  const { canMentionUsers } = usePermissions()
  const [text, setText] = useState('')
  const [mentions, setMentions] = useState<Mention[]>([])
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false)

  // Mention states
  const [isMentioning, setIsMentioning] = useState(false)
  const [filteredMentionUsers, setFilteredMentionUsers] = useState<ChatUser[]>(
    [],
  )
  const [highlightedMentionIndex, setHighlightedMentionIndex] = useState(0)

  const attachMenuRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const documentFileInputRef = useRef<HTMLInputElement>(null)
  const mentionListRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text)
      setMentions(editingMessage.mentions || [])
      textareaRef.current?.focus()
    } else {
      setText('') // Clear text when not editing
      setMentions([])
    }
  }, [editingMessage])

  useEffect(() => {
    if (isMentioning && mentionListRef.current) {
      const highlightedItem = mentionListRef.current.children[
        highlightedMentionIndex
      ] as HTMLLIElement
      if (highlightedItem) {
        highlightedItem.scrollIntoView({
          block: 'nearest',
        })
      }
    }
  }, [highlightedMentionIndex, isMentioning])

  const handleAction = () => {
    if (text.trim()) {
      const validMentions = mentions.filter((m) => {
        const user = users.find((u) => u._id === m.userId)
        if (!user) {
          return false
        }
        const mentionText = text.substring(m.startIndex, m.endIndex)
        return mentionText === `@${user.name}`
      })

      if (editingMessage) {
        onSaveEdit(text, validMentions)
      } else {
        onSendMessage(text, validMentions)
        setText('')
        setMentions([])
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isMentioning && filteredMentionUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedMentionIndex(
          (prev) => (prev + 1) % filteredMentionUsers.length,
        )
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedMentionIndex(
          (prev) =>
            (prev - 1 + filteredMentionUsers.length) %
            filteredMentionUsers.length,
        )
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        handleMentionSelect(filteredMentionUsers[highlightedMentionIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setIsMentioning(false)
        return
      }
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleAction()
    }
    if (e.key === 'Escape' && editingMessage) {
      onCancelEdit()
    }
  }

  /**
   * This function is called every time the text in the input changes.
   * It performs two main tasks:
   * 1. Updates the positions of existing mentions if text is added or removed.
   * 2. Checks if the user is typing a new mention (e.g., "@name") and shows the popover if so.
   */
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    const oldText = text

    // Part 1: Update existing mention positions based on text changes

    // Find the starting index of the change by comparing old and new text from the beginning.
    let changeStartIndex = 0
    while (
      changeStartIndex < oldText.length &&
      changeStartIndex < newText.length &&
      oldText[changeStartIndex] === newText[changeStartIndex]
    ) {
      changeStartIndex++
    }

    // Find the ending index of the change by comparing from the end.
    let oldTextEndIndex = oldText.length
    let newTextEndIndex = newText.length
    while (
      oldTextEndIndex > changeStartIndex &&
      newTextEndIndex > changeStartIndex &&
      oldText[oldTextEndIndex - 1] === newText[newTextEndIndex - 1]
    ) {
      oldTextEndIndex--
      newTextEndIndex--
    }

    // Calculate how much the length of the text has changed.
    const lengthDifference =
      newTextEndIndex - changeStartIndex - (oldTextEndIndex - changeStartIndex)

    const updatedMentions = mentions
      .map((mention) => {
        const { startIndex, endIndex } = mention

        // Case 1: Mention is entirely before the changed area. No changes needed.
        if (endIndex <= changeStartIndex) {
          return mention
        }

        // Case 2: Mention is entirely after the changed area. We just shift its position.
        if (startIndex >= oldTextEndIndex) {
          return {
            ...mention,
            startIndex: startIndex + lengthDifference,
            endIndex: endIndex + lengthDifference,
          }
        }

        // Case 3: The change overlaps with the mention text (e.g., user deleted a character from a name).
        // In this case, the mention is considered "damaged" and is removed.
        if (
          Math.max(startIndex, changeStartIndex) <
          Math.min(endIndex, oldTextEndIndex)
        ) {
          return null
        }

        // Fallback case, should not be reached with the above logic.
        return mention
      })
      .filter((m): m is Mention => m !== null) // Filter out any null (damaged) mentions.

    setMentions(updatedMentions)
    setText(newText)

    // Part 2: Check if a new mention is being typed

    // Only allow mentions if user has permission
    if (!canMentionUsers) {
      setIsMentioning(false)
      return
    }

    const cursorPosition = e.target.selectionStart
    const textBeforeCursor = newText.substring(0, cursorPosition)

    // Use a regex to find if the text right before the cursor looks like "@name".
    // This supports names with spaces.
    const mentionMatch = textBeforeCursor.match(/@([\w\s]*)$/)

    if (mentionMatch) {
      const mentionQuery = mentionMatch[1]
      // Filter available users based on the query.
      const filteredUsers = users.filter((user) =>
        user.name.toLowerCase().includes(mentionQuery.toLowerCase()),
      )

      if (filteredUsers.length > 0) {
        // If we have matches, show the mention popover.
        setIsMentioning(true)
        setFilteredMentionUsers(filteredUsers)
        setHighlightedMentionIndex(0)
      } else {
        // No matches, hide the popover.
        setIsMentioning(false)
      }
    } else {
      // The text doesn't look like a mention query, so hide the popover.
      setIsMentioning(false)
    }
  }

  /**
   * Handles the selection of a user from the mention popover.
   * This function replaces the typed query (e.g., "@da") with the full mention
   * (e.g., "@David Park"), creates a new mention object, and updates the
   * positions of any subsequent mentions in the text.
   */
  const handleMentionSelect = (user: ChatUser) => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    // Part 1: Identify the mention query and construct the new text

    const currentText = text
    const cursorPosition = textarea.selectionStart

    // Find the text that triggered the mention popover (e.g., "@Da").
    const textBeforeCursor = currentText.substring(0, cursorPosition)
    const mentionQueryMatch = textBeforeCursor.match(/@([\w\s]*)$/)

    if (!mentionQueryMatch) {
      setIsMentioning(false)
      return // Should not happen if popover is open, but a good safeguard.
    }

    const queryText = mentionQueryMatch[0] // The full query, e.g., "@Da"
    const queryStartIndex = mentionQueryMatch.index! // The start index of the query ("@" symbol)

    // Replace the query with the full user name mention.
    const mentionText = `@${user.name}`
    const textBeforeQuery = currentText.substring(0, queryStartIndex)
    const textAfterQuery = currentText.substring(cursorPosition)

    // Add a space after the mention for a better typing experience.
    const newText = `${textBeforeQuery}${mentionText} ${textAfterQuery}`

    // Part 2: Create the new mention object and update existing ones

    // The new mention object to be stored, with its exact position.
    const newMention: Mention = {
      userId: user._id || '',
      startIndex: queryStartIndex,
      endIndex: queryStartIndex + mentionText.length,
    }

    // Calculate the change in text length to shift any mentions that follow.
    const lengthDifference = mentionText.length + 1 - queryText.length

    const updatedMentions = mentions.map((mention) => {
      // If an existing mention comes after the one we just inserted,
      // we need to shift its start and end indexes to the new positions.
      if (mention.startIndex >= queryStartIndex) {
        return {
          ...mention,
          startIndex: mention.startIndex + lengthDifference,
          endIndex: mention.endIndex + lengthDifference,
        }
      }
      return mention
    })

    // Add the new mention to the list and re-sort by start index.
    setMentions(
      [...updatedMentions, newMention].sort(
        (a, b) => a.startIndex - b.startIndex,
      ),
    )
    setText(newText)
    setIsMentioning(false)

    // Part 3: Update the textarea cursor position

    // Move the cursor to after the inserted mention and the added space.
    const newCursorPosition = queryStartIndex + mentionText.length + 1

    // Use requestAnimationFrame to ensure the cursor is set after React's state update.
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPosition, newCursorPosition)
    })
  }

  const renderHighlightedText = () => {
    if (mentions.length === 0) {
      return (
        <>
          {text}
          {text.endsWith('\n') ? '\u200B' : ''}
        </>
      )
    }

    const sortedMentions = [...mentions].sort(
      (a, b) => a.startIndex - b.startIndex,
    )
    const finalParts: React.ReactNode[] = []
    let currentIndex = 0

    sortedMentions.forEach((mention, index) => {
      if (mention.startIndex > currentIndex) {
        finalParts.push(
          <React.Fragment key={`text-${index}`}>
            {text.slice(currentIndex, mention.startIndex)}
          </React.Fragment>,
        )
      }
      finalParts.push(
        <span key={`mention-${index}`} className="text-(--dc-mention-text)">
          {text.slice(mention.startIndex, mention.endIndex)}
        </span>,
      )
      currentIndex = mention.endIndex
    })

    if (currentIndex < text.length) {
      finalParts.push(
        <React.Fragment key="text-last">
          {text.slice(currentIndex)}
        </React.Fragment>,
      )
    }

    if (text.endsWith('\n')) {
      finalParts.push('\u200B')
    }

    return <>{finalParts}</>
  }


  return (
    <div className="p-4 bg-(--dc-surface-color) border-t border-(--dc-border-color) mt-auto flex-shrink-0 w-full">
      <div className="relative w-full">
        {editingMessage && (
          <div className="bg-[rgba(var(--dc-edit-bg),0.5)] rounded-lg p-3 mb-2 flex justify-between items-start">
            <div>
              <p className="font-semibold text-(--dc-edit-text) text-sm">
                Edit Message
              </p>
              <p className="text-sm text-(--dc-text-color-lighter) line-clamp-1">
                {editingMessage.text}
              </p>
            </div>
            <button
              onClick={onCancelEdit}
              className="text-(--dc-text-color-lightest) hover:text-(--dc-text-color-medium) flex-shrink-0 ml-2 outline-none focus:outline-none focus-visible:ring-(--dc-ring-color) focus-visible:ring-[3px] focus:ring-offset-1 ring-offset-transparent rounded"
            >
              <Icons.x className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="flex items-start space-x-3 w-full">
          <Popover.Root open={isAttachMenuOpen} onOpenChange={setIsAttachMenuOpen}>
            <Popover.Trigger asChild>
              <button
                className="flex-shrink-0 flex items-center space-x-2 px-3 py-2 rounded-full bg-(--dc-secondary-bg) hover:bg-(--dc-secondary-bg-hover) text-(--dc-text-color-lighter) font-medium outline-none focus:outline-none focus-visible:ring-(--dc-ring-color) focus-visible:ring-[3px] focus:ring-offset-1 ring-offset-(--dc-surface-color)"
              >
                <Icons.paperclip className="w-5 h-5" />
                <span>Attach</span>
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                ref={attachMenuRef}
                className="bg-(--dc-surface-color) rounded-lg shadow-lg border border-(--dc-border-color) w-48 z-10 py-1 outline-none"
                side="top"
                sideOffset={8}
                align="start"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file && onSendImage) {
                      onSendImage(file, text.trim() || undefined)
                      setText('')
                      setIsAttachMenuOpen(false)
                    }
                  }}
                />
                <input
                  type="file"
                  ref={documentFileInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file && onSendFile) {
                      onSendFile(file, text.trim() || undefined)
                      setText('')
                      setIsAttachMenuOpen(false)
                    }
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[rgb(var(--dc-secondary-bg))] flex items-center space-x-3 outline-none focus:outline-none focus-visible:ring-(--dc-ring-color) focus-visible:ring-[3px] focus:ring-offset-1 ring-offset-(--dc-surface-color)"
                >
                  <Icons.image className="w-5 h-5 text-(--dc-text-color-lightest)" />
                  <span>Photo</span>
                </button>
                <button
                  onClick={() => documentFileInputRef.current?.click()}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-(--dc-secondary-bg) flex items-center space-x-3 outline-none focus:outline-none focus-visible:ring-(--dc-ring-color) focus-visible:ring-[3px] focus:ring-offset-1 ring-offset-(--dc-surface-color)"
                >
                  <Icons.fileText className="w-5 h-5 text-(--dc-text-color-lightest)" />
                  <span>File</span>
                </button>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          <div className="flex-1 flex items-start bg-(--dc-secondary-bg) rounded-lg min-w-0 overflow-hidden">
            <Popover.Root
              open={isMentioning && filteredMentionUsers.length > 0}
              onOpenChange={(open) => {
                if (!open) {
                  setIsMentioning(false)
                }
              }}
            >
              <Popover.Anchor asChild>
                <div className="relative flex-1 min-h-12 max-h-32 p-2 overflow-y-auto min-w-0 max-w-full">
                  <div
                    aria-hidden="true"
                    className="text-base whitespace-pre-wrap invisible max-w-full"
                    style={{ width: '100%', maxWidth: '100%', wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                  >
                    {renderHighlightedText()}
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    placeholder={editingMessage ? 'Edit message...' : 'Message...'}
                    className="absolute inset-0 w-full h-full bg-transparent text-(--dc-text-color) text-base resize-none outline-none focus:outline-none focus-visible:ring-(--dc-ring-color) focus-visible:ring-[3px] focus:ring-offset-1 ring-offset-(--dc-secondary-bg) px-2 py-2 overflow-x-hidden overflow-y-auto rounded-lg"
                    style={{ maxWidth: '100%', wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                  />
                </div>
              </Popover.Anchor>
              <Popover.Portal>
                <Popover.Content
                  id="mention-popover"
                  className="bg-(--dc-surface-color) rounded-lg shadow-lg border border-(--dc-border-color) w-64 z-20 overflow-hidden outline-none"
                  side="top"
                  sideOffset={8}
                  align="start"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <ul ref={mentionListRef} className="max-h-60 overflow-y-auto">
                    {filteredMentionUsers.map((user, index) => (
                      <li key={user._id}>
                        <UserMentionItem
                          user={user}
                          isHighlighted={index === highlightedMentionIndex}
                          onSelect={() => handleMentionSelect(user)}
                          fetchAttachment={fetchAttachment}
                        />
                      </li>
                    ))}
                  </ul>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
            <button
              onClick={handleAction}
              disabled={!text.trim()}
              className="w-8 h-8 m-1 flex items-center justify-center rounded-full bg-(--dc-primary-color) text-(--dc-text-on-primary) disabled:bg-(--dc-disabled-bg) transition-colors flex-shrink-0 outline-none focus:outline-none focus-visible:ring-(--dc-ring-color) focus-visible:ring-[3px] focus:ring-offset-1 ring-offset-(--dc-secondary-bg)"
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
  )
}

export default MessageInput
