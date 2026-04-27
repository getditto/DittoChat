# DittoChat Swift SDK — Architecture & Patterns

## Overview

The Swift SDK is split into two SPM library targets:

- **DittoChatCore** — Data models, services, protocols, and the public API. No UI dependencies.
- **DittoChatUI** — SwiftUI screens and view models that consume `DittoChatCore`.

Both targets live under `Sources/`.

---

## Module Structure

```
Sources/
├── DittoChatCore/
│   ├── DittoChat.swift           # Main public class + builder
│   ├── Data/
│   │   ├── DittoService.swift    # Ditto sync engine adapter
│   │   └── LocalService.swift    # UserDefaults adapter
│   ├── Models/
│   │   ├── Room.swift
│   │   ├── Message.swift
│   │   ├── ChatUser.swift
│   │   └── MessageWithUser.swift
│   ├── ErrorHandling/
│   │   └── AppError.swift
│   └── Utilities/
│       ├── Publishers.swift      # DittoDecodable + DittoStore extensions
│       ├── Concurrency.swift     # asyncMap Publisher bridge
│       └── TemporaryFile.swift
└── DittoChatUI/
    ├── DittoChatUI.swift         # UI factory class
    └── Screens/
        ├── ChatScreen/           # Main messaging UI (7 files)
        ├── RoomsListScreen/      # Room list (3 files)
        ├── RoomEditScreen/       # Room creation (2 files)
        ├── MessageEditView/      # Message editing (2 files)
        └── ErrorScreen/          # Error handling UI (2 files)
```

---

## Key Architectural Patterns

### 1. Builder Pattern for Initialization

`DittoChatBuilder` provides a fluent, chainable API. All setters return `Self` and are marked `@discardableResult`. The `build()` method validates required fields and throws `BuilderError` if any are missing.

```swift
let chat = try DittoChat.builder()
    .setDitto(ditto)           // required
    .setUserId("user-123")     // required
    .setUserEmail("u@example.com")
    .setRetentionDays(30)
    .setAcceptLargeImages(true)
    .setPrimaryColor("#FF5733")
    .build()
```

Entry point is `DittoChat.builder()` (static factory). Never instantiate `DittoChatBuilder` directly.

### 2. Protocol-Based Abstraction

Three key protocols decouple consumers from implementations:

| Protocol | Implementation | Purpose |
|---|---|---|
| `DittoSwiftChat` | `DittoChat` | Public SDK contract |
| `DittoDataInterface` | `DittoService` | Ditto sync engine adapter |
| `LocalDataInterface` | `LocalService` | UserDefaults persistence adapter |

Add new data sources or swap implementations by conforming to these protocols — the rest of the SDK is unaffected.

### 3. MVVM with Combine + SwiftUI

All ViewModels:
- Are marked `@MainActor` (thread safety for UI state)
- Inherit from `ObservableObject`
- Use `@Published` properties for reactive updates

Views use `@StateObject` (ownership) or `@ObservedObject` (injection) to bind to ViewModels. Views never contain business logic.

```
DittoService (Combine publishers)
  └─> DittoChat (aggregates, transforms)
        └─> ViewModel @Published properties
              └─> SwiftUI View re-renders
```

### 4. Combine for Reactive Data Streams

All data is exposed as Combine publishers, never returned synchronously. Key patterns used:

- `CurrentValueSubject` — state that has a current value (rooms list, current user)
- `PassthroughSubject` — event-only streams
- `combineLatest()` — merge rooms + archival state into a single stream
- `removeDuplicates()` — prevent redundant UI updates

Publishers from `DittoService` flow up through `DittoChat` and into ViewModels via `.sink` or `.assign(to:)` in `onAppear`/`init`.

### 5. Custom `DittoDecodable` Protocol

