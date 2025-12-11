import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ChatView from '../ChatView'
import type { Chat } from '../../types'
import type {
  MessageWithUser,
  ChatStore,
} from '@dittolive/ditto-chat-core'
import type { MessageBubbleProps } from '../MessageBubble'
import type { MessageInputProps } from '../MessageInput'
import { EmojiClickData } from 'emoji-picker-react'
import type { Attachment } from '@dittolive/ditto'

// Mock dependencies
vi.mock('../MessageBubble', () => ({
  default: ({
    message,
    onStartEdit,
    onDeleteMessage,
    onAddReaction,
    onRemoveReaction,
  }: MessageBubbleProps) => (
    <div data-testid={`message-${message._id}`}>
      {message.text}
      <button onClick={() => onStartEdit(message)}>Edit</button>
      <button onClick={() => onDeleteMessage(message._id)}>Delete</button>
      <button
        onClick={() =>
          onAddReaction(message, {
            emoji: '👍',
            unified: '1f44d',
          } as EmojiClickData)
        }
      >
        Add Reaction
      </button>
      <button onClick={() => onRemoveReaction(message, 'user-1', '👍')}>
        Remove Reaction
      </button>
    </div>
  ),
}))

vi.mock('../MessageInput', () => ({
  default: ({
    onSendMessage,
    onSendImage,
    onSendFile,
    onCancelEdit,
    onSaveEdit,
  }: MessageInputProps) => (
    <div>
      <input data-testid="message-input" />
      <button onClick={() => onSendMessage('New message', [])}>Send</button>
      <button
        onClick={() => onSendImage?.({ name: 'image.png' } as File, 'caption')}
      >
        Send Image
      </button>
      <button
        onClick={() => onSendFile?.({ name: 'doc.pdf' } as File, 'caption')}
      >
        Send File
      </button>
      <button onClick={onCancelEdit}>Cancel Edit</button>
      <button onClick={() => onSaveEdit('Edited text', [])}>Save Edit</button>
    </div>
  ),
}))

vi.mock('../Icons', () => ({
  Icons: {
    arrowLeft: () => <div data-testid="icon-arrow-left" />,
    plus: () => <div data-testid="icon-plus" />,
    x: () => <div data-testid="icon-x" />,
  },
}))

vi.mock('../Avatar', () => ({
  default: () => <div data-testid="avatar" />,
}))

// Mock Ditto hooks
const mockUseDittoChatStore = vi.fn()

vi.mock('@dittolive/ditto-chat-core', () => ({
  useDittoChatStore: <T,>(selector: (state: ChatStore) => T) =>
    mockUseDittoChatStore(selector),
}))

// Mock usePermissions
import { usePermissions } from '../../utils/usePermissions'
vi.mock('../../utils/usePermissions', () => ({
  usePermissions: vi.fn(() => ({
    canCreateRoom: true,
    canPerformAction: vi.fn(),
    canEditOwnMessage: true,
    canDeleteOwnMessage: true,
    canAddReaction: true,
    canRemoveOwnReaction: true,
    canMentionUsers: true,
    canSubscribeToRoom: true,
  })),
}))

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn()

const mockChat: Chat = {
  id: 'room-1',
  name: 'General',
  type: 'group',
  participants: [],
  messages: [],
}

const mockMessages: MessageWithUser[] = [
  {
    id: 'msg-1',
    message: {
      _id: 'msg-1',
      roomId: 'room-1',
      text: 'Hello',
      createdOn: new Date().toISOString(),
      userId: 'user-1',
      isDeleted: false,
      isEdited: false,
      isArchived: false,
      reactions: [
        {
          emoji: '👍',
          userId: 'user-1',
          unified: '1f44d',
          unifiedWithoutSkinTone: '1f44d',
        },
      ],
    },
    user: {
      _id: 'user-1',
      name: 'Alice',
      subscriptions: {},
      mentions: {},
    },
  },
]

