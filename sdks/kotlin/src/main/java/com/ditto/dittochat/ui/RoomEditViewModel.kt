package com.ditto.dittochat.ui

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject
import com.ditto.dittochat.DittoChat
import com.ditto.dittochat.RoomConfig

class RoomEditViewModel(
    private val dittoChat: DittoChat
) : ViewModel() {

    private val _roomName = MutableStateFlow("")
    val roomName: StateFlow<String> = _roomName.asStateFlow()

    private val _isCreating = MutableStateFlow(false)
    val isCreating: StateFlow<Boolean> = _isCreating.asStateFlow()

    fun updateRoomName(name: String) {
        if (name.length <= 2500 && isValidInput(name)) {
            _roomName.value = name
        }
    }

    fun createRoom(onSuccess: () -> Unit) {
        if (_roomName.value.isEmpty()) return

        viewModelScope.launch {
            _isCreating.value = true
            try {
                dittoChat.createRoom(
                    RoomConfig(name = _roomName.value)
                )

                onSuccess()
            } catch (e: Exception) {
                Log.e("ROOM CREATION", e.message.toString())
            } finally {
                _isCreating.value = false
            }
        }
    }

    private fun isValidInput(input: String): Boolean {
        // Simplified validation
        return input.length <= 2500
    }
}