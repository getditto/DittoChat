package com.ditto.dittochat.ui

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.rememberNavController
import com.ditto.dittochat.ChatConfig
import com.ditto.dittochat.DittoChat
import com.ditto.dittochat.DittoChatImpl
import com.ditto.dittochat.UserConfig
import javax.inject.Inject

class DittoChatUI @Inject constructor(
    val dittoChat: DittoChat
) {

    constructor(context: Context, chatConfig: ChatConfig) : this(
        dittoChat = DittoChatImpl(context, chatConfig)
    )

    @Composable
    fun RoomsView(
        navController: NavHostController = rememberNavController()
    ) {
        RoomsListScreen(
            onNavigateToChat = { roomId ->
                navController.navigate("chat/$roomId")
            }
        )
    }

    @Composable
    fun RoomView(
        roomId: String,
        retentionDays: Int? = null,
        onNavigateBack: () -> Unit
    ) {
        ChatScreen(
            roomId = roomId,
            retentionDays = retentionDays,
            onNavigateBack = onNavigateBack
        )
    }

    fun logout() {
        dittoChat.logout()
    }

    fun setCurrentUser(config: UserConfig) {
        dittoChat.setCurrentUser(config)
    }
}