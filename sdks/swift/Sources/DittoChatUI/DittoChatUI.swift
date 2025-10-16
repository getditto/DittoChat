//
//  DittoSwiftUI.swift
//  DittoChat
//
//  Created by Erik Everson on 1/7/25.
//

import Foundation
import DittoSwift
import SwiftUI
import Combine
import DittoChatCore

@MainActor
public protocol DittoChatViews {
    var dittoChat: DittoChat { get }
    func roomView(room: Room, retentionDays: Int?) throws -> ChatScreen
    func readRoomById(id: String) async throws -> Room
    func roomsView() -> RoomsListScreen
    func logout()
    func setCurrentUser(withConfig config: UserConfig)
}

@MainActor
public class DittoChatUI: DittoChatViews {
    public var dittoChat: DittoChat

    public init(chatConfig: ChatConfig) {
        dittoChat = DittoChat(config: chatConfig)
    }

    public func roomView(room: Room, retentionDays: Int? = nil) throws -> ChatScreen {
        return ChatScreen(room: room, dittoChat: dittoChat, retentionDays: retentionDays)
    }

    public func readRoomById(id: String) async throws -> Room {
        try await dittoChat.readRoomById(id: id)
    }

    public func roomsView() -> RoomsListScreen {
        return RoomsListScreen(dittoChat: dittoChat)
    }

    public func logout() {
        dittoChat.logout()
    }

    public func setCurrentUser(withConfig config: UserConfig) {
        dittoChat.setCurrentUser(withConfig: config)
    }
}
