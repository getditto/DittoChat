package com.ditto.dittochat

/**
 * Keys embedded in every local notification's [android.os.Bundle] extras and in every
 * server-side push payload. Use these constants to read values from
 * [android.content.Intent.getStringExtra] in the host app.
 */
object DittoChatNotificationKey {
    /** The ID of the DittoChat room associated with the notification. */
    const val ROOM_ID = "dittoChatRoomId"

    /** The ID of the specific message that triggered the notification. May be absent. */
    const val MESSAGE_ID = "dittoChatMessageId"
}

/**
 * Navigation action returned by [DittoChat.handleNotification].
 *
 * Use this in your notification-tap handler to route the user to the correct screen:
 *
 * ```kotlin
 * val action = dittoChat.handleNotification(intent.extras)
 * when (action) {
 *     is DittoChatNotificationAction.OpenRoom    -> navController.navigate("chatroom/${action.roomId}")
 *     is DittoChatNotificationAction.OpenMessage -> navController.navigate("chatroom/${action.roomId}")
 *     is DittoChatNotificationAction.None        -> { /* not a DittoChat notification */ }
 * }
 * ```
 */
sealed class DittoChatNotificationAction {
    /** Navigate to the room list item or the room's chat screen. */
    data class OpenRoom(val roomId: String) : DittoChatNotificationAction()

    /**
     * Navigate to the room's chat screen and scroll to / highlight the specific message.
     * [messageId] is the value of [DittoChatNotificationKey.MESSAGE_ID] in the payload.
     */
    data class OpenMessage(val roomId: String, val messageId: String) : DittoChatNotificationAction()

    /** The notification payload does not contain DittoChat routing keys — ignore it. */
    object None : DittoChatNotificationAction()
}

/**
 * Optional delegate for server-side (APNs / FCM) push notification integration.
 *
 * Implement this interface and register it via [DittoChatImpl.Builder.setPushNotificationDelegate]
 * if your backend should send push notifications when messages are created. The delegate is called
 * on the coroutine dispatcher used by [DittoChatImpl] immediately after each Ditto write.
 *
 * Default no-op implementations are provided — override only what you need.
 *
 * ### Example
 * ```kotlin
 * class MyPushHandler : DittoChatPushNotificationDelegate {
 *     override fun dittoChat(dittoChat: DittoChat, didSendMessage: String, inRoom: Room) {
 *         MyPushServer.notifyRoom(id = inRoom.id, body = didSendMessage)
 *     }
 *     override fun dittoChat(dittoChat: DittoChat, didSendImageMessageInRoom: Room) {
 *         MyPushServer.notifyRoom(id = inRoom.id, body = "📷 Image")
 *     }
 * }
 * ```
 */
interface DittoChatPushNotificationDelegate {
    fun dittoChat(dittoChat: DittoChat, didSendMessage: String, inRoom: Room) {}
    fun dittoChat(dittoChat: DittoChat, didSendImageMessageInRoom: Room) {}
}
