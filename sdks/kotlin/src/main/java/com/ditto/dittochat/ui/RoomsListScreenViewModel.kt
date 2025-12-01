package com.ditto.dittochat.ui

import com.ditto.dittochat.DittoChat
import dagger.hilt.android.lifecycle.HiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.util.*
import javax.inject.Inject
import com.ditto.dittochat.ChatUser
import com.ditto.dittochat.Constants
import com.ditto.dittochat.DittoData
import com.ditto.dittochat.Room

class RoomsListScreenViewModel(
    private val dittoData: DittoData
) : ViewModel() {

    private val _publicRooms = MutableStateFlow<List<Room>>(emptyList())
    val publicRooms: StateFlow<List<Room>> = _publicRooms.asStateFlow()

    private val _defaultPublicRoom = MutableStateFlow<Room?>(null)
    val defaultPublicRoom: StateFlow<Room?> = _defaultPublicRoom.asStateFlow()

    private val _currentUser = MutableStateFlow<ChatUser?>(null)
    val currentUser: StateFlow<ChatUser?> = _currentUser.asStateFlow()

    private val _showCreateRoom = MutableStateFlow(false)
    val showCreateRoom: StateFlow<Boolean> = _showCreateRoom.asStateFlow()

    init {
        viewModelScope.launch {
            dittoData.publicRoomsFlow.collect { rooms ->
                _defaultPublicRoom.value = rooms.find { it.id == Constants.PUBLIC_KEY }
                _publicRooms.value = rooms
                    .filter { it.id != Constants.PUBLIC_KEY && !it.isGenerated }
            }
        }

        viewModelScope.launch {
            dittoData.currentUserFlow().collect {
                _currentUser.value = it
            }
        }
    }

    fun showCreateRoomDialog() {
        _showCreateRoom.value = true
    }

    fun hideCreateRoomDialog() {
        viewModelScope.launch {
            _showCreateRoom.emit(false)
        }
    }

    fun archiveRoom(room: Room) {
        dittoData.archiveRoom(room)
    }

    fun toggleSubscription(room: Room) {
        viewModelScope.launch {
            _currentUser.value?.let { user ->
                val subscriptions = user.subscriptions?.toMutableMap() ?: mutableMapOf()

                if (subscriptions.containsKey(room.id)) {
                    subscriptions.remove(room.id)
                } else {
                    subscriptions[room.id] = Date()
                }

                dittoData.updateUser(
                    id = user.id,
                    subscriptions = subscriptions
                )
            }
        }
    }
}