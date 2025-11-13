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
import React from 'react';
import { DittoChatUI } from '@dittolive/ditto-chat-ui';
import { Ditto } from '@dittolive/ditto';

const MyChatApp = () => {
  // Initialize Ditto instance and authentication here
  // For example:
  const ditto = new Ditto({
    persistenceDirectory: './ditto',
    // ... other Ditto configuration
  });
  // You would typically handle Ditto authentication (e.g., anonymous, JWT) here
  // ditto.auth.loginWithToken('YOUR_TOKEN', 'YOUR_PROVIDER');

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <DittoChatUI
        ditto={ditto}
        userCollectionKey="my-users"
        userId="user123"
      />
    </div>
  );
};

export default MyChatApp;
```

### Props

The `DittoChatUI` component accepts the following props:

- `ditto`: (Required) An initialized Ditto instance. This is used to connect to the Ditto mesh network and manage chat data.
- `userCollectionKey`: (Required) A string representing the key for the Ditto collection where user information is stored.
- `userId`: (Required) A string representing the ID of the current user.

## Contributing

We welcome contributions! Please see our `CONTRIBUTING.md` for more details.

## License

This project is licensed under the MIT License.
