import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MessageInput from '../MessageInput'
import type { ChatStore, Message } from '@dittolive/ditto-chat-core'

// Mock dependencies
vi.mock('../Icons', () => ({
  Icons: {
    paperclip: () => <div data-testid="icon-paperclip" />,
    arrowUp: () => <div data-testid="icon-arrow-up" />,
    check: () => <div data-testid="icon-check" />,
    x: () => <div data-testid="icon-x" />,
    image: () => <div data-testid="icon-image" />,
    fileText: () => <div data-testid="icon-file-text" />,
  },
}))

vi.mock('../Avatar', () => ({
  default: () => <div data-testid="avatar" />,
}))

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

describe('MessageInput', () => {
  const defaultProps = {
    onSendMessage: vi.fn(),
    onSendImage: vi.fn(),
    onSendFile: vi.fn(),
    editingMessage: null,
    onCancelEdit: vi.fn(),
    onSaveEdit: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = { allUsers: [] }
      return selector(state as unknown as ChatStore)
    })
  })

  it('renders input field', () => {
    render(<MessageInput {...defaultProps} />)
    expect(screen.getByPlaceholderText('Message...')).toBeInTheDocument()
  })

  it('updates text on change', () => {
    render(<MessageInput {...defaultProps} />)
    const input = screen.getByPlaceholderText('Message...')
    fireEvent.change(input, { target: { value: 'Hello' } })
    expect(input).toHaveValue('Hello')
  })

  it('calls onSendMessage on send button click', () => {
    render(<MessageInput {...defaultProps} />)
    const input = screen.getByPlaceholderText('Message...')
    fireEvent.change(input, { target: { value: 'Hello' } })

    const sendButton = screen.getByTestId('icon-arrow-up').parentElement!
    fireEvent.click(sendButton)

    expect(defaultProps.onSendMessage).toHaveBeenCalledWith('Hello', [])
    expect(input).toHaveValue('')
  })

  it('calls onSendMessage on Enter (Ctrl/Cmd + Enter)', () => {
    render(<MessageInput {...defaultProps} />)
    const input = screen.getByPlaceholderText('Message...')
    fireEvent.change(input, { target: { value: 'Hello' } })

    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true })

    expect(defaultProps.onSendMessage).toHaveBeenCalledWith('Hello', [])
  })

  it('toggles attachment menu', () => {
    render(<MessageInput {...defaultProps} />)
    const attachButton = screen.getByTestId('icon-paperclip').parentElement!

    fireEvent.click(attachButton)
    expect(screen.getByText('Photo')).toBeInTheDocument()

    fireEvent.click(attachButton)
    expect(screen.queryByText('Photo')).not.toBeInTheDocument()
  })

  it('populates input when editing message', () => {
    const editingMessage: Message = {
      _id: 'msg-1',
      roomId: 'room-1',
      text: 'Editing this',
      createdOn: new Date().toISOString(),
      userId: 'user-1',
      isArchived: false,
      mentions: [],
    }

    render(<MessageInput {...defaultProps} editingMessage={editingMessage} />)
    expect(screen.getByPlaceholderText('Edit message...')).toHaveValue(
      'Editing this',
    )
    expect(screen.getByText('Edit Message')).toBeInTheDocument()
  })

  it('calls onSaveEdit when editing', () => {
    const editingMessage: Message = {
      _id: 'msg-1',
      roomId: 'room-1',
      text: 'Old text',
      createdOn: new Date().toISOString(),
      userId: 'user-1',
      isArchived: false,
      mentions: [],
    }

    render(<MessageInput {...defaultProps} editingMessage={editingMessage} />)
    const input = screen.getByPlaceholderText('Edit message...')
    fireEvent.change(input, { target: { value: 'New text' } })

    const saveButton = screen.getByTestId('icon-check').parentElement!
    fireEvent.click(saveButton)

    expect(defaultProps.onSaveEdit).toHaveBeenCalledWith('New text', [])
  })

  it('calls onCancelEdit', () => {
    const editingMessage: Message = {
      _id: 'msg-1',
      roomId: 'room-1',
      text: 'Old text',
      createdOn: new Date().toISOString(),
      userId: 'user-1',
      isArchived: false,
    }

    render(<MessageInput {...defaultProps} editingMessage={editingMessage} />)
    const cancelButton = screen.getByTestId('icon-x').parentElement!
    fireEvent.click(cancelButton)

    expect(defaultProps.onCancelEdit).toHaveBeenCalled()
  })
  it('shows mentions popup when typing @', () => {
    const mockUsers = [{ _id: 'user-2', name: 'Bob' }]
    mockUseDittoChatStore.mockImplementation((selector) =>
      selector({ allUsers: mockUsers } as unknown as ChatStore),
    )

    render(<MessageInput {...defaultProps} />)
    const input = screen.getByPlaceholderText('Message...')
    fireEvent.change(input, { target: { value: '@' } })

    expect(screen.getByText('Bob')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Bob'))
    expect(input).toHaveValue('@Bob ')
  })

  it('calls onSendImage when image is selected', async () => {
    const { container } = render(<MessageInput {...defaultProps} />)
    const attachButton = screen.getByTestId('icon-paperclip').parentElement!
    fireEvent.click(attachButton)

    const inputs = container.querySelectorAll('input[type="file"]')
    const imageInput = inputs[0] // First input is for images

    const file = new File(['image'], 'image.png', { type: 'image/png' })

    fireEvent.change(imageInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(defaultProps.onSendImage).toHaveBeenCalled()
    })
  })

  it('navigates mentions with keyboard', () => {
    const mockUsers = [
      { _id: 'user-2', name: 'Alice' },
      { _id: 'user-3', name: 'Bob' },
    ]
    mockUseDittoChatStore.mockImplementation((selector) =>
      selector({ allUsers: mockUsers } as unknown as ChatStore),
    )

    render(<MessageInput {...defaultProps} />)
    const input = screen.getByPlaceholderText('Message...')

    // Open mentions
    fireEvent.change(input, { target: { value: '@' } })
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()

    // Navigate down
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    // Navigate up (wrap around)
    fireEvent.keyDown(input, { key: 'ArrowUp' })

    // Select Alice
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(input).toHaveValue('@Alice ')
  })

  it('filters mentions based on input', () => {
    const mockUsers = [
      { _id: 'user-2', name: 'Alice' },
      { _id: 'user-3', name: 'Bob' },
    ]
    mockUseDittoChatStore.mockImplementation((selector) =>
      selector({ allUsers: mockUsers } as unknown as ChatStore),
    )

    render(<MessageInput {...defaultProps} />)
    const input = screen.getByPlaceholderText('Message...')

    fireEvent.change(input, { target: { value: '@Bo' } })
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('closes mention popover on Escape', () => {
    const mockUsers = [{ _id: 'user-2', name: 'Alice' }]
    mockUseDittoChatStore.mockImplementation((selector) =>
      selector({ allUsers: mockUsers } as unknown as ChatStore),
    )

    render(<MessageInput {...defaultProps} />)
    const input = screen.getByPlaceholderText('Message...')

    fireEvent.change(input, { target: { value: '@' } })
    expect(screen.getByText('Alice')).toBeInTheDocument()

    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
  })

  it('updates mention positions when editing text', () => {
    const mockUsers = [{ _id: 'user-2', name: 'Alice' }]
    mockUseDittoChatStore.mockImplementation((selector) =>
      selector({ allUsers: mockUsers } as unknown as ChatStore),
    )

    render(<MessageInput {...defaultProps} />)
    const input = screen.getByPlaceholderText('Message...')

    // Create mention
    fireEvent.change(input, { target: { value: '@' } })
    fireEvent.click(screen.getByText('Alice'))
    expect(input).toHaveValue('@Alice ')

    // Add text before mention
    fireEvent.change(input, { target: { value: 'Hello @Alice ' } })

    // Verify mention is still valid by sending
    const sendButton = screen.getByTestId('icon-arrow-up').parentElement!
    fireEvent.click(sendButton)

    expect(defaultProps.onSendMessage).toHaveBeenCalledWith(
      'Hello @Alice ',
      expect.arrayContaining([
        expect.objectContaining({
          userId: 'user-2',
          startIndex: 6, // "Hello " is 6 chars
        }),
      ]),
    )
  })

  it('removes damaged mentions', () => {
    const mockUsers = [{ _id: 'user-2', name: 'Alice' }]
    mockUseDittoChatStore.mockImplementation((selector) =>
      selector({ allUsers: mockUsers } as unknown as ChatStore),
    )

    render(<MessageInput {...defaultProps} />)
    const input = screen.getByPlaceholderText('Message...')

    // Create mention
    fireEvent.change(input, { target: { value: '@' } })
    fireEvent.click(screen.getByText('Alice'))

    // Damage mention (remove last char)
    fireEvent.change(input, { target: { value: '@Alic ' } })

    // Verify mention is removed
    const sendButton = screen.getByTestId('icon-arrow-up').parentElement!
    fireEvent.click(sendButton)

    expect(defaultProps.onSendMessage).toHaveBeenCalledWith(
      '@Alic ',
      [], // No mentions
    )
  })

  it('closes menus on outside click', () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <MessageInput {...defaultProps} />
      </div>,
    )

    const attachButton = screen.getByTestId('icon-paperclip').parentElement!
    fireEvent.click(attachButton)
    expect(screen.getByText('Photo')).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByText('Photo')).not.toBeInTheDocument()
  })

  it('disables mentions when canMentionUsers permission is false', () => {
    vi.mocked(usePermissions).mockReturnValue({
      canCreateRoom: true,
      canPerformAction: vi.fn(),
      canEditOwnMessage: true,
      canDeleteOwnMessage: true,
      canAddReaction: true,
      canRemoveOwnReaction: true,
      canMentionUsers: false,
      canSubscribeToRoom: true,
    })

    const mockUsers = [{ _id: 'user-2', name: 'Bob' }]
    mockUseDittoChatStore.mockImplementation((selector) =>
      selector({ allUsers: mockUsers } as unknown as ChatStore),
    )

    render(<MessageInput {...defaultProps} />)
    const input = screen.getByPlaceholderText('Message...')
    fireEvent.change(input, { target: { value: '@' } })

    // Should not show user list
    expect(screen.queryByText('Bob')).not.toBeInTheDocument()
  })
})
