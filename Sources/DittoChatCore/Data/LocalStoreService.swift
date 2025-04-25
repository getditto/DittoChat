//
//  LocalStoreService.swift
//  DittoChat
//
//  Created by Eric Turner on 1/19/23.
//  Copyright © 2023 DittoLive Incorporated. All rights reserved.
//

import Combine
import Foundation

class LocalStoreService: LocalDataInterface {
    private let defaults = UserDefaults.standard
    private let archivedPublicRoomsSubject: CurrentValueSubject<[Room], Never>

    init() {
        let tmpDefaults = UserDefaults.standard

        // prime archivedPublicRoomsSubject with decoded Room instances
        var rooms = tmpDefaults.decodeRoomsFromData(Array(tmpDefaults.archivedPublicRooms.values))
        self.archivedPublicRoomsSubject = CurrentValueSubject<[Room], Never>(rooms)

        self.basicChat = UserDefaults.standard.basicChat
    }

    var basicChat: Bool {
        get { defaults.basicChat }
        set { defaults.basicChat = newValue }
    }

    var basicChatPublisher: AnyPublisher<Bool, Never> {
        defaults.basicChatPublisher
    }

    var acceptLargeImages: Bool {
        get { defaults.acceptLargeImages }
        set { defaults.acceptLargeImages = newValue }
    }

    var acceptLargeImagesPublisher: AnyPublisher<Bool, Never> {
        defaults.acceptLargeImagesPublisher
    }

    // MARK: Current User

    var currentUserId: String? {
        get { defaults.userId }
        set { defaults.userId = newValue }
    }

    var currentUserIdPublisher: AnyPublisher<String?, Never> {
        defaults.chatUserIdPublisher
    }

    // MARK: Public Rooms

    var archivedPublicRoomsPublisher: AnyPublisher<[Room], Never> {
        archivedPublicRoomsSubject.eraseToAnyPublisher()
    }

    var archivedPublicRoomIDs: [String] {
        Array(defaults.archivedPublicRooms.keys)
    }

    // public rooms can always be fetched with roomId from Ditto db (assuming on-mesh);
    // we don't need them serialized here
    func archivePublicRoom(_ room: Room) {
        let roomsData = addRoom(room, to: &defaults.archivedPublicRooms)
        let rooms = defaults.decodeRoomsFromData(roomsData)
        archivedPublicRoomsSubject.send(rooms)
    }

    func unarchivePublicRoom(_ room: Room) {
        let roomsData = removeRoom(roomId: room.id, from: &defaults.archivedPublicRooms)
        let rooms = defaults.decodeRoomsFromData(roomsData)
        archivedPublicRoomsSubject.send(rooms)
    }

    // MARK: LocalStore Utilities

    func encodeRoom(_ room: Room) -> Data? {
        let encoder = JSONEncoder()
        guard let jsonData = try? encoder.encode(room) else {
            print("LocalStoreService.UserDefaults.\(#function): ERROR encoding room from json data")
            return nil
        }
        return jsonData
    }

    func addRoom(_ room: Room, to roomsMap: inout [String: Data]) -> [Data] {
        guard let jsonData = encodeRoom(room) else {
            print("LocalStoreService.UserDefaults.\(#function): ERROR expected NON-NIL room")
            return Array(roomsMap.values)
        }
        roomsMap[room.id] = jsonData
        return Array(roomsMap.values)
    }

    func removeRoom(roomId: String, from roomsMap: inout [String: Data]) -> [Data] {
        roomsMap.removeValue(forKey: roomId)
        return Array(roomsMap.values)
    }
}

fileprivate extension UserDefaults {
    var archivedPublicRooms: [String: Data] {
        get {
            return object(forKey: archivedPublicRoomsKey) as? [String: Data] ?? [:]
        }
        set(value) {
            set(value, forKey: archivedPublicRoomsKey)
        }
    }
}

fileprivate extension UserDefaults {
    @objc var userId: String? {
        get {
            return string(forKey: userIdKey)
        }
        set(value) {
            set(value, forKey: userIdKey)
        }
    }

    var chatUserIdPublisher: AnyPublisher<String?, Never> {
        UserDefaults.standard
            .publisher(for: \.userId)
            .eraseToAnyPublisher()
    }
}

fileprivate extension UserDefaults {
    /* This utility function extends UserDefaults, rather than LocalStoreService because
     LocalStoreService invokes this function in its init() method to initialize its private Combine
     currentValueSubject properties with Room values. If this function were a method of
     LocalStoreService, it could not be invoked on self before all properties were initialized.
     */
    func decodeRoomsFromData(_ roomsData: [Data]) -> [Room] {
        var rooms = [Room]()
        let decoder = JSONDecoder()

        for jsonData in roomsData {
            guard let room = try? decoder.decode(Room.self, from: jsonData) else {
                print("LocalStoreService.\(#function): ERROR decoding room from json data")
                continue
            }
            rooms.append(room)
        }
        return rooms
    }
}

fileprivate extension UserDefaults {
    @objc var acceptLargeImages: Bool {
        get {
            object(forKey: acceptLargeImagesKey) as? Bool ?? true
        }
        set(value) {
            set(value, forKey: acceptLargeImagesKey)
        }
    }

    var acceptLargeImagesPublisher: AnyPublisher<Bool, Never> {
        UserDefaults.standard
            .publisher(for: \.acceptLargeImages)
            .eraseToAnyPublisher()
    }
}

fileprivate extension UserDefaults {
    @objc var basicChat: Bool {
        get {
            object(forKey: basicChatKey) as? Bool ?? true
        }
        set(value) {
            set(value, forKey: basicChatKey)
        }
    }

    var basicChatPublisher: AnyPublisher<Bool, Never> {
        UserDefaults.standard
            .publisher(for: \.basicChat)
            .eraseToAnyPublisher()
    }
}
