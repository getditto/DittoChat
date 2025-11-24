import { Attachment } from "@dittolive/ditto";

export default interface ChatUser {
  _id?: string;
  name: string;
  subscriptions: Record<string, string | null>;
  mentions: Record<string, string[]>;
  profilePicture?: Attachment | null;
  profilePictureThumbnail?: Attachment | null;
}
