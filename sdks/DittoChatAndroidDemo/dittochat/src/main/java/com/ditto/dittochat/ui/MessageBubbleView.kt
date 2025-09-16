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
fun MessageBubble(
    messageWithUser: MessageWithUser,
    currentUserId: String?,
    onEditClick: (Message) -> Unit,
    onDeleteClick: (Message) -> Unit,
    onImageClick: (Message) -> Unit
) {
    val message = messageWithUser.message
    val user = messageWithUser.user
    val isCurrentUser = user.id == currentUserId

    var showMenu by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = if (isCurrentUser) Alignment.End else Alignment.Start
    ) {
        if (!isCurrentUser) {
            Text(
                text = user.name,
                style = MaterialTheme.typography.labelSmall,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }

        Card(
            onClick = { showMenu = true },
            modifier = Modifier
                .widthIn(max = 280.dp)
                .padding(horizontal = 8.dp),
            shape = MessageBubbleShape(isCurrentUser),
            colors = CardDefaults.cardColors(
                containerColor = if (isCurrentUser)
                    MaterialTheme.colorScheme.primary
                else
                    MaterialTheme.colorScheme.surfaceVariant
            )
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                if (message.thumbnailImageToken != null) {
                    MessageImage(
                        message = message,
                        onClick = { onImageClick(message) }
                    )
                }

                if (message.text.isNotEmpty()) {
                    Text(
                        text = message.text,
                        color = if (isCurrentUser) Color.White else Color.Unspecified
                    )
                }
            }
        }

        Text(
            text = formatTime(message.createdOn),
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp)
        )

        DropdownMenu(
            expanded = showMenu,
            onDismissRequest = { showMenu = false }
        ) {
            if (message.isImageMessage && message.largeImageToken != null) {
                DropdownMenuItem(
                    text = { Text("View Image") },
                    onClick = {
                        onImageClick(message)
                        showMenu = false
                    }
                )
            }

            if (isCurrentUser && !message.isImageMessage) {
                DropdownMenuItem(
                    text = { Text("Edit") },
                    onClick = {
                        onEditClick(message)
                        showMenu = false
                    }
                )
            }

            if (isCurrentUser) {
                DropdownMenuItem(
                    text = { Text("Delete") },
                    onClick = {
                        onDeleteClick(message)
                        showMenu = false
                    }
                )
            }
        }
    }
}

@Composable
fun MessageImage(
    message: Message,
    onClick: () -> Unit
) {
    var bitmap by remember { mutableStateOf<Bitmap?>(null) }
    var progress by remember { mutableStateOf(0f) }

    // In real implementation, would load image from attachment token
    Box(
        modifier = Modifier
            .size(140.dp, 120.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(Color.Gray.copy(alpha = 0.3f))
    ) {
        if (bitmap != null) {
            // Display image
            // Implementation would use Coil or similar to display bitmap
        } else {
            CircularProgressIndicator(
                progress = progress,
                modifier = Modifier.align(Alignment.Center)
            )
        }
    }
}