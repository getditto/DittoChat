package com.ditto.dittochat.ui

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.rememberNavController
import com.ditto.dittochat.ChatConfig
import com.ditto.dittochat.DittoChat
import com.ditto.dittochat.DittoChatImpl
import com.ditto.dittochat.DittoData
import com.ditto.dittochat.UserConfig

class DittoChatUI(
    val dittoChat: DittoChat
) {

    @Composable
    fun RoomsListView(
        navController: NavHostController = rememberNavController(),
        roomsListScreenViewModel: RoomsListScreenViewModel
    ) {
        RoomsListScreen(
            onNavigateToChat = { roomId ->
                navController.navigate("chat/$roomId")
            },
            roomsListScreenViewModel
        )
    }

    @Composable
    fun ChatRoomView(
        roomId: String,
        retentionDays: Int? = null,
        onNavigateBack: () -> Unit,
        chatScreenViewModel: ChatScreenViewModel
    ) {
        ChatScreen(
            roomId = roomId,
            retentionDays = retentionDays,
            onNavigateBack = onNavigateBack,
            chatScreenViewModel
        )
    }

    fun logout() {
        dittoChat.logout()
    }

    fun setCurrentUser(config: UserConfig) {
        dittoChat.setCurrentUser(config)
    }
}