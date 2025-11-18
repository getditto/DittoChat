package com.ditto.dittochat

import com.google.gson.annotations.SerializedName
import java.util.Date
import java.util.UUID
data class Message(
    @SerializedName("_id")
    val id: String = UUID.randomUUID().toString(),

    @SerializedName("createdOn")
    var createdOn: Date = Date(),

    @SerializedName("roomId")
    val roomId: String,

    @SerializedName("text")
    var text: String = "",

    @SerializedName("userId")
    var userId: String = "",

    @SerializedName("largeImageToken")
    val largeImageToken: Map<String, Any>? = null,

    @SerializedName("thumbnailImageToken")
    val thumbnailImageToken: Map<String, Any>? = null,

    @SerializedName("archivedMessage")
    val archivedMessage: String? = null,

    @SerializedName("isArchived")
    val isArchived: Boolean = false
) {
    val isImageMessage: Boolean
        get() = thumbnailImageToken != null || largeImageToken != null

    fun toDocument(): Map<String, Any?> = mapOf(
        Constants.DB_ID_KEY to id,
        Constants.CREATED_ON_KEY to DateUtils.toISOString(createdOn),
        Constants.ROOM_ID_KEY to roomId,
        Constants.TEXT_KEY to text,
        Constants.USER_ID_KEY to userId,
        Constants.LARGE_IMAGE_TOKEN_KEY to largeImageToken,
        Constants.THUMBNAIL_IMAGE_TOKEN_KEY to thumbnailImageToken,
        Constants.ARCHIVED_MESSAGE_KEY to archivedMessage,
        Constants.IS_ARCHIVED_KEY to isArchived
    )
}
