package com.ditto.dittochat.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

// CreateRoomDialog.kt
@Composable
fun CreateRoomDialog(
    onDismiss: () -> Unit,
    onCreate: (String) -> Unit,
    viewModel: RoomEditViewModel = hiltViewModel()
) {
    val roomName by viewModel.roomName.collectAsState()
    val isCreating by viewModel.isCreating.collectAsState()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Create Room") },
        text = {
            OutlinedTextField(
                value = roomName,
                onValueChange = viewModel::updateRoomName,
                label = { Text("Room Name") },
                singleLine = true,
                enabled = !isCreating
            )
        },
        confirmButton = {
            TextButton(
                onClick = {
                    viewModel.createRoom {
                        onCreate(roomName)
                    }
                },
                enabled = roomName.isNotEmpty() && !isCreating
            ) {
                if (isCreating) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp))
                } else {
                    Text("Create")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

// DeleteMessageDialog.kt
@Composable
fun DeleteMessageDialog(
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Delete Message") },
        text = { Text("Delete this message everywhere?") },
        confirmButton = {
            TextButton(
                onClick = onConfirm,
                colors = ButtonDefaults.textButtonColors(
                    contentColor = MaterialTheme.colorScheme.error
                )
            ) {
                Text("Delete Everywhere")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}