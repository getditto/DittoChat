import type MessageWithUser from "dittochatcore/dist/types/MessageWithUser";
import type { User, Chat } from "./types";

export const CURRENT_USER_ID = 0; // Let's say "You" are user 0
export const EMPTY_MESSAGES: MessageWithUser[] = [];

export const USERS: User[] = [
  { id: 0, name: "You", avatarUrl: `https://picsum.photos/seed/you/40/40` },
  {
    id: 1,
    name: "Kenneth Shapiro",
    avatarUrl: `https://picsum.photos/seed/kenneth/40/40`,
    isActive: true,
  },
  {
    id: 2,
    name: "John Doe",
    avatarUrl: `https://picsum.photos/seed/john/40/40`,
  },
  {
    id: 3,
    name: "Jane Doe",
    avatarUrl: `https://picsum.photos/seed/jane/40/40`,
    isActive: true,
  },
  {
    id: 4,
    name: "David Park",
    avatarUrl: `https://picsum.photos/seed/david/40/40`,
  },
  {
    id: 5,
    name: "Amy Patel",
    avatarUrl: `https://picsum.photos/seed/amy/40/40`,
  },
  {
    id: 6,
    name: "Gareth Sudul",
    avatarUrl: `https://picsum.photos/seed/gareth/40/40`,
    isActive: true,
  },
  {
    id: 7,
    name: "Erik Everson",
    avatarUrl: `https://picsum.photos/seed/erik/40/40`,
  },
  {
    id: 8,
    name: "Aaron Leopold",
    avatarUrl: `https://picsum.photos/seed/aaron/40/40`,
    isActive: true,
  },
  {
    id: 9,
    name: "Shamari Southwell",
    avatarUrl: `https://picsum.photos/seed/shamari/40/40`,
  },
  {
    id: 10,
    name: "Bryan Malumphy",
    avatarUrl: `https://picsum.photos/seed/bryan/40/40`,
  },
  {
    id: 11,
    name: "Adam Fish",
    avatarUrl: `https://picsum.photos/seed/adam/40/40`,
    isActive: true,
  },
];

export const CHATS: Chat[] = [
  {
    id: 1,
    type: "dm",
    participants: [CURRENT_USER_ID, 1],
    messages: [
      // {
      //   id: 101,
      //   senderId: 1,
      //   content:
      //     "Hey, I'm Kenneth and this is a message from me. I'm only sending it for the mockup!",
      //   timestamp: "11:44",
      //   reactions: [
      //     { emoji: "🙂", userIds: [0], count: 1 },
      //     { emoji: "👍", userIds: [0], count: 1 },
      //   ],
      // },
      // {
      //   id: 102,
      //   senderId: CURRENT_USER_ID,
      //   content:
      //     "Oh that's great, I'll reply for the mockup too so things don't look even more awkward.",
      //   timestamp: "11:45",
      //   reactions: [],
      // },
    ],
  },
  // {
  //   id: 2,
  //   type: 'group',
  //   name: 'General',
  //   participants: [CURRENT_USER_ID, 2, 3],
  //   messages: [
  //     {
  //       id: 201,
  //       senderId: 2,
  //       content: "This is a message because I'm mocking chat right now",
  //       timestamp: '11:44',
  //       reactions: [{ emoji: '🙂', userIds: [0], count: 1 }, { emoji: '👍', userIds: [3], count: 1 }]
  //     },
  //     {
  //       id: 202,
  //       senderId: CURRENT_USER_ID,
  //       content: "This is a reply because I needed to mock another message here",
  //       timestamp: '11:45',
  //       reactions: []
  //     },
  //     {
  //       id: 203,
  //       senderId: 2,
  //       content: "This is a message for @Jane Doe to show a mention in a message",
  //       timestamp: '11:46',
  //       reactions: [{ emoji: '🙂', userIds: [0], count: 1 }, { emoji: '👋', userIds: [3], count: 1 }]
  //     }
  //   ],
  // },
  // {
  //   id: 3,
  //   type: 'group',
  //   name: 'Announcements',
  //   participants: [CURRENT_USER_ID, 4],
  //   unread: true,
  //   messages: [
  //      {
  //       id: 301,
  //       senderId: 4,
  //       content: 'Reminder: System maintenance this Saturday 6am-10am. Plan accordingly...',
  //       timestamp: 'Yesterday',
  //       reactions: []
  //     }
  //   ],
  // },
  // {
  //   id: 4,
  //   type: 'group',
  //   name: 'Shift Notes',
  //   participants: [CURRENT_USER_ID, 5],
  //   unread: true,
  //   messages: [
  //     {
  //       id: 401,
  //       senderId: 5,
  //       content: 'Night crew - FYI building 3 will be empty tonight, security doing rounds e...',
  //       timestamp: '10/24/25',
  //       reactions: []
  //     }
  //   ],
  // },
];
