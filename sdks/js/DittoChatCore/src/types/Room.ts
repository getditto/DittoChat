export default interface Room {
  _id: string;
  name: string;
  messagesId: string;
  collectionId?: string;
  createdBy: string;
  createdOn: Date;
  isGenerated: boolean;
}
