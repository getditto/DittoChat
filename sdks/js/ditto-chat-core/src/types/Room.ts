import type { RetentionConfig } from './Retention'

interface Room {
  _id: string
  name: string
  messagesId: string
  collectionId?: string
  createdBy: string
  createdOn: string
  isGenerated: boolean
  participants?: string[]
  retention?: RetentionConfig
}

export default Room
export type { Room }
