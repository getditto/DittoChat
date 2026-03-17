//
//  DittoChatPushNotification.swift
//  DittoChatCore
//
//  Copyright © 2025 DittoLive Incorporated. All rights reserved.
//

import Foundation

// MARK: - Notification Payload Keys

/// Keys used in the `userInfo` dictionary of push notifications sent by DittoChat-enabled apps.
///
/// When your push server sends a notification for a chat event, include these keys in the
/// `userInfo` payload. Pass the received `userInfo` to `DittoChat.handleNotification(userInfo:)`
/// so the SDK can return the appropriate navigation action.
///
/// ```json
/// {
///   "dittoChatRoomId": "<room-id>",
///   "dittoChatMessageId": "<message-id>"
/// }
/// ```
public enum DittoChatNotificationKey {
    /// The ID of the room associated with the notification.
    public static let roomId = "dittoChatRoomId"
    /// The ID of the specific message associated with the notification.
    public static let messageId = "dittoChatMessageId"
}

// MARK: - Notification Action

/// The navigation action to take in response to an incoming push notification.
///
/// Returned by `DittoChat.handleNotification(userInfo:)`. Use the associated values
/// to drive your app's navigation stack.
public enum DittoChatNotificationAction {
    /// Navigate to the chat room with the given ID.
    case openRoom(id: String)
    /// Navigate to a specific message within a room.
    case openMessage(roomId: String, messageId: String)
    /// The notification payload did not contain recognized DittoChat keys.
    case none
}

// MARK: - Push Notification Delegate

/// Implement this protocol to receive callbacks when local chat events occur that
/// should result in a push notification being sent to other room members.
///
/// The SDK does not send push notifications directly — APNs requires a server-side
/// component. Instead, the SDK calls these methods so that your app (or push server)
/// can compose and deliver the notification.
///
/// All methods are called on the main thread. Default no-op implementations are
/// provided via a protocol extension, so you only need to implement the methods
/// relevant to your use case.
///
/// ## Usage
///
/// ```swift
/// class MyPushHandler: DittoChatPushNotificationDelegate {
///     func dittoChat(_ dittoChat: DittoChat, didSendMessage text: String, inRoom room: Room) {
///         MyPushServer.send(body: text, toRoomId: room.id)
///     }
/// }
///
/// let chat = try DittoChat.builder()
///     .setDitto(ditto)
///     .setUserId("user-123")
///     .setPushNotificationDelegate(myHandler)
///     .build()
/// ```
@MainActor
public protocol DittoChatPushNotificationDelegate: AnyObject {
    /// Called when the local user sends a text message.
    ///
    /// Use this to forward the event to your push server, which can then deliver
    /// an APNs notification to other members of the room.
    ///
    /// - Parameters:
    ///   - dittoChat: The `DittoChat` instance that sent the message.
    ///   - text: The message text.
    ///   - room: The room the message was sent in.
    func dittoChat(_ dittoChat: DittoChat, didSendMessage text: String, inRoom room: Room)

    /// Called when the local user sends an image message.
    ///
    /// - Parameters:
    ///   - dittoChat: The `DittoChat` instance that sent the message.
    ///   - room: The room the image was sent in.
    func dittoChat(_ dittoChat: DittoChat, didSendImageMessageInRoom room: Room)
}

/// Default no-op implementations. Conform to only the methods you need.
public extension DittoChatPushNotificationDelegate {
    func dittoChat(_ dittoChat: DittoChat, didSendMessage text: String, inRoom room: Room) {}
    func dittoChat(_ dittoChat: DittoChat, didSendImageMessageInRoom room: Room) {}
}
