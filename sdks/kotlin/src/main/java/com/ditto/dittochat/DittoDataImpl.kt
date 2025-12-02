package com.ditto.dittochat

import android.util.Log
import com.google.gson.Gson
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.*
import live.ditto.*
import java.util.*
import javax.inject.Inject

class DittoDataImpl(
    private val privateStore: LocalData,
    override val ditto: Ditto,
    private val gson: Gson,
    private val usersCollection: String,
    private val chatRetentionPolicy: ChatRetentionPolicy
) : DittoData {

    private val _publicRoomsFlow = MutableStateFlow<List<Room>>(emptyList())
    override val publicRoomsFlow: StateFlow<List<Room>> = _publicRoomsFlow.asStateFlow()

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val subscriptions = mutableMapOf<String, DittoSyncSubscription>()
    private var usersSubscription: DittoSubscription? = null

    init {
        initialize()
    }

    private fun initialize() {
        scope.launch {
            createDefaultPublicRoom()

            try {
                ditto.sync.registerSubscription("SELECT * FROM `${Constants.PUBLIC_ROOMS_COLLECTION_ID}`")
            } catch (e: Exception) {
                Log.d("DITTODATA","Error subscribing to public rooms: $e")
            }

            usersSubscription = ditto.store[usersCollection].findAll().subscribe()

            updateAllPublicRooms()
        }
    }

    override val peerKeyString: String
        get() = ditto.presence.graph.localPeer.peerKeyString

    override val sdkVersion: String
        get() = Ditto.VERSION

    override suspend fun room(room: Room): Room? {
        val collectionId = room.collectionId ?: Constants.PUBLIC_ROOMS_COLLECTION_ID
        val query = "SELECT * FROM `$collectionId` WHERE _id = :id"
        val args = mapOf("id" to room.id)

        return try {
            val result = ditto.store.execute(query, args).items.firstOrNull()
            result?.let { gson.fromJson(gson.toJson(it.value), Room::class.java) }
        } catch (e: Exception) {
            Log.d("DITTODATA","room Error: $e")
            null
        }
    }

    override suspend fun findPublicRoomById(id: String): Room? {
        val actualId = if (id == "public") Constants.PUBLIC_KEY else id

        return try {
            val result = ditto.store.execute(
                "SELECT * FROM `${Constants.PUBLIC_ROOMS_COLLECTION_ID}` WHERE _id = :id",
                mapOf("id" to actualId)
            )
            result.items.firstOrNull()?.let {
                gson.fromJson(gson.toJson(it.value), Room::class.java)
            }
        } catch (e: Exception) {
            Log.d("DITTODATA","findPublicRoomById Error: $e")
            null
        }
    }

    override suspend fun createRoom(id: String?, name: String, isGenerated: Boolean): String? {
        val room = Room(
            id = id ?: UUID.randomUUID().toString(),
            name = name,
            messagesId = Constants.PUBLIC_MESSAGES_COLLECTION_ID,
            userId = privateStore.currentUserId ?: Constants.UNKNOWN_USER_ID_KEY,
            collectionId = Constants.PUBLIC_ROOMS_COLLECTION_ID,
            isGenerated = isGenerated,
            createdOn = Date()
        )

        addSubscriptions(room)

        val query = "INSERT INTO `${Constants.PUBLIC_ROOMS_COLLECTION_ID}` DOCUMENTS (:newDoc) ON ID CONFLICT DO UPDATE"
        val args = mapOf("newDoc" to room.toDocument())

        val roomId = try {
            val result = ditto.store.execute(query, args)
            result.items.firstOrNull()?.value?.get("_id") as? String
        } catch (e: Exception) {
            Log.d("DITTODATA","createRoom Error: $e")
            null
        }
        updateAllPublicRooms()
        return roomId ?: room.id
    }

    override fun archiveRoom(room: Room) {
        removeSubscriptions(room)
        evictPublicRoom(room)
        privateStore.archivePublicRoom(room)
        scope.launch { updateAllPublicRooms() }
    }

    override fun unarchiveRoom(room: Room) {
        privateStore.unarchivePublicRoom(room)
        addSubscriptions(room)
        scope.launch { updateAllPublicRooms() }
    }

    override suspend fun createMessage(room: Room, text: String) {
        val userId = privateStore.currentUserId ?: return
        val actualRoom = room(room) ?: return

        val userResult = ditto.store.execute(
            "SELECT * FROM COLLECTION `$usersCollection` (`${Constants.SUBSCRIPTIONS_KEY}` MAP, `${Constants.MENTIONS_KEY}` MAP) WHERE _id = '$userId'"
        )
        val userName = userResult.items.firstOrNull()?.value?.get("name") as? String ?: userId

        val message = Message(
            roomId = actualRoom.id,
            text = text,
            userId = userId
        )

        val query = "INSERT INTO `${actualRoom.messagesId}` DOCUMENTS (:newDoc) ON ID CONFLICT DO UPDATE"
        val args = mapOf("newDoc" to message.toDocument())

        try {
            ditto.store.execute(query, args)
        } catch (e: Exception) {
            Log.d("DITTODATA","createMessage Error: $e")
        }
    }

    override suspend fun saveEditedTextMessage(message: Message, room: Room) {
        val query = "UPDATE `${room.messagesId}` SET `${Constants.TEXT_KEY}` = '${message.text}' WHERE _id = :id"
        try {
            ditto.store.execute(query, mapOf("id" to message.id))
        } catch (e: Exception) {
            Log.d("DITTODATA","saveEditedTextMessage Error: $e")
        }
    }

    override suspend fun saveDeletedImageMessage(message: Message, room: Room) {
        val query = """
            UPDATE COLLECTION `${room.messagesId}` 
            (${Constants.THUMBNAIL_IMAGE_TOKEN_KEY} ATTACHMENT, ${Constants.LARGE_IMAGE_TOKEN_KEY} ATTACHMENT) 
            SET ${Constants.THUMBNAIL_IMAGE_TOKEN_KEY} -> tombstone(), 
                ${Constants.LARGE_IMAGE_TOKEN_KEY} -> tombstone(), 
                ${Constants.TEXT_KEY} = :text 
            WHERE _id = :id
        """.trimIndent()

        val args = mapOf(
            "id" to message.id,
            "text" to message.text
        )

        try {
            ditto.store.execute(query, args)
        } catch (e: Exception) {
            Log.d("DITTODATA","saveDeletedImageMessage Error: $e")
        }
    }

    override suspend fun createImageMessage(room: Room, imageData: ByteArray, text: String?) {
        // Simplified version - actual implementation would handle image attachments
        // This requires platform-specific image handling
        Log.d("DITTODATA","createImageMessage: Image handling not fully implemented")
    }

    override fun messagesFlow(room: Room, retentionDays: Int?): Flow<List<Message>> {
        return channelFlow {
            val days = retentionDays ?: chatRetentionPolicy.days
            val retentionDate = Date(System.currentTimeMillis() - (days * 24 * 60 * 60 * 1000L))

            val query = """
                SELECT * FROM COLLECTION `${room.messagesId}` 
                (${Constants.THUMBNAIL_IMAGE_TOKEN_KEY} ATTACHMENT, ${Constants.LARGE_IMAGE_TOKEN_KEY} ATTACHMENT)
                WHERE roomId == :roomId AND createdOn >= :date
                ORDER BY ${Constants.CREATED_ON_KEY} ASC
            """.trimIndent()

            val args = mapOf(
                "roomId" to room.id,
                "date" to DateUtils.toISOString(retentionDate)
            )

            ditto.store.registerObserver(query, args) { result ->
                val messages = result.items.map { item ->
                    gson.fromJson(gson.toJson(item.value), Message::class.java)
                }
                trySend(messages)
            }
            awaitClose()
        }
    }

    override fun messageFlow(msgId: String, collectionId: String): Flow<Message?> {
        return channelFlow {
            val query = """
                SELECT * FROM COLLECTION `$collectionId` 
                (${Constants.THUMBNAIL_IMAGE_TOKEN_KEY} ATTACHMENT, ${Constants.LARGE_IMAGE_TOKEN_KEY} ATTACHMENT) 
                WHERE _id = :id
            """.trimIndent()

            val args = mapOf("id" to msgId)

            ditto.store.registerObserver(query, args) { result ->
                val message = result.items.firstOrNull()?.let { item ->
                    gson.fromJson(gson.toJson(item.value), Message::class.java)
                }
                trySend(message)
            }
            awaitClose()
        }
    }

    override suspend fun createUpdateMessage(document: Map<String, Any?>) {
        try {
            ditto.store.execute(
                """
                INSERT INTO chat
                DOCUMENTS (:message)
                ON ID CONFLICT DO UPDATE
                """.trimIndent(),
                mapOf("message" to document)
            )
        } catch (e: Exception) {
            Log.d("DITTODATA","createUpdateMessage Error: $e")
        }
    }

    override suspend fun addUser(user: ChatUser) {
        try {
            ditto.store.execute(
                """
                INSERT INTO COLLECTION `$usersCollection` 
                (`${Constants.SUBSCRIPTIONS_KEY}` MAP, `${Constants.MENTIONS_KEY}` MAP) 
                DOCUMENTS (:newUser) 
                ON ID CONFLICT DO UPDATE
                """.trimIndent(),
                mapOf("newUser" to user.toDocument())
            )
        } catch (e: Exception) {
            Log.d("DITTODATA","addUser Error: $e")
        }
    }

    override suspend fun findUserById(id: String, collection: String): ChatUser {
        val result = ditto.store.execute(
            "SELECT * FROM $collection WHERE _id = :_id",
            mapOf("_id" to id)
        )

        val value = result.items.firstOrNull()?.value
            ?: throw Exception("Failed to get chat user from id")

        return gson.fromJson(gson.toJson(value), ChatUser::class.java)
    }

    override suspend fun updateUser(
        id: String,
        name: String?,
        subscriptions: Map<String, Date?>?,
        mentions: Map<String, List<String>>?
    ) {
        try {
            val currentUser = findUserById(id, usersCollection)

            val query = """
                INSERT INTO COLLECTION `$usersCollection` 
                (`${Constants.SUBSCRIPTIONS_KEY}` MAP, `${Constants.MENTIONS_KEY}` MAP)
                DOCUMENTS (:newDoc)
                ON ID CONFLICT DO UPDATE
            """.trimIndent()

            val newDoc = mapOf(
                Constants.DB_ID_KEY to id,
                Constants.NAME_KEY to (name ?: currentUser.name),
                Constants.SUBSCRIPTIONS_KEY to (subscriptions ?: currentUser.subscriptions),
                Constants.MENTIONS_KEY to (mentions ?: currentUser.mentions)
            )

            ditto.store.execute(query, mapOf("newDoc" to newDoc))
        } catch (e: Exception) {
            Log.d("DITTODATA","updateUser Error: $e")
        }
    }

    override fun currentUserFlow(): Flow<ChatUser?> {
        return privateStore.currentUserIdFlow.flatMapLatest { userId ->
            if (userId == null) {
                flowOf(null)
            } else {
                channelFlow {
                    val query = """
                        SELECT * FROM COLLECTION `$usersCollection` 
                        (`${Constants.SUBSCRIPTIONS_KEY}` MAP, `${Constants.MENTIONS_KEY}` MAP) 
                        WHERE _id = :id
                    """.trimIndent()

                    ditto.store.registerObserver(query, mapOf("id" to userId)) { result ->
                        val user = result.items.firstOrNull()?.let { item ->
                            gson.fromJson(gson.toJson(item.value), ChatUser::class.java)
                        }
                        trySend(user)
                    }
                    awaitClose()
                }
            }
        }
    }

    override fun allUsersFlow(): Flow<List<ChatUser>> {
        return channelFlow {
            val query = """
                SELECT * FROM COLLECTION `$usersCollection` 
                (`${Constants.SUBSCRIPTIONS_KEY}` MAP, `${Constants.MENTIONS_KEY}` MAP)
            """.trimIndent()

            ditto.store.registerObserver(query) { result ->
                val users = result.items.map { item ->
                    gson.fromJson(gson.toJson(item.value), ChatUser::class.java)
                }
                trySend(users)
            }
            awaitClose()
        }
    }

    override fun logout() {
        scope.cancel()
        usersSubscription?.close()
        subscriptions.values.forEach { it.close() }
        subscriptions.clear()
    }

    private fun addSubscriptions(room: Room) {
        try {
            val subscription = ditto.sync.registerSubscription(
                "SELECT * FROM `${room.messagesId}` WHERE roomId == :roomId",
                mapOf("roomId" to room.id)
            )
            subscriptions[room.id] = subscription
        } catch (e: Exception) {
            Log.d("DITTODATA","addSubscriptions Error: $e")
        }
    }

    private fun removeSubscriptions(room: Room) {
        subscriptions[room.id]?.close()
        subscriptions.remove(room.id)
    }

    private fun evictPublicRoom(room: Room) {
        scope.launch {
            try {
                ditto.store.execute(
                    "EVICT FROM `${room.messagesId}` WHERE roomId = :roomId",
                    mapOf("roomId" to room.id)
                )
            } catch (e: Exception) {
                Log.d("DITTODATA","evictPublicRoom Error: $e")
            }
        }
    }

    private suspend fun createDefaultPublicRoom() {
        if (getAllPublicRooms().size > 1) return

        try {
            val newDoc = mapOf(
                Constants.DB_ID_KEY to Constants.PUBLIC_KEY,
                Constants.NAME_KEY to Constants.PUBLIC_ROOM_TITLE_KEY,
                Constants.COLLECTION_ID_KEY to Constants.PUBLIC_ROOMS_COLLECTION_ID,
                Constants.MESSAGES_ID_KEY to Constants.PUBLIC_MESSAGES_ID_KEY,
                Constants.CREATED_ON_KEY to DateUtils.toISOString(Date())
            )

            ditto.store.execute(
                "INSERT INTO `${Constants.PUBLIC_ROOMS_COLLECTION_ID}` DOCUMENTS (:newDoc) ON ID CONFLICT DO UPDATE",
                mapOf("newDoc" to newDoc)
            )
        } catch (e: Exception) {
            Log.d("DITTODATA","createDefaultPublicRoom Error: $e")
        }
    }

    private suspend fun updateAllPublicRooms() {
        val query = "SELECT * FROM `${Constants.PUBLIC_ROOMS_COLLECTION_ID}` ORDER BY ${Constants.CREATED_ON_KEY} ASC"

        try {
            val result = ditto.store.execute(query)
            val allRooms = result.items.map { item ->
                gson.fromJson(gson.toJson(item.value), Room::class.java)
            }

            val filteredRooms = allRooms.filter { room ->
                !privateStore.archivedPublicRoomIDs.contains(room.id)
            }.sortedByDescending { it.createdOn }

            filteredRooms.forEach { room ->
                addSubscriptions(room)
            }

            _publicRoomsFlow.value = filteredRooms
        } catch (e: Exception) {
            Log.d("DITTODATA","updateAllPublicRooms Error: $e")
        }
    }

    private suspend fun getAllPublicRooms(): List<Room> {
        return try {
            val result = ditto.store.execute("SELECT * FROM `${Constants.PUBLIC_ROOMS_COLLECTION_ID}`")
            result.items.map { item ->
                gson.fromJson(gson.toJson(item.value), Room::class.java)
            }
        } catch (e: Exception) {
            emptyList()
        }
    }
}