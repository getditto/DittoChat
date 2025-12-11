import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatDate } from '../utils'

describe('formatDate', () => {
  let originalDate: typeof Date

  beforeEach(() => {
    // Save original Date
    originalDate = global.Date
  })

  afterEach(() => {
    // Restore original Date
    global.Date = originalDate
  })

  it("should format today's date as time only", () => {
    // Mock current time: 2024-01-15 14:30:00
    const mockNow = new Date('2024-01-15T14:30:00')
    vi.setSystemTime(mockNow)

    // Test with same day
    const todayDate = new Date('2024-01-15T10:15:00')
    const result = formatDate(todayDate)

    // Should return time only (format may vary by locale)
    expect(result).toMatch(/\d{1,2}:\d{2}/) // Matches time format like "10:15" or "10:15 AM"

    vi.useRealTimers()
  })

  it("should format today's date from string input", () => {
    const mockNow = new Date('2024-01-15T14:30:00')
    vi.setSystemTime(mockNow)

    const todayString = '2024-01-15T10:15:00'
    const result = formatDate(todayString)

    expect(result).toMatch(/\d{1,2}:\d{2}/)

    vi.useRealTimers()
  })

  it('should return "Yesterday" for yesterday\'s date', () => {
    // Mock current time: 2024-01-15 14:30:00
    const mockNow = new Date('2024-01-15T14:30:00')
    vi.setSystemTime(mockNow)

    // Test with yesterday's date
    const yesterdayDate = new Date('2024-01-14T10:15:00')
    const result = formatDate(yesterdayDate)

    expect(result).toBe('Yesterday')

    vi.useRealTimers()
  })

  it('should return "Yesterday" for yesterday\'s date from string', () => {
    const mockNow = new Date('2024-01-15T14:30:00')
    vi.setSystemTime(mockNow)

    const yesterdayString = '2024-01-14T10:15:00'
    const result = formatDate(yesterdayString)

    expect(result).toBe('Yesterday')

    vi.useRealTimers()
  })

  it('should format older dates as MM/DD/YY', () => {
    // Mock current time: 2024-01-15 14:30:00
    const mockNow = new Date('2024-01-15T14:30:00')
    vi.setSystemTime(mockNow)

    // Test with a date from 3 days ago
    const olderDate = new Date('2024-01-12T10:15:00')
    const result = formatDate(olderDate)

    // Should return formatted date like "01/12/24"
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{2}/)
    expect(result).toBe('01/12/24')

    vi.useRealTimers()
  })

  it('should format older dates from string input', () => {
    const mockNow = new Date('2024-01-15T14:30:00')
    vi.setSystemTime(mockNow)

    const olderString = '2024-01-12T10:15:00'
    const result = formatDate(olderString)

    expect(result).toMatch(/\d{2}\/\d{2}\/\d{2}/)
    expect(result).toBe('01/12/24')

    vi.useRealTimers()
  })

  it('should format dates from last year', () => {
    const mockNow = new Date('2024-01-15T14:30:00')
    vi.setSystemTime(mockNow)

    const lastYearDate = new Date('2023-12-25T10:15:00')
    const result = formatDate(lastYearDate)

    expect(result).toBe('12/25/23')

    vi.useRealTimers()
  })

  it('should handle edge case: exactly midnight today', () => {
    const mockNow = new Date('2024-01-15T14:30:00')
    vi.setSystemTime(mockNow)

    const midnightToday = new Date('2024-01-15T00:00:00')
    const result = formatDate(midnightToday)

    // Should be treated as today and show time
    expect(result).toMatch(/\d{1,2}:\d{2}/)

    vi.useRealTimers()
  })

  it('should handle edge case: exactly midnight yesterday', () => {
    const mockNow = new Date('2024-01-15T14:30:00')
    vi.setSystemTime(mockNow)

    const midnightYesterday = new Date('2024-01-14T00:00:00')
    const result = formatDate(midnightYesterday)

    expect(result).toBe('Yesterday')

    vi.useRealTimers()
  })

  it('should handle edge case: just before midnight yesterday', () => {
    const mockNow = new Date('2024-01-15T14:30:00')
    vi.setSystemTime(mockNow)

    const beforeMidnightYesterday = new Date('2024-01-14T23:59:59')
    const result = formatDate(beforeMidnightYesterday)

    expect(result).toBe('Yesterday')

    vi.useRealTimers()
  })
})
