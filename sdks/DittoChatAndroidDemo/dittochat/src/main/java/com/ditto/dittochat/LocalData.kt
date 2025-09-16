package com.ditto.dittochat

interface LocalData {
    val archivedPublicRoomIDs: List<String>
    val archivedPublicRoomsFlow: kotlinx.coroutines.flow.Flow<List<Room>>
    fun archivePublicRoom(room: Room)
    fun unarchivePublicRoom(room: Room)

    var currentUserId: String?
    val currentUserIdFlow: kotlinx.coroutines.flow.StateFlow<String?>
}