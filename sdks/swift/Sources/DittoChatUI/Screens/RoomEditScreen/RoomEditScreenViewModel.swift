//
//  RoomEditScreenViewModel.swift
//  DittoChat
//
//  Created by Maximilian Alexander on 7/20/22.
//  Copyright © 2022 DittoLive Incorporated. All rights reserved.
//

import Combine
import Foundation
import DittoChatCore

@MainActor
class RoomEditScreenViewModel: ObservableObject {
    @Published var name: String = ""
    @Published var saveButtonDisabled = false
    @Published var isValid = true
    private let dittoChat: DittoChat

    init(dittoChat: DittoChat) {
        self.dittoChat = dittoChat

        $name
            .map { $0.isEmpty }
            .assign(to: &$saveButtonDisabled)
    }

    func createRoom() {
        Task {
            let _ = await dittoChat.createRoom(name: name)
        }
    }
}
