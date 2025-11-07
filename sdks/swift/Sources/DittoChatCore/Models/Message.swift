//
//  Message.swift
//  DittoChat
//
//  Created by Maximilian Alexander on 7/19/22.
//  Copyright © 2022 DittoLive Incorporated. All rights reserved.
//

import DittoSwift
import Foundation

extension Message: Hashable {
    public func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

public struct Message: Identifiable, Equatable {
    public var id: String
    public var createdOn: Date
    public var roomId: String  // Shared
    public var text: String
    public var userId: String
    public var largeImageToken: [String: (any Sendable)]?
    public var thumbnailImageToken: [String: (any Sendable)]?

    public var archivedMessage: String?
    public var isArchived: Bool

    public var isImageMessage: Bool {
        thumbnailImageToken != nil || largeImageToken != nil
    }

    // FIXME: Excluding attachment tokens from equality because Any is not equatable
    public static func == (lhs: Message, rhs: Message) -> Bool {
        return lhs.id == rhs.id && lhs.createdOn == rhs.createdOn && lhs.roomId == rhs.roomId
            && lhs.text == rhs.text && lhs.userId == rhs.userId
            && lhs.isImageMessage == rhs.isImageMessage
    }
}

extension Message: DittoDecodable {
    public init(value: [String: Any?]) {
        self.id = value[dbIdKey] as? String ?? ""
        self.createdOn =
            DateFormatter.isoDate.date(from: value[createdOnKey] as? String ?? "") ?? Date()
        self.roomId = value[roomIdKey] as? String ?? ""
        self.text = value[textKey] as? String ?? ""
        self.userId = value[userIdKey] as? String ?? ""
        self.largeImageToken = value[largeImageTokenKey] as? [String: (any Sendable)]
        self.thumbnailImageToken = value[thumbnailImageTokenKey] as? [String: (any Sendable)]
        self.archivedMessage = value[archivedMessageKey] as? String
        self.isArchived = value[isArchivedKey] as? Bool ?? false
    }
}

extension Message {
    public init(
        id: String? = nil,
        createdOn: Date? = nil,
        roomId: String,
        text: String? = nil,
        userId: String? = nil,
        largeImageToken: [String: (any Sendable)]? = nil,
        thumbnailImageToken: [String: (any Sendable)]? = nil,
        archivedMessage: String? = nil,
        isArchived: Bool = false
    ) {
        self.id = id ?? UUID().uuidString
        self.createdOn = createdOn ?? Date()
        self.roomId = roomId
        self.text = text ?? ""
        self.userId = userId ?? createdByUnknownKey
        self.largeImageToken = largeImageToken
        self.thumbnailImageToken = thumbnailImageToken
        self.archivedMessage = archivedMessage
        self.isArchived = isArchived
    }

    // Used for creating new chat types for upload
    public init(
        id: String? = nil,
        createdOn: Date = .now,
        roomId: String,
        message: String = "",
        userName: String,
        userId: String,
        largeImageToken: [String: (any Sendable)]? = nil,
        thumbnailImageToken: [String: (any Sendable)]? = nil,
        archivedMessage: String? = nil,
        isArchived: Bool = false,
        parent: String = "RootContactGroup",
        peerKey: String,
        room: String = "ditto",
        schver: Int = 1,
    ) {
        self.id = id ?? UUID().uuidString
        self.createdOn = createdOn
        self.roomId = roomId
        self.text = message
        self.userId = userId
        self.largeImageToken = largeImageToken
        self.thumbnailImageToken = thumbnailImageToken
        self.archivedMessage = archivedMessage
        self.isArchived = isArchived
    }
}

extension Message {
    func docDictionary() -> [String: (any Sendable)?] {
        [
            dbIdKey: id,
            createdOnKey: DateFormatter.isoDate.string(from: createdOn),
            roomIdKey: roomId,
            textKey: text,
            userIdKey: userId,
            largeImageTokenKey: largeImageToken,
            thumbnailImageTokenKey: thumbnailImageToken,
            archivedMessageKey: archivedMessage,
            isArchivedKey: isArchived
        ]
    }
}
