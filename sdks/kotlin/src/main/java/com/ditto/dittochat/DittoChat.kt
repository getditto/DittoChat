package com.ditto.dittochat

import android.content.Context
import com.google.gson.Gson
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.flow.Flow
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
}

@Singleton
class DittoChatImpl private constructor(
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

    init {
        userId?.let { setCurrentUser(UserConfig(it)) }
        userEmail?.let {
            // Setup roles subscription if needed
        }
    }

    override suspend fun createRoom(config: RoomConfig): String {
        val room = p2pStore.createRoom(config.id, config.name, config.isGenerated)
            ?: throw Exception("Room creation failed")
        return room
    }

    override suspend fun createMessage(config: MessageConfig) {
        val room = readRoomById(config.roomId)
        p2pStore.createMessage(room, config.message)
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
        p2pStore.logout()
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

    // Builder Pattern
    class Builder @Inject constructor(
        private val localStore: LocalData
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

        fun build(): DittoChatImpl {
            requireNotNull(ditto) { "Ditto instance is required" }

            val dittoStore = DittoDataImpl(
                privateStore = localStore,
                ditto = ditto!!,
                usersCollection = usersCollection,
                chatRetentionPolicy = retentionPolicy
            )

            return DittoChatImpl(
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
            )
        }
    }

    companion object {
        fun builder(localStore: LocalData): Builder {
            return Builder(localStore)
        }
    }
}
