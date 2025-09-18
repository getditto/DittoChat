package com.ditto.dittochat.ui

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController

@Composable
fun DittoChatNavigation(
    dittoChatUI: DittoChatUI
) {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = "rooms"
    ) {
        composable("rooms") {
            dittoChatUI.RoomsListView(navController)
        }

        composable("chat/{roomId}") { backStackEntry ->
            val roomId = backStackEntry.arguments?.getString("roomId") ?: return@composable
            dittoChatUI.ChatRoomView(
                roomId = roomId,
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}