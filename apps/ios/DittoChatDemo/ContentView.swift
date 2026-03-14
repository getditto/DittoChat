//
//  ContentView.swift
//  DittoChatDemo
//
//  Created by Bryan Malumphy on 9/3/25.
//

import SwiftUI
import DittoChatUI
import DittoChatCore
import DittoSwift

struct ContentView: View {

    @StateObject private var viewModel = ContentViewModel()

    /// Room ID received from a notification tap. Set via the `dittoChatOpenRoom`
    /// NotificationCenter broadcast posted by AppDelegate.
    @State private var pendingRoomId: String?

    /// Drives the programmatic NavigationLink to the deep-linked chat room.
    @State private var isNavigatingToRoom = false

    var body: some View {
        NavigationView {
            Group {
                if let dittoChat = viewModel.dittoChat {
                    ZStack {
                        RoomsListScreen(dittoChat: dittoChat)

                        // Hidden NavigationLink activated when a notification is tapped.
                        NavigationLink(
                            destination: roomDestination(dittoChat: dittoChat),
                            isActive: $isNavigatingToRoom
                        ) { EmptyView() }
                    }
                } else {
                    ProgressView("Starting Ditto…")
                }
            }
        }
        // Receive deep-link events broadcast by AppDelegate on notification tap.
        .onReceive(NotificationCenter.default.publisher(for: .dittoChatOpenRoom)) { note in
            guard let roomId = note.userInfo?["roomId"] as? String else { return }
            pendingRoomId = roomId
            isNavigatingToRoom = true
        }
    }

    /// Destination view that fetches the Room asynchronously then shows `ChatScreen`.
    @ViewBuilder
    private func roomDestination(dittoChat: DittoChat) -> some View {
        if let roomId = pendingRoomId {
            RoomDeepLinkView(roomId: roomId, dittoChat: dittoChat)
        }
    }
}

// MARK: - RoomDeepLinkView

/// Resolves a room ID to a `Room` model asynchronously and presents `ChatScreen`.
/// Shows a spinner while the lookup is in flight.
private struct RoomDeepLinkView: View {

    let roomId: String
    let dittoChat: DittoChat

    @State private var room: Room?
    @State private var loadFailed = false

    var body: some View {
        Group {
            if let room {
                ChatScreen(room: room, dittoChat: dittoChat)
            } else if loadFailed {
                ContentUnavailableView(
                    "Room not found",
                    systemImage: "bubble.left.and.exclamationmark.bubble.right",
                    description: Text("This chat room could not be loaded.")
                )
            } else {
                ProgressView()
            }
        }
        .task {
            do {
                room = try await dittoChat.readRoomById(id: roomId)
            } catch {
                loadFailed = true
            }
        }
    }
}

#Preview {
    ContentView()
}
