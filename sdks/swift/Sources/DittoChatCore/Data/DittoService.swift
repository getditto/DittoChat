//
//  DittoService.swift
//  DittoChat
//
//  Created by Eric Turner on 2/24/23.
//  Copyright © 2023 DittoLive Incorporated. All rights reserved.
//

import Combine
@preconcurrency import DittoSwift
import UIKit

@MainActor
class DittoService: DittoDataInterface {
    @Published var publicRoomsPublisher = CurrentValueSubject<[Room], Never>([])
    @Published fileprivate private(set) var allPublicRooms: [Room] = []
    private var allPublicRoomsCancellable: AnyCancellable = AnyCancellable({})
    private var cancellables = Set<AnyCancellable>()
    private var usersSubscription: DittoSubscription?

    private var privateRoomSubscriptions = [String: DittoSyncSubscription]()
    private var privateRoomMessagesSubscriptions = [String: DittoSyncSubscription]()
    private var publicRoomMessagesSubscriptions = [String: DittoSyncSubscription]()

    var ditto: Ditto?
    private let usersKey: String
    private var privateStore: LocalDataInterface
    private var chatRetentionPolicy: ChatRetentionPolicy

    private var joinRoomObserver: DittoStoreObserver?

    init(privateStore: LocalDataInterface, ditto: Ditto?, usersCollection: String, chatRetentionPolicy: ChatRetentionPolicy) {
        self.ditto = ditto
        self.privateStore = privateStore
        self.usersKey = usersCollection
        self.chatRetentionPolicy = chatRetentionPolicy

        if let ditto = ditto {
            self.usersSubscription = ditto.store[usersCollection].findAll().subscribe()
        }

        createDefaultPublicRoom()

        if let ditto = ditto {
            do {
                try ditto.sync.registerSubscription(query: "SELECT * FROM `\(publicRoomsCollectionId)`")
            } catch {
                print("Error subscribing to public rooms collection: \(error)")
            }
        }

        updateAllPublicRooms()

        $allPublicRooms
            .receive(on: DispatchQueue.main)
            .sink { [weak self] pubRooms in
                var rooms = pubRooms.filter { room in
                    !privateStore.archivedPublicRoomIDs.contains(room.id)
                }
                rooms.sort { $0.createdOn > $1.createdOn }

                rooms.forEach {[weak self] room in
                    self?.addSubscriptions(for: room)
                }

                self?.publicRoomsPublisher.value = rooms
            }
            .store(in: &cancellables)
    }

    func logout() {
        usersSubscription?.cancel()

        cancellables.forEach { anyCancellable in
            anyCancellable.cancel()
        }

        allPublicRoomsCancellable.cancel()

        publicRoomMessagesSubscriptions.forEach { (key: String, value: DittoSyncSubscription) in
            value.cancel()
        }

        publicRoomMessagesSubscriptions.forEach { (key: String, value: DittoSyncSubscription) in
            value.cancel()
        }

        ditto = nil
    }
}

extension DittoService {
    //MARK: Subscriptions

    func addSubscriptions(for room: Room) {
        guard let ditto = ditto else { return }

        do {
            let mSub = try ditto.sync.registerSubscription(query: "SELECT * FROM `\(room.messagesId)` WHERE roomId == :roomId", arguments: ["roomId": room.id,])
            publicRoomMessagesSubscriptions[room.id] = mSub

        } catch {
            print("addSubscriptions Error: \(error)")
        }
    }

    func removeSubscriptions(for room: Room) {
        guard let rSub = publicRoomMessagesSubscriptions[room.id] else {
            print("\(#function) publicRoomMessagesSubscriptions subcription NOT FOUND --> RETURN")
            return
        }
        rSub.cancel()
        publicRoomMessagesSubscriptions.removeValue(forKey: room.id)
    }
}

extension DittoService {
    // MARK: Users

