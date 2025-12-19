---
'@dittolive/ditto-chat-ui': minor
---

# Initial Ditto Chat UI Release

This is the first release of `@dittolive/ditto-chat-ui`, a complete React UI component library for building chat applications on the Ditto Platform.

## Features

- **Complete Chat Interface**: Ready-to-use chat UI with minimal configuration
- **Chat List**: Display all conversations with unread counts and last message preview
- **Message View**: Rich message display with support for text, images, and files
- **Message Input**: Compose messages with emoji picker and @mentions
- **Reactions**: Visual emoji reactions on messages
- **File Attachments**: Send and preview images and files
- **User Avatars**: Automatic avatar generation and display
- **Typing Indicators**: Real-time typing status
- **Read Receipts**: Message read status tracking
- **Responsive Design**: Mobile-friendly UI with Tailwind CSS
- **Dark Mode Support**: Built-in dark mode styling
- **Customizable**: Flexible styling and theming options
- **RBAC Integration**: UI elements respect permission settings
- **Accessibility**: ARIA labels and keyboard navigation support

## Components

The package exports a complete chat UI and individual components:
- `DittoChatUI` - Complete chat application component
- `ChatList` - Conversation list component
- `ChatView` - Message view component
- `MessageBubble` - Individual message component
- `MessageInput` - Message composition component
- `NewMessageModal` - Create new conversation modal

## Getting Started

```tsx
import { DittoChatUI } from '@dittolive/ditto-chat-ui'
import '@dittolive/ditto-chat-ui/dist/ditto-chat-ui.css'

function App() {
  return (
    <DittoChatUI
      appId="your-app-id"
      authToken="your-auth-token"
      userId="user-id"
    />
  )
}
```

## Styling

The UI uses Tailwind CSS and includes a pre-built CSS file. Import the styles in your application:

```typescript
import '@dittolive/ditto-chat-ui/dist/ditto-chat-ui.css'
```

## Requirements

- React 18.0+ or 19.0+
- `@dittolive/ditto-chat-core` (peer dependency)
- `@dittolive/ditto` SDK (peer dependency)

See the [README](https://github.com/getditto/DittoChat) for full documentation and examples.
