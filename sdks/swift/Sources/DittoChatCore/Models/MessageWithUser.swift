//
//  MessageWithUser.swift
//  DittoChat
//
//  Created by Maximilian Alexander on 7/20/22.
//  Copyright © 2022 DittoLive Incorporated. All rights reserved.
//

import Foundation

public struct MessageWithUser: Identifiable, Hashable, Equatable {
    public var message: Message
    public var user: ChatUser
    public var id: String {
        return self.message.id
    }

    public init(message: Message, user: ChatUser) {
        self.message = message
        self.user = user
    }
}
