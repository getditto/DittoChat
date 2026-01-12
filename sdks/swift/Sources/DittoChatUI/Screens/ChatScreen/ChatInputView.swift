//
//  ChatInputView.swift
//  DittoChat
//
//  Created by Eric Turner on 02/20/23.
//  Copyright © 2023 DittoLive Incorporated. All rights reserved.
//

import SwiftUI
import DittoChatCore

struct ChatInputView: View {
    @Binding var text: String
    var onSendButtonTappedCallback: (() -> Void)? = nil
    var primaryColor: Color = .blue

    var body: some View {
        HStack(alignment: .bottom) {
            Spacer(minLength: 12)
            HStack(alignment: .bottom) {
#if os(tvOS)
                TextField("", text: $text)
                    .padding(EdgeInsets(top: 0, leading: 8, bottom: 0, trailing: 8))
#else
                ExpandingTextView(text: $text)
                    .padding(EdgeInsets(top: 0, leading: 8, bottom: 0, trailing: 8))
#endif
                Button {
                    onSendButtonTappedCallback?()
                } label: {
                    Image(systemName: arrowUpKey)
                        .padding(.all, 5)
                        .foregroundColor(Color.white)
                        .background(.blue)
                        .clipShape(Circle())
                }
                .padding(4)

                Spacer(minLength: 8)
            }
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(.secondary, lineWidth: 1)
            )

            Spacer(minLength: 12)
        }
    }
}

#if DEBUG
struct ChatInputView_Previews: PreviewProvider {
    static var previews: some View {
        ChatInputView(text: .constant("Hello how are you this fine evening?")) { /*for previews only*/ }
    }
}
#endif
