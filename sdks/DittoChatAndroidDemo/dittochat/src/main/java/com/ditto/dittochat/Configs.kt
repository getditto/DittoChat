package com.ditto.dittochat

data class ChatConfig(
    val ditto: live.ditto.Ditto,
    val retentionPolicy: ChatRetentionPolicy = ChatRetentionPolicy(days = 30),
    val usersCollection: String = "users",
    val userId: String? = "ditto-system-user-id",
    val acceptLargeImages: Boolean = true
)

data class ChatRetentionPolicy(
    val days: Int
)

data class RoomConfig(
    val id: String? = null,
    val name: String,
    val isGenerated: Boolean = false
)

data class MessageConfig(
    val roomId: String,
    val message: String
)

data class UserConfig(
    val id: String
)