    func currentUserPublisher() -> AnyPublisher<ChatUser?, Never> {
        guard ditto != nil else {
            return Just<ChatUser?>(nil).eraseToAnyPublisher()
        }

        return privateStore.currentUserIdPublisher
            .map { [weak self] userId -> AnyPublisher<ChatUser?, Never> in
                guard let self, let ditto = self.ditto, let userId = userId else {
                    return Just<ChatUser?>(nil).eraseToAnyPublisher()
                }

                return ditto.store.observePublisher(query: "SELECT * FROM COLLECTION `\(usersKey)` (`\(subscriptionsKey)` MAP, `\(mentionsKey)` MAP) WHERE _id = :id", arguments: ["id":userId], mapTo: ChatUser.self, onlyFirst: true)
                    .catch { error in
                        assertionFailure("ERROR with \(#function)" + error.localizedDescription)
                        return Empty<ChatUser?, Never>()
                    }
                    .removeDuplicates()
                    .compactMap { $0 }
                    .eraseToAnyPublisher()
            }
            .switchToLatest()
            .eraseToAnyPublisher()
    }

    func findUserById(_ id: String, inCollection collection: String) async throws -> ChatUser {
        guard let ditto = ditto else {
            throw AppError.unknown("Ditto instance not available")
        }

        let result = try await ditto.store.execute(query: "SELECT * FROM \(collection) WHERE _id = :_id", arguments: ["_id": id])

        guard let value = result.items.first?.value else {
            throw AppError.unknown("failed to get chat user from id")
        }

        return ChatUser(value: value)
    }

    func addUser(_ usr: ChatUser) {
        guard let ditto = ditto else { return }

        Task {
            do {
                try await ditto.store.execute(query: "INSERT INTO COLLECTION `\(usersKey)` (`\(subscriptionsKey)` MAP, `\(mentionsKey)` MAP) DOCUMENTS (:newUser) ON ID CONFLICT DO UPDATE", arguments: ["newUser": usr.docDictionary()])
            } catch {
                print("addUser Error: \(error)")
            }
        }
    }

    func updateUser(withId id: String,
                    name: String?,
                    subscriptions: [String: Date?]?,
                    mentions: [String: [String]]?) {
        guard let ditto = ditto else { return }

        Task {
            do {
                let currentUser = try await findUserById(id, inCollection: usersKey)

                let query = """
                    INSERT INTO COLLECTION `\(usersKey)` (`\(subscriptionsKey)` MAP, `\(mentionsKey)` MAP)
                    DOCUMENTS (:newDoc)
                    ON ID CONFLICT DO UPDATE
                    """
                let subscriptions = subscriptions ?? currentUser.subscriptions
                let subs = subscriptions.mapValues { date in date?.ISO8601Format() }
                let newDoc = [
                    dbIdKey: id,
                    nameKey: name ?? currentUser.name,
                    subscriptionsKey: subs,
                    mentionsKey: mentions ?? currentUser.mentions,
                ]
                let args = ["newDoc": newDoc]

                try await ditto.store.execute(query: query, arguments: args)
            } catch {
                print(error.localizedDescription)
            }
        }
    }

    func allUsersPublisher() -> AnyPublisher<[ChatUser], Never> {
        guard let ditto = ditto else {
            return Just<[ChatUser]>([]).eraseToAnyPublisher()
        }

        return ditto.store
            .observePublisher(query: "SELECT * FROM COLLECTION `\(usersKey)` (`\(subscriptionsKey)` MAP, `\(mentionsKey)` MAP)", mapTo: ChatUser.self)
            .catch { error in
                assertionFailure("ERROR with \(#function)" + error.localizedDescription)
                return Empty<[ChatUser], Never>()
            }
            .removeDuplicates()
            .eraseToAnyPublisher()
    }
}

// MARK: Messages

extension DittoService {

