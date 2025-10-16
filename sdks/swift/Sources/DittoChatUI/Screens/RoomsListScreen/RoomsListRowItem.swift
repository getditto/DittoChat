//
//  RoomsListRowItem.swift
//  DittoChat
//
//  Created by Eric Turner on 2/17/23.
//  Copyright © 2023 DittoLive Incorporated. All rights reserved.
//

import SwiftUI
import DittoChatCore

struct RoomsListRowItem: View {
    @ObservedObject var viewModel: RoomsListRowItemViewModel

    init(room: Room, dittoChat: DittoChat, retentionDays: Int? = nil) {
        self.viewModel = RoomsListRowItemViewModel(room: room, dittoChat: dittoChat, retentionDays: retentionDays)
    }

    var body: some View {
        HStack {
            if viewModel.subscribedTo() {
                Text(viewModel.room.name)
                    .bold()
                    .italic()
            } else {
                Text(viewModel.room.name)
            }
            Spacer()
            if viewModel.subscribedTo(), viewModel.unreadMessagesCount() != 0 {
                Text(viewModel.unreadMessagesCount().description)
                    .padding(.horizontal)
                    .background(.gray)
                    .clipShape(.capsule)
            }
            if viewModel.mentionsCount() != 0 {
                Text(viewModel.mentionsCount().description)
                    .padding(.horizontal)
                    .background(.gray)
                    .clipShape(.capsule)
            }
        }
    }
}
@MainActor
class RoomsListRowItemViewModel: ObservableObject {
    @Published var messages: [Message] = []
    @Published var currentUser: ChatUser?
    @Published var room: Room

    init(room: Room, dittoChat: DittoChat, retentionDays: Int?) {
        self.room = room

        dittoChat.messagesPublisher(for: room, retentionDays: retentionDays)
            .assign(to: &$messages)

        dittoChat.currentUserPublisher()
            .assign(to: &$currentUser)
    }


    func unreadMessagesCount() -> Int {
        guard let currentUser,
              subscribedTo(),
              let keyValue = currentUser.subscriptions[room.id],
              let date = keyValue else {
            return 0
        }

        let firstIndex = messages.firstIndex { message in
            message.createdOn > date
        }

        if let firstIndex {
            return messages.count - firstIndex
        }

        return 0
    }

    func subscribedTo() -> Bool {
        guard let currentUser,
            let _ = currentUser.subscriptions[room.id] else {
            return false
        }

        return true
    }

    func mentionsCount() -> Int {
        guard let currentUser else {
            return 0
        }

        return currentUser.mentions[room.id]?.count ?? 0
    }
}

#if DEBUG
import DittoSwift
struct RoomsListRowItem_Previews: PreviewProvider {
    static var previews: some View {
        RoomsListRowItem(
            room: Room(
                id: "id123",
                name: "My Room",
                messagesId: "msgId123",
                userId: "some user"
            ),
            dittoChat: DittoChat(config: ChatConfig(ditto: Ditto(), usersCollection: "users")),
            retentionDays: 365
        )
    }
}
#endif
