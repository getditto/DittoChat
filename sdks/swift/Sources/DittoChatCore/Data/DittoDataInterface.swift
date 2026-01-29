//
//  DittoDataInterface.swift
//  DittoChat
//
//  Created by Erik Everson on 4/15/25.
//  Copyright © 2025 DittoLive Incorporated. All rights reserved.
//

import Combine
import DittoSwift
import UIKit

@MainActor
protocol DittoDataInterface {
    var ditto: Ditto? { get }
    var publicRoomsPublisher: CurrentValueSubject<[Room], Never> { get }
    var peerKeyString: String { get }
    var sdkVersion: String { get }

    func room(for room: Room) async -> Room?
    func findPublicRoomById(id: String) async -> Room?
    func createRoom(id: String?, name: String, isGenerated: Bool) async -> String?

    func archiveRoom(_ room: Room)
    func unarchiveRoom(_ room: Room)

    func createMessage(for rooom: Room, text: String)
    func saveEditedTextMessage(_ message: Message, in room: Room)
    func saveDeletedImageMessage(_ message: Message, in room: Room)
    func createImageMessage(for room: Room, image: UIImage, text: String?) async throws
    func messagesPublisher(for room: Room, retentionDays: Int?) -> AnyPublisher<[Message], Never>
    func messagePublisher(for msgId: String, in collectionId: String) -> AnyPublisher<Message, Never>
    func attachmentPublisher(
        for token: DittoAttachmentToken,
        in collectionId: String
    ) -> DittoStore.FetchAttachmentPublisher?
    func createUpdateMessage(document: [String: Any?])

    func addUser(_ usr: ChatUser)
    func findUserById(_ id: String, inCollection collection: String) async throws -> ChatUser
    func updateUser(withId id: String,
                    name: String?,
                    subscriptions: [String: Date?]?,
                    mentions: [String: [String]]?)
    func currentUserPublisher() -> AnyPublisher<ChatUser?, Never>
    func allUsersPublisher() -> AnyPublisher<[ChatUser], Never>

    func logout()
}
