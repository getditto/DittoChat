package com.ditto.dittochat.ui

import android.graphics.Bitmap
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ditto.dittochat.DateUtils
import com.ditto.dittochat.Message
import com.ditto.dittochat.MessageWithUser

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MessageBubble(
    messageWithUser: MessageWithUser,
    currentUserId: String?,
    onEditClick: (Message) -> Unit,
    onDeleteClick: (Message) -> Unit,
    onImageClick: (Message) -> Unit,
    hasAdminPrivileges: Boolean = false,
    primaryColor: Color? = null
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
            Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Surface(
                    modifier = Modifier.size(24.dp),
                    shape = CircleShape,
                    color = Color(0xFFE5E7EB)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = user.name.firstOrNull()?.uppercase() ?: "?",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF6B7280)
                            )
                        )
                    }
                }
                Text(
                    text = user.name,
                    style = MaterialTheme.typography.labelMedium.copy(
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF4B5563)
                    )
                )
            }
        }

        Surface(
            onClick = { showMenu = true },
            modifier = Modifier
                .widthIn(max = 280.dp)
                .padding(horizontal = 4.dp)
                .shadow(
                    elevation = 2.dp,
                    shape = RoundedCornerShape(
                        topStart = if (isCurrentUser) 16.dp else 4.dp,
                        topEnd = if (isCurrentUser) 4.dp else 16.dp,
                        bottomStart = 16.dp,
                        bottomEnd = 16.dp
                    )
                ),
            shape = RoundedCornerShape(
                topStart = if (isCurrentUser) 16.dp else 4.dp,
                topEnd = if (isCurrentUser) 4.dp else 16.dp,
                bottomStart = 16.dp,
                bottomEnd = 16.dp
            ),
            color = if (isCurrentUser)
                primaryColor ?: Color(0xFF4F46E5)
            else
                Color.White,
            tonalElevation = 0.dp
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                if (message.thumbnailImageToken != null) {
                    MessageImage(
                        message = message,
                        onClick = { onImageClick(message) }
                    )
                    if (message.text?.isNotEmpty() == true) {
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                }

                if (message.text?.isNotEmpty() == true) {
                    Text(
                        text = message.text!!,
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (isCurrentUser) Color.White else Color(0xFF1A1A2E)
                    )
                }
            }
        }

        Text(
            text = formatTime(DateUtils.fromISOString(message.createdOn)!!),
            style = MaterialTheme.typography.labelSmall.copy(
                color = Color(0xFF9CA3AF)
            ),
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
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

            if (isCurrentUser && !message.isImageMessage && hasAdminPrivileges) {
                DropdownMenuItem(
                    text = { Text("Edit") },
                    onClick = {
                        onEditClick(message)
                        showMenu = false
                    }
                )
            }

            if (isCurrentUser && hasAdminPrivileges) {
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

    Box(
        modifier = Modifier
            .size(200.dp, 160.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFFF3F4F6))
    ) {
        if (bitmap != null) {
            // Display image - implementation would use Coil or similar
        } else {
            CircularProgressIndicator(
                progress = progress,
                modifier = Modifier.align(Alignment.Center),
                color = Color(0xFF4F46E5)
            )
        }
    }
}
