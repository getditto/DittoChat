interface Room {
  _id: string
  name: string
  messagesId: string
  collectionId?: string
  createdBy: string
  createdOn: string
  isGenerated: boolean
  participants?: string[]
  retentionDays?: number
}

export default Room
export type { Room }
