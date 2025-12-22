export function formatDate(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const now = new Date()

  // Normalize to local time
  const isSameDay = date.toDateString() === now.toDateString()

  // Yesterday check
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  if (isSameDay) {
    // Show only time (e.g., 15:00)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (isYesterday) {
    return 'Yesterday'
  } else {
    // Show formatted date (MM/DD/YY)
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
    })
  }
}

export function getThemeClass(): string {
  return localStorage.getItem('ditto-web-chat-theme') || 'light'
}
