export default interface ChatUser {
  _id?: string;
  name: string;
  subscriptions: Record<string, Date | null>;
  mentions: Record<string, string[]>;
}
