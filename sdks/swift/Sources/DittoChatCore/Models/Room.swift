//
//  Room.swift
//  DittoChat
//
//  Created by Eric Turner on 1/12/23.
//  Copyright © 2023 DittoLive Incorporated. All rights reserved.
//

import DittoSwift
import Foundation

extension Room: Codable { /*Adding codable protocol*/ }

public struct Room: Identifiable, Hashable, Equatable {
    public let id: String
    public let name: String
    public let messagesId: String
    public let collectionId: String?
    public let createdBy: String
    public let createdOn: Date
    public let isGenerated: Bool

    public init(id: String, name: String, messagesId: String, collectionId: String?, createdBy: String, createdOn: Date, isGenerated: Bool = false) {
        self.id = id
        self.name = name
        self.messagesId = messagesId
        self.collectionId = collectionId
        self.createdBy = createdBy
        self.createdOn = createdOn
        self.isGenerated = isGenerated
    }
}

extension Room: DittoDecodable {
    public init(value: [String : Any?]) {
        self.id = value[dbIdKey] as? String ?? ""
        self.name = value[nameKey] as? String ?? ""
        self.messagesId = value[messagesIdKey] as? String ?? ""
        self.collectionId = value[collectionIdKey] as? String
        self.createdBy = value[createdByKey] as? String ?? ""
        self.createdOn = DateFormatter.isoDate.date(from: value[createdOnKey] as? String ?? "") ?? Date()
        self.isGenerated = value[isGeneratedKey] as? Bool ?? false
    }
}

extension Room {
    public init(
        id: String,
        name: String,
        messagesId: String,
        userId: String,
        collectionId: String? = nil,
        createdBy: String? = nil,
        createdOn: Date? = nil,
        isGenerated: Bool = false
    ) {
        //let userId = DataManager.shared.currentUserId ?? createdByUnknownKey
        self.id = id
        self.name = name
        self.messagesId = messagesId
        self.collectionId = collectionId
        self.createdBy = createdBy ?? userId
        self.createdOn = createdOn ?? Date()
        self.isGenerated = isGenerated
    }
}

extension Room {
    func docDictionary() -> [String: (any Sendable)?] {
        [
            dbIdKey: id,
            nameKey: name,
            messagesIdKey: messagesId,
            collectionIdKey: collectionId,
            createdByKey: createdBy,
            createdOnKey: DateFormatter.isoDate.string(from: createdOn),
            isGeneratedKey: isGenerated
        ]
    }
}
