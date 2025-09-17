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
    val isArchived: Boolean = false,

    // TAK specific fields
    @SerializedName("authorCs")
    val authorCs: String = "",

    @SerializedName("authorId")
    val authorId: String = "",

    @SerializedName("authorLoc")
    val authorLoc: String = "",

    @SerializedName("authorType")
    val authorType: String = "",

    @SerializedName("msg")
    val msg: String = "",

    @SerializedName("parent")
    val parent: String = "",

    @SerializedName("pks")
    val pks: String = "",

    @SerializedName("room")
    val room: String = "",

    @SerializedName("schver")
    val schver: Int = 0,

    @SerializedName("takUid")
    val takUid: String = "",

    @SerializedName("timeMs")
    var timeMs: Long = 0,

    // TAK 1.0 fields
    @SerializedName("_r")
    val _r: Boolean = false,

    @SerializedName("_v")
    val _v: Int = 2,

    @SerializedName("a")
    val a: String = "",

    @SerializedName("b")
    var b: Long = 0,

    @SerializedName("d")
    val d: String = "",

    @SerializedName("e")
    val e: String = "",

    @SerializedName("hasBeenConverted")
    var hasBeenConverted: Boolean? = null
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
        Constants.IS_ARCHIVED_KEY to isArchived,
        Constants.AUTHOR_CS_KEY to authorCs,
        Constants.AUTHOR_ID_KEY to authorId,
        Constants.AUTHOR_LOC_KEY to authorLoc,
        Constants.AUTHOR_TYPE_KEY to authorType,
        Constants.MSG_KEY to msg,
        Constants.PARENT_KEY to parent,
        Constants.PKS_KEY to pks,
        Constants.ROOM_KEY to room,
        Constants.SCHVER_KEY to schver,
        Constants.TAK_UID_KEY to takUid,
        Constants.TIME_MS_KEY to Date(timeMs).time,
        Constants.HAS_BEEN_CONVERTED_KEY to hasBeenConverted,
        "_r" to _r,
        "_v" to _v,
        "a" to a,
        "b" to Date(b).time,
        "d" to d,
        "e" to e
    )
}