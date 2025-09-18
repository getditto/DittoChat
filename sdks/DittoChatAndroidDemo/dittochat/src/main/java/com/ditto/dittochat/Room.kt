package com.ditto.dittochat

import com.google.gson.annotations.SerializedName
import java.util.Date
import java.util.UUID

data class Room(
    @SerializedName("_id")
    val id: String,

    @SerializedName("name")
    val name: String,

    @SerializedName("messagesId")
    val messagesId: String,

    @SerializedName("collectionId")
    val collectionId: String? = null,

    @SerializedName("createdBy")
    val createdBy: String,

    @SerializedName("createdOn")
    val createdOn: Date,

    @SerializedName("isGenerated")
    val isGenerated: Boolean = false
) {
    constructor(
        id: String = UUID.randomUUID().toString(),
        name: String,
        messagesId: String,
        userId: String,
        collectionId: String? = null,
        createdBy: String? = null,
        createdOn: Date? = null,
        isGenerated: Boolean = false
    ) : this(
        id = id,
        name = name,
        messagesId = messagesId,
        collectionId = collectionId,
        createdBy = createdBy ?: userId,
        createdOn = createdOn ?: Date(),
        isGenerated = isGenerated
    )

    fun toDocument(): Map<String, Any?> = mapOf(
        Constants.DB_ID_KEY to id,
        Constants.NAME_KEY to name,
        Constants.MESSAGES_ID_KEY to messagesId,
        Constants.COLLECTION_ID_KEY to collectionId,
        Constants.CREATED_BY_KEY to createdBy,
        Constants.CREATED_ON_KEY to DateUtils.toISOString(createdOn),
        Constants.IS_GENERATED_KEY to isGenerated
    )
}