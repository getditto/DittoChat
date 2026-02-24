package com.ditto.dittochatandroiddemo

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.ditto.dittochat.DittoChat
import com.ditto.dittochat.ui.ChatScreenViewModel
import com.ditto.dittochat.ui.DittoChatUI
import com.ditto.dittochat.ui.RoomEditViewModel
import com.ditto.dittochat.ui.RoomsListScreenViewModel

@Composable
fun MyAppNavigation(dittoChat: DittoChat) {
    val navController = rememberNavController()
    var roomIdState = remember { "" }
    val chatViewModel = remember { ChatScreenViewModel(dittoChat.p2pStore, dittoChat) }
    NavHost(navController = navController, startDestination = "home") {
        composable("home") {
            // Content for your Home Screen
            DittoChatUI(dittoChat).RoomsListView(
                RoomsListScreenViewModel(
                    dittoChat,
                    dittoChat.p2pStore
                ),
                RoomEditViewModel(dittoChat),
            ) { roomId ->
                roomIdState = roomId
                navController.navigate("chatroom")
            }
        }
        composable("chatroom") {

            // Content for your Detail Screen
            DittoChatUI(dittoChat).ChatRoomView(
                chatViewModel,
                roomId = roomIdState,
                retentionDays = 200000000
            ) {
                roomIdState = ""
                navController.popBackStack()
            }
        }
    }
}