    @MainActor
    func messagePublisher(for msgId: String, in collectionId: String) -> AnyPublisher<Message, Never> {
        guard let ditto = ditto else {
            return Empty<Message, Never>().eraseToAnyPublisher()
        }

        let query = "SELECT * FROM COLLECTION `\(collectionId)` (\(thumbnailImageTokenKey) ATTACHMENT, \(largeImageTokenKey) ATTACHMENT) WHERE _id = :id"
        let args = ["id": msgId]

        return ditto.store.observePublisher(query: query, arguments: args, mapTo: Message.self, onlyFirst: true)
            .catch { error in
                assertionFailure("ERROR with \(#function)" + error.localizedDescription)
                return Empty<Message?, Never>()
            }
            .removeDuplicates()
            .compactMap { $0 }
            .eraseToAnyPublisher()
    }

    func messagesPublisher(for room: Room, retentionDays: Int?) -> AnyPublisher<[Message], Never> {
        guard let ditto = ditto else {
            return Just<[Message]>([]).eraseToAnyPublisher()
        }

        let retentionDaysDouble = Double(retentionDays ?? chatRetentionPolicy.days)
        let retentionDaysAgo = Date().addingTimeInterval(-retentionDaysDouble * 24 * 60 * 60)
        let query = """
                    SELECT * FROM COLLECTION `\(room.messagesId)` (\(thumbnailImageTokenKey) ATTACHMENT, \(largeImageTokenKey) ATTACHMENT)
                    WHERE roomId == :roomId AND createdOn >= :date
                    ORDER BY \(createdOnKey) ASC
                    """
        let args: [String: Any?] = [
            "roomId": room.id,
            "date": retentionDaysAgo.ISO8601Format()
        ]

        return ditto.store.observePublisher(query: query, arguments: args, mapTo: Message.self)
            .catch { error in
                assertionFailure("ERROR with \(#function)" + error.localizedDescription)
                return Empty<[Message], Never>()
            }
            .removeDuplicates()
            .eraseToAnyPublisher()
    }

    func createMessage(for room: Room, text: String) {
        guard let userId = privateStore.currentUserId, let ditto = ditto else { return }

        Task {
            guard let room = await self.room(for: room) else { return }

            let userQuery = try? await ditto.store.execute(query: "SELECT * FROM COLLECTION `\(usersKey)` (`\(subscriptionsKey)` MAP, `\(mentionsKey)` MAP) WHERE _id = '\(userId)'")
            let userDictionary = userQuery?.items.first?.value
            let query = "INSERT INTO `\(room.messagesId)` DOCUMENTS (:newDoc) ON ID CONFLICT DO UPDATE"
            let fullName = userDictionary?["name"] as? String
            let message = Message(roomId: room.id, message: text, userName: fullName ?? userId, userId: userId, peerKey: "").docDictionary()

            do {
                try await ditto.store.execute(query: query,arguments: ["newDoc": message])
            } catch {
                print("createMessage Error: \(error)")
            }
        }
    }

    func saveEditedTextMessage(_ message: Message, in room: Room) {
        guard let ditto = ditto else { return }

        let query = "UPDATE `\(room.messagesId)` SET `\(textKey)` = '\(message.text)' WHERE _id = :id"
        Task {
            do {
                try await ditto.store.execute(query: query, arguments: ["id": message.id])
            } catch {
                print("saveEditedTextMessage Error: \(error)")
            }
        }
    }

    func saveDeletedImageMessage(_ message: Message, in room: Room) {
        guard let ditto = ditto else { return }

        let query = "UPDATE COLLECTION `\(room.messagesId)` (\(thumbnailImageTokenKey) ATTACHMENT, \(largeImageTokenKey) ATTACHMENT) SET \(thumbnailImageTokenKey) -> tombstone(), \(largeImageTokenKey) -> tombstone(), \(textKey) = :text WHERE _id = :id"
        let args = [
            "id": message.id,
            "text": message.text
        ]

        Task {
            do {
                try await ditto.store.execute(query: query, arguments: args)
            } catch {
                print("saveDeletedImageMessage Error: \(error)")
            }
        }
    }

