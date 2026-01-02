package com.ditto.dittochat.ui

import androidx.compose.runtime.Composable
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController

@Composable
fun DittoChatNavigation(
    chatScreenViewModel: ChatScreenViewModel,
    roomsListScreenViewModel: RoomsListScreenViewModel,
    dittoChatUI: DittoChatUI,
    navController: NavHostController
) {

    NavHost(
        navController = navController,
        startDestination = "rooms"
    ) {
        composable("rooms") {
            dittoChatUI.RoomsListView(roomsListScreenViewModel) {
                navController.navigate(it)
            }
        }

        composable("chat/{roomId}") { backStackEntry ->
            val roomId = backStackEntry.arguments?.getString("roomId") ?: return@composable
            dittoChatUI.ChatRoomView(
                chatScreenViewModel,
                roomId = roomId,
                onNavigateBack = { navController.popBackStack() },
                chatScreenViewModel = chatScreenViewModel
            )
        }
    }
}