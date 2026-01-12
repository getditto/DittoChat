package com.ditto.dittochat.ui

import androidx.compose.runtime.Composable
import com.ditto.dittochat.DittoChat
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