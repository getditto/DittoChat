//
//  RoomsListScreen.swift
//  DittoChat
//
//  Created by Eric Turner on 2/17/23.
//  Copyright © 2023 DittoLive Incorporated. All rights reserved.
//

import SwiftUI
import DittoChatCore

public struct RoomsListScreen: View {
    @ObservedObject var viewModel: RoomsListScreenVM
    private let dittoChat: DittoChat

    public init(dittoChat: DittoChat) {
        self.dittoChat = dittoChat
        self.viewModel = RoomsListScreenVM(dittoChat: dittoChat)
    }

    public var body: some View {
        List {
            if let defaultPublicRoom = viewModel.defaultPublicRoom {
                Section(openPublicRoomTitleKey) {
                    NavigationLink(destination: ChatScreen(room: defaultPublicRoom, dittoChat: dittoChat)) {
                        RoomsListRowItem(room: defaultPublicRoom, dittoChat: viewModel.dittoChat)
                    }
                    #if !os(tvOS)
                    .swipeActions(edge: .leading, allowsFullSwipe: true) {
                        Button(action: {
                            viewModel.toggleSubscriptionFor(room: defaultPublicRoom)
                        }, label: {
                            Text("Sub")
                        })
                    }
                    #endif
                }
            }
            Section( viewModel.publicRooms.count > 0 ? publicRoomsTitleKey : "" ) {
                ForEach(viewModel.publicRooms) { room in
                    NavigationLink(destination: ChatScreen(room: room, dittoChat: dittoChat)) {
                        RoomsListRowItem(room: room, dittoChat: viewModel.dittoChat)
                    }
                    #if !os(tvOS)
                    .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                        Button(settingsHideTitleKey) {
                            viewModel.archiveRoom(room)
                        }
                        .tint(.red)
                    }
                    .swipeActions(edge: .leading, allowsFullSwipe: true) {
                        Button(action: {
                            viewModel.toggleSubscriptionFor(room: room)
                        }, label: {
                            Text("Sub")
                        })
                    }
                    #endif
                }
            }
        }
#if !os(tvOS)
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: Room.self) { room in
            ChatScreen(room: room, dittoChat: viewModel.dittoChat, retentionDays: nil)
                .withErrorHandling()
        }
#endif
        .sheet(isPresented: $viewModel.presentCreateRoomScreen) {
            RoomEditScreen(dittoChat: viewModel.dittoChat)
        }
        .toolbar {
            ToolbarItemGroup(placement: .principal) {
                Text(appTitleKey)
                    .fontWeight(.bold)
            }
            ToolbarItemGroup(placement: .navigationBarTrailing) {
                Button {
                    viewModel.createRoomButtonAction()
                } label: {
                    Label(newRoomTitleKey, systemImage: plusMessageFillKey)
                }
            }
        }
    }
}

#if DEBUG
import DittoSwift
struct RoomsListScreen_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            RoomsListScreen(dittoChat: DittoChat(config: ChatConfig(ditto: Ditto(), usersCollection: "users")))
        }
    }
}
#endif
