# Singleton Store Pattern: Sharing Zustand Store Across Multiple npm Packages

## Table of Contents

- [Problem](#problem)
  - [Scenario](#scenario)
- [Solution: Global Singleton Pattern](#solution-global-singleton-pattern)
  - [Implementation](#implementation)
- [Usage](#usage)
  - [1. Initialize the Store (Once)](#1-initialize-the-store-once)
  - [2. Use the Store (Anywhere)](#2-use-the-store-anywhere)
  - [3. Helper Functions](#3-helper-functions)
- [Verification](#verification)
  - [Check Console Logs](#check-console-logs)
  - [Inspect in Browser DevTools](#inspect-in-browser-devtools)
  - [Test State Synchronization](#test-state-synchronization)
- [Ensuring Single Zustand Installation](#ensuring-single-zustand-installation)
  - [Using npm (v8.3+)](#using-npm-v83)
  - [Using yarn](#using-yarn)
  - [Verify Single Installation](#verify-single-installation)
- [Testing](#testing)
- [Important Notes](#important-notes)
  - [Global Variable Naming](#global-variable-naming)
  - [Multiple React Applications](#multiple-react-applications)
  - [TypeScript Support](#typescript-support)
- [Alternatives Considered](#alternatives-considered)
  - [1. Module Federation](#1-module-federation)
  - [2. React Context](#2-react-context)
  - [3. Peer Dependencies Only](#3-peer-dependencies-only)
- [Why This Solution Works](#why-this-solution-works)
- [Related Files](#related-files)
- [Questions?](#questions)

## Problem

When `@dittolive/ditto-chat-core` is installed as an npm dependency in multiple packages (e.g., in both your main application and in `@dittolive/ditto-chat-ui`), each package may get its own copy of the module during bundling. This results in **multiple independent Zustand store instances** instead of a single shared singleton.

### Scenario

```
YourApp/
├── node_modules/
│   ├── @dittolive/ditto-chat-core/     (Instance 1)
│   └── @dittolive/ditto-chat-ui/
│       └── node_modules/
│           └── @dittolive/ditto-chat-core/  (Instance 2) ❌
```

**Result**: State changes in one package don't reflect in another package because they're using different store instances.

## Solution: Global Singleton Pattern

We use `globalThis` to ensure a single store instance is shared across all npm package installations.

### Implementation

#### Before (Module-Level Singleton)
```typescript
// ❌ Each bundled copy has its own chatStore variable
export let chatStore: StoreApi<ChatStore> | null = null;

export function useDittoChat(params: DittoConfParams) {
  const store = useMemo(() => {
    if (!chatStore) {
      chatStore = createStore<ChatStore>()(/* ... */);
    }
    return chatStore;
  }, [params.ditto]);
  
  return useStore(store);
}
```

#### After (Global Singleton)
```typescript
// ✅ All packages share the same global reference
declare global {
  var __DITTO_CHAT_STORE__: StoreApi<ChatStore> | undefined;
}

export function useDittoChat(params: DittoConfParams) {
  const store = useMemo(() => {
    if (!globalThis.__DITTO_CHAT_STORE__) {
      globalThis.__DITTO_CHAT_STORE__ = createStore<ChatStore>()(/* ... */);
    }
    return globalThis.__DITTO_CHAT_STORE__;
  }, [params.ditto]);
  
  return useStore(store);
}
```

## Usage

### 1. Initialize the Store (Once)

In your main application's root component:

```typescript
import { useDittoChat } from "@dittolive/ditto-chat-core";

function App() {
  const ditto = useDitto(); // Your Ditto instance
  
  // Initialize the global store
  useDittoChat({
    ditto,
    userId: "user123",
    userCollectionKey: "users",
  });

  return <YourApp />;
}
```

### 2. Use the Store (Anywhere)

In any component, from any package:

```typescript
import { useDittoChatStore } from "@dittolive/ditto-chat-core";

function ChatView() {
  // Uses the SAME global store instance
  const messages = useDittoChatStore((state) => state.messagesByRoom);
  const rooms = useDittoChatStore((state) => state.rooms);
  
  return <div>{/* ... */}</div>;
}
```

### 3. Helper Functions

```typescript
import { getChatStore, resetChatStore } from "@dittolive/ditto-chat-core";

// Get the global store instance (for debugging)
const store = getChatStore();
console.log(store?.getState());

// Reset the store (useful for testing)
resetChatStore();
```

## Verification

### Check Console Logs

When your app initializes, you should see:

```
🔵 Creating NEW global chatStore instance
```

This should appear **only once**. If you see it multiple times, the singleton pattern is not working correctly.

### Inspect in Browser DevTools

```javascript
// Check if the global store exists
window.__DITTO_CHAT_STORE__

// View the current state
window.__DITTO_CHAT_STORE__.getState()
```

### Test State Synchronization

1. Update state in one component (e.g., from your main app)
2. Verify the state updates in another component (e.g., from DittoChatUI)
3. Both should reflect the same data immediately

## Ensuring Single Zustand Installation

To prevent multiple copies of Zustand from being installed, configure your main application's `package.json`:

### Using npm (v8.3+)

```json
{
  "dependencies": {
    "@dittolive/ditto-chat-core": "^1.0.0",
    "@dittolive/ditto-chat-ui": "^1.0.0",
    "zustand": "^5.0.8"
  },
  "overrides": {
    "zustand": "^5.0.8"
  }
}
```

### Using yarn

```json
{
  "dependencies": {
    "@dittolive/ditto-chat-core": "^1.0.0",
    "@dittolive/ditto-chat-ui": "^1.0.0",
    "zustand": "^5.0.8"
  },
  "resolutions": {
    "zustand": "^5.0.8"
  }
}
```

### Verify Single Installation

```bash
npm ls zustand
# or
yarn why zustand
```

Expected output:
```
your-app@1.0.0
└── zustand@5.0.8
    └── (deduped)
```

## Testing

When writing tests, reset the global store between test cases:

```typescript
import { resetChatStore } from "@dittolive/ditto-chat-core";
import { afterEach } from "vitest"; // or your test framework

afterEach(() => {
  resetChatStore();
});
```

## Important Notes

### Global Variable Naming

The global variable `__DITTO_CHAT_STORE__` is prefixed with `__` to indicate it's internal. **Do not access it directly** in your application code. Always use the provided hooks:

- ✅ `useDittoChat()` - Initialize the store
- ✅ `useDittoChatStore()` - Access the store in components
- ✅ `getChatStore()` - Get store instance (debugging only)
- ✅ `resetChatStore()` - Reset the store (testing only)

### Multiple React Applications

If you have multiple independent React applications on the same page (rare), they will share the same store. If you need separate stores for each app, you'll need to implement a different pattern (e.g., React Context-based stores with separate providers).

### TypeScript Support

The global declaration ensures TypeScript knows about the global variable:

```typescript
declare global {
  var __DITTO_CHAT_STORE__: StoreApi<ChatStore> | undefined;
}
```

This provides full type safety when accessing the global store.

## Alternatives Considered

### 1. Module Federation

**Pros**: Industry standard for micro-frontends  
**Cons**: Complex build configuration, requires Webpack/Vite plugins  
**Use Case**: True micro-frontend architectures with independent deployments

### 2. React Context

**Pros**: No global variables, React-native pattern  
**Cons**: Requires provider wrapper, doesn't work across separate React trees  
**Use Case**: Single application with controlled component hierarchy

### 3. Peer Dependencies Only

**Pros**: Simple package.json configuration  
**Cons**: Doesn't guarantee singleton in all bundler scenarios  
**Use Case**: Works for some cases but not reliable across all build tools

## Why This Solution Works

1. **`globalThis` is shared** across all JavaScript modules in the same runtime
2. **Bundlers preserve globals** - they don't duplicate global references
3. **Simple and reliable** - no complex build configuration needed
4. **Works everywhere** - compatible with all bundlers (Webpack, Vite, Rollup, etc.)
5. **TypeScript-safe** - proper type declarations included

## Related Files

- [`src/useChat.ts`](./src/useChat.ts) - Core implementation
- [`src/index.ts`](./src/index.ts) - Exported functions
- [`tests/setup.ts`](./tests/setup.ts) - Test configuration with store reset

## Questions?

If you encounter issues with the singleton pattern:

1. Check console logs for multiple "Creating NEW global chatStore instance" messages
2. Verify `npm ls zustand` shows only one installation
3. Ensure `useDittoChat()` is called before `useDittoChatStore()`
4. Check that your bundler isn't creating separate runtime chunks
