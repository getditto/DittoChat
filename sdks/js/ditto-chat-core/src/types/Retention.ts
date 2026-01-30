/**
 * Configuration for message retention policies.
 *
 * Retention policies control how long messages are kept in chat rooms.
 * You can configure retention at three levels:
 * 1. Global level (via DittoConfParams)
 * 2. Per-room level (via Room.retention)
 * 3. Per-query level (via parameter overrides)
 *
 * Priority order: query parameter > room config > global config > default (30 days)
 */
export type RetentionConfig = {
  /**
   * If true, messages are retained indefinitely (no time-based eviction).
   * When set to true, the `days` field is ignored.
   */
  retainIndefinitely: boolean

  /**
   * Number of days to retain messages.
   * Only used when `retainIndefinitely` is false.
   * If not specified, defaults to 30 days.
   */
  days?: number
} | null | undefined