describe('ChatView', () => {
  const defaultProps = {
    chat: mockChat,
    onBack: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        messagesByRoom: { 'room-1': mockMessages },
        currentUser: { _id: 'user-1', subscriptions: {} },
        allUsers: [],
        createMessage: vi.fn().mockResolvedValue(undefined),
        createImageMessage: vi.fn(),
        createFileMessage: vi.fn(),
        fetchAttachment: vi.fn(),
        addReactionToMessage: vi.fn(),
        removeReactionFromMessage: vi.fn(),
        saveEditedTextMessage: vi.fn(),
        saveDeletedMessage: vi.fn(),
        markRoomAsRead: vi.fn().mockResolvedValue(undefined),
        toggleRoomSubscription: vi.fn().mockResolvedValue(undefined),
        rooms: [{ _id: 'room-1', name: 'General' }],
      }
      return selector(state as unknown as ChatStore)
    })
  })

  it('renders chat header and messages', () => {
    render(<ChatView {...defaultProps} />)
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('handles back button click', () => {
    render(<ChatView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('icon-arrow-left').parentElement!)
    expect(defaultProps.onBack).toHaveBeenCalled()
  })

  it('sends a new message', () => {
    const createMessageMock = vi.fn().mockResolvedValue(undefined)
    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        messagesByRoom: { 'room-1': mockMessages },
        currentUser: { _id: 'user-1' },
        allUsers: [],
        createMessage: createMessageMock,
        rooms: [{ _id: 'room-1', name: 'General' }],
        markRoomAsRead: vi.fn().mockResolvedValue(undefined),
      }
      return selector(state as unknown as ChatStore)
    })

    render(<ChatView {...defaultProps} />)
    fireEvent.click(screen.getByText('Send'))
    expect(createMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'room-1' }),
      'New message',
      [],
    )
  })

  it('handles message deletion', () => {
    const saveDeletedMessageMock = vi.fn()
    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        messagesByRoom: { 'room-1': mockMessages },
        currentUser: { _id: 'user-1' },
        allUsers: [],
        saveDeletedMessage: saveDeletedMessageMock,
        rooms: [{ _id: 'room-1', name: 'General' }],
        markRoomAsRead: vi.fn().mockResolvedValue(undefined),
      }
      return selector(state as unknown as ChatStore)
    })

    render(<ChatView {...defaultProps} />)
    fireEvent.click(screen.getByText('Delete'))
    expect(saveDeletedMessageMock).toHaveBeenCalled()
  })

  it('renders empty state when no messages', () => {
    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        messagesByRoom: { 'room-1': [] },
        currentUser: { _id: 'user-1' },
        allUsers: [],
        rooms: [{ _id: 'room-1', name: 'General' }],
        markRoomAsRead: vi.fn().mockResolvedValue(undefined),
      }
      return selector(state as unknown as ChatStore)
    })

    render(<ChatView {...defaultProps} />)
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.queryByText('Hello')).not.toBeInTheDocument()
  })

  it('scrolls to bottom on new message', () => {
    render(<ChatView {...defaultProps} />)
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
  })

  it('marks room as read on mount', () => {
    const markRoomAsReadMock = vi.fn().mockResolvedValue(undefined)
    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        messagesByRoom: { 'room-1': mockMessages },
        currentUser: { _id: 'user-1' },
        allUsers: [],
        rooms: [{ _id: 'room-1', name: 'General' }],
        markRoomAsRead: markRoomAsReadMock,
      }
      return selector(state as unknown as ChatStore)
    })

    render(<ChatView {...defaultProps} />)
    expect(markRoomAsReadMock).toHaveBeenCalledWith('room-1')
  })

  it('handles room subscription', async () => {
    const toggleRoomSubscriptionMock = vi.fn().mockResolvedValue(undefined)
    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        messagesByRoom: { 'room-1': mockMessages },
        currentUser: { _id: 'user-1', subscriptions: {} },
        allUsers: [],
        rooms: [{ _id: 'room-1', name: 'General' }],
        markRoomAsRead: vi.fn().mockResolvedValue(undefined),
        toggleRoomSubscription: toggleRoomSubscriptionMock,
      }
      return selector(state as unknown as ChatStore)
    })

    render(<ChatView {...defaultProps} />)

    const subscribeButton = screen.getByText('Subscribe')
    fireEvent.click(subscribeButton)

    expect(toggleRoomSubscriptionMock).toHaveBeenCalledWith('room-1')
  })

  it('shows subscribed state', () => {
    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        messagesByRoom: { 'room-1': mockMessages },
        currentUser: {
          _id: 'user-1',
          subscriptions: { 'room-1': '2023-01-01' },
        },
        allUsers: [],
        rooms: [{ _id: 'room-1', name: 'General' }],
        markRoomAsRead: vi.fn().mockResolvedValue(undefined),
      }
      return selector(state as unknown as ChatStore)
    })

    render(<ChatView {...defaultProps} />)
    expect(screen.getByText('Unsubscribe')).toBeInTheDocument()
  })

  it('sends image message', () => {
    const createImageMessageMock = vi.fn().mockResolvedValue(undefined)
    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        messagesByRoom: { 'room-1': mockMessages },
        currentUser: { _id: 'user-1' },
        allUsers: [],
        createImageMessage: createImageMessageMock,
        rooms: [{ _id: 'room-1', name: 'General' }],
        markRoomAsRead: vi.fn().mockResolvedValue(undefined),
      }
      return selector(state as unknown as ChatStore)
    })

    render(<ChatView {...defaultProps} />)
    fireEvent.click(screen.getByText('Send Image'))
    expect(createImageMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'room-1' }),
      expect.objectContaining({ name: 'image.png' }),
      'caption',
    )
  })

  it('sends file message', () => {
    const createFileMessageMock = vi.fn().mockResolvedValue(undefined)
    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        messagesByRoom: { 'room-1': mockMessages },
        currentUser: { _id: 'user-1' },
        allUsers: [],
        createFileMessage: createFileMessageMock,
        rooms: [{ _id: 'room-1', name: 'General' }],
        markRoomAsRead: vi.fn().mockResolvedValue(undefined),
      }
      return selector(state as unknown as ChatStore)
    })

    render(<ChatView {...defaultProps} />)
    fireEvent.click(screen.getByText('Send File'))
    expect(createFileMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'room-1' }),
      expect.objectContaining({ name: 'doc.pdf' }),
      'caption',
    )
  })

  it('handles message editing', async () => {
    const saveEditedTextMessageMock = vi.fn().mockResolvedValue(undefined)
    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        messagesByRoom: { 'room-1': mockMessages },
        currentUser: { _id: 'user-1' },
        allUsers: [],
        saveEditedTextMessage: saveEditedTextMessageMock,
        rooms: [{ _id: 'room-1', name: 'General' }],
        markRoomAsRead: vi.fn().mockResolvedValue(undefined),
      }
      return selector(state as unknown as ChatStore)
    })

    render(<ChatView {...defaultProps} />)

    // Start edit
    fireEvent.click(screen.getByText('Edit'))

    // Save edit
    fireEvent.click(screen.getByText('Save Edit'))

    expect(saveEditedTextMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'msg-1', text: 'Edited text' }),
      expect.objectContaining({ _id: 'room-1' }),
    )
  })

  it('handles adding reaction', () => {
    const addReactionToMessageMock = vi.fn().mockResolvedValue(undefined)
    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        messagesByRoom: { 'room-1': mockMessages },
        currentUser: { _id: 'user-1' },
        allUsers: [],
        addReactionToMessage: addReactionToMessageMock,
        rooms: [{ _id: 'room-1', name: 'General' }],
        markRoomAsRead: vi.fn().mockResolvedValue(undefined),
      }
      return selector(state as unknown as ChatStore)
    })

    render(<ChatView {...defaultProps} />)
    fireEvent.click(screen.getByText('Add Reaction'))

    expect(addReactionToMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'msg-1' }),
      expect.objectContaining({ _id: 'room-1' }),
      expect.objectContaining({ emoji: '👍' }),
    )
  })

  it('handles removing reaction', () => {
    const removeReactionFromMessageMock = vi.fn().mockResolvedValue(undefined)
    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        messagesByRoom: { 'room-1': mockMessages },
        currentUser: { _id: 'user-1' },
        allUsers: [],
        removeReactionFromMessage: removeReactionFromMessageMock,
        rooms: [{ _id: 'room-1', name: 'General' }],
        markRoomAsRead: vi.fn().mockResolvedValue(undefined),
      }
      return selector(state as unknown as ChatStore)
    })

    render(<ChatView {...defaultProps} />)
    fireEvent.click(screen.getByText('Remove Reaction'))

    expect(removeReactionFromMessageMock).toHaveBeenCalled()
  })

  it('handles file message deletion', () => {
    const saveDeletedMessageMock = vi.fn()
    const fileMessage: MessageWithUser = {
      id: 'msg-file',
      message: {
        _id: 'msg-file',
        roomId: 'room-1',
        text: 'File message',
        createdOn: new Date().toISOString(),
        userId: 'user-1',
        isDeleted: false,
        isEdited: false,
        isArchived: false,
        fileAttachmentToken: {
          id: 'file-token-123',
          len: 0,
          metadata: {},
          idBytes: new Uint8Array(),
          token: 'file-token-123',
        } as unknown as Attachment,
      },
      user: {
        _id: 'user-1',
        name: 'Alice',
        subscriptions: {},
        mentions: {},
      },
    }

    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        messagesByRoom: { 'room-1': [fileMessage] },
        currentUser: { _id: 'user-1' },
        allUsers: [],
        saveDeletedMessage: saveDeletedMessageMock,
        rooms: [{ _id: 'room-1', name: 'General' }],
        markRoomAsRead: vi.fn().mockResolvedValue(undefined),
      }
      return selector(state as unknown as ChatStore)
    })

    render(<ChatView {...defaultProps} />)
    fireEvent.click(screen.getByText('Delete'))

    expect(saveDeletedMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fileAttachmentToken: expect.objectContaining({ id: 'file-token-123' }),
      }),
      expect.objectContaining({ _id: 'room-1' }),
      'file',
    )
  })

  it('handles image message deletion', () => {
    const saveDeletedMessageMock = vi.fn()
    const imageMessage: MessageWithUser = {
      id: 'msg-image',
      message: {
        _id: 'msg-image',
        roomId: 'room-1',
        text: 'Image message',
        createdOn: new Date().toISOString(),
        userId: 'user-1',
        isDeleted: false,
        isEdited: false,
        isArchived: false,
        thumbnailImageToken: {
          id: 'thumb-token',
          len: 0,
          metadata: {},
          idBytes: new Uint8Array(),
          token: 'thumb-token',
        } as unknown as Attachment,
        largeImageToken: {
          id: 'large-token',
          len: 0,
          metadata: {},
          idBytes: new Uint8Array(),
          token: 'large-token',
        } as unknown as Attachment,
      },
      user: {
        _id: 'user-1',
        name: 'Alice',
        subscriptions: {},
        mentions: {},
      },
    }

    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        messagesByRoom: { 'room-1': [imageMessage] },
        currentUser: { _id: 'user-1' },
        allUsers: [],
        saveDeletedMessage: saveDeletedMessageMock,
        rooms: [{ _id: 'room-1', name: 'General' }],
        markRoomAsRead: vi.fn().mockResolvedValue(undefined),
      }
      return selector(state as unknown as ChatStore)
    })

    render(<ChatView {...defaultProps} />)
    fireEvent.click(screen.getByText('Delete'))

    expect(saveDeletedMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        thumbnailImageToken: expect.objectContaining({ id: 'thumb-token' }),
      }),
      expect.objectContaining({ _id: 'room-1' }),
      'image',
    )
  })

  it("displays DM chat with other user's name", () => {
    const dmChat: Chat = {
      id: 'dm-1',
      name: 'DM',
      type: 'dm',
      participants: [
        { _id: 'user-1', name: 'Alice', subscriptions: {}, mentions: {} },
        { _id: 'user-2', name: 'Bob', subscriptions: {}, mentions: {} },
      ],
      messages: [],
    }

    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        messagesByRoom: { 'dm-1': [] },
        currentUser: { _id: 'user-1', subscriptions: {} },
        allUsers: [
          { _id: 'user-1', name: 'Alice', subscriptions: {}, mentions: {} },
          { _id: 'user-2', name: 'Bob', subscriptions: {}, mentions: {} },
        ],
        rooms: [{ _id: 'dm-1', name: 'DM' }],
        markRoomAsRead: vi.fn().mockResolvedValue(undefined),
      }
      return selector(state as unknown as ChatStore)
    })

    render(<ChatView chat={dmChat} onBack={vi.fn()} />)

    // Should display the other user's name (Bob), not the current user (Alice)
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it("displays 'Unknown User' for DM when other user not found", () => {
    const dmChat: Chat = {
      id: 'dm-1',
      name: 'DM',
      type: 'dm',
      participants: [],
      messages: [],
    }

    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        messagesByRoom: { 'dm-1': [] },
        currentUser: { _id: 'user-1', subscriptions: {} },
        allUsers: [],
        rooms: [{ _id: 'dm-1', name: 'DM' }],
        markRoomAsRead: vi.fn().mockResolvedValue(undefined),
      }
      return selector(state as unknown as ChatStore)
    })

    render(<ChatView chat={dmChat} onBack={vi.fn()} />)

    expect(screen.getByText('Unknown User')).toBeInTheDocument()
  })

  it('handles cancel edit', () => {
    render(<ChatView {...defaultProps} />)

    // Start editing a message
    fireEvent.click(screen.getByText('Edit'))

    // Cancel the edit
    fireEvent.click(screen.getByText('Cancel Edit'))

    // The editing state should be cleared (we can't directly test state,
    // but the component should handle it without errors)
    expect(screen.getByTestId('message-input')).toBeInTheDocument()
  })

  it('handles save edit when no room exists', async () => {
    const saveEditedTextMessageMock = vi.fn()

    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        messagesByRoom: { 'chat-1': mockMessages },
        currentUser: { _id: 'user-1', subscriptions: {} },
        allUsers: [
          { _id: 'user-1', name: 'Alice', subscriptions: {}, mentions: {} },
        ],
        rooms: [], // No rooms
        markRoomAsRead: vi.fn().mockResolvedValue(undefined),
        saveEditedTextMessage: saveEditedTextMessageMock,
      }
      return selector(state as unknown as ChatStore)
    })

    render(<ChatView {...defaultProps} />)

    // Component should render without crashing even when room doesn't exist
    expect(screen.getByTestId('message-input')).toBeInTheDocument()
  })

  it('handles send message when no room exists', () => {
    const createMessageMock = vi.fn()

    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        messagesByRoom: { 'chat-1': [] },
        currentUser: { _id: 'user-1', subscriptions: {} },
        allUsers: [],
        rooms: [], // No rooms
        markRoomAsRead: vi.fn().mockResolvedValue(undefined),
        createMessage: createMessageMock,
      }
      return selector(state as unknown as ChatStore)
    })

    render(<ChatView {...defaultProps} />)

    // Try to send a message
    fireEvent.click(screen.getByText('Send'))

    // Should not call createMessage when room doesn't exist
    expect(createMessageMock).not.toHaveBeenCalled()
  })

  it('handles send image when no room exists', () => {
    const createImageMessageMock = vi.fn()

    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        messagesByRoom: { 'chat-1': [] },
        currentUser: { _id: 'user-1', subscriptions: {} },
        allUsers: [],
        rooms: [], // No rooms
        markRoomAsRead: vi.fn().mockResolvedValue(undefined),
        createImageMessage: createImageMessageMock,
      }
      return selector(state as unknown as ChatStore)
    })

    render(<ChatView {...defaultProps} />)

    // Try to send an image
    fireEvent.click(screen.getByText('Send Image'))

    // Should not call createImageMessage when room doesn't exist
    expect(createImageMessageMock).not.toHaveBeenCalled()
  })

  it('handles send file when no room exists', () => {
    const createFileMessageMock = vi.fn()

    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        messagesByRoom: { 'chat-1': [] },
        currentUser: { _id: 'user-1', subscriptions: {} },
        allUsers: [],
        rooms: [], // No rooms
        markRoomAsRead: vi.fn().mockResolvedValue(undefined),
        createFileMessage: createFileMessageMock,
      }
      return selector(state as unknown as ChatStore)
    })

    render(<ChatView {...defaultProps} />)

    // Try to send a file
    fireEvent.click(screen.getByText('Send File'))

    // Should not call createFileMessage when room doesn't exist
    expect(createFileMessageMock).not.toHaveBeenCalled()
  })

  it('handles subscribe button when subscribeToRoom is undefined', () => {
    const groupChat: Chat = {
      id: 'group-1',
      name: 'Group Chat',
      type: 'group',
      participants: [],
      messages: [],
    }

    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        messagesByRoom: { 'group-1': [] },
        currentUser: { _id: 'user-1', subscriptions: {} },
        allUsers: [],
        rooms: [{ _id: 'group-1', name: 'Group Chat' }],
        markRoomAsRead: vi.fn().mockResolvedValue(undefined),
        subscribeToRoom: undefined, // No subscribeToRoom function
      }
      return selector(state as unknown as ChatStore)
    })

    render(<ChatView chat={groupChat} onBack={vi.fn()} />)

    // Subscribe button should still render
    const subscribeButton = screen.getByText('Subscribe')
    fireEvent.click(subscribeButton)

    // Should not crash even though subscribeToRoom is undefined
    expect(screen.getByText('Subscribe')).toBeInTheDocument()
  })

  it('hides subscribe button when canSubscribeToRoom permission is false', () => {
    vi.mocked(usePermissions).mockReturnValue({
      canCreateRoom: true,
      canPerformAction: vi.fn(),
      canEditOwnMessage: true,
      canDeleteOwnMessage: true,
      canAddReaction: true,
      canRemoveOwnReaction: true,
      canMentionUsers: true,
      canSubscribeToRoom: false,
    })

    render(<ChatView {...defaultProps} />)

    expect(screen.queryByText('Subscribe')).not.toBeInTheDocument()
  })
})
