export type PermissionKey =
  | 'canCreateRoom'
  | 'canEditOwnMessage'
  | 'canDeleteOwnMessage'
  | 'canAddReaction'
  | 'canRemoveOwnReaction'
  | 'canMentionUsers'
  | 'canSubscribeToRoom'

export interface RBACConfig {
  canCreateRoom?: boolean
  canEditOwnMessage?: boolean
  canDeleteOwnMessage?: boolean
  canAddReaction?: boolean
  canRemoveOwnReaction?: boolean
  canMentionUsers?: boolean
  canSubscribeToRoom?: boolean
}

export const DEFAULT_PERMISSIONS: Required<RBACConfig> = {
  canCreateRoom: true,
  canEditOwnMessage: true,
  canDeleteOwnMessage: true,
  canAddReaction: true,
  canRemoveOwnReaction: true,
  canMentionUsers: true,
  canSubscribeToRoom: true,
}
