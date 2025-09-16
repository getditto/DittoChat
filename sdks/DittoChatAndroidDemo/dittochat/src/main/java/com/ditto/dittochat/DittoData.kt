package com.ditto.dittochat

import java.util.Date

interface DittoData {
    val ditto: live.ditto.Ditto
    val publicRoomsFlow: kotlinx.coroutines.flow.StateFlow<List<Room>>
    val peerKeyString: String
    val sdkVersion: String

    suspend fun room(room: Room): Room?
    suspend fun findPublicRoomById(id: String): Room?
    suspend fun createRoom(id: String?, name: String, isGenerated: Boolean): String?

    fun archiveRoom(room: Room)
    fun unarchiveRoom(room: Room)

    suspend fun createMessage(room: Room, text: String)
    suspend fun saveEditedTextMessage(message: Message, room: Room)
    suspend fun saveDeletedImageMessage(message: Message, room: Room)
    suspend fun createImageMessage(room: Room, imageData: ByteArray, text: String?)
    fun messagesFlow(room: Room, retentionDays: Int?): kotlinx.coroutines.flow.Flow<List<Message>>
    fun messageFlow(msgId: String, collectionId: String): kotlinx.coroutines.flow.Flow<Message?>
    suspend fun createUpdateMessage(document: Map<String, Any?>)

    suspend fun addUser(user: ChatUser)
    suspend fun findUserById(id: String, collection: String): ChatUser
    suspend fun updateUser(
        id: String,
        name: String? = null,
        subscriptions: Map<String, Date?>? = null,
        mentions: Map<String, List<String>>? = null
    )
    fun currentUserFlow(): kotlinx.coroutines.flow.Flow<ChatUser?>
    fun allUsersFlow(): kotlinx.coroutines.flow.Flow<List<ChatUser>>

    fun logout()
}