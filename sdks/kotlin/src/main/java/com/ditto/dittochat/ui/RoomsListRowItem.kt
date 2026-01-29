package com.ditto.dittochat.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ditto.dittochat.ChatUser
import com.ditto.dittochat.Room

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

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(2.dp, RoundedCornerShape(16.dp))
            .clip(RoundedCornerShape(16.dp))
            .clickable { onClick() },
        color = Color.White,
        tonalElevation = 0.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Room icon
            Surface(
                modifier = Modifier.size(48.dp),
                shape = CircleShape,
                color = if (isSubscribed) Color(0xFF4F46E5) else Color(0xFFE5E7EB)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.Home,
                        contentDescription = null,
                        tint = if (isSubscribed) Color.White else Color(0xFF9CA3AF),
                        modifier = Modifier.size(24.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(16.dp))

            // Room name and info
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    room.name,
                    style = MaterialTheme.typography.bodyLarge.copy(
                        fontWeight = if (isSubscribed) FontWeight.Bold else FontWeight.Medium,
                        color = Color(0xFF1A1A2E)
                    )
                )

                if (isSubscribed) {
                    Text(
                        "Subscribed",
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = Color(0xFF4F46E5),
                            fontWeight = FontWeight.Medium
                        )
                    )
                }
            }

            // Badges
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (isSubscribed && unreadCount > 0) {
                    Surface(
                        shape = CircleShape,
                        color = Color(0xFF10B981)
                    ) {
                        Text(
                            unreadCount.toString(),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = Color.White,
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }
                }

                if (mentionCount > 0) {
                    Surface(
                        shape = CircleShape,
                        color = Color(0xFFEF4444)
                    ) {
                        Text(
                            mentionCount.toString(),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = Color.White,
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }
                }

                Icon(
                    Icons.Default.KeyboardArrowRight,
                    contentDescription = null,
                    tint = Color(0xFF9CA3AF),
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}