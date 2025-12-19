# @dittolive/ditto-chat-core

## 0.1.0

### Minor Changes

- 21fd054: # Initial Ditto Chat Core Release

  This is the first release of `@dittolive/ditto-chat-core`, a React-based chat SDK built on the Ditto Platform for peer-to-peer, real-time messaging.

  ## Features
  - **Real-time Chat**: Peer-to-peer messaging with automatic sync across devices
  - **Room Management**: Create and manage chat rooms (DM and group chats)
  - **Message Operations**: Send, edit, delete messages with optimistic updates
  - **Reactions**: Add and remove emoji reactions to messages
  - **User Presence**: Track online/offline status and typing indicators
  - **Mentions**: Support for @mentions in messages
  - **Attachments**: Send and receive file attachments and images
  - **RBAC Support**: Role-based access control for fine-grained permissions
  - **TypeScript**: Fully typed with comprehensive TypeScript definitions
  - **Zustand State Management**: Efficient state management with Zustand

  ## API

  The package exports React hooks and types for building chat applications:
  - `useDittoChat` - Main hook for initializing chat functionality
  - `useDittoChatStore` - Access to the chat store
  - Type definitions for `Message`, `Room`, `ChatUser`, `Reaction`, etc.

  ## Getting Started

  ```typescript
  import { useDittoChat } from '@dittolive/ditto-chat-core'

  const { chatLogin, chatLogout } = useDittoChat({
    appId: 'your-app-id',
    authToken: 'your-auth-token',
    userId: 'user-id',
  })
  ```

  See the [README](https://github.com/getditto/DittoChat) for full documentation.
