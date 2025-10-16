//
//  User.swift
//  DittoChat
//
//  Created by Maximilian Alexander on 7/19/22.
//  Copyright © 2022 DittoLive Incorporated. All rights reserved.
//

import DittoSwift
import Foundation

public struct ChatUser: Identifiable, Hashable, Equatable {
    public static func == (lhs: ChatUser, rhs: ChatUser) -> Bool {
        return lhs.name == rhs.name &&
        lhs.id == rhs.id
    }
    
    public var id: String
    public var name: String
    public var subscriptions: [String : Date?]
    public var mentions: [String: [String]]

    public init(id: String, name: String, subscriptions: [String : Date?], mentions: [String : [String]]) {
        self.id = id
        self.name = name
        self.subscriptions = subscriptions
        self.mentions = mentions
    }
}

extension ChatUser: DittoDecodable {

    public init(value: [String: Any?]) {
        id = value[dbIdKey] as! String
        if let name = value[nameKey] as? String {
            self.name = name
        } else {
            name = (value[firstNameKey] as? String ?? "") + " " + (value[lastNameKey] as? String ?? "")
        }

        let subscriptionDictionary = value[subscriptionsKey] as? [String : String?] ?? [:]
        subscriptions = subscriptionDictionary.mapValues { dateString in
            if let dateString {
                try? Date(dateString, strategy: .iso8601)
            } else {
                nil
            }
        }
        mentions = value[mentionsKey] as? [String: [String]] ?? [:]
    }
}

extension ChatUser {
    public static func unknownUser() -> ChatUser {
        ChatUser(
            id: unknownUserIdKey,
            name: noNameKey,
            subscriptions: [:],
            mentions: [:]
        )
    }
}

extension ChatUser {
    func docDictionary() -> [String: Any?] {
        [
            dbIdKey: id,
            nameKey: name,
            subscriptionsKey: subscriptions,
            mentionsKey: mentions,
        ]
    }
}