    func createImageMessage(for room: Room, image: UIImage, text: String?) async throws {
        guard let ditto = ditto else {
            throw AppError.unknown("Ditto instance not available")
        }

        let userId = privateStore.currentUserId ?? createdByUnknownKey
        var nowDate = DateFormatter.isoDate.string(from: Date())
        var fname = await attachmentFilename(for: user(for: userId), type: .thumbnailImage, timestamp: nowDate)

        //------------------------------------- Thumbnail ------------------------------------------
        guard let thumbnailImg = await image.attachmentThumbnail() else {
            print("DittoService.\(#function): ERROR - expected non-nil thumbnail")
            throw AttachmentError.thumbnailCreateFail
        }

        guard let tmpStorage = try? TemporaryFile(creatingTempDirectoryForFilename: "thumbnail.jpg") else {
            print("DittoService.\(#function): Error creating TMP storage directory")
            throw AttachmentError.tmpStorageCreateFail
        }

        guard let _ = try? thumbnailImg.jpegData(compressionQuality: 1.0)?.write(to: tmpStorage.fileURL) else {
            print("Error writing JPG attachment data to file at path: \(tmpStorage.fileURL.path) --> Throw")
            throw AttachmentError.tmpStorageWriteFail
        }

        guard let thumbAttachment = try? await ditto.store.newAttachment(
            path: tmpStorage.fileURL.path,
            metadata: metadata(for: image, fname: fname, timestamp: nowDate)
        ) else {
            print("Error creating Ditto image attachment from thumbnail jpg data --> Throw")
            throw AttachmentError.createFail
        }

        let docId = UUID().uuidString
        let capturedNowDate = nowDate

        Task {
            do {
                let doc: [String: Any?] = [
                    dbIdKey: docId,
                    createdOnKey: capturedNowDate,
                    roomIdKey: room.id,
                    userIdKey: userId,
                    thumbnailImageTokenKey: thumbAttachment
                ];

                try await ditto.store.execute(query: "INSERT INTO COLLECTION `\(room.messagesId)` (\(thumbnailImageTokenKey) ATTACHMENT) DOCUMENTS (:newDoc)", arguments: ["newDoc": doc, "\(thumbnailImageTokenKey)": thumbAttachment])

                try await cleanupTmpStorage(tmpStorage.deleteDirectory)
            } catch {
                print("createImageMessage insert attachment doc Error \(error)")
                throw error
            }
        }

        //------------------------------------- Large Image  ---------------------------------------
        nowDate = DateFormatter.isoDate.string(from: Date())
        fname = await attachmentFilename(for: user(for: userId), type: .largeImage, timestamp: nowDate)

        guard let tmpStorage = try? TemporaryFile(creatingTempDirectoryForFilename: "largeImage.jpg") else {
            print("DittoService.\(#function): Error creating TMP storage directory")
            throw AttachmentError.tmpStorageCreateFail
        }

        guard let _ = try? image.jpegData(compressionQuality: 1.0)?.write(to: tmpStorage.fileURL) else {
            print("Error writing JPG attachment data to file at path: \(tmpStorage.fileURL.path) --> Return")
            throw AttachmentError.tmpStorageWriteFail
        }

        guard let largeAttachment = try? await ditto.store.newAttachment(
            path: tmpStorage.fileURL.path,
            metadata: metadata(for: image, fname: fname, timestamp: nowDate)
        ) else {
            print("Error creating Ditto image attachment from large jpg data --> Throw")
            throw AttachmentError.createFail
        }

        Task {
            do {
                let query = "UPDATE COLLECTION `\(room.messagesId)` (\(largeImageTokenKey) ATTACHMENT) SET \(largeImageTokenKey) = :largeAttachment WHERE _id = :id"

                let args = [
                    "id": docId,
                    "largeAttachment": largeAttachment
                ]

                let _ = try await ditto.store.execute(query: query, arguments: args)
            } catch {
                print("createImageMessage update largeAttachment Error: \(error)")
            }
        }

        do {
            try await cleanupTmpStorage(tmpStorage.deleteDirectory)
        } catch {
            throw error
        }
    }

