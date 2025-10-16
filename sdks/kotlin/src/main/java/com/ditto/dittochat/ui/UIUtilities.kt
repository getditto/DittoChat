package com.ditto.dittochat.ui

import androidx.compose.foundation.shape.GenericShape
import androidx.compose.ui.graphics.Path
import java.util.Date

fun MessageBubbleShape(isCurrentUser: Boolean) = GenericShape { size, _ ->
    val path = Path()
    val width = size.width
    val height = size.height

    if (isCurrentUser) {
        // Right bubble with tail
        path.moveTo(25f, height)
        path.lineTo(20f, height)
        path.cubicTo(8f, height, 0f, height - 8f, 0f, height - 20f)
        path.lineTo(0f, 20f)
        path.cubicTo(0f, 8f, 8f, 0f, 20f, 0f)
        path.lineTo(width - 21f, 0f)
        path.cubicTo(width - 12f, 0f, width - 4f, 8f, width - 4f, 20f)
        path.lineTo(width - 4f, height - 11f)
        path.cubicTo(width - 4f, height - 1f, width, height, width, height)
        path.lineTo(width + 0.05f, height - 0.01f)
        path.cubicTo(width - 4f, height + 0.5f, width - 8f, height - 1f, width - 11f, height - 4f)
        path.cubicTo(width - 16f, height, width - 20f, height, width - 25f, height)
    } else {
        // Left bubble with tail
        path.moveTo(25f, height)
        path.lineTo(width - 20f, height)
        path.cubicTo(width - 8f, height, width, height - 8f, width, height - 20f)
        path.lineTo(width, 20f)
        path.cubicTo(width, 8f, width - 8f, 0f, width - 20f, 0f)
        path.lineTo(21f, 0f)
        path.cubicTo(12f, 0f, 4f, 8f, 4f, 20f)
        path.lineTo(4f, height - 11f)
        path.cubicTo(4f, height - 1f, 0f, height, 0f, height)
        path.lineTo(-0.05f, height - 0.01f)
        path.cubicTo(4f, height + 0.5f, 8f, height - 1f, 11f, height - 4f)
        path.cubicTo(16f, height, 20f, height, 25f, height)
    }

    path.close()
    addPath(path)
}

// DateUtils.kt
fun formatTime(date: Date): String {
    val formatter = java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
    return formatter.format(date)
}