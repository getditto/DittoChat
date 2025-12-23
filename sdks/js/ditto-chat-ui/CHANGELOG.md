# @dittolive/ditto-chat-ui

## 0.1.2

### Patch Changes

- 5c05b55: - Replaced the existing UI components in `ditto-chat-ui` to use Radix components
  - Radix UI Components used:
    - Dialog - `@radix-ui/react-dialog`
    - Dropdown Menu - `@radix-ui/react-dropdown-menu`
    - Popover - `@radix-ui/react-popover`
- Updated dependencies [5c05b55]
  - @dittolive/ditto-chat-core@0.1.2

## 0.1.1

### Patch Changes

- 86a6e35: - Resolved Configuration Conflicts: Standardized the CSS framework configuration syntax to fix build and linting errors.
  - Fixed Style Generation: Corrected build path resolution to ensure component styles are properly located and compiled.
  - Enabled Custom Theming: Enhanced the main UI component to accept a custom theme object, allowing for full color palette control at runtime.
  - Dynamic Variable Mapping: Implemented logic to map custom theme properties directly to CSS variables.
  - Documented Styling: Added comprehensive documentation detailing all available style variables and their specific effects across the UI.
  - Updated Demo: Refreshed the example application to showcase the new custom theming capabilities.
- Updated dependencies [e417a1b]
  - @dittolive/ditto-chat-core@0.1.1

## 0.1.0

### Minor Changes

- 21fd054: # Initial Ditto Chat UI Release

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

### Patch Changes

- Updated dependencies [21fd054]
  - @dittolive/ditto-chat-core@0.1.0
