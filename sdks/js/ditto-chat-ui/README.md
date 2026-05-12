# DittoChatScreens

This package provides a collection of React components for building chat UIs, powered by Ditto. Its main purpose is to expose the `DittoChatUI` component as a reusable React component library, allowing developers to easily integrate a full-featured chat experience into their applications.

## Installation

To install the package, use npm or yarn:

```bash
npm install @dittolive/ditto-chat-ui
# or
yarn add @dittolive/ditto-chat-ui
```

## Usage

Here's a basic example of how to use the `DittoChatUI` component:

```javascript
import React from 'react'
import { DittoChatUI } from '@dittolive/ditto-chat-ui'
import { Ditto } from '@dittolive/ditto'
import { toast } from 'sonner'

const MyChatApp = () => {
  // Initialize Ditto instance and authentication here
  // For example:
  const ditto = new Ditto({
    persistenceDirectory: './ditto',
    // ... other Ditto configuration
  })
  // You would typically handle Ditto authentication (e.g., anonymous, JWT) here
  // ditto.auth.loginWithToken('YOUR_TOKEN', 'YOUR_PROVIDER');

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <DittoChatUI
        ditto={ditto}
        userCollectionKey="my-users"
        userId="user123"
        theme="auto"
        isAdmin={true}
        notificationHandler={(title, description) => {
          toast.info(title, {
            description,
          })
        }}
      />
    </div>
  )
}

export default MyChatApp
```

### Props

The `DittoChatUI` component accepts the following props:

- `ditto`: (Required) An initialized Ditto instance. This is used to connect to the Ditto mesh network and manage chat data.
- `userCollectionKey`: (Required) A string representing the key for the Ditto collection where user information is stored.
- `userId`: (Required) A string representing the ID of the current user.
- `theme`: (Optional) Theme configuration. Can be a mode string (`"light"`, `"dark"`, or `"auto"`) or a custom `Theme` object. Default is `"light"`.
- `isAdmin`: (Optional) Boolean flag indicating whether the current user has admin privileges. Defaults to `false`. Mutating this prop at runtime is supported — a `useEffect` inside `useDittoChat` syncs prop changes into the store.
- `notificationHandler`: (Optional) A callback function to handle chat notifications. Receives `title` and `description` parameters. If not provided, the component uses a default toast notification handler. See the [Notifications section](#notifications) for more details.

## Theming

The `DittoChatUI` component offers a flexible theming system that supports both predefined modes and granular customization through a theme object.

### Predefined Modes

You can set the `theme` prop to one of the following strings:

- `"light"`: Forces light mode (default).
- `"dark"`: Forces dark mode.
- `"auto"`: Automatically follows the system's color scheme preference.

### Custom Theme Object

For more granular control, you can pass a `Theme` object to the `theme` prop. This allows you to override specific colors while maintaining the base theme structure.

#### Theme Interface

```typescript
export interface Theme {
  /** Base variant to use as a starting point */
  variant?: 'light' | 'dark'

  // Primary Palette
  primaryColor?: string
  primaryColorHover?: string
  primaryColorFocus?: string
  primaryColorLight?: string
  primaryColorLighter?: string
  primaryColorLightBorder?: string
  primaryColorDarkText?: string
  textOnPrimary?: string

  // Mentions
  mentionText?: string
  mentionTextOnPrimary?: string

  // Surface & Backgrounds
  surfaceColor?: string
  surfaceColorLight?: string
  secondaryBg?: string
  secondaryBgHover?: string
  disabledBg?: string

  // Text Colors
  textColor?: string
  textColorMedium?: string
  textColorLight?: string
  textColorLighter?: string
  textColorLightest?: string
  textColorFaint?: string
  textColorDisabled?: string

  // Borders & Focus
  borderColor?: string
  ringColor?: string

  // Status & Actions
  editBg?: string
  editText?: string
  infoIconColor?: string
  notificationBadgeBg?: string
  activeStatusBg?: string
  dangerText?: string
  dangerBg?: string
  successBg?: string
  successText?: string
}
```

#### Example Usage

```tsx
const customTheme: Theme = {
  variant: 'light',
  primaryColor: '#6366f1', // Custom Indigo
  surfaceColor: '#111827', // Darker surface
  textColor: '#ffffff',
}

<DittoChatUI
  ditto={ditto}
  userId="user123"
  userCollectionKey="users"
  theme={customTheme}
/>
```

### CSS Variables

For more advanced customization or to integrate with your existing CSS architecture, you can override the CSS variables directly. These variables are scoped to the `.dcui-root` class.

[View full list of CSS Variables](./CSS_VARIABLES.md)

## Notifications

The `DittoChatUI` component provides built-in notification support through the `notificationHandler` prop.

### Default Behavior

If no `notificationHandler` is provided, the component uses Sonner's `toast.info()` as the default notification handler.

### Custom Notification Handler

You can provide a custom handler to integrate with your preferred toast/notification library:

```javascript
import { toast } from 'sonner'

;<DittoChatUI
  ditto={ditto}
  userCollectionKey="my-users"
  userId="user123"
  notificationHandler={(title, description) => {
    toast.info(title, {
      description,
    })
  }}
/>
```

For more examples and details about notification events, see the [DittoChatCore Notifications documentation](../ditto-chat-core/README.md#notifications).

## Comment Rooms (Generated Rooms)

To render a specific comment thread (generated room) separately from the main chat list, you can use the `ChatView` component directly.

```javascript
import { ChatView } from '@dittolive/ditto-chat-ui'

;<ChatView
  roomId={commentRoomId} // ID of the generated room (e.g., "comments-doc-123")
  messagesId="messages" // Collection ID to store messages
  onBack={() => console.log('Back clicked')} // Optional back button handler
/>
```

For detailed documentation on **creating** comment rooms and managing their state, see the [DittoChatCore Comment Rooms documentation](../ditto-chat-core/README.md#comment-rooms-generated-rooms).

## Admin Flag

`<DittoChatUI>` takes an optional `isAdmin: boolean` prop (default `false`). The prop can change at runtime — a `useEffect` inside `useDittoChat` syncs prop changes into the underlying Zustand store, so consumers can update a user's admin status without rebuilding the chat. For imperative updates from outside the React tree, call `useDittoChatStore.getState().setIsAdmin(...)` directly. See [DittoChatCore's Admin Flag section](../ditto-chat-core/README.md#admin-flag) for details.

## Contributing

We welcome contributions! Please see our `CONTRIBUTING.md` for more details.

## License

This project is licensed under the MIT License.
