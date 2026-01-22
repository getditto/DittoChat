//
//  File.swift
//  DittoChat
//
//  Created by Erik Everson on 12/2/24.
//

import Foundation
import DittoSwift
import Combine
import UIKit

@MainActor
public protocol DittoSwiftChat {
    // Create
    func createRoom(withConfig: RoomConfig) async throws -> String
    func createMessage(withConfig: MessageConfig) async throws
    func setCurrentUser(withConfig: UserConfig)

    // Read
    var publicRoomsPublisher: AnyPublisher<[Room], Never> { get }
    func readRoomById(id: String) async throws -> Room
    func allUsersPublisher() -> AnyPublisher<[ChatUser], Never>

    // Update
    func updateRoom(room: Room) async throws

    func logout()
}

public struct RoomConfig {
    public let id: String?
    public let name: String
    public let isGenerated: Bool

    public init(id: String? = nil, name: String, isGenerated: Bool = false) {
        self.id = id
        self.name = name
        self.isGenerated = isGenerated
    }
}

public struct MessageConfig {
    public let roomId: String
    public let message: String

    public init(roomId: String, message: String) {
        self.roomId = roomId
        self.message = message
    }
}

public struct UserConfig {
    public let id: String

    public init (id: String) {
        self.id = id
    }
}

public struct ChatConfig {
    public var ditto: Ditto
    public var retentionPolicy: ChatRetentionPolicy
    public var usersCollection: String
    public var userId: String?
    public var userEmail: String?
    public var acceptLargeImages: Bool
    public var primaryColor: String?

    public init(
        ditto: Ditto,
        retentionPolicy: ChatRetentionPolicy = .init(days: 30),
        usersCollection: String = "users", 
        userId: String? = nil,
        userEmail: String? = nil,
        acceptLargeImages: Bool = true,
        primaryColor: String? = nil
    ) {
        self.ditto = ditto
        self.retentionPolicy = retentionPolicy
        self.usersCollection = usersCollection
        self.userId = userId
        self.userEmail = userEmail
        self.acceptLargeImages = acceptLargeImages
        self.primaryColor = primaryColor
    }
}

// TODO: Hook this up to actually work
public struct ChatRetentionPolicy {
    public var days: Int
    
    public init(days: Int) {
        self.days = days
    }
}

struct AdminRole: DittoDecodable {
    init(value: [String : Any?]) {
        _id = value["_id"] as? String
        email = value["email"] as? String
    }

    public var _id: String?
    public var email: String?
}

@MainActor
public class DittoChat: DittoSwiftChat, ObservableObject {
    @Published private(set) public var publicRoomsPublisher: AnyPublisher<[Room], Never>
    public var retentionPolicy: ChatRetentionPolicy = .init(days: 30)
    public var acceptLargeImages: Bool
    public var primaryColor: String?
    public var hasAdminPrivileges: Bool {
        return !roles.isEmpty
    }
    private var rolesCancellable: AnyCancellable?
    private var roles: [AdminRole] = []

    private var localStore: LocalDataInterface
    internal var p2pStore: DittoDataInterface

    public init(config: ChatConfig) {
        let localStore: LocalService = LocalService()
        self.acceptLargeImages = config.acceptLargeImages
        self.primaryColor = config.primaryColor
        self.localStore = localStore
        self.p2pStore = DittoService(privateStore: localStore, ditto: config.ditto, usersCollection: config.usersCollection, chatRetentionPolicy: config.retentionPolicy)
        self.publicRoomsPublisher = p2pStore.publicRoomsPublisher.eraseToAnyPublisher()
        self.retentionPolicy = config.retentionPolicy
        if let userId = config.userId {
            self.setCurrentUser(withConfig: UserConfig(id: userId))
        }
        if let email = config.userEmail {
            do {
                try setupRolesSubscription(
                    email: email
                )
            } catch {
                // TODO: Handle errors
            }
        }
    }

    // MARK: Carry over from previous public things
    public var currentUserId: String? {
        get { localStore.currentUserId }
        set { localStore.currentUserId = newValue }
    }

    public func readRoomById(id: String) async throws -> Room {
        guard let room = await self.findPublicRoomById(id: id) else {
            throw AppError.unknown("room not found")
        }

        return room
    }

    func setupRolesSubscription(email: String) throws {
        try p2pStore.ditto?.sync.registerSubscription(
            query: "SELECT * FROM `roles` WHERE email = :email",
            arguments: ["email": email]
        )

        rolesCancellable = p2pStore.ditto?.store
            .observePublisher(
                query: "SELECT * FROM `roles` WHERE email = :email",
                arguments: ["email": email],
                mapTo: AdminRole.self
            )
            .catch { error in
                assertionFailure("ERROR with \(#function)" + error.localizedDescription)
                return Empty<[AdminRole], Never>()
            }
            .assign(to: \.roles, on: self)
    }

    public func allUsersPublisher() -> AnyPublisher<[ChatUser], Never> {
        p2pStore.allUsersPublisher()
    }

    // MARK: Create
    public func createRoom(withConfig config: RoomConfig) async throws -> String {
        guard let id = await self.createRoom(id: config.id, name: config.name, isGenerated: config.isGenerated) else {
            throw AppError.unknown("room not found")
        }

        return id
    }

    public func createMessage(withConfig config: MessageConfig) async throws {
        let room = try await readRoomById(id: config.roomId)

        self.createMessage(for: room, text: config.message)
    }

    public func setCurrentUser(withConfig config: UserConfig) {
        self.setCurrentUser(id: config.id)
    }

    // MARK: Read
    public func read(messagesForRoom room: Room) throws {
        self.readMessagesForRoom(room: room)
    }

