import { type ChatUser, type Message } from '@dittolive/ditto-chat-core'

export interface User {
  id: number
  name: string
  avatarUrl: string
  isActive?: boolean
}

export interface Reaction {
  emoji: string
  userIds: number[]
  count: number
}

export type ChatType = 'dm' | 'group'

export interface Chat {
  id: number | string
  type: ChatType
  name?: string
  participants: ChatUser[]
  messages: Message[]
  unread?: boolean
}

export interface Theme {
  variant?: 'light' | 'dark'

  primaryColor?: string
  primaryColorHover?: string
  primaryColorFocus?: string
  primaryColorLight?: string
  primaryColorLighter?: string
  primaryColorLightBorder?: string
  primaryColorDarkText?: string
  textOnPrimary?: string

  mentionText?: string
  mentionTextOnPrimary?: string

  surfaceColor?: string
  surfaceColorLight?: string
  secondaryBg?: string
  secondaryBgHover?: string
  disabledBg?: string

  textColor?: string
  textColorMedium?: string
  textColorLight?: string
  textColorLighter?: string
  textColorLightest?: string
  textColorFaint?: string
  textColorDisabled?: string

  borderColor?: string

  ringColor?: string

  editBg?: string
  editText?: string
  infoIconColor?: string
  notificationBadgeBg?: string
  activeStatusBg?: string
  dangerText?: string
  dangerBg?: string
  successBg?: string
  successText?: string
}
