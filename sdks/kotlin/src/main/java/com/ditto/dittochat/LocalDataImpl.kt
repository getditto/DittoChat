package com.ditto.dittochat

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import androidx.core.content.edit

class LocalDataImpl(
    private val context: Context,
    private val gson: Gson
) : LocalData {

    private val prefs: SharedPreferences = context.getSharedPreferences("DittoChatPrefs", Context.MODE_PRIVATE)
    private val _archivedPublicRoomsFlow = MutableStateFlow<List<Room>>(emptyList())
    private val _currentUserIdFlow = MutableStateFlow<String?>(null)

    init {
        loadArchivedRooms()
        _currentUserIdFlow.value = prefs.getString(Constants.USER_ID_KEY, null)
    }

    override val archivedPublicRoomIDs: List<String>
        get() = getArchivedRoomIds()

    override val archivedPublicRoomsFlow: Flow<List<Room>>
        get() = _archivedPublicRoomsFlow.asStateFlow()

    override var currentUserId: String?
        get() = _currentUserIdFlow.value
        set(value) {
            prefs.edit { putString(Constants.USER_ID_KEY, value) }
            CoroutineScope(Dispatchers.Main).launch {
                _currentUserIdFlow.emit(value)
            }
        }

    override val currentUserIdFlow: StateFlow<String?>
        get() = _currentUserIdFlow.asStateFlow()

    override fun archivePublicRoom(room: Room) {
        val archived = getArchivedRooms().toMutableMap()
        archived[room.id] = room
        saveArchivedRooms(archived)
        _archivedPublicRoomsFlow.value = archived.values.toList()
        loadArchivedRooms()
    }

    override fun unarchivePublicRoom(room: Room) {
        val archived = getArchivedRooms().toMutableMap()
        archived.remove(room.id)
        saveArchivedRooms(archived)
        _archivedPublicRoomsFlow.value = archived.values.toList()
        loadArchivedRooms()
    }

    private fun getArchivedRooms(): Map<String, Room> {
        val json = prefs.getString(Constants.ARCHIVED_PUBLIC_ROOMS_KEY, null) ?: return emptyMap()
        val type = object : TypeToken<Map<String, Room>>() {}.type
        return gson.fromJson(json, type)
    }

    private fun getArchivedRoomIds(): List<String> {
        return getArchivedRooms().keys.toList()
    }

    private fun saveArchivedRooms(rooms: Map<String, Room>) {
        val json = gson.toJson(rooms)
        prefs.edit { putString(Constants.ARCHIVED_PUBLIC_ROOMS_KEY, json) }
        loadArchivedRooms()
    }

    private fun loadArchivedRooms() {
        _archivedPublicRoomsFlow.value = getArchivedRooms().values.toList()
    }
}