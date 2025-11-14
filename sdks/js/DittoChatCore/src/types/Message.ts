import { Attachment } from "@dittolive/ditto";

export type Reaction = {
  userId: string;
  emoji: string;
  unified?: string;
  unifiedWithoutSkinTone?: string;
};

export default interface Message {
  _id: string;
  createdOn: string;
  roomId: string;
  text: string;
  userId: string;
  largeImageToken?: Attachment;
  thumbnailImageToken?: Attachment;
  fileAttachmentToken?: Attachment;

  archivedMessage?: string;
  isArchived: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  reactions?: Reaction[];
}
