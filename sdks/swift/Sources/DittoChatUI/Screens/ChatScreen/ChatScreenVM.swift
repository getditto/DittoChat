//
//  ChatScreenVM.swift
//  DittoChat
//
//  Created by Eric Turner on 2/20/23.
//  Copyright © 2023 DittoLive Incorporated. All rights reserved.
//

import Combine
import PhotosUI
import SwiftUI
import DittoChatCore

enum MessageOperation {
    case edit, deleteImage, deleteText, presentAttachment
}

@MainActor
class ChatScreenVM: ObservableObject {
    @Published var inputText: String = ""
    @Published var roomName: String = ""
    @Published var messagesWithUsers = [MessageWithUser]()
    var room: Room
    var cancellables: Set<AnyCancellable> = []

    #if !os(tvOS)
    @Published var selectedItem: PhotosPickerItem?
    #endif
    @Published var selectedImage: UIImage?
    @Published var presentAttachmentView = false
    var attachmentMessage: Message?

    @Published var currentUser: ChatUser?

    @Published var presentEditingView = false
    @Published var isEditing = false
    @Published var keyboardStatus: KeyboardChangeEvent = .unchanged
    var editMsgId: String?
    private let dittoChat: DittoChat

    init(room: Room, dittoChat: DittoChat, retentionDays: Int?) {
        self.room = room
        self.dittoChat = dittoChat

        let users = dittoChat.allUsersPublisher()
        let messages = dittoChat.messagesPublisher(for: room, retentionDays: retentionDays)

        messages.combineLatest(users)
            .map { messages, users -> [MessageWithUser] in
                var messagesWithUsers = [MessageWithUser]()
                for message in messages {
                    let user = users.first(where: { $0.id == message.userId }) ?? ChatUser.unknownUser()
                    messagesWithUsers.append(MessageWithUser(message: message, user: user))
                }
                return messagesWithUsers
            }
            .assign(to: &$messagesWithUsers)

        #if !os(tvOS)
        DispatchQueue.main.async {
            Publishers.keyboardStatus
                .assign(to: &self.$keyboardStatus)
        }
        #endif

        dittoChat.currentUserPublisher()
            .assign(to: &$currentUser)
    }

    func sendMessage() {
        // only allow non-empty string messages
        guard !inputText.isEmpty else { return }

        dittoChat.createMessage(for: room, text: inputText)

        inputText = ""
    }

    func sendImageMessage() async throws {
        guard let image = selectedImage else {
            throw AttachmentError.libraryImageFail
        }
        
        do {
            try await dittoChat.createImageMessage(for: room, image: image, text: inputText)

        } catch {
            print("Caught error: \(error.localizedDescription)")
            throw error
        }

        await MainActor.run {
            inputText = ""
            #if !os(tvOS)
            selectedItem = nil
            #endif
            selectedImage = nil
        }
    }

    func messageOperationCallback(_ op: MessageOperation, msg: Message) {
        switch op {
        case .edit:
            editMessageCallback(msg)
        case .deleteImage:
            deleteImageMessage(msg)
        case .deleteText:
            deleteTextMessage(msg)
        case .presentAttachment:
            presentAttachment(msg)
        }
    }

    func editMessageCallback(_ msg: Message) {
        editMsgId = msg.id
        isEditing = true
        presentEditingView = true
    }

    func cancelEditCallback() {
        cleanupEdit()
    }

    func cleanupEdit() {
        editMsgId = nil
        isEditing = false
        presentEditingView = false
    }

    func editMessagesWithUsers() throws -> (editUsrMsg: MessageWithUser, chats: ArraySlice<MessageWithUser>) {
        guard let msgIdx = messagesWithUsers.firstIndex(where: { $0.id == editMsgId }) else {
            throw AppError.unknown("could not find message with id: \(editMsgId ?? "nil")")
        }
        let usrMsg = messagesWithUsers[msgIdx]
        let chats = messagesWithUsers.prefix(through: msgIdx)
        return (editUsrMsg: usrMsg, chats: chats)
    }

    func saveEditedTextMessage(_ msg: Message) {
        if msg.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return deleteTextMessage(msg)
        }
        dittoChat.saveEditedTextMessage(msg, in: room)
        cleanupEdit()
    }

    func deleteTextMessage(_ msg: Message) {
        var editedMsg = msg
        editedMsg.text = deletedTextMessageKey
        saveEditedTextMessage(editedMsg)
    }

    func deleteImageMessage(_ msg: Message) {
        var editedMsg = msg
        editedMsg.text = deletedImageMessageKey
        editedMsg.thumbnailImageToken = nil
        editedMsg.largeImageToken = nil
        dittoChat.saveDeletedImageMessage(editedMsg, in: room)
    }

    func presentAttachment(_ msg: Message) {
        attachmentMessage = msg
        presentAttachmentView = true
    }

    func cleanupAttachmentAttribs() {
        attachmentMessage = nil
    }

    func lastUnreadMessage() -> String? {
        if let lastReadKeyValue = currentUser?.subscriptions[room.id], let lastReadDate = lastReadKeyValue {
            let firstunreadMEssage = messagesWithUsers.first { messageWithUser in
                messageWithUser.message.createdOn > lastReadDate
            }

            if let firstunreadMEssage {
                return firstunreadMEssage.id
            }

            return nil
        }
        return nil
    }

    func clearUnreadsAndMentions() {
        guard let currentUser else { return }
        var subs = currentUser.subscriptions
        var mentions = currentUser.mentions
        subs.updateValue(.now, forKey: room.id)
        mentions.updateValue([], forKey: room.id)

        dittoChat.updateUser(withId: currentUser.id, firstName: nil, lastName: nil, subscriptions: subs, mentions: mentions)
    }
}
