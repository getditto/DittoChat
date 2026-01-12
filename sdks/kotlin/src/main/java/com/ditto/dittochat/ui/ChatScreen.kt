package com.ditto.dittochat.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.graphics.toColorInt
import androidx.hilt.navigation.compose.hiltViewModel
import com.ditto.dittochat.DittoChat
import com.ditto.dittochat.DittoData
import kotlinx.coroutines.launch
import parseHexColor

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    roomId: String,
    retentionDays: Int? = null,
    onNavigateBack: () -> Unit,
    viewModel: ChatScreenViewModel
) {
    val messagesWithUsers by viewModel.messagesWithUsers.collectAsState()
    val inputText by viewModel.inputText.collectAsState()
    val isEditing by viewModel.isEditing.collectAsState()
    val showDeleteDialog by viewModel.showDeleteDialog.collectAsState()
    val room by viewModel.room.collectAsState()
    val currentUser by viewModel.currentUser.collectAsState()

    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    val imagePicker = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let { viewModel.sendImageMessage(it) }
    }

    LaunchedEffect(roomId) {
        viewModel.initialize(roomId, retentionDays)
    }

    LaunchedEffect(messagesWithUsers) {
        if (messagesWithUsers.isNotEmpty()) {
            scope.launch {
                listState.animateScrollToItem(messagesWithUsers.size - 1)
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(room?.name ?: "") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        bottomBar = {
            if (isEditing) {
                EditingBottomBar(
                    text = inputText,
                    onTextChange = viewModel::updateInputText,
                    onSave = viewModel::saveEditedMessage,
                    onCancel = viewModel::cancelEdit
                )
            } else {
                ChatInputBar(
                    text = inputText,
                    onTextChange = viewModel::updateInputText,
                    onSendClick = viewModel::sendMessage,
                    onCameraClick = { imagePicker.launch("image/*") },
                    primaryColor =
                        viewModel.dittoChat.dittoChatConfig.primaryColor?.parseHexColor()
                            ?: MaterialTheme.colorScheme.primary
                )
            }
        }
    ) { paddingValues ->
        Box(modifier = Modifier.padding(paddingValues)) {
            LazyColumn(
                state = listState,
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                items(
                    items = messagesWithUsers,
                    key = { it.message.id }
                ) { messageWithUser ->
                    MessageBubble(
                        messageWithUser = messageWithUser,
                        currentUserId = currentUser?.id,
                        onEditClick = { viewModel.startEditMessage(it) },
                        onDeleteClick = { viewModel.deleteMessage(it) },
                        onImageClick = { viewModel.showAttachment(it) },
                        hasAdminPrivileges = viewModel.dittoChat.dittoChatConfig.hasAdminPrivileges,
                        primaryColor = viewModel.dittoChat.dittoChatConfig.primaryColor
                    )
                }
            }

            // Unread messages indicator
            viewModel.getLastUnreadMessage()?.let { lastUnreadId ->
                FloatingActionButton(
                    onClick = {
                        scope.launch {
                            val index = messagesWithUsers.indexOfFirst {
                                it.message.id == lastUnreadId
                            }
                            if (index >= 0) {
                                listState.animateScrollToItem(index)
                                viewModel.clearUnreadsAndMentions()
                            }
                        }
                    },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(16.dp)
                ) {
                    Icon(Icons.Default.KeyboardArrowUp, contentDescription = "New messages")
                }
            }
        }
    }

    if (showDeleteDialog) {
        DeleteMessageDialog(
            onConfirm = viewModel::confirmDelete,
            onDismiss = viewModel::cancelDelete
        )
    }
}