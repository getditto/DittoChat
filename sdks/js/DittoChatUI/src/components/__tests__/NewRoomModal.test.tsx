import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import NewRoomModal from '../NewRoomModal'

// Mock Icons
vi.mock('../Icons', () => ({
  Icons: {
    x: () => <div data-testid="icon-x" />,
  },
}))

describe('NewRoomModal', () => {
  const defaultProps = {
    onClose: vi.fn(),
    onCreateRoom: vi.fn(),
  }

  it('renders modal with input field', () => {
    render(<NewRoomModal {...defaultProps} />)

    expect(screen.getByText('Create New Room')).toBeInTheDocument()
    expect(screen.getByLabelText('Room Name')).toBeInTheDocument()
    expect(screen.getByText('Create Room')).toBeDisabled()
  })

  it('enables create button when room name is entered', () => {
    render(<NewRoomModal {...defaultProps} />)

    const input = screen.getByLabelText('Room Name')
    fireEvent.change(input, { target: { value: 'New Project' } })

    expect(screen.getByText('Create Room')).not.toBeDisabled()
  })

  it('calls onCreateRoom when form is submitted', () => {
    render(<NewRoomModal {...defaultProps} />)

    const input = screen.getByLabelText('Room Name')
    fireEvent.change(input, { target: { value: 'New Project' } })

    fireEvent.click(screen.getByText('Create Room'))

    expect(defaultProps.onCreateRoom).toHaveBeenCalledWith('New Project')
  })

  it('calls onClose when cancel button is clicked', () => {
    render(<NewRoomModal {...defaultProps} />)

    fireEvent.click(screen.getByText('Cancel'))

    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('calls onClose when close icon is clicked', () => {
    render(<NewRoomModal {...defaultProps} />)

    // The close button is the one with the icon-x
    const closeButton = screen.getByTestId('icon-x').parentElement
    fireEvent.click(closeButton!)

    expect(defaultProps.onClose).toHaveBeenCalled()
  })
})
