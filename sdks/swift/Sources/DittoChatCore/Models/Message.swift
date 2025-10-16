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
    public var roomId: String // Shared
    public var text: String
    public var userId: String
    public var largeImageToken: [String: (any Sendable)]?
    public var thumbnailImageToken: [String: (any Sendable)]?

    public var archivedMessage: String?
    public var isArchived: Bool

    // TAK specific values Beta -1.0
    public var authorCs: String
    public var authorId: String
    public var authorLoc: String // Shared
    public var authorType: String // Shared
    public var msg: String // Shared
    public var parent: String // Shared
    public var pks: String
    public var room: String // Shared
    public var schver: Int
    public var takUid: String
    public var timeMs: Date

    // TAK specific values 1.0
     public var _r: Bool // false,
     public var _v: Int // 2,
     public var a: String// "pkAocCgkMCHR2rZKkzOQCuNctl7TISZ-CHLQSponngkXJBvYn4IcE",
     public var b: Date // 1748900833112,
     public var d: String // "ANDROID-0fdedc6978d14b12",
     public var e: String // "LUMP",
//    public var authorLoc: String// "39.55585,-105.088471,1682.3389318704824,HAE,9.935046195983887,NaN",
//    public var authorType: // "a-f-G-U-C",
//     public var msg: String // "testing 1.0",
//     public var parent: String // "RootContactGroup",
//     public var room: String // "Ditto",
//     public var roomId: String // "ChatContact-Ditto"

    public var hasBeenConverted: Bool?

    public var isImageMessage: Bool {
        thumbnailImageToken != nil || largeImageToken != nil
    }

    // FIXME: Excluding attachment tokens from equality because Any is not equatable
    public static func == (lhs: Message, rhs: Message) -> Bool {
        return lhs.id == rhs.id &&
        lhs.createdOn == rhs.createdOn &&
        lhs.roomId == rhs.roomId &&
        lhs.text == rhs.text &&
        lhs.userId == rhs.userId &&
        lhs.isImageMessage == rhs.isImageMessage
    }
}

