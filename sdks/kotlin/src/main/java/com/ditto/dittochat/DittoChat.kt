package com.ditto.dittochat

import android.content.Context
import android.os.Bundle
import com.google.gson.Gson
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import java.util.Date
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

interface DittoChat {
    suspend fun createRoom(config: RoomConfig): String
    suspend fun createMessage(config: MessageConfig)
    fun setCurrentUser(config: UserConfig)

    val publicRoomsFlow: Flow<List<Room>>
    val hasAdminPrivileges: Boolean
    val retentionPolicy: ChatRetentionPolicy
    val acceptLargeImages: Boolean
    val primaryColor: String?

    val localStore: LocalData
    val p2pStore: DittoData
    suspend fun readRoomById(id: String): Room
    fun allUsersFlow(): Flow<List<ChatUser>>

    suspend fun updateRoom(room: Room)
    fun logout()

    // -----------------------------------------------------------------------------------------
    // Read receipts & unread counts
    // -----------------------------------------------------------------------------------------

    /**
     * Marks [roomId] as read for the current user by setting their
     * `subscriptions[roomId]` to `Date()`. Subsequent calls to
     * [unreadMessagesCountFlow] for that room emit `0` until new messages arrive.
     */
    suspend fun markRoomAsRead(roomId: String)

    /**
     * Emits the count of unread messages in [room] for the current user.
     *
     * Derived from the current user's `subscriptions[room.id]` last-read timestamp.
     * Messages authored by the current user and archived messages are excluded.
     * If the user has no last-read timestamp for the room (never opened it or not
     * subscribed), the count is `0`.
     */
    fun unreadMessagesCountFlow(room: Room): Flow<Int>

    /**
     * Emits a `Map<userId, lastReadDate>` describing which users have read up to
     * what point in [room]. A user appears in the map only if they have a non-null
     * last-read timestamp for the room — i.e. they have opened it at least once
     * since the SDK started tracking reads.
     *
     * To render a "read by" indicator on a message, compare each user's last-read
     * date to the message's `createdOn`: if `lastRead >= createdOn`, the user has
     * seen the message.
     */
    fun readReceiptsFlow(room: Room): Flow<Map<String, Date>>

    // -----------------------------------------------------------------------------------------
    // Push notifications
    // -----------------------------------------------------------------------------------------

    /**
     * Optional delegate that receives callbacks for outgoing chat events so the host app
     * can forward them to a push server (FCM). Held with a strong reference — the caller
     * controls its lifetime.
     */
    var pushNotificationDelegate: DittoChatPushNotificationDelegate?

    /**
     * The FCM registration token set by [registerDeviceToken]. Null until the host app
     * provides a token.
     */
    val deviceToken: String?

    /**
     * Stores the FCM registration token so it is available when building push payloads.
     *
     * Call this from your `FirebaseMessagingService.onNewToken` override:
     * ```kotlin
     * override fun onNewToken(token: String) {
     *     dittoChat.registerDeviceToken(token)
     * }
     * ```
     */
    fun registerDeviceToken(token: String)

    /**
     * Interprets an incoming notification's extras and returns the navigation action.
     *
     * Pass the [Bundle] from `intent.extras` (in `Activity.onCreate` or `onNewIntent`):
     * ```kotlin
     * val action = dittoChat.handleNotification(intent.extras)
     * when (action) {
     *     is DittoChatNotificationAction.OpenRoom    -> navTo("chatroom/${action.roomId}")
     *     is DittoChatNotificationAction.OpenMessage -> navTo("chatroom/${action.roomId}")
     *     is DittoChatNotificationAction.None        -> { }
     * }
     * ```
     */
    fun handleNotification(extras: Bundle?): DittoChatNotificationAction
}

