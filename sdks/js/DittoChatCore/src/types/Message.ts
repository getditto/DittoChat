import { Attachment } from "@dittolive/ditto";

export default interface Message {
  _id: string;
  createdOn: Date;
  roomId: string;
  text: string;
  userId: string;
  largeImageToken?: Attachment | Record<string, any>;
  thumbnailImageToken?: Attachment | Record<string, any>;
  fileAttachmentToken?: Attachment | Record<string, any>;

  archivedMessage?: string;
  isArchived: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
}
