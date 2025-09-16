package com.ditto.dittochat

import com.google.gson.annotations.SerializedName
import java.util.Date

// ChatUser.kt
data class ChatUser(
    @SerializedName("_id")
    val id: String,

    @SerializedName("name")
    val name: String,

    @SerializedName("subscriptions")
    val subscriptions: Map<String, Date?> = emptyMap(),

    @SerializedName("mentions")
    val mentions: Map<String, List<String>> = emptyMap()
) {
    companion object {
        fun unknownUser() = ChatUser(
            id = Constants.UNKNOWN_USER_ID_KEY,
            name = Constants.NO_NAME_KEY,
            subscriptions = emptyMap(),
            mentions = emptyMap()
        )
    }

    fun toDocument(): Map<String, Any?> = mapOf(
        Constants.DB_ID_KEY to id,
        Constants.NAME_KEY to name,
        Constants.SUBSCRIPTIONS_KEY to subscriptions,
        Constants.MENTIONS_KEY to mentions
    )
}