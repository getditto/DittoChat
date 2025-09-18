package com.ditto.dittochat

import android.content.Context
import com.google.gson.Gson
import kotlinx.coroutines.flow.Flow
import java.util.Date
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

interface DittoChat {
    suspend fun createRoom(config: RoomConfig): String
    suspend fun createMessage(config: MessageConfig)
    fun setCurrentUser(config: UserConfig)

    val publicRoomsFlow: kotlinx.coroutines.flow.Flow<List<Room>>
    suspend fun readRoomById(id: String): Room
    fun allUsersFlow(): kotlinx.coroutines.flow.Flow<List<ChatUser>>

    suspend fun updateRoom(room: Room)
    fun logout()
}

@Singleton
internal class DittoChatImpl @Inject constructor(
    private val localStore: LocalData,
    private val p2pStore: DittoData
) : DittoChat {

    constructor(context: Context, config: ChatConfig) : this(
        localStore = LocalService(context, Gson()),
        p2pStore = DittoDataImpl(
            privateStore = LocalService(context, Gson()),
            ditto = config.ditto,
            gson = Gson(),
            usersCollection = config.usersCollection,
            chatRetentionPolicy = config.retentionPolicy
        )
    ) {
        config.userId?.let {
            setCurrentUser(UserConfig(it))
        }
    }

    override val publicRoomsFlow: Flow<List<Room>>
        get() = p2pStore.publicRoomsFlow

    var currentUserId: String?
        get() = localStore.currentUserId
        set(value) {
            localStore.currentUserId = value
        }

    override suspend fun createRoom(config: RoomConfig): String {
        return p2pStore.createRoom(config.id, config.name, config.isGenerated)
            ?: throw Exception("Room creation failed")
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
}