extension Message: DittoDecodable {
    public init(value: [String: Any?]) {
        self.id = value[dbIdKey] as? String ?? ""
        self.createdOn = DateFormatter.isoDate.date(from: value[createdOnKey] as? String ?? "") ?? Date()
        self.roomId = value[roomIdKey] as? String ?? ""
        self.text = value[textKey] as? String ?? ""
        self.userId = value[userIdKey] as? String ?? ""
        self.largeImageToken = value[largeImageTokenKey] as? [String: (any Sendable)]
        self.thumbnailImageToken = value[thumbnailImageTokenKey] as? [String: (any Sendable)]
        self.archivedMessage = value[archivedMessageKey] as? String
        self.isArchived = value[isArchivedKey] as? Bool ?? false

        // TAK related values
        self.authorCs = value[authorCsKey] as? String ?? ""
        self.authorId = value[authorIdKey] as? String ?? ""
        self.authorLoc = value[authorLocKey] as? String ?? ""
        self.authorType = value[authorTypeKey] as? String ?? ""
        self.msg = value[msgKey] as? String ?? ""
        self.parent = value[parentKey] as? String ?? ""
        self.pks = value[pksKey] as? String ?? ""
        self.room = value[roomKey] as? String ?? ""
        self.roomId = value[roomIdKey] as? String ?? ""
        self.schver = value[schverKey] as? Int ?? 0
        self.takUid = value[takUidKey] as? String ?? ""


        // TAK 1.0
        self._r = value["_r"] as? Bool ?? false
        self._v = value["_v"] as? Int ?? 2
        self.a = value["a"] as? String ?? ""
        self.d = value["d"] as? String ?? ""
        self.e = value["e"] as? String ?? ""

        if let timeMs = value[timeMsKey] as? Double {
            self.timeMs = Date(timeIntervalSince1970InMilliSeconds: timeMs)
            self.b = Date(timeIntervalSince1970InMilliSeconds: timeMs)
        } else if let timeMs = value[timeMsKey] as? Int {
            self.timeMs = Date(timeIntervalSince1970InMilliSeconds: timeMs)
            self.b = Date(timeIntervalSince1970InMilliSeconds: timeMs)
        } else if let timeMs = value["b"] as? Double {
            self.timeMs = Date(timeIntervalSince1970InMilliSeconds: timeMs)
            self.b = Date(timeIntervalSince1970InMilliSeconds: timeMs)
        } else if let timeMs = value["b"] as? Int {
            self.timeMs = Date(timeIntervalSince1970InMilliSeconds: timeMs)
            self.b = Date(timeIntervalSince1970InMilliSeconds: timeMs)
        } else {
            self.b = Date()
            self.timeMs = Date()
        }

        self.hasBeenConverted = value[hasBeenConvertedKey] as? Bool
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
        isArchived: Bool = false,
        authorCs: String? = nil,
        authorId: String? = nil,
        authorLoc: String? = nil,
        authorType: String? = nil,
        msg: String? = nil,
        parent: String? = nil,
        pks: String? = nil,
        room: String? = nil,
        schver: Int? = nil,
        takUid: String? = nil,
        timeMs: Date? = nil,
        _r: Bool? = nil,
        _v: Int? = nil,
        a: String? = nil,
        b: Date? = nil,
        d: String? = nil,
        e: String? = nil
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

        self.authorCs = authorCs ?? userId ?? ""
        self.authorId = authorId ?? ""
        self.authorLoc = authorLoc ?? ""
        self.authorType = authorType ?? ""
        self.msg = msg ?? ""
        self.parent = parent ?? ""
        self.pks = pks ?? ""
        self.room = room ?? ""
        self.schver = schver ?? .zero
        self.takUid = takUid ?? ""
        self.timeMs = timeMs ?? Date()
        // TAK 1.0
        self._r = _r ?? false
        self._v = _v ?? 2
        self.a = a ?? pks ?? ""
        self.b = b ?? Date()
        self.d = d ?? ""
        self.e = e ?? ""
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
        hasBeenConverted: Bool = true
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

        self.authorCs = userName
        self.authorId = userId
        self.authorLoc = "0.0,0.0,NaN,HAE,NaN,NaN"
        self.authorType = "a-f-G-U-C"
        self.msg = message
        self.parent = parent
        self.pks = peerKey
        self.room = room
        self.schver = schver
        self.takUid = UUID().uuidString
        self.timeMs = createdOn
        self.hasBeenConverted = hasBeenConverted

        // TAK 1.0
        self._r = false
        self._v = 2
        self.a = peerKey
        self.b = createdOn
        self.d = userId
        self.e = userName
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
            isArchivedKey: isArchived,
            authorCsKey: authorCs,
            authorIdKey: authorId,
            authorLocKey: authorLoc,
            authorTypeKey: authorType,
            msgKey: msg,
            parentKey: parent,
            pksKey: pks,
            roomKey: room,
            schverKey: schver,
            takUidKey: takUid,
            timeMsKey: timeMs.timeIntervalSince1970InMilliSeconds,
            hasBeenConvertedKey: hasBeenConverted,

            // TAk 1.0
            "_r": _r,
            "_v": _v,
            "a": a,
            "b": b.timeIntervalSince1970InMilliSeconds,
            "d": d,
            "e": e,
        ]
    }
}

extension Date {
    init(timeIntervalSince1970InMilliSeconds: Int) {
        self = Date(timeIntervalSince1970: Double(timeIntervalSince1970InMilliSeconds) / 1000)
    }

    init(timeIntervalSince1970InMilliSeconds: Double) {
        self = Date(timeIntervalSince1970: Double(timeIntervalSince1970InMilliSeconds) / 1000)
    }

    var timeIntervalSince1970InMilliSeconds: Int {
        Int(self.timeIntervalSince1970 * 1000)
    }

//    var timeIntervalSince1970InMilliSeconds: Double {
//        Double(self.timeIntervalSince1970 * 1000)
//    }
}
