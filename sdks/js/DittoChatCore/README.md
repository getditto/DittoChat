# dittochatcore

`@dittolive/ditto-chat-core` is a React and TypeScript-based library leveraging Ditto for real-time chat functionalities.

## Installation

You can install `@dittolive/ditto-chat-core` using npm or yarn:

```bash
npm install @dittolive/ditto-chat-core
# or
yarn add @dittolive/ditto-chat-core
```

## Peer Dependencies

This library requires the following peer dependencies:

- `@dittolive/ditto`: `^4.12.3`
- `react`: `^18 || ^19`

Make sure you have these installed in your project.

## Usage

Here's a basic example of how to use `@dittolive/ditto-chat-core` in your React application:

```typescript
import React from 'react';
import { Ditto } from '@dittolive/ditto';
import { useDittoChat, useDittoChatStore } from '@dittolive/ditto-chat-core';

// Assume you have a Ditto instance and user details
const dittoInstance: Ditto | null = null; // Your Ditto instance
const currentUserId = 'your-user-id';
const userCollectionKey = 'your-user-collection-key';

function ChatApp() {
  // 1. Initialize the chat store with your Ditto instance and user details
  const { rooms, activeRoomId, setActiveRoomId } = useDittoChat({
    ditto: dittoInstance,
    userId: currentUserId,
    userCollectionKey: userCollectionKey,
  });

  // 2. Access parts of the store using useDittoChatStore
  const messages = useDittoChatStore(state => state.messages);
  const sendMessage = useDittoChatStore(state => state.sendMessage);

  // Example usage:
  const handleSendMessage = (text: string) => {
    if (activeRoomId) {
      sendMessage(activeRoomId, {
        text: text,
        // other message properties
      });
    }
  };

  return (
    <div>
      <h1>Ditto Chat</h1>
      <p>Current User ID: {currentUserId}</p>
      <h2>Rooms:</h2>
      <ul>
        {rooms.map(room => (
          <li key={room._id} onClick={() => setActiveRoomId(room._id)}>
            {room.name} {room._id === activeRoomId ? '(Active)' : ''}
          </li>
        ))}
      </ul>
      <h2>Messages in Active Room:</h2>
      <ul>
        {messages.filter(msg => msg.roomId === activeRoomId).map(msg => (
          <li key={msg._id}>
            <strong>{msg.senderId}:</strong> {msg.text}
          </li>
        ))}
      </ul>
      <button onClick={() => handleSendMessage('Hello from the app!')}>Send Test Message</button>
    </div>
  );
}

export default ChatApp;
```

**Note:** The `dittoInstance`, `currentUserId`, and `userCollectionKey` should be provided from your application's context or configuration. You will need to replace `null` with a properly initialized Ditto instance.

## Available Scripts

In the project directory, you can run:

- `npm run build`: Builds the project for production.
- `npm run test`: Runs tests and exits.
- `npm run test:watch`: Runs tests in watch mode.
- `npm run clean`: Removes the `dist` directory.

## Keywords

react, typescript, ditto, ditto-chat-core, ditto-chat

## License

MIT

## Repository

https://github.com/getditto/DittoChat.git