@Singleton
class DittoChatImpl private constructor(
    private val context: Context,
    private val ditto: live.ditto.Ditto?,
    override val retentionPolicy: ChatRetentionPolicy,
    private val usersCollection: String,
    private val userId: String?,
    private val userEmail: String?,
    override val hasAdminPrivileges: Boolean,
    override val acceptLargeImages: Boolean,
    override val primaryColor: String?,
    override val localStore: LocalData,
    override val p2pStore: DittoData
) : DittoChat {

    override val publicRoomsFlow: Flow<List<Room>>
        get() = p2pStore.publicRoomsFlow

    var currentUserId: String?
        get() = localStore.currentUserId
        set(value) {
            localStore.currentUserId = value
        }

    // -----------------------------------------------------------------------------------------
    // Push notifications
    // -----------------------------------------------------------------------------------------

    override var pushNotificationDelegate: DittoChatPushNotificationDelegate? = null
    override var deviceToken: String? = null
        private set

    override fun registerDeviceToken(token: String) {
        deviceToken = token
    }

    override fun handleNotification(extras: Bundle?): DittoChatNotificationAction {
        val roomId = extras?.getString(DittoChatNotificationKey.ROOM_ID)
            ?: return DittoChatNotificationAction.None
        val messageId = extras.getString(DittoChatNotificationKey.MESSAGE_ID)
        return if (messageId != null) {
            DittoChatNotificationAction.OpenMessage(roomId, messageId)
        } else {
            DittoChatNotificationAction.OpenRoom(roomId)
        }
    }

    // -----------------------------------------------------------------------------------------
    // Notification manager
    // -----------------------------------------------------------------------------------------

    private val notificationManager = ChatNotificationManager(context, ditto!!, localStore)

    /** Scope used solely to collect [publicRoomsFlow] and keep [notificationManager] in sync. */
    private val notificationScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    // -----------------------------------------------------------------------------------------
    // Init
    // -----------------------------------------------------------------------------------------

    init {
        userId?.let { setCurrentUser(UserConfig(it)) }
        userEmail?.let {
            // Setup roles subscription if needed
        }

        // Keep ChatNotificationManager in sync with the live rooms list.
        notificationScope.launch {
            p2pStore.publicRoomsFlow.collect { rooms ->
                notificationManager.syncRooms(rooms)
            }
        }
    }

    // -----------------------------------------------------------------------------------------
    // DittoChat interface
    // -----------------------------------------------------------------------------------------

    override suspend fun createRoom(config: RoomConfig): String {
        val room = p2pStore.createRoom(config.id, config.name, config.isGenerated)
            ?: throw Exception("Room creation failed")
        return room
    }

    override suspend fun createMessage(config: MessageConfig) {
        val room = readRoomById(config.roomId)
        p2pStore.createMessage(room, config.message)
        pushNotificationDelegate?.dittoChat(this, config.message, room)
    }

    override fun setCurrentUser(config: UserConfig) {
        currentUserId = config.id
    }

    override suspend fun readRoomById(id: String): Room {
        return p2pStore.findPublicRoomById(id)
            ?: throw Exception("Room not found")
    }

    override fun allUsersFlow(): Flow<List<ChatUser>> {
        return p2pStore.allUsersFlow()
    }

    override suspend fun updateRoom(room: Room) {
        // Implementation needed
    }

    override fun logout() {
        notificationManager.stopAll()
        notificationScope.cancel()
        p2pStore.logout()
    }

    // -----------------------------------------------------------------------------------------
    // Read receipts & unread counts
    // -----------------------------------------------------------------------------------------

    override suspend fun markRoomAsRead(roomId: String) {
        val userId = currentUserId ?: return
        try {
            val user = p2pStore.findUserById(userId, usersCollection)
            val subs = user.subscriptions?.toMutableMap() ?: mutableMapOf()
            subs[roomId] = Date()
            p2pStore.updateUser(id = userId, subscriptions = subs)
        } catch (e: Exception) {
            // User not found yet — nothing to mark as read.
        }
    }

    override fun unreadMessagesCountFlow(room: Room): Flow<Int> {
        return combine(
            p2pStore.messagesFlow(room, null),
            p2pStore.currentUserFlow()
        ) { messages, currentUser ->
            val user = currentUser ?: return@combine 0
            val lastRead = user.subscriptions?.get(room.id) ?: return@combine 0
            messages.count { msg ->
                !msg.isArchived
                    && msg.userId != user.id
                    && (DateUtils.fromISOString(msg.createdOn)?.after(lastRead) == true)
            }
        }.distinctUntilChanged()
    }

    override fun readReceiptsFlow(room: Room): Flow<Map<String, Date>> {
        return p2pStore.allUsersFlow().map { users ->
            users.mapNotNull { user ->
                user.subscriptions?.get(room.id)?.let { date -> user.id to date }
            }.toMap()
        }.distinctUntilChanged()
    }

    fun archiveRoom(room: Room) {
        p2pStore.archiveRoom(room)
    }

    fun unarchiveRoom(room: Room) {
        p2pStore.unarchiveRoom(room)
    }

    fun archivedPublicRoomsFlow(): Flow<List<Room>> {
        return localStore.archivedPublicRoomsFlow
    }

    suspend fun createImageMessage(room: Room, imageData: ByteArray, text: String?) {
        p2pStore.createImageMessage(room, imageData, text)
        pushNotificationDelegate?.dittoChat(this, room)
    }

    suspend fun saveEditedTextMessage(message: Message, room: Room) {
        p2pStore.saveEditedTextMessage(message, room)
    }

    suspend fun saveDeletedImageMessage(message: Message, room: Room) {
        p2pStore.saveDeletedImageMessage(message, room)
    }

    fun messageFlow(msgId: String, collectionId: String): Flow<Message?> {
        return p2pStore.messageFlow(msgId, collectionId)
    }

    fun messagesFlow(room: Room, retentionDays: Int?): Flow<List<Message>> {
        return p2pStore.messagesFlow(room, retentionDays)
    }

    fun currentUserFlow(): Flow<ChatUser?> {
        return p2pStore.currentUserFlow()
    }

    suspend fun addUser(user: ChatUser) {
        p2pStore.addUser(user)
    }

    suspend fun updateUser(
        id: String,
        name: String? = null,
        subscriptions: Map<String, Date?>? = null,
        mentions: Map<String, List<String>>? = null
    ) {
        p2pStore.updateUser(id, name, subscriptions, mentions)
    }

    suspend fun saveCurrentUser(name: String) {
        if (currentUserId == null) {
            currentUserId = UUID.randomUUID().toString()
        }

        val user = ChatUser(
            id = currentUserId!!,
            name = name,
            subscriptions = emptyMap(),
            mentions = emptyMap()
        )
        p2pStore.addUser(user)
    }

    fun setCurrentUser(id: String) {
        currentUserId = id
    }

    val sdkVersion: String
        get() = p2pStore.sdkVersion

    val peerKeyString: String
        get() = p2pStore.peerKeyString

    // -----------------------------------------------------------------------------------------
    // Builder
    // -----------------------------------------------------------------------------------------

    /**
     * Fluent builder for [DittoChatImpl].
     *
     * When using Hilt, inject [Builder] directly — [Context] is provided automatically.
     * Without Hilt, use the [companion factory][DittoChatImpl.builder]:
     * ```kotlin
     * val chat = DittoChatImpl.builder(localStore, applicationContext)
     *     .setDitto(ditto)
     *     .setUserId(userId)
     *     .build()
     * ```
     */
    class Builder @Inject constructor(
        private val localStore: LocalData,
        @ApplicationContext private val context: Context
    ) {
        private var ditto: live.ditto.Ditto? = null
        var retentionPolicy: ChatRetentionPolicy = ChatRetentionPolicy(days = 30)
            private set
        var usersCollection: String = "users"
            private set
        var userId: String? = null
            private set
        var hasAdminPrivileges: Boolean = false
            private set
        var userEmail: String? = null
            private set
        var acceptLargeImages: Boolean = true
            private set
        var primaryColor: String? = null
            private set
        private var pushNotificationDelegate: DittoChatPushNotificationDelegate? = null

        fun setDitto(ditto: live.ditto.Ditto) = apply {
            this.ditto = ditto
        }

        fun setRetentionPolicy(policy: ChatRetentionPolicy) = apply {
            this.retentionPolicy = policy
        }

        fun setRetentionDays(days: Int) = apply {
            this.retentionPolicy = ChatRetentionPolicy(days = days)
        }

        fun setUsersCollection(collection: String) = apply {
            this.usersCollection = collection
        }

        fun setUserId(id: String?) = apply {
            this.userId = id
        }

        fun setUserEmail(email: String?) = apply {
            this.userEmail = email
        }

        fun setHasAdminPrivileges(hasAdminPrivileges: Boolean) = apply {
            this.hasAdminPrivileges = hasAdminPrivileges
        }

        fun setAcceptLargeImages(accept: Boolean) = apply {
            this.acceptLargeImages = accept
        }

        fun setPrimaryColor(color: String?) = apply {
            this.primaryColor = color
        }

        /**
         * Sets the delegate that receives callbacks for outgoing chat events so the host app
         * can forward them to a push server (FCM).
         */
        fun setPushNotificationDelegate(delegate: DittoChatPushNotificationDelegate?) = apply {
            this.pushNotificationDelegate = delegate
        }

        fun build(): DittoChatImpl {
            requireNotNull(ditto) { "Ditto instance is required" }

            val dittoStore = DittoDataImpl(
                privateStore = localStore,
                ditto = ditto!!,
                usersCollection = usersCollection,
                chatRetentionPolicy = retentionPolicy
            )

            return DittoChatImpl(
                context = context,
                ditto = ditto,
                retentionPolicy = retentionPolicy,
                usersCollection = usersCollection,
                userId = userId,
                userEmail = userEmail,
                hasAdminPrivileges = hasAdminPrivileges,
                acceptLargeImages = acceptLargeImages,
                primaryColor = primaryColor,
                localStore = localStore,
                p2pStore = dittoStore
            ).also { impl ->
                impl.pushNotificationDelegate = pushNotificationDelegate
            }
        }
    }

    companion object {
        /** Non-Hilt factory. [context] should be the Application context. */
        fun builder(localStore: LocalData, context: Context): Builder {
            return Builder(localStore, context)
        }
    }
}
