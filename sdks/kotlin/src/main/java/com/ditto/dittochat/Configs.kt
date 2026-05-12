package com.ditto.dittochat

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
