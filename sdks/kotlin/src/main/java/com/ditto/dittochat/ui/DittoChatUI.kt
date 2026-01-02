package com.ditto.dittochat.ui

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
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
        viewModel: RoomsListScreenViewModel,
        navigateToChat: (String) -> Unit,
    ) {
        RoomsListScreen(
            onNavigateToChat = navigateToChat,
            viewModel = viewModel
        )
    }

    @Composable
    fun ChatRoomView(
        viewModel: ChatScreenViewModel,
        roomId: String,
        retentionDays: Int? = null,
        onNavigateBack: () -> Unit,
    ) {
        ChatScreen(
            roomId = roomId,
            retentionDays = retentionDays,
            onNavigateBack = onNavigateBack,
            viewModel = viewModel
        )
    }

    fun logout() {
        dittoChat.logout()
    }

    fun setCurrentUser(config: UserConfig) {
        dittoChat.setCurrentUser(config)
    }
}