Ditto returns documents as `[String: Any?]` dictionaries. Rather than using `Codable` (which Ditto doesn't natively support), models implement `DittoDecodable`:

```swift
protocol DittoDecodable {
    init(value: [String: Any?])
}
```

All models (`Room`, `Message`, `ChatUser`) conform to this. The `DittoStore` extension `observePublisher(query:mapTo:)` automatically maps raw Ditto results into strongly-typed model arrays.

### 6. Async/Await + Combine Bridging

Long-running operations (file I/O, attachment fetches) use `async/await`. The `asyncMap` Publisher extension bridges async work back into a Combine pipeline:

```swift
// In Concurrency.swift
extension Publisher {
    @MainActor
    func asyncMap<T>(
        _ transform: @escaping (Output) async throws -> T
    ) -> Publishers.FlatMap<Future<T, Error>, Self>
}
```

Use this any time you need to call an `async` function inside a `.map` on a publisher.

---

## Data Models

All models are value types (`struct`) and `Identifiable`. Key fields:

**`Room`** — `id`, `name`, `messagesId` (Ditto collection for its messages), `createdBy`, `createdOn`, `isGenerated`

**`Message`** — `id`, `roomId`, `text`, `userId`, `createdOn`, `largeImageToken`, `thumbnailImageToken`, `archivedMessage` (tombstone for soft deletes), `isArchived` (computed)

**`ChatUser`** — `id`, `name`, `subscriptions: [roomId: Date?]`, `mentions: [roomId: [userId]]`

**`MessageWithUser`** — value object composing `Message` + `ChatUser`; used in UI to avoid repeated lookups.

---

## Ditto Integration

### DQL (Ditto Query Language)

Use DQL strings directly. Collections for chat are `rooms`, `users`, and per-room message collections (identified by `room.messagesId`). Collection names with special characters are backtick-quoted.

```swift
// Example queries used in DittoService
"SELECT * FROM `rooms` ORDER BY createdOn ASC"
"SELECT * FROM `messages` WHERE roomId == :roomId ORDER BY createdOn ASC"
"SELECT * FROM COLLECTION `users` (`subscriptions` MAP, `mentions` MAP) WHERE _id = :id"
```

- Use named parameters (`:paramName`) — never interpolate values into query strings.
- `MAP` type hint is required for `subscriptions` and `mentions` fields.

### Upserts

Use `INSERT ... ON ID CONFLICT DO UPDATE` for all create/update operations that need idempotency (creating rooms, setting user data).

### Attachments

Images flow through Ditto's attachment API:
1. `ditto.store.newAttachment(path:metadata:)` — creates attachment from file path
2. Store the returned token in `largeImageToken` / `thumbnailImageToken` on the message document
3. Fetch later via `fetchAttachment(token:deliverOn:onFetchEvent:)` with progress tracking

Deleted image messages are tombstoned by nulling out both tokens and setting `archivedMessage`.

### Subscriptions

Register Ditto subscriptions in `DittoService` for each collection the app needs to sync. Subscriptions must be explicitly cancelled in `logout()`. Never leave dangling subscriptions.

---

## Error Handling

| Type | Usage |
|---|---|
| `AppError` | General feature and QR code errors |
| `AttachmentError` | Image attachment failures |
| `DittoChatBuilder.BuilderError` | Missing required builder fields |

In the UI layer, errors flow through `ErrorHandler` (an `ObservableObject`) and are surfaced via the `View.withErrorHandling()` extension modifier. ViewModels catch thrown errors and forward them to `ErrorHandler`.

---

## UI Factory (`DittoChatUI`)

`DittoChatUI` wraps a `DittoChat` instance and acts as a factory for top-level SwiftUI views:

```swift
let ui = DittoChatUI(dittoChatCore: chat)
ui.roomsView()          // AnyView — rooms list
ui.roomView(room)       // AnyView — chat screen for a room
ui.readRoomById(id)     // AnyView? — chat screen by room ID
```

Consumers embed these views into their own SwiftUI hierarchy. The views own their ViewModels via `@StateObject`.

---

## Threading Conventions

- All ViewModels and `DittoChat` are `@MainActor` — they may be accessed from the main thread only.
- `DittoService` callbacks are dispatched to `.main` via `.receive(on: DispatchQueue.main)` before being delivered to subscribers.
- Use `Task { @MainActor in ... }` when bridging from background async work back to ViewModel state.

---

## Local Notifications (Incoming Messages)

`ChatNotificationManager` (internal) automatically posts `UNUserNotification`s when new messages arrive in synced rooms. It is created inside `DittoChat.init` and requires no configuration by the host app beyond ensuring the app has the necessary background modes.

### How it works

```
Ditto sync engine receives new message document
  └─> DittoStoreObserver callback fires (even when app is backgrounded)
        └─> ChatNotificationManager.handle(messages:roomId:roomName:)
              └─> filters: not own message, createdOn > startTime, not archived, not yet notified
                    └─> UNUserNotificationCenter.add(request) → banner appears
```

Each room in `DittoChat.p2pStore.publicRoomsPublisher` gets its own `DittoStoreObserver` that watches the room's message collection. Observers are held strongly in `[roomId: DittoStoreObserver]` — releasing an entry cancels the subscription. The manager reconciles the observed set each time the rooms list changes.

### Why raw DittoStoreObserver instead of Combine

`Publishers.swift`'s `observePublisher` wraps `registerObserver` but does **not** retain the returned `DittoStoreObserver`. The Combine `AnyCancellable` only keeps the pipeline alive, not the underlying Ditto observation. For guaranteed background delivery, `ChatNotificationManager` calls `ditto.store.registerObserver` directly and retains each observer explicitly.

### Background operation

- `DittoStoreObserver` callbacks fire on Ditto's internal threads regardless of app state.
- `deliverOn: .main` is used so callbacks land on the main RunLoop, which iOS keeps alive during background execution.
- `UNUserNotificationCenter.add` is thread-safe and works from background state.
- The host app must enable the **Background Modes** capability with **Background fetch** and/or **Remote notifications** for Ditto sync to continue when backgrounded.

### Filtering rules

| Condition | Behaviour |
|---|---|
| `message.userId == currentUserId` | Skipped — don't notify for own messages |
| `message.createdOn <= startTime` | Skipped — don't replay history on launch |
| `message.isArchived == true` | Skipped — tombstoned / deleted messages |
| Already in `notifiedMessageIds` | Skipped — observer fires for full result set, not just deltas |

### Foreground notifications

By default iOS suppresses notification banners when the app is foreground. To display them, implement `UNUserNotificationCenterDelegate.userNotificationCenter(_:willPresent:withCompletionHandler:)` in the host app and call the handler with `.banner` and `.sound`.

### Notification payload

The `userInfo` on every posted notification contains the DittoChat navigation keys so the host app can deep-link on tap (see **Apple Push Notifications** section below):

```swift
[
  DittoChatNotificationKey.roomId: "<room-id>",
  DittoChatNotificationKey.messageId: "<message-id>"
]
```

---

## Apple Push Notifications (APNs)

The SDK does not send push notifications directly — APNs requires a server-side component. The SDK provides hooks so the host app (or its push server) can react to chat events.

### Architecture

```
DittoChat (creates message)
  └─> DittoChatPushNotificationDelegate.didSendMessage(_:inRoom:)
        └─> Host app forwards event to push server
              └─> Push server sends APNs notification
                    └─> Host app calls DittoChat.handleNotification(userInfo:)
                          └─> DittoChatNotificationAction (.openRoom / .openMessage / .none)
```

All types live in `Sources/DittoChatCore/PushNotifications/DittoChatPushNotification.swift`.

### Key Types

| Type | Purpose |
|---|---|
| `DittoChatPushNotificationDelegate` | Protocol — receives callbacks when messages are sent |
| `DittoChatNotificationAction` | Enum — navigation action derived from an incoming payload |
| `DittoChatNotificationKey` | Constants — `userInfo` dictionary keys (`dittoChatRoomId`, `dittoChatMessageId`) |

### Registering the Delegate (Builder)

```swift
let chat = try DittoChat.builder()
    .setDitto(ditto)
    .setUserId("user-123")
    .setPushNotificationDelegate(myHandler)   // optional
    .build()
```

`DittoChat` holds the delegate `weak` — the caller must retain it.

### Implementing the Delegate

Default no-op implementations are provided; only override what you need.

```swift
class MyPushHandler: DittoChatPushNotificationDelegate {
    func dittoChat(_ dittoChat: DittoChat, didSendMessage text: String, inRoom room: Room) {
        // Forward to your push server with room.id and text as the notification body
        MyPushServer.notifyRoom(id: room.id, body: text)
    }

    func dittoChat(_ dittoChat: DittoChat, didSendImageMessageInRoom room: Room) {
        MyPushServer.notifyRoom(id: room.id, body: "📷 Image")
    }
}
```

Delegate methods are called on the main thread immediately after the Ditto write is dispatched.

### Registering the Device Token

Call from `application(_:didRegisterForRemoteNotificationsWithDeviceToken:)`:

```swift
func application(_ app: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    dittoChat.registerDeviceToken(deviceToken)
    // dittoChat.deviceToken now holds the hex string
}
```

The hex token is stored in `dittoChat.deviceToken` and can be included in payloads sent to your push server.

### Handling Incoming Notifications

Call from your `UNUserNotificationCenterDelegate`:

```swift
func userNotificationCenter(_ center: UNUserNotificationCenter,
                             didReceive response: UNNotificationResponse) async {
    let action = dittoChat.handleNotification(userInfo: response.notification.request.content.userInfo)
    switch action {
    case .openRoom(let id):
        navigate(toRoomId: id)
    case .openMessage(let roomId, let messageId):
        navigate(toMessageId: messageId, inRoomId: roomId)
    case .none:
        break
    }
}
```

### Push Payload Convention

Your push server should include these keys in the `userInfo` (APN `data`) dictionary:

```json
{
  "dittoChatRoomId": "<room-id>",
  "dittoChatMessageId": "<message-id>"
}
```

`dittoChatMessageId` is optional — omitting it produces an `.openRoom` action instead of `.openMessage`.

---

## Read Receipts & Unread Counts

Both features are derived client-side from the existing per-user `ChatUser.subscriptions: [roomId: Date?]` map (the user's last-read timestamp per room). There is no per-message `readBy` field.

| API | Returns |
|---|---|
| `read(messagesForRoom:)` | Updates the current user's `subscriptions[room.id] = Date()` |
| `unreadMessagesCountPublisher(for:)` | `AnyPublisher<Int, Never>` — count of messages newer than the user's last-read timestamp, excluding own and archived |
| `readReceiptsPublisher(for:)` | `AnyPublisher<[userId: Date], Never>` — last-read timestamp per user for the room |

To render a "read by" indicator on a specific message, compare each entry in `readReceiptsPublisher` to `message.createdOn`: if `lastRead >= createdOn`, the user has seen that message. There is no way to express "user X read message A but not the older message B" in this model — users are assumed to read in chronological order.

The unread count is bounded by the same retention window as `messagesPublisher(for:retentionDays:)`.

---

## Adding New Features

1. **New model** — Add a `struct` in `DittoChatCore/Models/` conforming to `DittoDecodable` (and `Codable` if local persistence is needed).
2. **New data operation** — Add a method to `DittoDataInterface`, implement it in `DittoService`, and expose it via `DittoChat`.
3. **New screen** — Add a folder under `DittoChatUI/Screens/` with a `View` + `ViewModel` pair. The ViewModel takes `DittoChat` as a dependency. Expose via `DittoChatUI` factory if it's a top-level screen.
4. **New config option** — Add a stored property to `DittoChatBuilder`, a corresponding setter returning `Self`, and wire it through `build()` into `DittoChat`'s initializer.
