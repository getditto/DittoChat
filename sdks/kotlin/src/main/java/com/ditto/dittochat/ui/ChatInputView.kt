package com.ditto.dittochat.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.rounded.Image
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

@Composable
fun ChatInputBar(
    text: String,
    onTextChange: (String) -> Unit,
    onSendClick: () -> Unit,
    onCameraClick: () -> Unit,
    primaryColor: Color
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(8.dp),
        color = Color.White,
        tonalElevation = 0.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Surface(
                modifier = Modifier.size(44.dp),
                shape = CircleShape,
                color = Color(0xFFF3F4F6),
                onClick = onCameraClick
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Rounded.Image,
                        contentDescription = "Attach image",
                        tint = Color(0xFF6B7280),
                        modifier = Modifier.size(22.dp)
                    )
                }
            }

            Surface(
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(24.dp),
                color = Color(0xFFF3F4F6),
                tonalElevation = 0.dp
            ) {
                TextField(
                    value = text,
                    onValueChange = onTextChange,
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = {
                        Text(
                            "Type a message...",
                            style = MaterialTheme.typography.bodyMedium.copy(
                                color = Color(0xFF9CA3AF)
                            )
                        )
                    },
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent
                    ),
                    maxLines = 6
                )
            }

            Surface(
                modifier = Modifier.size(44.dp),
                shape = CircleShape,
                color = if (text.isNotBlank()) primaryColor else Color(0xFFE5E7EB),
                onClick = if (text.isNotBlank()) onSendClick else { {} }
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.Send,
                        contentDescription = "Send",
                        tint = if (text.isNotBlank()) Color.White else Color(0xFF9CA3AF),
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}