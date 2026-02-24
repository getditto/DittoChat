//
//  ContentView.swift
//  DittoChatDemo
//
//  Created by Bryan Malumphy on 9/3/25.
//

import SwiftUI
import DittoChatUI
import DittoChatCore
import DittoSwift 

struct ContentView: View {

    @ObservedObject var viewModel: ContentViewModel = ContentViewModel()

    var body: some View {
        NavigationView {
            let ditto = viewModel.ditto ?? Ditto()
            RoomsListScreen(
                dittoChat: try! DittoChatBuilder()
                        .setDitto(ditto)
                        .setUserId(viewModel.projectMetadata.ueerId)
                        .build()
            )
        }
    }
}

#Preview {
    ContentView()
}
