package com.ditto.dittochat.ui

import android.graphics.Bitmap
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import com.ditto.dittochat.ChatUser
import com.ditto.dittochat.Message
import com.ditto.dittochat.MessageWithUser
import com.ditto.dittochat.Room
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoomListItem(
    room: Room,
    currentUser: ChatUser?,
    onClick: () -> Unit,
    onSubscribeToggle: () -> Unit,
    onArchive: (() -> Unit)?
) {
    val isSubscribed = currentUser?.subscriptions?.containsKey(room.id) == true
    val unreadCount = 0 // Would calculate from messages
    val mentionCount = currentUser?.mentions?.get(room.id)?.size ?: 0

    var showSwipeActions by remember { mutableStateOf(false) }

    ListItem(
        headlineContent = {
            Text(
                room.name,
                style = if (isSubscribed)
                    MaterialTheme.typography.bodyLarge.copy(
                        fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                    )
                else
                    MaterialTheme.typography.bodyLarge
            )
        },
        trailingContent = {
            Row {
                if (isSubscribed && unreadCount > 0) {
                    Badge {
                        Text(unreadCount.toString())
                    }
                }
                if (mentionCount > 0) {
                    Badge(
                        modifier = Modifier.padding(start = 4.dp)
                    ) {
                        Text(mentionCount.toString())
                    }
                }
            }
        },
        modifier = Modifier.clickable { onClick() }
    )
}