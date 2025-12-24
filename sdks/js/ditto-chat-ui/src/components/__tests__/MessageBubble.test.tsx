import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MessageBubble from '../MessageBubble'
import type { Message, ChatUser, Reaction } from '@dittolive/ditto-chat-core'
import type { Attachment } from '@dittolive/ditto'

vi.mock('../Icons', () => ({
  Icons: {
    fileText: () => <div data-testid="icon-file-text" />,
    arrowDown: () => <div data-testid="icon-arrow-down" />,
    edit3: () => <div data-testid="icon-edit" />,
    moreHorizontal: () => <div data-testid="icon-more" />,
  },
}))

vi.mock('../QuickReaction', () => ({
  default: () => <div data-testid="quick-reaction" />,
}))

vi.mock('../ui/Dialog', () => ({
  Root: ({ children, open }: any) =>
    open ? <div data-testid="dialog-root">{children}</div> : null,
  Trigger: ({ children }: any) => children,
  Portal: ({ children }: any) => children,
  Overlay: () => null,
  Content: ({ children }: any) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  Header: ({ children }: any) => <div>{children}</div>,
  Title: ({ children }: any) => <div>{children}</div>,
  Description: ({ children }: any) => <div>{children}</div>,
  Footer: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('../ui/DropdownMenu', () => {
  const DropdownContext = React.createContext({
    open: false,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setOpen: (_v: boolean) => {},
  })

  return {
    Root: ({ children, onOpenChange }: any) => {
      const [open, setOpen] = React.useState(false)
      const value = React.useMemo(
        () => ({
          open,
          setOpen: (v: boolean) => {
            setOpen(v)
            onOpenChange?.(v)
          },
        }),
        [open, onOpenChange],
      )
      return (
        <DropdownContext.Provider value={value}>
          {children}
        </DropdownContext.Provider>
      )
    },
    Trigger: ({ children }: any) => {
      const { open, setOpen } = React.useContext(DropdownContext)
      const child = React.Children.only(children)
      return React.cloneElement(child, {
        onClick: (e: any) => {
          if (child.props.disabled) {
            return
          }
          child.props.onClick?.(e)
          setOpen(!open)
        },
      })
    },
    Portal: ({ children }: any) => {
      const { open } = React.useContext(DropdownContext)
      return open ? <>{children}</> : null
    },
    Content: ({ children }: any) => (
      <div data-testid="dropdown-content">{children}</div>
    ),
    Item: ({ children, onSelect }: any) => {
      const { setOpen } = React.useContext(DropdownContext)
      return (
        <div
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
            setOpen(false)
          }}
          role="menuitem"
        >
          {children}
        </div>
      )
    },
  }
})

vi.mock('../../hooks/useImageAttachment')

// Mock dependencies - import after vi.mock to get the mocked version
import { useImageAttachment } from '../../hooks/useImageAttachment'
type UseImageAttachmentReturn = ReturnType<typeof useImageAttachment>
const mockUseImageAttachment = vi.mocked(useImageAttachment)

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

const mockMessage: Message = {
  _id: 'msg-1',
  roomId: 'room-1',
  text: 'Hello world',
  createdOn: new Date().toISOString(),
  isDeleted: false,
  isEdited: false,
  userId: 'user-1',
  mentions: [],
  reactions: [],
  isArchived: false,
}

const mockUser: ChatUser = {
  _id: 'user-1',
  name: 'Alice',
  subscriptions: {},
  mentions: {},
}

describe('MessageBubble', () => {
  const defaultProps = {
    message: mockMessage,
    sender: mockUser,
    currentUserId: 'user-2',
    isOwnMessage: false,
    isGroupChat: false,
    showSenderInfo: true,
    onStartEdit: vi.fn(),
    onDeleteMessage: vi.fn(),
    onAddReaction: vi.fn(),
    onRemoveReaction: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseImageAttachment.mockReturnValue({
      imageUrl: null,
      progress: 0,
      isLoading: false,
      error: null,
      fetchImage: vi.fn(),
    })
  })

  it('renders text message correctly', () => {
    render(<MessageBubble {...defaultProps} />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('renders own message correctly', () => {
    render(
      <MessageBubble
        {...defaultProps}
        isOwnMessage={true}
        currentUserId="user-1"
      />,
    )
    expect(screen.getByText('Hello world')).toBeInTheDocument()
    expect(screen.queryByText('Alice')).not.toBeInTheDocument() // Should not show name for own message
  })

  it('shows edited status', () => {
    const editedMessage = { ...mockMessage, isEdited: true }
    render(<MessageBubble {...defaultProps} message={editedMessage} />)
    expect(screen.getByText('(edited)')).toBeInTheDocument()
  })

  it('shows deleted message placeholder', () => {
    const deletedMessage = { ...mockMessage, isDeleted: true }
    render(<MessageBubble {...defaultProps} message={deletedMessage} />)
    expect(screen.getByText('[deleted message]')).toBeInTheDocument()
  })

  it('handles actions for own message', () => {
    render(
      <MessageBubble
        {...defaultProps}
        isOwnMessage={true}
        currentUserId="user-1"
      />,
    )

    const editButton = screen.getByLabelText('Edit message')
    fireEvent.click(editButton)
    expect(defaultProps.onStartEdit).toHaveBeenCalledWith(mockMessage)
  })
  it('handles reaction addition', () => {
    render(<MessageBubble {...defaultProps} />)

    const reactionButton = screen.getByTestId('quick-reaction')
    expect(reactionButton).toBeInTheDocument()
  })

  it('handles message deletion confirmation', async () => {
    render(
      <MessageBubble
        {...defaultProps}
        isOwnMessage={true}
        currentUserId="user-1"
      />,
    )

    // Open menu first
    const moreButton = screen.getByLabelText('More options')
    fireEvent.click(moreButton)

    const deleteMenuItem = screen.getByText('Delete message')
    fireEvent.click(deleteMenuItem)

    // Now dialog should be open
    expect(screen.getByTestId('dialog-root')).toBeInTheDocument()

    const confirmDeleteButton = screen.getByRole('button', { name: 'Delete' })
    fireEvent.click(confirmDeleteButton)

    expect(defaultProps.onDeleteMessage).toHaveBeenCalledWith(mockMessage._id)
  })

  it('cancels message deletion', () => {
    render(
      <MessageBubble
        {...defaultProps}
        isOwnMessage={true}
        currentUserId="user-1"
      />,
    )

    // Open menu first
    const moreButton = screen.getByLabelText('More options')
    fireEvent.click(moreButton)

    const deleteMenuItem = screen.getByText('Delete message')
    fireEvent.click(deleteMenuItem)

    // Now dialog should be open
    expect(screen.getByTestId('dialog-root')).toBeInTheDocument()

    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelButton)

    expect(defaultProps.onDeleteMessage).not.toHaveBeenCalled()
    expect(screen.queryByTestId('dialog-root')).not.toBeInTheDocument()
  })

  it('renders mentions correctly', () => {
    const mentionMessage = {
      ...mockMessage,
      text: 'Hello @Alice',
      mentions: [
        {
          startIndex: 6,
          endIndex: 12,
          userId: 'user-1',
        },
      ],
    }
    render(<MessageBubble {...defaultProps} message={mentionMessage} />)
    expect(screen.getByText(/Hello/)).toBeInTheDocument()
    const mention = screen.getByText('@Alice')
    expect(mention).toBeInTheDocument()
    expect(mention.tagName).toBe('SPAN')
    expect(mention.className).toContain('font-semibold')
  })

  it('renders image attachment', () => {
    const imageMessage: Message = {
      ...mockMessage,
      thumbnailImageToken: {
        id: 'token-1',
        len: 0,
        metadata: {},
      } as unknown as Attachment,
    }

    render(<MessageBubble {...defaultProps} message={imageMessage} />)
    expect(screen.getByText(/Preparing image/)).toBeInTheDocument()
  })

  it('renders loaded image', () => {
    mockUseImageAttachment.mockReturnValue({
      imageUrl: 'blob:http://localhost/image',
      progress: 1,
      isLoading: false,
      error: null,
      fetchImage: vi.fn(),
    })

    const imageMessage: Message = {
      ...mockMessage,
      thumbnailImageToken: {
        id: 'token-1',
        len: 0,
        metadata: {},
      } as unknown as Attachment,
    }

    render(<MessageBubble {...defaultProps} message={imageMessage} />)
    const img = screen.getByAltText('Message attachment')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'blob:http://localhost/image')
  })

  it('renders file attachment', () => {
    const fileMessage: Message = {
      ...mockMessage,
      fileAttachmentToken: {
        id: 'token-2',
        len: 0,
        metadata: {},
      } as unknown as Attachment,
      text: 'document.pdf',
    }

    render(<MessageBubble {...defaultProps} message={fileMessage} />)
    expect(screen.getByText('document.pdf')).toBeInTheDocument()
    expect(screen.getByTestId('icon-file-text')).toBeInTheDocument()
  })

  it('handles file download', () => {
    const fileMessage: Message = {
      ...mockMessage,
      fileAttachmentToken: {
        id: 'token-2',
        len: 0,
        metadata: {},
      } as unknown as Attachment,
      text: 'document.pdf',
    }

    const fetchAttachmentMock = vi.fn()

    // Mock fetch for download
    global.fetch = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['content'])),
    })
    global.URL.createObjectURL = vi.fn(() => 'blob:url')

    render(
      <MessageBubble
        {...defaultProps}
        message={fileMessage}
        fetchAttachment={fetchAttachmentMock}
      />,
    )

    const downloadButton = screen.getByLabelText('Download file')
    fireEvent.click(downloadButton)

    expect(fetchAttachmentMock).toHaveBeenCalled()
  })

  it('handles reaction removal', () => {
    const reactionMessage: Message = {
      ...mockMessage,
      reactions: [
        {
          emoji: '👍',
          userId: 'user-2', // Current user reaction
        } as Reaction,
      ],
    }

    render(<MessageBubble {...defaultProps} message={reactionMessage} />)

    // Find button containing the emoji
    const reactionButton = screen.getByRole('button', { name: /👍/ })
    fireEvent.click(reactionButton)

    expect(defaultProps.onRemoveReaction).toHaveBeenCalledWith(
      reactionMessage,
      'user-2',
      '👍',
    )
  })

  it("does not show edit/delete options for other users' messages", () => {
    render(
      <MessageBubble
        {...defaultProps}
        isOwnMessage={false}
        currentUserId="user-2"
      />,
    )

    expect(screen.queryByLabelText('More options')).not.toBeInTheDocument()
  })
  it('handles thumbnail click to show large image', () => {
    const fetchLargeImageMock = vi.fn()

    mockUseImageAttachment.mockImplementation(
      (
        config?: Parameters<typeof useImageAttachment>[0],
      ): UseImageAttachmentReturn => {
        if (config?.token?.id === 'token-1') {
          return {
            imageUrl: 'thumbnail-url',
            progress: 1,
            isLoading: false,
            error: null,
            fetchImage: vi.fn(),
          }
        }
        if (config?.token?.id === 'token-large') {
          return {
            imageUrl: null,
            progress: 0,
            isLoading: false,
            error: null,
            fetchImage: fetchLargeImageMock,
          }
        }
        return {
          imageUrl: null,
          progress: 0,
          isLoading: false,
          error: null,
          fetchImage: vi.fn(),
        }
      },
    )

    const imageMessage: Message = {
      ...mockMessage,
      thumbnailImageToken: {
        id: 'token-1',
        len: 0,
        metadata: {},
      } as unknown as Attachment,
      largeImageToken: {
        id: 'token-large',
        len: 0,
        metadata: {},
      } as unknown as Attachment,
    }

    render(<MessageBubble {...defaultProps} message={imageMessage} />)

    const img = screen.getByAltText('Message attachment')
    fireEvent.click(img)

    expect(fetchLargeImageMock).toHaveBeenCalled()
  })

  it('closes large image on close button click', () => {
    mockUseImageAttachment.mockReturnValue({
      imageUrl: 'large-url',
      progress: 1,
      isLoading: false,
      error: null,
      fetchImage: vi.fn(),
    })

    const imageMessage: Message = {
      ...mockMessage,
      thumbnailImageToken: {
        id: 'token-1',
        len: 0,
        metadata: {},
      } as unknown as Attachment,
      largeImageToken: {
        id: 'token-large',
        len: 0,
        metadata: {},
      } as unknown as Attachment,
    }

    render(<MessageBubble {...defaultProps} message={imageMessage} />)

    const img = screen.getByAltText('Message attachment')
    fireEvent.click(img)

    expect(screen.getByAltText('Large view')).toBeInTheDocument()

    const closeButton = screen.getByText('✕')
    fireEvent.click(closeButton)

    expect(screen.queryByAltText('Large view')).not.toBeInTheDocument()
  })

  it('groups reactions correctly', () => {
    const reactionMessage: Message = {
      ...mockMessage,
      reactions: [
        { emoji: '👍', userId: 'user-1' } as Reaction,
        { emoji: '👍', userId: 'user-3' } as Reaction,
        { emoji: '❤️', userId: 'user-2' } as Reaction,
      ],
    }

    render(<MessageBubble {...defaultProps} message={reactionMessage} />)

    const thumbsUp = screen.getByText('2') // Count for 👍
    expect(thumbsUp).toBeInTheDocument()

    const heart = screen.getByText('1') // Count for ❤️
    expect(heart).toBeInTheDocument()
  })

  it('prevents duplicate reaction by same user', () => {
    const reactionMessage: Message = {
      ...mockMessage,
      reactions: [
        { emoji: '👍', userId: 'user-2' } as Reaction, // Current user already reacted
      ],
    }

    render(<MessageBubble {...defaultProps} message={reactionMessage} />)

    const reactionButton = screen.getByRole('button', { name: /👍/ })
    expect(reactionButton).toHaveClass('bg-(--dc-primary-color-lighter)')
  })

  it('shows error state for image load failure', () => {
    mockUseImageAttachment.mockImplementation((): UseImageAttachmentReturn => {
      return {
        imageUrl: null,
        progress: 0,
        isLoading: false,
        error: 'Failed to load',
        fetchImage: vi.fn(),
      }
    })

    const imageMessage: Message = {
      ...mockMessage,
      thumbnailImageToken: {
        id: 'token-1',
        len: 0,
        metadata: {},
      } as unknown as Attachment,
    }

    render(<MessageBubble {...defaultProps} message={imageMessage} />)
    expect(screen.getByText('Failed to load')).toBeInTheDocument()
  })

  it('shows loading state for large image', () => {
    mockUseImageAttachment.mockImplementation(
      (
        config?: Parameters<typeof useImageAttachment>[0],
      ): UseImageAttachmentReturn => {
        if (config?.token?.id === 'token-large') {
          return {
            imageUrl: null,
            progress: 0.5,
            isLoading: true,
            error: null,
            fetchImage: vi.fn(),
          }
        }
        return {
          imageUrl: 'thumb',
          progress: 1,
          isLoading: false,
          error: null,
          fetchImage: vi.fn(),
        }
      },
    )

    const imageMessage: Message = {
      ...mockMessage,
      thumbnailImageToken: {
        id: 'token-1',
        len: 0,
        metadata: {},
      } as unknown as Attachment,
      largeImageToken: {
        id: 'token-large',
        len: 0,
        metadata: {},
      } as unknown as Attachment,
    }

    render(<MessageBubble {...defaultProps} message={imageMessage} />)

    // Open large image
    fireEvent.click(screen.getByAltText('Message attachment'))

    expect(screen.getByText('Loading full image…')).toBeInTheDocument()
    expect(screen.getAllByText('50%')).toHaveLength(2)
  })

  it('stops propagation on large image click', () => {
    mockUseImageAttachment.mockReturnValue({
      imageUrl: 'large-url',
      progress: 1,
      isLoading: false,
      error: null,
      fetchImage: vi.fn(),
    })

    const imageMessage: Message = {
      ...mockMessage,
      thumbnailImageToken: {
        id: 'token-1',
        len: 0,
        metadata: {},
      } as unknown as Attachment,
      largeImageToken: {
        id: 'token-large',
        len: 0,
        metadata: {},
      } as unknown as Attachment,
    }

    render(
      <div>
        <MessageBubble {...defaultProps} message={imageMessage} />
      </div>,
    )

    // Open large image
    fireEvent.click(screen.getByAltText('Message attachment'))

    const largeImg = screen.getByAltText('Large view')
    fireEvent.click(largeImg)
  })

  it('does not show edit option for deleted message', () => {
    const deletedMessage = { ...mockMessage, isDeleted: true }
    render(
      <MessageBubble
        {...defaultProps}
        message={deletedMessage}
        isOwnMessage={true}
        currentUserId="user-1"
      />,
    )

    const moreButton = screen.getByLabelText('More options')
    expect(moreButton).toBeDisabled()

    // Menu should not be accessible since button is disabled
    fireEvent.click(moreButton)
    expect(screen.queryByText('Delete message')).not.toBeInTheDocument()
  })

  it('shows thumbnail progress', () => {
    mockUseImageAttachment.mockReturnValue({
      imageUrl: null,
      progress: 0.45,
      isLoading: true,
      error: null,
      fetchImage: vi.fn(),
    })

    const imageMessage: Message = {
      ...mockMessage,
      thumbnailImageToken: {
        id: 'token-1',
        len: 0,
        metadata: {},
      } as unknown as Attachment,
    }

    render(<MessageBubble {...defaultProps} message={imageMessage} />)
    expect(screen.getByText('45%')).toBeInTheDocument()
  })

  it('shows deleted file placeholder', () => {
    const deletedFileMessage: Message = {
      ...mockMessage,
      text: 'file.pdf',
      fileAttachmentToken: {
        id: 'file-token',
        len: 0,
        metadata: {},
      } as unknown as Attachment,
      isDeleted: true,
    }

    render(<MessageBubble {...defaultProps} message={deletedFileMessage} />)
    expect(screen.getByText('[deleted file]')).toBeInTheDocument()
  })

  it('handles file download success', () => {
    const fetchAttachmentMock = vi
      .fn()
      .mockImplementation((token, onProgress, onComplete) => {
        onComplete({ success: true, data: new Uint8Array([1, 2, 3]) })
      })

    const fileMessage: Message = {
      ...mockMessage,
      text: 'test.pdf',
      fileAttachmentToken: {
        id: 'file-token',
        len: 0,
        metadata: {},
      } as unknown as Attachment,
    }

    // Mock URL.createObjectURL and URL.revokeObjectURL
    const createObjectURLMock = vi.fn().mockReturnValue('blob:url')
    const revokeObjectURLMock = vi.fn()
    global.URL.createObjectURL = createObjectURLMock
    global.URL.revokeObjectURL = revokeObjectURLMock

    const clickMock = vi.fn()
    const mockAnchor = document.createElement('a')
    mockAnchor.click = clickMock

    const originalCreateElement = document.createElement.bind(document)
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation(
        (tagName: string, options?: ElementCreationOptions) => {
          if (tagName === 'a') {
            return mockAnchor
          }
          return originalCreateElement(tagName, options)
        },
      )

    render(
      <MessageBubble
        {...defaultProps}
        message={fileMessage}
        fetchAttachment={fetchAttachmentMock}
      />,
    )

    fireEvent.click(screen.getByLabelText('Download file'))

    expect(fetchAttachmentMock).toHaveBeenCalled()
    expect(createObjectURLMock).toHaveBeenCalled()
    expect(createElementSpy).toHaveBeenCalledWith('a')
    expect(clickMock).toHaveBeenCalled()
    expect(revokeObjectURLMock).toHaveBeenCalled()

    // Cleanup mocks
    createElementSpy.mockRestore()
    createObjectURLMock.mockRestore()
    revokeObjectURLMock.mockRestore()
  })

  it('handles edit from menu', () => {
    const onStartEditMock = vi.fn()
    render(
      <MessageBubble
        {...defaultProps}
        message={mockMessage}
        isOwnMessage={true}
        onStartEdit={onStartEditMock}
      />,
    )

    // Open menu
    fireEvent.click(screen.getByLabelText('More options'))

    // Click edit
    fireEvent.click(screen.getByText('Edit message'))

    expect(onStartEditMock).toHaveBeenCalledWith(mockMessage)
  })

  it('hides actions on mouse leave for own message', () => {
    const { container } = render(
      <MessageBubble
        {...defaultProps}
        message={mockMessage}
        isOwnMessage={true}
        currentUserId="user-1"
      />,
    )

    const messageContainer = container.firstChild as HTMLElement

    // Trigger mouse enter to show actions
    fireEvent.mouseEnter(messageContainer)

    // Actions should be visible
    const editButton = screen.getByLabelText('Edit message')
    expect(editButton.parentElement?.className).toContain('opacity-100')

    // Trigger mouse leave to hide actions
    fireEvent.mouseLeave(messageContainer)

    // Actions should be hidden
    expect(editButton.parentElement?.className).toContain('opacity-0')
  })

  it('hides edit option when canEditOwnMessage permission is false', () => {
    vi.mocked(usePermissions).mockReturnValue({
      canCreateRoom: true,
      canPerformAction: vi.fn(),
      canEditOwnMessage: false,
      canDeleteOwnMessage: true,
      canAddReaction: true,
      canRemoveOwnReaction: true,
      canMentionUsers: true,
      canSubscribeToRoom: true,
    })

    render(
      <MessageBubble
        {...defaultProps}
        message={mockMessage}
        isOwnMessage={true}
      />,
    )

    // Edit button (pencil) should be missing
    expect(screen.queryByLabelText('Edit message')).not.toBeInTheDocument()

    // Open menu
    fireEvent.click(screen.getByLabelText('More options'))

    // Edit menu item should be missing
    expect(screen.queryByText('Edit message')).not.toBeInTheDocument()
  })

  it('hides delete option when canDeleteOwnMessage permission is false', () => {
    vi.mocked(usePermissions).mockReturnValue({
      canCreateRoom: true,
      canPerformAction: vi.fn(),
      canEditOwnMessage: true,
      canDeleteOwnMessage: false,
      canAddReaction: true,
      canRemoveOwnReaction: true,
      canMentionUsers: true,
      canSubscribeToRoom: true,
    })

    render(
      <MessageBubble
        {...defaultProps}
        message={mockMessage}
        isOwnMessage={true}
      />,
    )

    // Open menu
    fireEvent.click(screen.getByLabelText('More options'))

    expect(screen.queryByText('Delete message')).not.toBeInTheDocument()
  })

  it('hides more options button when both edit and delete permissions are false', () => {
    vi.mocked(usePermissions).mockReturnValue({
      canCreateRoom: true,
      canPerformAction: vi.fn(),
      canEditOwnMessage: false,
      canDeleteOwnMessage: false,
      canAddReaction: true,
      canRemoveOwnReaction: true,
      canMentionUsers: true,
      canSubscribeToRoom: true,
    })

    render(
      <MessageBubble
        {...defaultProps}
        message={mockMessage}
        isOwnMessage={true}
      />,
    )

    expect(screen.queryByLabelText('More options')).not.toBeInTheDocument()
  })

  it('hides reaction button when canAddReaction permission is false', () => {
    vi.mocked(usePermissions).mockReturnValue({
      canCreateRoom: true,
      canPerformAction: vi.fn(),
      canEditOwnMessage: true,
      canDeleteOwnMessage: true,
      canAddReaction: false,
      canRemoveOwnReaction: true,
      canMentionUsers: true,
      canSubscribeToRoom: true,
    })

    render(<MessageBubble {...defaultProps} />)

    expect(screen.queryByTestId('quick-reaction')).not.toBeInTheDocument()
  })

  it('disables reaction removal when canRemoveOwnReaction permission is false', () => {
    vi.mocked(usePermissions).mockReturnValue({
      canCreateRoom: true,
      canPerformAction: vi.fn(),
      canEditOwnMessage: true,
      canDeleteOwnMessage: true,
      canAddReaction: true,
      canRemoveOwnReaction: false,
      canMentionUsers: true,
      canSubscribeToRoom: true,
    })

    const reactionMessage: Message = {
      ...mockMessage,
      reactions: [
        {
          emoji: '👍',
          userId: 'user-2', // Current user reaction
        } as Reaction,
      ],
    }

    render(<MessageBubble {...defaultProps} message={reactionMessage} />)

    // Find button containing the emoji
    const reactionButton = screen.getByRole('button', { name: /👍/ })

    // It should be disabled or click shouldn't trigger removal
    // Note: The implementation might just disable the click handler or the button itself
    // Let's check if the click handler is called
    fireEvent.click(reactionButton)

    expect(defaultProps.onRemoveReaction).not.toHaveBeenCalled()
  })
})