    private func metadata(for image:UIImage, fname: String, timestamp: String) async -> [String: String] {
        await [
            filenameKey: fname,
            userIdKey: privateStore.currentUserId ?? "",
            usernameKey: user(for: privateStore.currentUserId ?? "")?.name ?? unknownUserNameKey,
            fileformatKey: jpgExtKey,
            filesizeKey: String(image.sizeInBytes),
            timestampKey: timestamp
        ]
    }

    private func cleanupTmpStorage(_ cleanup: () throws -> Void) async throws {
        do {
            try cleanup()
        } catch {
            throw AttachmentError.tmpStorageCleanupFail
        }
    }

    private func attachmentFilename(
        for user: ChatUser?,
        type: AttachmentType,
        timestamp: String,
        ext: String = jpgExtKey
    ) async -> String {
        var fname = await self.user(for: privateStore.currentUserId ?? "")?.name ?? unknownUserNameKey
        fname = fname.replacingOccurrences(of: " ", with: "-")
        let tmstamp = timestamp.replacingOccurrences(of: ":", with: "-")
        fname += "_\(type.description)" + "_\(tmstamp)" + ext

        return fname
    }

    private func user(for userId: String) async -> ChatUser? {
        guard let ditto = ditto else { return nil }

        let query = "SELECT * FROM COLLECTION `\(usersKey)` (`\(subscriptionsKey)` MAP, `\(mentionsKey)` MAP) WHERE _id = :id"
        let args = ["id": userId]

       do {
           let result = try await ditto.store.execute(query: query, arguments: args)
           if let userValue = result.items.first?.value {
               return ChatUser(value: userValue)
           }
       } catch {
           print("user Error: \(error)")
       }

       return nil
   }

    func attachmentPublisher(
        for token: DittoAttachmentToken,
        in collectionId: String
    ) -> DittoSwift.DittoStore.FetchAttachmentPublisher? {
        guard let ditto = ditto else { return nil }
        return ditto.store.fetchAttachmentPublisher(attachmentToken: token)
    }

    func createUpdateMessage(document: [String : Any?]) {
        guard let ditto = ditto else { return }

        Task {
            try? await ditto.store.execute(
                query: """
                    INSERT INTO chat
                    DOCUMENTS (:message)
                    ON ID CONFLICT DO UPDATE
                    """,
                arguments: ["message": document]
            )
        }
    }
}

extension DittoService {
    //MARK: Rooms

    private func updateAllPublicRooms() {
        guard let ditto = ditto else {
            allPublicRooms = []
            return
        }

        let query = "SELECT * FROM `\(publicRoomsCollectionId)` ORDER BY \(createdOnKey) ASC"

        allPublicRoomsCancellable = ditto.store.observePublisher(query: query, mapTo: Room.self)
            .catch { error in
                assertionFailure("ERROR with \(#function)" + error.localizedDescription)
                return Empty<[Room], Never>()
            }
            .assign(to: \.allPublicRooms, on: self)
    }

    func room(for room: Room) async -> Room? {
        guard let ditto = ditto else { return nil }

        let collectionId = room.collectionId ?? publicRoomsCollectionId
        let query = "SELECT * FROM `\(collectionId)` WHERE _id = :id"
        let args = ["id": room.id]

        do {
            let result = try await ditto.store.execute(query: query, arguments: args)

            if result.items.isEmpty {
                print("DittoService.\(#function): WARNING - expected non-nil room room.id: \(room.id)")
                return nil
            }

            if let itemValue = result.items.first?.value {
                return Room(value: itemValue)
            }

        } catch {
            print("room Error: \(error)")
        }

        return nil
    }

