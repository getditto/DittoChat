# dittochatcore

`@dittolive/ditto-chat-core` is a React and TypeScript-based library leveraging Ditto for real-time chat functionalities.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Comment Rooms (Generated Rooms)](#comment-rooms-generated-rooms)
  - [Creating a Comment Room](#creating-a-comment-room)
  - [Subscribing to Messages](#subscribing-to-messages)
- [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
  - [Available Permissions](#available-permissions)
  - [Configuring Permissions](#configuring-permissions)
  - [Checking Permissions](#checking-permissions)
- [Notifications](#notifications)
  - [Notification Handler](#notification-handler)
  - [Default Behavior](#default-behavior)
  - [Custom Notification Handler](#custom-notification-handler)
  - [Common Notification Events](#common-notification-events)
- [Singleton Store Pattern](#singleton-store-pattern)
  - [Why This Matters](#why-this-matters)
  - [What This Means for You](#what-this-means-for-you)
  - [Example](#example)
  - [Ensuring Single Zustand Installation](#ensuring-single-zustand-installation)
  - [Detailed Documentation](#detailed-documentation)
- [Architecture & Performance](#architecture--performance)
  - [Optimistic UI Updates](#optimistic-ui-updates)
- [Available Scripts](#available-scripts)
- [Keywords](#keywords)
- [License](#license)
- [Repository](#repository)

## Installation

You can install `@dittolive/ditto-chat-core` using npm or yarn:

```bash
npm install @dittolive/ditto-chat-core
# or
yarn add @dittolive/ditto-chat-core
```

## Usage

Here's a basic example of how to use `@dittolive/ditto-chat-core` in your React application:

```typescript
import React, { useEffect, useState } from 'react';
import { Ditto } from '@dittolive/ditto';
import { useDittoChat, useDittoChatStore } from '@dittolive/ditto-chat-core';

// Assume you have a Ditto instance and user details
const dittoInstance: Ditto | null = null; // Your Ditto instance
const currentUserId = 'your-user-id';
const userCollectionKey = 'your-user-collection-key';

function ChatApp() {
  // 1. Initialize the chat store with useDittoChat
  useDittoChat({
    ditto: dittoInstance,
    userId: currentUserId,
    userCollectionKey: userCollectionKey,
  });

  // 2. Access parts of the store using useDittoChatStore selectors
  const rooms = useDittoChatStore(state => state.rooms);
  const activeRoomId = useDittoChatStore(state => state.activeRoomId);
  const setActiveRoomId = useDittoChatStore(state => state.setActiveRoomId);
  const messagesByRoom = useDittoChatStore(state => state.messagesByRoom);
  const createMessage = useDittoChatStore(state => state.createMessage);

  // 3. Derived state
  const activeRoom = rooms.find(r => r._id === activeRoomId);
  const messages = activeRoomId ? (messagesByRoom[activeRoomId] || []) : [];

  // Example usage:
  const handleSendMessage = (text: string) => {
    if (activeRoom) {
      createMessage(activeRoom, text);
    }
  };

  return (
    <div>
      <h1>Ditto Chat</h1>
      <p>Current User ID: {currentUserId}</p>
      <h2>Rooms:</h2>
      <ul>
        {rooms.map(room => (
          <li
            key={room._id}
            onClick={() => setActiveRoomId(room._id)}
            style={{ fontWeight: room._id === activeRoomId ? 'bold' : 'normal' }}
          >
            {room.name}
          </li>
        ))}
      </ul>
      <h2>Messages in Active Room:</h2>
      <ul>
        {messages.map(wrapper => (
          <li key={wrapper.id}>
            <strong>{wrapper.user?.name || wrapper.message.userId}:</strong> {wrapper.message.text}
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

## Comment Rooms (Generated Rooms)

DittoChatCore supports "Generated Rooms" which behave differently from standard chat rooms:

1.  They are **excluded** from the main room list found in `state.rooms`.
2.  They are stored separately in `state.generatedRooms`.
3.  They must be subscribed to explicitly.

### Creating a Comment Room

Use `createGeneratedRoom` to create a room that won't pollute the main chat list:

```typescript
const { createGeneratedRoom } = useDittoChatStore((state) => state)

const handleOpenComments = async (entityId: string) => {
  // Creates a room with ID `comments-${entityId}` if it doesn't exist
  // and adds it to state.generatedRooms
  await createGeneratedRoom(`comments-${entityId}`, 'Comments Thread')
}
```

### Subscribing to Messages

For generated rooms, you often want to subscribe to messages only when viewing that specific thread. Use the `subscribeToRoomMessages` helper:

```typescript
const { subscribeToRoomMessages, unsubscribeFromRoomMessages } =
  useDittoChatStore((state) => state)

useEffect(() => {
  if (isCommentsOpen) {
    // Subscribe to messages for this specific room
    subscribeToRoomMessages(commentRoomId, 'messages')
  }

  return () => {
    // Clean up subscription when closing/unmounting
    unsubscribeFromRoomMessages(commentRoomId)
  }
}, [isCommentsOpen, commentRoomId])
```

## Role-Based Access Control (RBAC)

DittoChatCore includes a built-in RBAC system that allows you to control user permissions for various chat actions. By default, all permissions are enabled.

### Available Permissions

| Permission             | Description               | Default |
| ---------------------- | ------------------------- | ------- |
| `canCreateRoom`        | Create new chat rooms     | `true`  |
| `canEditOwnMessage`    | Edit own messages         | `true`  |
| `canDeleteOwnMessage`  | Delete own messages       | `true`  |
| `canAddReaction`       | Add reactions to messages | `true`  |
| `canRemoveOwnReaction` | Remove own reactions      | `true`  |
| `canMentionUsers`      | Mention users in messages | `true`  |
| `canSubscribeToRoom`   | Subscribe to chat rooms   | `true`  |

### Configuring Permissions

You can configure permissions when initializing the chat or update them dynamically:

```typescript
import { useDittoChat, useDittoChatStore } from '@dittolive/ditto-chat-core'

// Configure permissions during initialization
const chat = useDittoChat({
  ditto: dittoInstance,
  userId: currentUserId,
  userCollectionKey: userCollectionKey,
  rbacConfig: {
    canCreateRoom: false, // Disable room creation
    canMentionUsers: false, // Disable user mentions
    canDeleteOwnMessage: true, // Allow deleting own messages
  },
})

// Or update permissions dynamically
const updateRBACConfig = useDittoChatStore((state) => state.updateRBACConfig)

updateRBACConfig({
  canEditOwnMessage: false, // Disable message editing
})
```

### Checking Permissions

You can check if a user has permission to perform an action:

```typescript
const canPerformAction = useDittoChatStore((state) => state.canPerformAction)

if (canPerformAction('canCreateRoom')) {
  // Show create room button
}
```

**Note:** When a permission is denied, the action will fail silently with a warning logged to the console. The UI layer should check permissions before displaying action buttons to provide better UX.

## Notifications

DittoChatCore provides a customizable notification system through the `notificationHandler` prop. This allows you to integrate chat notifications with your preferred toast/notification library.

### Notification Handler

The `notificationHandler` is an optional callback function that receives notification events from the chat system.

**Signature:**

```typescript
notificationHandler?: (title: string, description: string) => void
```

**Parameters:**

- `title` - The notification title (e.g., "New Message", "Room Created")
- `description` - Additional details about the notification

### Default Behavior

If no `notificationHandler` is provided, notifications will not trigger or be logged. You must provide a custom handler to receive and display notifications.

### Custom Notification Handler

You can provide a custom handler to integrate with any toast/notification library:

#### Example with Sonner

```typescript
import { toast } from 'sonner'
import { useDittoChat } from '@dittolive/ditto-chat-core'

useDittoChat({
  ditto: dittoInstance,
  userId: currentUserId,
  userCollectionKey: userCollectionKey,
  notificationHandler: (title, description) => {
    toast.info(title, {
      description,
    })
  },
})
```

#### Example with React-Toastify

```typescript
import { toast } from 'react-toastify'
import { useDittoChat } from '@dittolive/ditto-chat-core'

useDittoChat({
  ditto: dittoInstance,
  userId: currentUserId,
  userCollectionKey: userCollectionKey,
  notificationHandler: (title, description) => {
    toast.info(`${title}: ${description}`)
  },
})
```

#### Example with Custom Notification System

```typescript
import { useDittoChat } from '@dittolive/ditto-chat-core'

useDittoChat({
  ditto: dittoInstance,
  userId: currentUserId,
  userCollectionKey: userCollectionKey,
  notificationHandler: (title, description) => {
    // Custom notification logic
    showCustomNotification({
      type: 'info',
      title,
      message: description,
      duration: 3000,
    })
  },
})
```

### Common Notification Events

The chat system triggers notifications for various events:

- New messages in subscribed rooms
- User mentions

## Singleton Store Pattern

**Important:** DittoChatCore uses a **global singleton pattern** to ensure that all npm packages share the same Zustand store instance.

### Why This Matters

When `@dittolive/ditto-chat-core` is installed in multiple packages (e.g., in your main app and in `@dittolive/ditto-chat-ui`), each package could potentially get its own copy of the module. To prevent multiple independent store instances, we use `globalThis` to maintain a single shared store.

### What This Means for You

1.  **Initialize once** - Call `useDittoChat()` in your root component
2.  **Use anywhere** - Call `useDittoChatStore()` in any component from any package
3.  **Shared state** - All packages automatically share the same state

### Example

```typescript
// In your main app (initialize once)
function App() {
  useDittoChat({
    ditto: dittoInstance,
    userId: currentUserId,
    userCollectionKey: userCollectionKey,
  })

  return <YourApp />
}

// In any component, from any package (use the shared store)
function ChatComponent() {
  const messages = useDittoChatStore((state) => state.messagesByRoom)
  // All components see the same state
}
```

## Architecture & Performance

### Optimistic UI Updates

DittoChatCore uses an **optimistic update pattern** for message reactions to provide instant UI feedback.

**How it works:**

1. **Immediate UI Update** - Reaction appears instantly in the UI before any database operations
2. **Async Persistence** - Change persists to Ditto database in the background
3. **Auto Rollback** - If database update fails, the reaction is automatically removed from the UI

**Benefits:** Instant feedback, no perceived latency, automatic data consistency.

**Implementation:** See `updateMessageReactions()` function in [`src/slices/useMessages.ts`](src/slices/useMessages.ts) for the complete implementation details.

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
