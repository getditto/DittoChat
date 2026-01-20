package com.ditto.dittochat.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

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
    val focusManager = LocalFocusManager.current

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

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFFF8F9FA),
                        Color(0xFFE9ECEF)
                    )
                )
            )
    ) {
        Scaffold(
            containerColor = Color.Transparent,
            contentWindowInsets = WindowInsets(0.dp),
            topBar = {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .shadow(4.dp)
                        .statusBarsPadding(),
                    color = Color.White,
                    tonalElevation = 0.dp
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            modifier = Modifier.size(40.dp),
                            shape = CircleShape,
                            color = Color(0xFFF3F4F6),
                            onClick = onNavigateBack
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.ArrowBack,
                                    contentDescription = "Back",
                                    tint = Color(0xFF1A1A2E),
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                room?.name ?: "",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF1A1A2E)
                                )
                            )
                            Text(
                                "Active now",
                                style = MaterialTheme.typography.bodySmall.copy(
                                    color = Color(0xFF10B981)
                                )
                            )
                        }
                    }
                }
            },
            bottomBar = {
                if (isEditing) {
                    EditingBottomBar(
                        text = inputText,
                        onTextChange = viewModel::updateInputText,
                        onSave = viewModel::saveEditedMessage,
                        onCancel = viewModel::cancelEdit,
                        primaryColor = viewModel.dittoChat.dittoChatConfig.primaryColor ?: Color(0xFF4F46E5)
                    )
                } else {
                    ChatInputBar(
                        text = inputText,
                        onTextChange = viewModel::updateInputText,
                        onSendClick = viewModel::sendMessage,
                        onCameraClick = { imagePicker.launch("image/*") },
                        primaryColor = viewModel.dittoChat.dittoChatConfig.primaryColor ?: Color(0xFF4F46E5)
                    )
                }
            }
        ) { paddingValues ->
            Box(modifier = Modifier.padding(paddingValues)) {
                LazyColumn(
                    state = listState,
                    modifier = Modifier
                        .fillMaxSize()
                        .pointerInput(Unit) {
                            detectTapGestures(onTap = {
                                focusManager.clearFocus()
                            })
                        },
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
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
                    Surface(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(16.dp)
                            .shadow(8.dp, CircleShape),
                        shape = CircleShape,
                        color = Color(0xFF4F46E5),
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
                        }
                    ) {
                        Box(
                            modifier = Modifier.size(56.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.KeyboardArrowDown,
                                contentDescription = "New messages",
                                tint = Color.White,
                                modifier = Modifier.size(24.dp)
                            )
                        }
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
}