    func findPublicRoomById(id: String) async -> Room? {
        guard let ditto = ditto else { return nil }

        var id = id
        if id == "public" {
            id = publicKey
        }

        guard let result = try? await ditto.store.execute(query: "SELECT * FROM `\(publicRoomsCollectionId)` WHERE _id = :id", arguments: ["id": id]),
              let doc = result.items.first?.value else {
            print("DittoService.\(#function): WARNING - expected non-nil room room.id: \(id)")
            return nil
        }

        let room = Room(value: doc)
        return room
    }

    func createRoom(id: String?, name: String, isGenerated: Bool = false) async -> String? {
        guard let ditto = ditto else { return nil }

        let collectionId = publicRoomsCollectionId
        let messagesId: String = publicMessagesCollectionId

        let room = Room(
            id: id ?? UUID().uuidString,
            name: name,
            messagesId: messagesId,
            userId: privateStore.currentUserId ?? unknownUserIdKey,
            collectionId: collectionId,
            isGenerated: isGenerated
        )

        addSubscriptions(for: room)

        let query = "INSERT INTO `\(collectionId)` DOCUMENTS (:newDoc) ON ID CONFLICT DO UPDATE"
        let args = ["newDoc": room.docDictionary()]

        do {
            let result = try await ditto.store.execute(query: query, arguments: args)
            return result.items.first?.value["_id"] as? String
        } catch {
            print("createRoom Error: \(error)")
        }

        return nil
    }

    private func createDefaultPublicRoom() {
        guard let ditto = ditto else { return }

        if allPublicRooms.count > 1 {
            return
        }

        Task {
            do {
                let newDoc: [String: Any?] = [
                    dbIdKey: publicKey,
                    nameKey: publicRoomTitleKey,
                    collectionIdKey: publicRoomsCollectionId,
                    messagesIdKey: publicMessagesCollectionId,
                    createdOnKey: DateFormatter.isoDate.string(from: Date()),
                ]

                try await ditto.store.execute(query: "INSERT INTO `\(publicRoomsCollectionId)` DOCUMENTS (:newDoc) ON ID CONFLICT DO UPDATE", arguments: ["newDoc": newDoc])
            } catch {
                print("createDefaultPublicRoom Error: \(error)")
            }
        }
    }
}

extension DittoService {
    // MARK: Room Archive/Unarchive

    func archiveRoom(_ room: Room) {
        archivePublicRoom(room)
    }

    private func archivePublicRoom(_ room: Room) {
        removeSubscriptions(for: room)
        evictPublicRoom(room)
        privateStore.archivePublicRoom(room)

        DispatchQueue.main.async { [weak self] in
            self?.updateAllPublicRooms()
        }
    }

    func unarchiveRoom(_ room: Room) {
        unarchivePublicRoom(room)
    }

    func unarchivePublicRoom(_ room: Room) {
        guard let ditto = ditto else { return }

        privateStore.unarchivePublicRoom(room)

        Task {
            do {
                guard let _ = try await ditto.store.execute(query: "SELECT * FROM `\(publicRoomsCollectionId)` WHERE _id = :id", arguments: ["id": room.id]).items.first else {
                    print("DittoService.\(#function): ERROR - expected non-nil public room for roomId: \(room.id)")
                    return
                }
            } catch {
                print("unarchivePublicRoom Error: \(error)")
            }
        }

        addSubscriptions(for: room)

        DispatchQueue.main.async { [weak self] in
            self?.updateAllPublicRooms()
        }
    }

    private func evictRoom(_ room: Room) {
        evictPublicRoom(room)
    }

    private func evictPublicRoom(_ room: Room) {
        guard let ditto = ditto else { return }

        Task {
            do {
                try await ditto.store.execute(query: "EVICT FROM `\(room.messagesId)` WHERE roomId = :roomId", arguments: ["roomId": room.id])
            } catch {
                print("evictPublicRoom Error: \(error)")
            }
        }
    }
}

extension DittoService {
    var peerKeyString: String {
        ditto?.presence.graph.localPeer.peerKeyString ?? ""
    }

    var sdkVersion: String {
        Ditto.version
    }
}
