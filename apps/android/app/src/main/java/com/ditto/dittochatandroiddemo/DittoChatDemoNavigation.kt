package com.ditto.dittochatandroiddemo

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.ditto.dittochat.DittoChat
import com.ditto.dittochat.ui.ChatScreenViewModel
import com.ditto.dittochat.ui.DittoChatUI
import com.ditto.dittochat.ui.RoomEditViewModel
import com.ditto.dittochat.ui.RoomsListScreenViewModel
import kotlinx.coroutines.flow.StateFlow

/**
 * Root navigation graph for the DittoChat demo app.
 *
 * @param notificationRoomId A [StateFlow] emitted by [MainActivity] when the user taps a
 *   DittoChat notification. Whenever a non-null value arrives, the nav graph navigates
 *   directly to that room's chat screen, bypassing the rooms list.
 */
@Composable
fun MyAppNavigation(
    dittoChat: DittoChat,
    notificationRoomId: StateFlow<String?>
) {
    val navController = rememberNavController()
    var roomIdState by remember { mutableStateOf("") }
    val chatViewModel = remember { ChatScreenViewModel(dittoChat.p2pStore, dittoChat) }

    // Observe notification taps. When a room ID arrives, navigate to that room.
    val pendingRoomId by notificationRoomId.collectAsState()
    LaunchedEffect(pendingRoomId) {
        val roomId = pendingRoomId ?: return@LaunchedEffect
        roomIdState = roomId
        // Navigate to the chatroom destination; popUpTo prevents stacking duplicates.
        navController.navigate("chatroom") {
            launchSingleTop = true
        }
    }

    NavHost(navController = navController, startDestination = "home") {
        composable("home") {
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
