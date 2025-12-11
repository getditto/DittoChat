import { Attachment } from '@dittolive/ditto'

export type Reaction = {
  userId: string
  emoji: string
  unified?: string
  unifiedWithoutSkinTone?: string
}
export interface Mention {
  userId: string
  startIndex: number
  endIndex: number
}

interface Message {
  _id: string
  createdOn: string
  roomId: string
  text: string
  userId: string
  largeImageToken?: Attachment | null
  thumbnailImageToken?: Attachment | null
  fileAttachmentToken?: Attachment | null

  archivedMessage?: string
  isArchived: boolean
  isEdited?: boolean
  isDeleted?: boolean
  reactions?: Reaction[]
  mentions?: Mention[]
}

export default Message
export type { Message }
