//
//  ChatScreen.swift
//  DittoChat
//
//  Created by Eric Turner on 02/24/23.
//  Copyright © 2023 DittoLive Incorporated. All rights reserved.
//

import SwiftUI
import PhotosUI
import DittoChatCore

public struct ChatScreen: View {
    @StateObject var viewModel: ChatScreenVM
    @StateObject var errorHandler: ErrorHandler = ErrorHandler()
    private let dittoChat: DittoChat

    public init(room: Room, dittoChat: DittoChat, retentionDays: Int? = nil) {
        self.dittoChat = dittoChat
        self._viewModel = StateObject(wrappedValue: ChatScreenVM(room: room, dittoChat: dittoChat, retentionDays: retentionDays))
    }

    public var body: some View {
        EmptyView()
        VStack {
            ScrollViewReader { proxy in
                ZStack {
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(viewModel.messagesWithUsers) { usrMsg in
                                MessageBubbleView(
                                    messageWithUser: usrMsg,
                                    messagesId: viewModel.room.messagesId,
                                    messageOpCallback: viewModel.messageOperationCallback,
                                    isEditing: $viewModel.isEditing,
                                    dittoChat: dittoChat
                                )
                                .id(usrMsg.message.id)
                                .transition(.slide)
                            }
                        }
                    }
                    //.defaultScrollAnchor(.bottom)
                    .scrollDismissesKeyboard(.interactively)
                    .onAppear {
                        DispatchQueue.main.async {
                            scrollToBottom(proxy: proxy)
                        }
                    }
                    .onChange(of: viewModel.messagesWithUsers) { value, _  in
                        DispatchQueue.main.async {
                            withAnimation {
                                scrollToBottom(proxy: proxy)
                            }
                        }
                    }
                    .onChange(of: viewModel.keyboardStatus) { status, _ in
                        guard !viewModel.presentEditingView else { return }
                        if status == .willShow || status == .willHide { return }
                        withAnimation {
                            scrollToBottom(proxy: proxy)
                        }
                    }
                    if let lastUnreadMessage = viewModel.lastUnreadMessage() {
                        VStack(alignment: .leading) {
                            Button(action: {
                                DispatchQueue.main.async {
                                    withAnimation {
                                        proxy.scrollTo(lastUnreadMessage, anchor: .top)
                                    }
                                    viewModel.clearUnreadsAndMentions()
                                }
                            }, label: {
                                Image(systemName: "arrow.up.message")
                                Text("new messages")
                            })
                            .padding(.top)
                            .padding(.horizontal)
                            .buttonBorderShape(.capsule)
                            .buttonStyle(.borderedProminent)
                            Spacer()
                        }
                    }
                }
            }

            HStack(alignment: .center, spacing: 0) {
#if !os(tvOS)
                photosPickerButtonView
#endif

                ChatInputView(
                    text: $viewModel.inputText,
                    onSendButtonTappedCallback: viewModel.sendMessage,
                    dittoChat: dittoChat
                )
                .padding(.leading, 0)
            }
            .gesture(
                DragGesture().onChanged { _ in
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                }
            )
        }
#if !os(tvOS)
        .listStyle(.inset)
        .fullScreenCover(
            isPresented: $viewModel.presentAttachmentView,
            onDismiss: {
                viewModel.cleanupAttachmentAttribs()
            }
        ) {
            AttachmentPreview(
                vm: MessageBubbleVM(
                    viewModel.attachmentMessage!,
                    messagesId: viewModel.room.messagesId,
                    dittoChat: dittoChat
                ),
                errorHandler: errorHandler
            )
        }
#endif
        .fullScreenCover(isPresented: $viewModel.presentEditingView) {
            if let msgsUsers = try? viewModel.editMessagesWithUsers() {
                NavigationView {
                    MessageEditView(
                        msgsUsers,
                        saveEditCallback: viewModel.saveEditedTextMessage,
                        cancelEditCallback: viewModel.cancelEditCallback,
                        dittoChat: dittoChat
                    )
                }
            } else {
                EmptyView()
            }
        }
    }

#if !os(tvOS)
    var photosPickerButtonView: some View {
        PhotosPicker(selection: $viewModel.selectedItem,
                     matching: .images,
                     photoLibrary: .shared()
        ) {
            Image(systemName: cameraFillKey)
                .symbolRenderingMode(.multicolor)
                .font(.system(size: 28))
                .foregroundColor(.accentColor)
        }
        .padding(.leading, 12)
        .padding(.trailing, 4)
        .frame(width: 56, height: 44)
        .buttonStyle(.borderless)
        .onChange(of: viewModel.selectedItem) { newValue, _ in
            Task {
                do {
                    let imageData = try await newValue?.loadTransferable(type: Data.self)

                    if let image = UIImage(data: imageData ?? Data()) {
                        viewModel.selectedImage = image

                        do {
                            try await viewModel.sendImageMessage()
                        } catch {
                            self.errorHandler.handle(error: error)
                        }
                    }
                } catch {
                    self.errorHandler.handle(error: AttachmentError.iCloudLibraryImageFail)
                }
            }
        }
    }
#endif

    func scrollToBottom(proxy: ScrollViewProxy) {
        proxy.scrollTo(viewModel.messagesWithUsers.last?.id)
    }
}

#if DEBUG
import DittoSwift
struct ChatScreen_Previews: PreviewProvider {
    static var previews: some View {
        ChatScreen(
            room: Room(id: "abc", name: "My Room", messagesId: "def", userId: "test"),
            dittoChat: DittoChat(config: ChatConfig(ditto: Ditto(), usersCollection: "users")), retentionDays: 365
        )
    }
}
#endif
