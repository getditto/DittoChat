package com.ditto.dittochat

data class MessageWithUser(
    val message: Message,
    val user: ChatUser
) {
    val id: String
        get() = message.id
}