export default interface ChatUser {
  _id?: string; // Ditto auto-generated 
  name: string;
  subscriptions: Record<string, Date | null>;
  mentions: Record<string, string[]>;
}
