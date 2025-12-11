import ChatUser from './ChatUser'
import Message from './Message'

interface MessageWithUser {
  message: Message
  user?: ChatUser | null
  id: string
}

export default MessageWithUser
export type { MessageWithUser }
