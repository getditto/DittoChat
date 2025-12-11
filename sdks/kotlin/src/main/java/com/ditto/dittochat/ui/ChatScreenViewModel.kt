package com.ditto.dittochat.ui

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.util.*
import android.net.Uri
import com.ditto.dittochat.ChatUser
import com.ditto.dittochat.DittoChat
import com.ditto.dittochat.DittoData
import com.ditto.dittochat.Message
import com.ditto.dittochat.MessageWithUser
import com.ditto.dittochat.Room
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

// ChatScreenViewModel.kt
class ChatScreenViewModel(
    private val dittoData: DittoData,
    private val dittoChat: DittoChat
) {

    private val _room = MutableStateFlow<Room?>(null)
    val room: StateFlow<Room?> = _room.asStateFlow()

    private val _inputText = MutableStateFlow("")
    val inputText: StateFlow<String> = _inputText.asStateFlow()

    private val _messagesWithUsers = MutableStateFlow<List<MessageWithUser>>(emptyList())
    val messagesWithUsers: StateFlow<List<MessageWithUser>> = _messagesWithUsers.asStateFlow()

    private val _currentUser = MutableStateFlow<ChatUser?>(null)
    val currentUser: StateFlow<ChatUser?> = _currentUser.asStateFlow()

    private val _isEditing = MutableStateFlow(false)
    val isEditing: StateFlow<Boolean> = _isEditing.asStateFlow()

    private val _editMessageId = MutableStateFlow<String?>(null)
    val editMessageId: StateFlow<String?> = _editMessageId.asStateFlow()

    private val _showAttachment = MutableStateFlow(false)
    val showAttachment: StateFlow<Boolean> = _showAttachment.asStateFlow()

    private val _attachmentMessage = MutableStateFlow<Message?>(null)
    val attachmentMessage: StateFlow<Message?> = _attachmentMessage.asStateFlow()

    private val _showDeleteDialog = MutableStateFlow(false)
    val showDeleteDialog: StateFlow<Boolean> = _showDeleteDialog.asStateFlow()

    private val _deleteMessage = MutableStateFlow<Message?>(null)
    val deleteMessage: StateFlow<Message?> = _deleteMessage.asStateFlow()

    fun initialize(roomId: String, retentionDays: Int? = null) {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val loadedRoom = dittoChat.readRoomById(roomId)
                _room.value = loadedRoom

                // Combine messages and users flows
                dittoData.messagesFlow(loadedRoom, retentionDays)
                    .combine(dittoData.allUsersFlow()) { messages, users ->
                        messages.map { message ->
                            val user = users.find { it.id == message.userId }
                                ?: ChatUser.unknownUser()
                            MessageWithUser(message, user)
                        }
                    }
                    .collect { _messagesWithUsers.value = it }
            } catch (e: Exception) {
                // Handle error
            }
        }

        CoroutineScope(Dispatchers.Main).launch {
            dittoData.currentUserFlow().collect {
                _currentUser.emit((it))
            }
        }
    }

    fun updateInputText(text: String) {
        _inputText.value = text
    }

    fun sendMessage() {
        val text = _inputText.value.trim()
        if (text.isEmpty()) return

        CoroutineScope(Dispatchers.Main).launch {
            _room.value?.let { room ->
                dittoData.createMessage(room, text)
                _inputText.value = ""
            }
        }
    }

    fun sendImageMessage(imageUri: Uri) {
        CoroutineScope(Dispatchers.Main).launch {
            _room.value?.let { room ->
                // Convert URI to byte array
                val imageData = loadImageData(imageUri)
                imageData?.let {
                    dittoData.createImageMessage(room, it, _inputText.value)
                    _inputText.value = ""
                }
            }
        }
    }

    private suspend fun loadImageData(uri: Uri): ByteArray? {
        return withContext(Dispatchers.IO) {
            try {
                // Implementation would need context to load from content resolver
                // This is simplified
                ByteArray(0)
            } catch (e: Exception) {
                null
            }
        }
    }

    fun startEditMessage(message: Message) {
        _editMessageId.value = message.id
        _isEditing.value = true
        _inputText.value = message.text ?: ""
    }

    fun cancelEdit() {
        _editMessageId.value = null
        _isEditing.value = false
        _inputText.value = ""
    }

    fun saveEditedMessage() {
        val messageId = _editMessageId.value ?: return
        val editedText = _inputText.value.trim()

        CoroutineScope(Dispatchers.Main).launch {
            _room.value?.let { room ->
                val message = _messagesWithUsers.value
                    .find { it.message.id == messageId }
                    ?.message

                message?.let {
                    val updated = it.copy(text = editedText)
                    dittoData.saveEditedTextMessage(updated, room)
                    cancelEdit()
                }
            }
        }
    }

    fun deleteMessage(message: Message) {
        _deleteMessage.value = message
        _showDeleteDialog.value = true
    }

    fun confirmDelete() {
        CoroutineScope(Dispatchers.Main).launch {
            _room.value?.let { room ->
                _deleteMessage.value?.let { message ->
                    if (message.isImageMessage) {
                        dittoData.saveDeletedImageMessage(message, room)
                    } else {
                        val deleted = message.copy(text = "[text deleted by sender]")
                        dittoData.saveEditedTextMessage(deleted, room)
                    }
                }
            }
            _showDeleteDialog.value = false
            _deleteMessage.value = null
        }
    }

    fun cancelDelete() {
        _showDeleteDialog.value = false
        _deleteMessage.value = null
    }

    fun showAttachment(message: Message) {
        _attachmentMessage.value = message
        _showAttachment.value = true
    }

    fun hideAttachment() {
        _showAttachment.value = false
        _attachmentMessage.value = null
    }

    fun clearUnreadsAndMentions() {
        CoroutineScope(Dispatchers.Main).launch {
            _currentUser.value?.let { user ->
                _room.value?.let { room ->
                    val subscriptions = user.subscriptions?.toMutableMap() ?: mutableMapOf()
                    subscriptions[room.id] = Date()

                    val mentions = user.mentions?.toMutableMap() ?: mutableMapOf()
                    mentions[room.id] = emptyList()

                    dittoData.updateUser(
                        id = user.id,
                        subscriptions = subscriptions,
                        mentions = mentions
                    )
                }
            }
        }
    }

    fun getLastUnreadMessage(): String? {
        val user = _currentUser.value ?: return null
        val room = _room.value ?: return null
        val lastReadDate = user.subscriptions?.get(room.id) ?: return null

        return _messagesWithUsers.value
            .firstOrNull { it.message.createdOn > lastReadDate }
            ?.message?.id
    }
}