    public func read(messagesForUser user: ChatUser) throws {
        self.readMessagesForUser(user: user)
    }

    // MARK: Update
    public func updateRoom(room: Room) throws {
        self.updateRoom(room)
    }

    /// Clears references to Ditto and running subscritopns as well as observers.
    /// Note: Make sure that you call stop sync before calling this logout function.
    public func logout() {
        p2pStore.logout()
    }
}

extension DittoChat {
    // MARK: Ditto Public Rooms

    internal func room(for room: Room) async -> Room? {
        await p2pStore.room(for: room)
    }

    internal func findPublicRoomById(id: String) async -> Room? {
        await p2pStore.findPublicRoomById(id: id)
    }

    public func createRoom(id: String? = UUID().uuidString, name: String, isGenerated: Bool = false) async -> String? {
        return await p2pStore.createRoom(id: id, name: name, isGenerated: isGenerated)
    }

    public func archiveRoom(_ room: Room) {
        p2pStore.archiveRoom(room)
    }

    internal func unarchiveRoom(_ room: Room) {
        p2pStore.unarchiveRoom(room)
    }

    internal func archivedPublicRoomsPublisher() -> AnyPublisher<[Room], Never> {
        localStore.archivedPublicRoomsPublisher
    }

    internal func readMessagesForRoom(room: Room) {
        // TODO: Implement
    }

    internal func readMessagesForUser(user: ChatUser) {
        // TODO: Implement
    }
}

@MainActor
extension DittoChat {
    // MARK: Messages

    public func createMessage(for room: Room, text: String) {
        p2pStore.createMessage(for: room, text: text)
    }

    public func createImageMessage(for room: Room, image: UIImage, text: String?) async throws {
        try await p2pStore.createImageMessage(for: room, image: image, text: text)
    }

    public func saveEditedTextMessage(_ message: Message, in room: Room) {
        p2pStore.saveEditedTextMessage(message, in: room)
    }

    public func saveDeletedImageMessage(_ message: Message, in room: Room) {
        p2pStore.saveDeletedImageMessage(message, in: room)
    }

    public func messagePublisher(for msgId: String, in collectionId: String) -> AnyPublisher<Message, Never> {
        p2pStore.messagePublisher(for: msgId, in: collectionId)
    }

    public func messagesPublisher(for room: Room, retentionDays: Int?) -> AnyPublisher<[Message], Never> {
        p2pStore.messagesPublisher(for: room, retentionDays: retentionDays)
    }

    internal func attachmentPublisher(
        for token: DittoAttachmentToken,
        in collectionId: String
    ) -> DittoSwift.DittoStore.FetchAttachmentPublisher? {
        p2pStore.attachmentPublisher(for: token, in: collectionId)
    }

    internal func createUpdateMessage(document: [String: Any?]) {
        p2pStore.createUpdateMessage(document: document)
    }

    @discardableResult
    public func fetchAttachment(
        token: [String : Any],
        deliverOn queue: DispatchQueue = .main,
        onFetchEvent: @escaping (DittoAttachmentFetchEvent) -> Void
    ) throws -> DittoAttachmentFetcher? {
        try p2pStore.ditto?.store.fetchAttachment(token: token, deliverOn: queue, onFetchEvent: onFetchEvent)
    }
}

extension DittoChat {
    // MARK: Users

    internal var currentUserIdPublisher: AnyPublisher<String?, Never> {
        localStore.currentUserIdPublisher
    }

    public func currentUserPublisher() -> AnyPublisher<ChatUser?, Never> {
        p2pStore.currentUserPublisher()
    }

    internal func addUser(_ usr: ChatUser) {
        p2pStore.addUser(usr)
    }

    public func updateUser(withId id: String, name: String? = nil, firstName: String? = nil, lastName: String? = nil, subscriptions: [String: Date?]?, mentions: [String: [String]]?) {
        if let firstName, let lastName {
            p2pStore.updateUser(withId: id, name: firstName + " " + lastName, subscriptions: subscriptions, mentions: mentions)
        } else {
            p2pStore.updateUser(withId: id, name: name, subscriptions: subscriptions, mentions: mentions)
        }
    }

    internal func updateRoom(_ room: Room) {
        // TODO: Implement
    }

    internal func saveCurrentUser(name: String) {
        if currentUserId == nil {
            let userId = UUID().uuidString
            currentUserId = userId
        }

        assert(currentUserId != nil, "Error: expected currentUserId to not be NIL")

        let user = ChatUser(id: currentUserId!, name: name, subscriptions: [:], mentions: [:])
        p2pStore.addUser(user)
    }

    @available(*, deprecated, renamed: "saveCurrentUser(name:)", message: "First and last name are no needed. Use name instead")
    internal func saveCurrentUser(firstName: String, lastName: String) {
        if currentUserId == nil {
            let userId = UUID().uuidString
            currentUserId = userId
        }

        assert(currentUserId != nil, "Error: expected currentUserId to not be NIL")

        let user = ChatUser(id: currentUserId!, name: firstName + " " + lastName, subscriptions: [:], mentions: [:])
        p2pStore.addUser(user)
    }

    internal func setCurrentUser(id: String) {
        currentUserId = id
    }
}

extension DittoChat {
    internal var sdkVersion: String {
        p2pStore.sdkVersion
    }

    internal var appInfo: String {
        let name = Bundle.main.appName
        let version = Bundle.main.appVersion
        let build = Bundle.main.appBuild
        return "\(name) \(version) build \(build)"
    }

    internal var peerKeyString: String {
        p2pStore.peerKeyString
    }
}
