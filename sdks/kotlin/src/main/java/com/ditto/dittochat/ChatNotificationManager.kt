package com.ditto.dittochat

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import live.ditto.Ditto
import live.ditto.DittoStoreObserver
import java.util.concurrent.ConcurrentHashMap

/**
 * Observes Ditto message collections and posts local Android notifications when new messages
 * arrive in rooms the current user has access to.
 *
 * ## Background operation
 *
 * Each room is observed via a raw [DittoStoreObserver] held strongly in [roomObservers].
 * Because Ditto's Android SDK runs as a persistent background service, the observer callbacks
 * fire even when the host app's UI is not in the foreground — no WorkManager or
 * foreground-service boilerplate is required on the app side.
 *
 * [NotificationManagerCompat.notify] is thread-safe and works from any background thread.
 *
 * ## Filtering rules
 *
 * | Condition | Behaviour |
 * |---|---|
 * | `message.userId == currentUserId` | Skipped — don't notify for own messages |
 * | `message.createdOn <= startTime` | Skipped — don't replay history on init |
 * | `message.isArchived == true` | Skipped — tombstoned / deleted messages |
 * | Already in `notifiedMessageIds` | Skipped — observer fires for full result set, not deltas |
 *
 * ## Deep-link on tap
 *
 * Each notification carries [DittoChatNotificationKey.ROOM_ID] and
 * [DittoChatNotificationKey.MESSAGE_ID] in its [PendingIntent] extras. The host app
 * reads these via [Intent.getStringExtra] in `Activity.onNewIntent` or
 * `Activity.onCreate` and routes using [DittoChat.handleNotification].
 */
internal class ChatNotificationManager(
    private val context: Context,
    private val ditto: Ditto,
    private val localStore: LocalData
) {

    companion object {
        private const val TAG = "ChatNotificationManager"
        internal const val CHANNEL_ID = "ditto_chat_messages"
        private const val CHANNEL_NAME = "Chat Messages"
        private const val CHANNEL_DESCRIPTION = "New messages in DittoChat rooms"
    }

    // One DittoStoreObserver per room. Must be retained — releasing an entry cancels the
    // Ditto observation for that room.
    private val roomObservers = ConcurrentHashMap<String, DittoStoreObserver>()

    // Message IDs for which a notification has already been posted this session.
    private val notifiedMessageIds: MutableSet<String> = ConcurrentHashMap.newKeySet()

    // Messages with createdOn before this instant are treated as historical and never notified.
    private val startTimeMs = System.currentTimeMillis()

    init {
        createNotificationChannel()
    }

    // -----------------------------------------------------------------------------------------
    // Room sync
    // -----------------------------------------------------------------------------------------

    /**
     * Reconciles the observed set against [rooms]:
     * starts observers for rooms not yet watched, cancels observers for rooms no longer present.
     *
     * Call this whenever [DittoChatImpl.publicRoomsFlow] emits a new list.
     */
    fun syncRooms(rooms: List<Room>) {
        val newIds = rooms.map { it.id }.toSet()
        val currentIds = roomObservers.keys.toSet()

        // Stop watching rooms that are no longer in the list.
        currentIds.subtract(newIds).forEach { stopObserving(it) }

        // Start watching rooms that are new.
        rooms.filter { it.id !in currentIds }.forEach { startObserving(it) }
    }

    /**
     * Cancels all active observers and clears session state.
     * Call from [DittoChatImpl.logout].
     */
    fun stopAll() {
        roomObservers.values.forEach { it.close() }
        roomObservers.clear()
        notifiedMessageIds.clear()
    }

    // -----------------------------------------------------------------------------------------
    // Observation
    // -----------------------------------------------------------------------------------------

    private fun startObserving(room: Room) {
        if (roomObservers.containsKey(room.id)) return

        // Fetch only the most recent 50 messages; no attachment tokens needed for text preview.
        val query = """
            SELECT * FROM `${room.messagesId}`
            WHERE roomId == :roomId
            ORDER BY createdOn DESC
            LIMIT 50
        """.trimIndent()

        val roomId = room.id
        val roomName = room.name

        try {
            val observer = ditto.store.registerObserver(
                query,
                mapOf("roomId" to roomId)
            ) { result ->
                // Callback fires on Ditto's internal thread — safe to post notifications directly.
                val currentUserId = localStore.currentUserId

                val incoming = result.items.mapNotNull { item ->
                    parseSafeMessage(item.value)
                }.filter { msg ->
                    msg.userId != currentUserId                           // not own message
                        && createdAfterStart(msg.createdOn)               // not historical
                        && !msg.isArchived                                // not deleted
                        && notifiedMessageIds.add(msg.id)                 // not already notified
                }

                incoming.forEach { msg ->
                    postNotification(msg, roomName, roomId)
                }
            }
            roomObservers[roomId] = observer
        } catch (e: Exception) {
            Log.w(TAG, "Failed to register observer for room $roomId: $e")
        }
    }

    private fun stopObserving(roomId: String) {
        roomObservers.remove(roomId)?.close()
    }

    // -----------------------------------------------------------------------------------------
    // Notification posting
    // -----------------------------------------------------------------------------------------

    private fun postNotification(message: Message, roomName: String, roomId: String) {
        // Build a PendingIntent that opens the launcher Activity with room/message extras.
        // Using the launcher intent means the SDK doesn't need to reference the host app's
        // MainActivity class directly.
        val launchIntent = context.packageManager
            .getLaunchIntentForPackage(context.packageName)
            ?.apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra(DittoChatNotificationKey.ROOM_ID, roomId)
                putExtra(DittoChatNotificationKey.MESSAGE_ID, message.id)
            }

        val pendingIntent = launchIntent?.let {
            PendingIntent.getActivity(
                context,
                // Use roomId hash as request code so each room has its own back-stack entry.
                roomId.hashCode(),
                it,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        val body = if (message.isImageMessage) "Sent an image" else message.text.orEmpty()

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(roomName)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(message.id.hashCode(), notification)
        } catch (e: SecurityException) {
            // POST_NOTIFICATIONS permission has not been granted yet.
            Log.w(TAG, "Cannot post notification — POST_NOTIFICATIONS not granted: $e")
        }
    }

    // -----------------------------------------------------------------------------------------
    // Channel setup
    // -----------------------------------------------------------------------------------------

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = CHANNEL_DESCRIPTION
            }
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE)
                as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    // -----------------------------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------------------------

    /** Safely parse a raw Ditto document value into a [Message], returning null on failure. */
    @Suppress("UNCHECKED_CAST")
    private fun parseSafeMessage(value: Map<String, Any?>): Message? {
        return try {
            val id = value["_id"] as? String ?: return null
            val createdOn = value["createdOn"] as? String ?: return null
            val roomId = value["roomId"] as? String ?: return null
            Message(
                id = id,
                createdOn = createdOn,
                roomId = roomId,
                text = value["text"] as? String,
                userId = value["userId"] as? String ?: "",
                thumbnailImageToken = value["thumbnailImageToken"] as? Map<String, Any>,
                largeImageToken = value["largeImageToken"] as? Map<String, Any>,
                isArchived = value["isArchived"] as? Boolean ?: false
            )
        } catch (e: Exception) {
            null
        }
    }

    /** Returns true if the ISO-8601 [createdOn] string represents a time after [startTimeMs]. */
    private fun createdAfterStart(createdOn: String): Boolean {
        val date = DateUtils.fromISOString(createdOn) ?: return false
        return date.time > startTimeMs
    }
}
