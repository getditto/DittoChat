import { Attachment } from '@dittolive/ditto'

interface ChatUser {
  _id?: string
  name: string
  subscriptions: Record<string, string | null>
  mentions: Record<string, string[]>
  profilePicture?: Attachment | null
  profilePictureThumbnail?: Attachment | null
}

export default ChatUser
export type { ChatUser }
