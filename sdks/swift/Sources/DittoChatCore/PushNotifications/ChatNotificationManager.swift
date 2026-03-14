//
//  ChatNotificationManager.swift
//  DittoChatCore
//
//  Copyright © 2025 DittoLive Incorporated. All rights reserved.
//

import DittoSwift
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

        // Query the most recent 50 messages; no attachment tokens needed for text preview.
        let query = """
            SELECT * FROM `\(room.messagesId)`
            WHERE roomId == :roomId
            ORDER BY createdOn DESC
            LIMIT 50
            """

        let roomId = room.id
        let roomName = room.name

        do {
            // deliverOn: .main keeps this @MainActor-safe and consistent with the rest of the SDK.
            // On iOS, the main RunLoop continues while the app is backgrounded, so callbacks fire.
            let observer = try ditto.store.registerObserver(
                query: query,
                arguments: ["roomId": roomId],
                deliverOn: .main
            ) { [weak self] result in
                guard let self else { return }
                let messages = result.items.compactMap { Message(value: $0.value) }
                self.handle(messages: messages, roomId: roomId, roomName: roomName)
            }
            roomObservers[room.id] = observer
        } catch {
            print("ChatNotificationManager: failed to register observer for room \(roomId): \(error)")
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
