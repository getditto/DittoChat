import androidx.compose.ui.graphics.Color
import androidx.core.graphics.toColorInt

fun String.parseHexColor(): Color {
    return Color(this.toColorInt())
}