//
//  ChatNotificationManager.swift
//  DittoChatCore
//
//  Copyright © 2025 DittoLive Incorporated. All rights reserved.
//

@preconcurrency import DittoSwift
import Foundation
import UserNotifications

/// Observes Ditto message collections and posts local `UNUserNotification`s when new
/// messages arrive in rooms the current user has access to.
///
/// ## Background operation
///
/// Each room uses a raw `DittoStoreObserver` (not a Combine publisher) so that callbacks
/// continue firing while the app is backgrounded. `DittoStoreObserver` objects are held
/// strongly in `roomObservers` — releasing an observer cancels its subscription, so the
/// dictionary must remain alive for as long as notifications are needed.
///
/// `UNUserNotificationCenter.add(_:withCompletionHandler:)` works from any thread and from
/// background app state, so notifications are posted directly inside the observer callback.
///
/// ## What gets notified
///
/// - Only messages with `createdOn` after the manager was initialized (avoids replaying history).
/// - Only messages from other users (never from the current user's own `userId`).
/// - Never for archived / deleted messages.
/// - Each message ID is tracked in `notifiedMessageIds` so duplicate callbacks don't
///   produce duplicate banners.
@MainActor
final class ChatNotificationManager {

    // MARK: - Private State

    private weak var ditto: Ditto?
    private let localStore: LocalDataInterface

    /// One `DittoStoreObserver` per observed room. Must be retained — releasing an entry
    /// cancels that room's Ditto observation.
    private var roomObservers: [String: DittoStoreObserver] = [:]

    /// Message IDs for which a local notification has already been posted this session.
    private var notifiedMessageIds: Set<String> = []

    /// Messages created before this instant are treated as historical and never notified.
    private let startTime = Date()

    // MARK: - Init

    init(ditto: Ditto?, localStore: LocalDataInterface) {
        self.ditto = ditto
        self.localStore = localStore
        requestAuthorization()
    }

    // MARK: - Room Sync

    /// Reconciles the observed set against `rooms`:
    /// starts observers for rooms not yet watched, cancels observers for rooms no longer present.
    ///
    /// Call this whenever the public rooms list changes.
    func syncRooms(_ rooms: [Room]) {
        let newIds = Set(rooms.map(\.id))
        let currentIds = Set(roomObservers.keys)

        for roomId in currentIds.subtracting(newIds) {
            stopObserving(roomId: roomId)
        }
        for room in rooms where !currentIds.contains(room.id) {
            startObserving(room: room)
        }
    }

    /// Cancels all active observers and clears state. Call from `DittoChat.logout()`.
    func stopAll() {
        roomObservers.removeAll()   // releasing DittoStoreObservers cancels each subscription
        notifiedMessageIds.removeAll()
    }

    // MARK: - Observation

    private func startObserving(room: Room) {
        guard let ditto, roomObservers[room.id] == nil else { return }

        let query = """
            SELECT * FROM `\(room.messagesId)`
            WHERE roomId == :roomId
            ORDER BY createdOn DESC
            LIMIT 50
            """

        // Pass self as nonisolated(unsafe) to remove it from the @MainActor region before
        // it crosses into makeObserver. Swift 6.3 region isolation flags `self` as a sending
        // value when it flows from an @MainActor method into a nonisolated one; the
        // nonisolated(unsafe) local opts the reference out of that tracking entirely.
        nonisolated(unsafe) let unsafeSelf: ChatNotificationManager = self

        do {
            // registerObserver is called from a nonisolated helper so that the closure passed
            // to Ditto is created in a nonisolated context. Swift 6.3 injects
            // _swift_task_checkIsolatedSwift into the prologue of any closure created inside an
            // @MainActor method — crashing when Ditto delivers the callback on utility-qos.
            let observer = try makeObserver(store: ditto.store, query: query,
                                            roomId: room.id, roomName: room.name,
                                            owner: unsafeSelf)
            roomObservers[room.id] = observer
        } catch {
            print("ChatNotificationManager: failed to register observer for room \(room.id): \(error)")
        }
    }

    /// Creates and registers a Ditto store observer from a `nonisolated` context.
    /// Closures defined here carry no `@MainActor` coloring, so Swift 6.3 does not inject
    /// actor-isolation checks into their prologues.
    nonisolated private func makeObserver(
        store: DittoStore,
        query: String,
        roomId: String,
        roomName: String,
        owner: ChatNotificationManager
    ) throws -> DittoStoreObserver {
        nonisolated(unsafe) weak var weakOwner: ChatNotificationManager? = owner
        return try store.registerObserver(query: query, arguments: ["roomId": roomId]) { result in
            let messages = result.items.compactMap { Message(value: $0.value) }
            DispatchQueue.main.async {
                MainActor.assumeIsolated {
                    weakOwner?.handle(messages: messages, roomId: roomId, roomName: roomName)
                }
            }
        }
    }

    private func stopObserving(roomId: String) {
        roomObservers.removeValue(forKey: roomId)   // releasing cancels the Ditto subscription
    }

    // MARK: - Notification Logic

    private func handle(messages: [Message], roomId: String, roomName: String) {
        let currentUserId = localStore.currentUserId
        let cutoff = startTime

        let incoming = messages.filter { msg in
            msg.userId != currentUserId        // not from the local user
            && msg.createdOn > cutoff           // not historical
            && !msg.isArchived                  // not a tombstoned / deleted message
            && !notifiedMessageIds.contains(msg.id)
        }

        for msg in incoming {
            notifiedMessageIds.insert(msg.id)
            postNotification(for: msg, roomName: roomName, roomId: roomId)
        }
    }

    private func postNotification(for message: Message, roomName: String, roomId: String) {
        let content = UNMutableNotificationContent()
        content.title = roomName
        content.body = message.isImageMessage ? "Sent an image" : message.text
        content.sound = .default
        // Embed DittoChat navigation keys so the host app can route on tap.
        content.userInfo = [
            DittoChatNotificationKey.roomId: roomId,
            DittoChatNotificationKey.messageId: message.id
        ]

        let request = UNNotificationRequest(
            identifier: "dittochat-msg-\(message.id)",
            content: content,
            trigger: nil    // deliver immediately
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error {
                print("ChatNotificationManager: failed to schedule notification: \(error)")
            }
        }
    }

    // MARK: - Authorization

    private func requestAuthorization() {
        UNUserNotificationCenter.current()
            .requestAuthorization(options: [.alert, .sound, .badge]) { _, error in
                if let error {
                    print("ChatNotificationManager: authorization error: \(error)")
                }
            }
    }
}
