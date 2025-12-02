import ChatUser from "./ChatUser";
import Message from "./Message";

export default interface MessageWithUser {
  message: Message;
  user?: ChatUser | null;
  id: string;
}
