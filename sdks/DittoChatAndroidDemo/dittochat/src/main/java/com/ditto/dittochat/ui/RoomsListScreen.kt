package com.ditto.dittochat.ui

import android.graphics.Bitmap
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
import androidx.hilt.navigation.compose.hiltViewModel
import com.ditto.dittochat.Message
import com.ditto.dittochat.MessageWithUser
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoomsListScreen(
    onNavigateToChat: (String) -> Unit,
    viewModel: RoomsListScreenViewModel = hiltViewModel()
) {
    val publicRooms by viewModel.publicRooms.collectAsState()
    val defaultPublicRoom by viewModel.defaultPublicRoom.collectAsState()
    val currentUser by viewModel.currentUser.collectAsState()
    val showCreateRoom by viewModel.showCreateRoom.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Ditto Chat",
                        style = MaterialTheme.typography.titleLarge
                    )
                },
                actions = {
                    IconButton(onClick = { viewModel.showCreateRoomDialog() }) {
                        Icon(Icons.Default.Add, contentDescription = "New Room")
                    }
                }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(vertical = 8.dp)
        ) {
            // Default public room section
            defaultPublicRoom?.let { room ->
                item {
                    Text(
                        "Open Public Room",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                    )
                }

                item {
                    RoomListItem(
                        room = room,
                        currentUser = currentUser,
                        onClick = { onNavigateToChat(room.id) },
                        onSubscribeToggle = { viewModel.toggleSubscription(room) },
                        onArchive = null // Don't allow archiving default room
                    )
                }
            }

            // Other public rooms
            if (publicRooms.isNotEmpty()) {
                item {
                    Text(
                        "Public Rooms",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                    )
                }

                items(
                    items = publicRooms,
                    key = { it.id }
                ) { room ->
                    RoomListItem(
                        room = room,
                        currentUser = currentUser,
                        onClick = { onNavigateToChat(room.id) },
                        onSubscribeToggle = { viewModel.toggleSubscription(room) },
                        onArchive = { viewModel.archiveRoom(room) }
                    )
                }
            }
        }
    }

    if (showCreateRoom) {
        CreateRoomDialog(
            onDismiss = { viewModel.hideCreateRoomDialog() },
            onCreate = { name ->
                // Handle room creation
                viewModel.hideCreateRoomDialog()
            }
        )
    }
}
