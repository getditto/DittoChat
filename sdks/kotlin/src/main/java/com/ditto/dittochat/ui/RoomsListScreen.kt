package com.ditto.dittochat.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun RoomsListScreen(
    onNavigateToChat: (String) -> Unit,
    viewModel: RoomsListScreenViewModel,
    roomEditViewModel: RoomEditViewModel
) {
    val publicRooms by viewModel.publicRooms.collectAsState()
    val defaultPublicRoom by viewModel.defaultPublicRoom.collectAsState()
    val currentUser by viewModel.currentUser.collectAsState()
    val showCreateRoom by viewModel.showCreateRoom.collectAsState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFFF5F7FA),
                        Color(0xFFE8EDF2)
                    )
                )
            )
    ) {
        Scaffold(
            containerColor = Color.Transparent,
            topBar = {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .shadow(4.dp),
                    color = Color.White,
                    tonalElevation = 0.dp
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp, vertical = 16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                "Ditto Chat",
                                style = MaterialTheme.typography.headlineMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF1A1A2E)
                                )
                            )
                        }

                        Surface(
                            modifier = Modifier.size(48.dp),
                            shape = CircleShape,
                            color = viewModel.dittoChat.dittoChatConfig.primaryColor ?: Color(0xFF4F46E5),
                            onClick = { viewModel.showCreateRoomDialog() }
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.Add,
                                    contentDescription = "New Room",
                                    tint = Color.White,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                        }
                    }
                }
            }
        ) { paddingValues ->
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Default public room section
                defaultPublicRoom?.let { room ->
                    item {
                        Text(
                            "Open Public Room",
                            style = MaterialTheme.typography.titleSmall.copy(
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFF6B7280),
                                letterSpacing = 0.5.sp
                            ),
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 8.dp)
                        )
                    }

                    item {
                        RoomListItem(
                            room = room,
                            currentUser = currentUser,
                            onClick = { onNavigateToChat(room.id) },
                            onSubscribeToggle = { viewModel.toggleSubscription(room) },
                            onArchive = null
                        )
                    }
                }

                // Other public rooms
                if (publicRooms.isNotEmpty()) {
                    item {
                        Text(
                            "Public Rooms",
                            style = MaterialTheme.typography.titleSmall.copy(
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFF6B7280),
                                letterSpacing = 0.5.sp
                            ),
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 8.dp)
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
                    viewModel.hideCreateRoomDialog()
                },
                roomEditViewModel
            )
        }
    }
}