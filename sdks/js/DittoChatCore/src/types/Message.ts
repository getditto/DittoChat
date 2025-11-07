import { Attachment } from "@dittolive/ditto";

export default interface Message {
  _id: string;
  createdOn: Date;
  roomId: string;
  text: string;
  userId: string;
  largeImageToken?: Attachment | Record<string, any>;
  thumbnailImageToken?: Attachment | Record<string, any>;

  archivedMessage?: string;
  isArchived: boolean;

  // TAK specific values Beta -1.0
  authorCs?: string;
  authorId?: string;
  authorLoc?: string;
  authorType?: string;
  msg?: string;
  parent?: string;
  pks?: string;
  room?: string;
  schver?: number;
  takUid?: string;
  timeMs?: Date;

  // TAK specific values 1.0
  _r?: boolean; // false,
  _v?: number; // 2,
  a?: string; // "pkAocCgkMCHR2rZKkzOQCuNctl7TISZ-CHLQSponngkXJBvYn4IcE",
  b?: Date; // 1748900833112,
  d?: string; // "ANDROID-0fdedc6978d14b12",
  e?: string; // "LUMP",

  hasBeenConverted?: boolean;
}
